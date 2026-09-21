/**
 * Server entry point — imports the Express app from app.js,
 * initializes the database, and starts listening.
 * Used for Railway deployment and local development.
 */
import app from './app.js';
import { initDb, flushDb } from './data/db.js';
import { startAutomationScheduler, isWhatsAppConfigured } from './data/automation.js';
import { checkSLAViolations, applyTemperatureDecay } from './data/leadEngine.js';
import { getDb } from './data/db.js';

const PORT = process.env.PORT || 5001;
let server;

initDb()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Hintonn CRM API Server running on port ${PORT}`);
      console.log('🚀 Server ready — Database connected');
      if (isWhatsAppConfigured()) {
        console.log(`📱 WhatsApp Cloud API active (phone: ${process.env.WHATSAPP_PHONE_NUMBER_ID})`);
      } else {
        console.log('⚠️  WhatsApp API not configured');
      }
    });

    // Start automation scheduler
    startAutomationScheduler();

    // Periodic flush to Firestore (every 30 seconds)
    setInterval(async () => {
      try {
        await flushDb();
      } catch (err) {
        console.error('Periodic flush error:', err.message);
      }
    }, 30 * 1000);

    // SLA monitoring (every 5 minutes)
    setInterval(() => {
      try {
        const db = getDb();
        const violations = checkSLAViolations(db);
        if (violations.length > 0) {
          console.log(`⚠️  SLA Monitor: ${violations.length} violation(s) detected`);
          if (!db.slaAlerts) db.slaAlerts = [];
          for (const v of violations) {
            const existing = db.slaAlerts.find(a => a.leadId === v.leadId);
            if (!existing) {
              db.slaAlerts.push({ ...v, alertedAt: new Date().toISOString() });
            }
          }
          if (db.slaAlerts.length > 100) db.slaAlerts = db.slaAlerts.slice(-100);
        }
      } catch (err) {
        console.error('SLA monitor error:', err.message);
      }
    }, 5 * 60 * 1000);

    // Temperature decay (every hour)
    setInterval(() => {
      try {
        const db = getDb();
        const decayed = applyTemperatureDecay(db);
        if (decayed.length > 0) {
          console.log(`🌡️  Temperature Decay: ${decayed.length} lead(s) cooled`);
        }
      } catch (err) {
        console.error('Temperature decay error:', err.message);
      }
    }, 60 * 60 * 1000);
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('📴 SIGTERM received — shutting down...');
  await flushDb();
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', async () => {
  console.log('📴 SIGINT received — flushing data...');
  await flushDb();
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
});
