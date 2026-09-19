import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDb, getDb } from './data/db.js';
import { startAutomationScheduler, handleWebhookVerification, processInboundWebhook, isWhatsAppConfigured } from './data/automation.js';
import { checkSLAViolations, applyTemperatureDecay } from './data/leadEngine.js';
import { authenticate } from './middleware/auth.js';

import leadsRouter from './routes/leads.js';
import pipelineRouter from './routes/pipeline.js';
import projectsRouter from './routes/projects.js';
import tasksRouter from './routes/tasks.js';
import siteVisitsRouter from './routes/siteVisits.js';
import whatsappRouter from './routes/whatsapp.js';
import callsRouter from './routes/calls.js';
import partnersRouter from './routes/partners.js';
import reportsRouter from './routes/reports.js';
import settingsRouter from './routes/settings.js';
import webhooksRouter from './routes/webhooks.js';
import leadCaptureRouter from './routes/leadCapture.js';
import leadNurtureRouter from './routes/leadNurture.js';
import postBookingRouter from './routes/postBooking.js';
import teamAnalyticsRouter from './routes/teamAnalytics.js';
import documentPipelineRouter from './routes/documentPipeline.js';
import siteVisitAutoRouter from './routes/siteVisitAutomation.js';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 5001;

// ── FIX #1: Helmet security headers ──────────────────────────────────────────
app.use(helmet());

// ── FIX #2: CORS — restrict to known origins ─────────────────────────────────
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5001',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.CLIENT_ORIGIN,           // set in .env for custom domain
  'https://hintonn-crm.vercel.app',    // default Vercel domain
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, Postman, curl)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

// ── FIX #3: Request body size limit ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── FIX #4: Rate limiting ────────────────────────────────────────────────────
// General API: 100 requests per minute per IP
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

// Auth endpoints: 5 attempts per minute per IP (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again in 1 minute' },
});

app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// ── WhatsApp Cloud API Webhook (Meta verification + inbound messages) ───────
// Mounted BEFORE the whatsapp router to bypass auth middleware
app.get('/api/whatsapp/webhook', (req, res) => {
  handleWebhookVerification(req, res);
});

// FIX #7: Meta webhook signature verification
function verifyMetaSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // Skip verification in development if no app secret configured
  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('⚠️  WHATSAPP_APP_SECRET not set — rejecting webhook in production');
      return res.status(403).json({ error: 'Webhook verification failed' });
    }
    return next(); // Dev mode: skip
  }

  if (!signature) {
    return res.status(403).json({ error: 'Missing signature' });
  }

  // Get raw body for HMAC — express.json() already parsed it, so use req.body
  const bodyStr = JSON.stringify(req.body);
  const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(bodyStr).digest('hex');

  if (signature !== expectedSig) {
    console.error('❌ Meta webhook signature mismatch');
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
}

app.post('/api/whatsapp/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), verifyMetaSignature, (req, res) => {
  try {
    const results = processInboundWebhook(req.body);
    if (results.length > 0) {
      console.log(`📩 Processed ${results.length} inbound message(s)`);
    }
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('WhatsApp webhook error:', err.message);
    res.status(200).json({ status: 'ok' }); // Always 200 to Meta
  }
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/site-visits', siteVisitsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/calls', callsRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/lead-capture', leadCaptureRouter);
app.use('/api/nurture', leadNurtureRouter);
app.use('/api/post-booking', postBookingRouter);
app.use('/api/team-analytics', teamAnalyticsRouter);
app.use('/api/documents', documentPipelineRouter);
app.use('/api/site-visit-auto', siteVisitAutoRouter);

// ── WhatsApp API Status (for frontend dashboard) ────────────────────────────
app.get('/api/whatsapp/status', authenticate, (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];
  const activeLeads = contacts.filter(c => !['won', 'lost'].includes(c.stage) && !c.automationPaused);
  const pausedLeads = contacts.filter(c => c.automationPaused);
  const totalSent = contacts.reduce((sum, c) => sum + (c.automationLog || []).filter(l => l.status === 'sent').length, 0);

  res.json({
    success: true,
    data: {
      configured: isWhatsAppConfigured(),
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
      mode: 'direct_meta_api',
      webhookUrl: '/api/whatsapp/webhook',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || null,
      schedulerRunning: isWhatsAppConfigured(),
      activeLeads: activeLeads.length,
      pausedLeads: pausedLeads.length,
      totalMessagesSent: totalSent,
    }
  });
});

// Global Search endpoint (requires auth)
app.get('/api/search', authenticate, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json({ success: true, data: { leads: [], projects: [], partners: [], tasks: [] } });

  const db = getDb();
  const leads = (db.contacts || []).filter(c =>
    (c.name && c.name.toLowerCase().includes(q)) ||
    (c.phone && c.phone.includes(q)) ||
    (c.config && c.config.toLowerCase().includes(q))
  ).slice(0, 5);

  const projects = (db.projects || []).filter(p =>
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.loc && p.loc.toLowerCase().includes(q)) ||
    (p.type && p.type.toLowerCase().includes(q))
  ).slice(0, 4);

  const partners = (db.partners || []).filter(p =>
    (p.name && p.name.toLowerCase().includes(q)) ||
    (p.company && p.company.toLowerCase().includes(q))
  ).slice(0, 4);

  const tasks = (db.tasks || []).filter(t =>
    (t.title && t.title.toLowerCase().includes(q)) ||
    (t.assignee && t.assignee.toLowerCase().includes(q))
  ).slice(0, 4);

  res.json({
    success: true,
    data: { leads, projects, partners, tasks }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ── Global error handler — never leak stack traces in production ─────────────
app.use((err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? (status === 500 ? 'Internal server error' : err.message)
    : err.message;

  if (status >= 500) {
    console.error('Server error:', err.message);
  }

  res.status(status).json({ success: false, message });
});

// Boot: initialize database engine, then start listening
let server; // reference for graceful shutdown

initDb()
  .then(() => {
    server = app.listen(PORT, () => {
      console.log(`Hintonn CRM API Server running on port ${PORT}`);
      console.log('🚀 Server ready — Database connected');
      if (isWhatsAppConfigured()) {
        console.log(`📱 WhatsApp Cloud API active (phone: ${process.env.WHATSAPP_PHONE_NUMBER_ID})`);
        console.log(`🔗 Webhook URL: /api/whatsapp/webhook`);
        console.log(`🔑 Verify token: ${process.env.WHATSAPP_VERIFY_TOKEN}`);
      } else {
        console.log('⚠️  WhatsApp API not configured — set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN');
      }
    });

    // Start the automation scheduler (Meta WhatsApp API direct)
    startAutomationScheduler();

    // Start SLA monitoring (every 5 minutes)
    setInterval(() => {
      try {
        const db = getDb();
        const violations = checkSLAViolations(db);
        if (violations.length > 0) {
          console.log(`⚠️  SLA Monitor: ${violations.length} violation(s) detected`);
          violations.forEach(v => {
            console.log(`   → ${v.leadName}: ${v.message}`);
          });
          // Store SLA alerts (keep last 100, dedup by leadId)
          if (!db.slaAlerts) db.slaAlerts = [];
          for (const v of violations) {
            const existing = db.slaAlerts.find(a => a.leadId === v.leadId);
            if (!existing) {
              db.slaAlerts.push({ ...v, alertedAt: new Date().toISOString() });
            }
          }
          // Cap at 100 alerts
          if (db.slaAlerts.length > 100) db.slaAlerts = db.slaAlerts.slice(-100);
        }
      } catch (err) {
        console.error('SLA monitor error:', err.message);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    // Start temperature decay monitor (every hour)
    setInterval(() => {
      try {
        const db = getDb();
        const decayed = applyTemperatureDecay(db);
        if (decayed.length > 0) {
          console.log(`🌡️  Temperature Decay: ${decayed.length} lead(s) cooled`);
          decayed.forEach(d => {
            console.log(`   → ${d.leadName}: ${d.oldScore} → ${d.newScore} (${d.daysSinceActivity}d inactive)`);
          });
        }
      } catch (err) {
        console.error('Temperature decay error:', err.message);
      }
    }, 60 * 60 * 1000); // Every hour
  })
  .catch(err => {
    console.error('❌ Failed to initialize database:', err.message);
    process.exit(1);
  });

// ── FIX #6: Unhandled error + graceful shutdown ──────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️  Unhandled Rejection:', reason?.message || reason);
  // Don't exit — log and continue (the setInterval jobs may recover)
});

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message);
  console.error(err.stack);
  // Graceful shutdown on truly broken state
  if (server) {
    server.close(() => {
      console.log('🔒 Server closed due to uncaught exception');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown on SIGTERM (Vercel sends this on deploy)
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received — shutting down gracefully...');
  if (server) {
    server.close(() => {
      console.log('🔒 Server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received — shutting down...');
  if (server) {
    server.close(() => process.exit(0));
  } else {
    process.exit(0);
  }
});

export default app;
