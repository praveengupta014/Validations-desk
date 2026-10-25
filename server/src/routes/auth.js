import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { writeAudit } from '../services/audit.js';

const r = Router();

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }
  await writeAudit(user, 'LOGIN', 'user', user._id, `${user.role} signed in`);
  res.json({ token: signToken(user), user: { id: user._id, name: user.name, email: user.email, role: user.role, instituteName: user.instituteName } });
});

// Institutes can self-register; officers/admins are created by seed/admin only.
r.post('/register', async (req, res) => {
  const { name, email, password, instituteName, aicteId } = req.body || {};
  if (!name || !email || !password || !instituteName) return res.status(400).json({ message: 'Name, email, password and institute name are required' });
  if (password.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ message: 'An account with this email already exists' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'institute', instituteName, aicteId });
  await writeAudit(user, 'REGISTER', 'user', user._id, `Institute registered: ${instituteName}`);
  res.status(201).json({ token: signToken(user), user: { id: user._id, name, email: user.email, role: user.role, instituteName } });
});

r.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

export default r;
