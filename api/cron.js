/**
 * Vercel Cron Endpoint — processes automation messages.
 * Called by Vercel Cron or external service every few hours.
 * 
 * Also callable manually: GET /api/cron?secret=YOUR_CRON_SECRET
 */
import { initDb } from '../server/data/db.js';
import { processAutomation } from '../server/data/automation.js';

let dbReady = false;

export default async function handler(req, res) {
  // Simple auth — only allow calls with valid secret or from Vercel Cron
  const cronSecret = process.env.CRON_SECRET || 'hintonn-cron-2026';
  const providedSecret = req.query.secret || req.headers['x-cron-secret'];
  
  if (providedSecret !== cronSecret) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  if (!dbReady) {
    try {
      await initDb();
      dbReady = true;
    } catch (err) {
      console.error('DB init failed:', err.message);
      return res.status(503).json({ success: false, message: 'Database initializing' });
    }
  }

  try {
    const triggered = await processAutomation();
    return res.json({
      success: true,
      processed: triggered.length,
      messages: triggered.map(t => ({
        lead: t.leadName,
        stage: t.stage,
        template: t.label,
        method: t.method,
      })),
    });
  } catch (err) {
    console.error('Cron automation error:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
