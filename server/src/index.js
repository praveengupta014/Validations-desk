import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.js';
import applicationRoutes from './routes/applications.js';
import miscRoutes from './routes/misc.js';
import { seedIfEmpty } from './seed.js';

const app = express();
const server = http.createServer(app);
const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const io = new Server(server, { cors: { origin, credentials: true } });

// officers/admins join the "staff" room to receive live alerts
io.use((socket, next) => {
  try {
    const p = jwt.verify(socket.handshake.auth?.token || '', process.env.JWT_SECRET || 'dev-secret');
    socket.data.role = p.role;
    next();
  } catch { next(new Error('unauthorised')); }
});
io.on('connection', (s) => { if (s.data.role !== 'institute') s.join('staff'); });

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

// Ensure DB is connected before processing requests (critical for Vercel Serverless)
app.use(async (_req, _res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err);
    next(err);
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true, db: mongoose.connection.readyState === 1 }));
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes(io));
app.use('/api', miscRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 400).json({ message: err.message || 'Something went wrong' });
});

let isConnected = false;
export async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aicte_validation_desk';
  await mongoose.connect(uri);
  isConnected = true;
  await seedIfEmpty();
}

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  connectDB()
    .then(() => server.listen(PORT, () => console.log(`API ready on http://localhost:${PORT}`)))
    .catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
}

export default app;
