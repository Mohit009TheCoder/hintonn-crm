/**
 * Vercel Serverless Function — wraps the Express app.
 * Initializes DB on cold start, then handles requests.
 *
 * Cron jobs (SLA, temp decay, automation) are disabled in serverless.
 * Use an external cron service to keep the function warm.
 */
import { initDb } from '../server/data/db.js';
import app from '../server/app.js';

let dbReady = false;

export default async function handler(req, res) {
  if (!dbReady) {
    try {
      await initDb();
      dbReady = true;
    } catch (err) {
      console.error('DB init failed:', err.message);
      return res.status(503).json({ success: false, message: 'Database initializing, please retry' });
    }
  }
  return app(req, res);
}
