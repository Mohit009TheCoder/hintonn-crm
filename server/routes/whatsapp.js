import express from 'express';
import { getDb, saveDb, insertItem } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validateWhatsAppMessage } from '../middleware/validate.js';

const router = express.Router();
router.use(authenticate);

router.get('/threads/:contactId', authorize('whatsapp', 'read'), (req, res) => {
  const db = getDb();
  const contact = db.contacts.find(c => Number(c.id) === Number(req.params.contactId));
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

  const first = contact.name.split(' ')[0];
  const defaultMessages = [
    { dir: 'out', text: `Hi ${first}, this is Rohan from Ashray Group — thanks for your interest in ${contact.config}! Sending a quick overview of the project.`, time: '3 days ago' }
  ];
  if (contact.score >= 50) {
    defaultMessages.push({ dir: 'in', text: 'Thanks Rohan, will take a look and get back to you with family preferences.', time: '2 days ago' });
  }

  const customMessages = (contact.waLog || []).map(m => ({
    dir: m.dir || 'out',
    text: m.text,
    time: m.time || 'Just now',
    auto: !!m.auto
  }));

  res.json({
    success: true,
    data: [...defaultMessages, ...customMessages]
  });
});

router.post('/send', authorize('whatsapp', 'send'), validateWhatsAppMessage, (req, res) => {
  const { contactId, text } = req.body;
  if (!contactId || !text) {
    return res.status(400).json({ success: false, message: 'contactId and text are required' });
  }

  const db = getDb();
  const contact = db.contacts.find(c => Number(c.id) === Number(contactId));
  if (!contact) return res.status(404).json({ success: false, message: 'Contact not found' });

  if (!contact.waLog) contact.waLog = [];
  const newMsg = {
    id: contact.waLog.length + 1,
    text,
    time: 'Just now',
    dir: 'out'
  };
  contact.waLog.push(newMsg);

  if (!contact.timeline) contact.timeline = [];
  contact.timeline.unshift({
    type: 'whatsapp',
    text: `Sent WhatsApp: "${text.substring(0, 45)}${text.length > 45 ? '...' : ''}"`,
    time: 'Just now',
    icon: 'messagecircle'
  });

  // Automated stage transition in database: if currently new, advance to contacted
  let stageChanged = false;
  if (contact.stage === 'new') {
    contact.stage = 'contacted';
    contact.dealProb = Math.max(contact.dealProb || 0, 45);
    contact.score = Math.min(100, (contact.score || 30) + 15);
    contact.timeline.unshift({
      type: 'stage-change',
      text: 'Stage auto-advanced to Contacted (outbound WhatsApp message)',
      time: 'Just now',
      icon: 'zap'
    });
    stageChanged = true;
  }

  saveDb();
  res.json({ success: true, data: newMsg, stageChanged, currentStage: contact.stage });
});

router.get('/broadcasts', authorize('whatsapp', 'read'), (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.broadcasts || [] });
});

router.post('/broadcasts', authorize('whatsapp', 'send'), (req, res) => {
  const { name, segment, message, status, scheduledAt } = req.body;
  if (!name || !message) return res.status(400).json({ success: false, message: 'Name and message are required' });

  const isSent = status === 'sent';
  const db = getDb();
  const targetCount = db.contacts.length * 8; // realistic blast figure

  const newBroadcast = {
    id: (db.broadcasts ? db.broadcasts.length : 0) + 1,
    name,
    segment: segment || 'All Leads',
    message,
    status: status || 'sent',
    sentCount: isSent ? targetCount : 0,
    deliveredCount: isSent ? Math.round(targetCount * 0.98) : 0,
    readCount: isSent ? Math.round(targetCount * 0.72) : 0,
    repliedCount: isSent ? Math.round(targetCount * 0.14) : 0,
    scheduledAt: scheduledAt || null,
    sentAt: isSent ? 'Just now' : null
  };

  db.broadcasts.unshift(newBroadcast);
  saveDb();
  res.status(201).json({ success: true, data: newBroadcast });
});

router.get('/sequences', authorize('whatsapp', 'read'), (req, res) => {
  const db = getDb();
  res.json({ success: true, data: db.sequences || [] });
});

router.post('/sequences', authorize('whatsapp', 'send'), (req, res) => {
  const { name, trigger, messages } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

  const db = getDb();
  const newSeq = {
    id: (db.sequences ? db.sequences.length : 0) + 1,
    name,
    trigger: trigger || 'User inquiry',
    steps: Array.isArray(messages) ? messages.length : 3,
    activeLeads: 4,
    status: 'active',
    messages: Array.isArray(messages) ? messages : ['Welcome to Ashray Group!']
  };

  db.sequences.push(newSeq);
  saveDb();
  res.status(201).json({ success: true, data: newSeq });
});

// Simulation Engine routes
router.get('/simulation', authorize('whatsapp', 'read'), (req, res) => {
  const db = getDb();
  const REMINDER_ELIGIBLE = ['new', 'contacted', 'qualified'];
  const eligibleLeads = db.contacts.map(c => {
    const isEligible = REMINDER_ELIGIBLE.includes(c.stage);
    return {
      id: c.id,
      name: c.name,
      stage: c.stage,
      score: c.score,
      createdMinutesAgo: c.createdMinutesAgo || 0,
      reminderCount: c.reminderCount || 0,
      nextReminderHour: c.nextReminderHour,
      lastReminderHour: c.lastReminderHour,
      isEligible,
      status: !isEligible ? 'Paused (at ' + c.stage + ')' : ((c.reminderCount || 0) > 0 ? `${c.reminderCount} sent` : 'Scheduled')
    };
  });

  res.json({
    success: true,
    data: {
      simulatedHour: (db.simulation && db.simulation.simulatedHour) || 0,
      logs: (db.simulation && db.simulation.logs) || [],
      leads: eligibleLeads
    }
  });
});

router.post('/simulation/advance', authorize('whatsapp', 'send'), (req, res) => {
  const { hours } = req.body;
  const advanceBy = Number(hours) || 12;
  const db = getDb();

  if (!db.simulation) db.simulation = { simulatedHour: 0, logs: [] };
  db.simulation.simulatedHour += advanceBy;
  const curHour = db.simulation.simulatedHour;

  const REMINDER_ELIGIBLE = ['new', 'contacted', 'qualified'];
  const triggered = [];

  db.contacts.forEach(c => {
    if (!REMINDER_ELIGIBLE.includes(c.stage)) return;

    if (c.nextReminderHour === undefined || c.nextReminderHour === null) {
      c.nextReminderHour = 24;
    }

    if (curHour >= c.nextReminderHour) {
      c.reminderCount = (c.reminderCount || 0) + 1;
      c.lastReminderHour = curHour;
      c.nextReminderHour = curHour + 12; // 12-hour cadence

      const leadFirst = c.name.split(' ')[0];
      const project = db.projects.find(p => p.id === c.projectId) || db.projects[0];
      const nudgeText = `Hi ${leadFirst}! Just following up on ${project.name} (${c.config}). Would you be free for a brief 5-minute call or walkthrough this week?`;

      if (!c.waLog) c.waLog = [];
      c.waLog.push({
        id: c.waLog.length + 1,
        text: nudgeText,
        time: `Simulated hour +${curHour}h`,
        dir: 'out',
        auto: true
      });

      const logEntry = {
        id: db.simulation.logs.length + 1,
        contactId: c.id,
        contactName: c.name,
        text: `Automated nudge #${c.reminderCount} sent to ${c.name} (${c.stage})`,
        hour: curHour,
        time: `+${curHour}h in simulation`
      };

      db.simulation.logs.unshift(logEntry);
      triggered.push(logEntry);
    }
  });

  saveDb();
  res.json({
    success: true,
    data: {
      simulatedHour: curHour,
      triggeredCount: triggered.length,
      triggered,
      allLogs: db.simulation.logs
    }
  });
});

router.post('/simulation/reset', authorize('whatsapp', 'send'), (req, res) => {
  const db = getDb();
  db.simulation = {
    simulatedHour: 0,
    logs: [
      { id: 1, contactId: 3, contactName: 'Kavita Shah', text: 'Simulation clock reset to 0h', hour: 0, time: 'Now' }
    ]
  };
  db.contacts.forEach(c => {
    c.reminderCount = 0;
    c.nextReminderHour = 24;
    c.lastReminderHour = null;
  });
  saveDb();
  res.json({ success: true, message: 'Simulation reset' });
});

export default router;
