import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import crypto from 'crypto';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getDb } from './data/db.js';
import { handleWebhookVerification, processInboundWebhook, processAutomation, isWhatsAppConfigured } from './data/automation.js';
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
import siteVisitTestRouter from './routes/siteVisitTest.js';
import authRouter from './routes/auth.js';

const app = express();

// Trust Vercel's proxy (required for rate-limit to read X-Forwarded-For)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5001',
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.CLIENT_ORIGIN,
  'https://hintonn-crm.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

// Body limit + logging
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100, // Increased for easier testing
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts, please try again in 1 minute' },
});

app.use('/api/auth', authLimiter);
app.use('/api/', generalLimiter);

// WhatsApp webhook (GET verification)
app.get('/api/whatsapp/webhook', (req, res) => {
  handleWebhookVerification(req, res);
});

// Meta webhook signature verification
function verifyMetaSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Webhook verification failed' });
    }
    return next();
  }

  if (!signature) {
    return res.status(403).json({ error: 'Missing signature' });
  }

  const bodyStr = JSON.stringify(req.body);
  const expectedSig = 'sha256=' + crypto.createHmac('sha256', appSecret).update(bodyStr).digest('hex');

  if (signature !== expectedSig) {
    return res.status(403).json({ error: 'Invalid signature' });
  }

  next();
}

app.post('/api/whatsapp/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }), verifyMetaSignature, async (req, res) => {
  try {
    const results = await processInboundWebhook(req.body);
    if (results.length > 0) {
      console.log(`Processed ${results.length} inbound message(s)`);
      for (const r of results) {
        if (r.autoReply) {
          console.log(`  → ${r.leadName}: auto-reply ${r.autoReply.sent ? 'sent' : 'failed'} (${r.autoReply.action})`);
        }
      }
    }
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('WhatsApp webhook error:', err.message);
    res.status(200).json({ status: 'ok' });
  }
});

// Lazy automation — process due messages on API activity (throttled to once/hour)
let lastAutomationRun = 0;
const AUTOMATION_INTERVAL = 60 * 60 * 1000; // 1 hour
app.use('/api/', (req, res, next) => {
  if (isWhatsAppConfigured() && Date.now() - lastAutomationRun > AUTOMATION_INTERVAL) {
    lastAutomationRun = Date.now();
    processAutomation().catch(err =>
      console.error('Lazy automation error:', err.message)
    );
  }
  next();
});

// API Routes
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
app.use('/api/site-visit-test', siteVisitTestRouter);

// WhatsApp status
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

// Global search
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

  res.json({ success: true, data: { leads, projects, partners, tasks } });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
  });
});

// Global error handler
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

export default app;
