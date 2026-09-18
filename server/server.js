import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { initDb, getDb } from './data/db.js';
import { startAutomationScheduler, setWebhookUrl } from './data/automation.js';
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

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

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

// Boot: init Firestore → then start Express
const server = app.listen(PORT, () => {
  console.log(`Hintonn CRM API Server running on port ${PORT}`);
});

initDb()
  .then(() => {
    console.log('🚀 Server ready — Firestore connected');

    // Set n8n webhook URL from settings or env
    const db = getDb();
    const webhookUrl = db.settings?.automation?.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL;
    if (webhookUrl) setWebhookUrl(webhookUrl);

    // Start the automation scheduler
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
    console.error('❌ Failed to initialize Firestore:', err.message);
    process.exit(1);
  });
