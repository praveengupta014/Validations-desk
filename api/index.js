/**
 * Vercel Serverless Function entry point for Node.js Express API.
 */
import app, { connectDB } from '../server/src/index.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Vercel Serverless] DB connection error:', err.message);
  }
  return app(req, res);
}
