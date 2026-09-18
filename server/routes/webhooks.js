/**
 * Webhook Routes for n8n Integration
 * 
 * Outbound: CRM → n8n (send WhatsApp messages)
 * Inbound: n8n → CRM (delivery status, incoming messages)
 * 
 * Endpoints:
 * POST /api/webhooks/n8n/outbound    — Send message via n8n
 * POST /api/webhooks/n8n/inbound     — Receive delivery status from n8n
 * POST /api/webhooks/n8n/message     — Receive incoming WhatsApp messages
 * GET  /api/webhooks/n8n/status      — Check n8n connection status
 */

import express from 'express';
import { getDb, saveDb } from '../data/db.js';
import { sendViaN8n, handleIncomingMessage } from '../data/automation.js';

const router = express.Router();

/**
 * POST /api/webhooks/n8n/outbound
 * Manually trigger an outbound message via n8n
 * Body: { contactId, message, templateId? }
 */
router.post('/outbound', async (req, res) => {
  const { contactId, message, templateId } = req.body;
  if (!contactId || !message) {
    return res.status(400).json({ success: false, message: 'contactId and message are required' });
  }

  const db = getDb();
  const lead = db.contacts.find(c => Number(c.id) === Number(contactId));
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  const project = db.projects.find(p => p.id === lead.projectId) || db.projects[0];

  const payload = {
    leadId: lead.id,
    leadName: lead.name,
    phone: lead.phone,
    message,
    templateId: templateId || 'manual',
    templateLabel: 'Manual Send',
    projectId: lead.projectId,
    projectName: project.name,
    stage: lead.stage,
    config: lead.config,
    event: 'manual_send'
  };

  const result = await sendViaN8n(payload);

  if (result.success) {
    // Store in waLog
    if (!lead.waLog) lead.waLog = [];
    lead.waLog.push({
      id: lead.waLog.length + 1,
      text: message,
      time: new Date().toLocaleString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short'
      }),
      dir: 'out',
      auto: false,
      sentAt: new Date().toISOString()
    });

    // Timeline entry
    if (!lead.timeline) lead.timeline = [];
    lead.timeline.unshift({
      type: 'whatsapp',
      text: `WhatsApp (Manual): "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
      time: 'Just now',
      icon: 'messagecircle'
    });

    saveDb();
    res.json({ success: true, data: lead.waLog[lead.waLog.length - 1] });
  } else {
    res.status(502).json({ success: false, message: 'Failed to send via n8n', error: result.error });
  }
});

/**
 * POST /api/webhooks/n8n/inbound
 * n8n calls this endpoint with delivery status updates
 * Body: { leadId, status, messageId, error? }
 */
router.post('/inbound', (req, res) => {
  const { leadId, status, messageId, error } = req.body;
  if (!leadId) {
    return res.status(400).json({ success: false, message: 'leadId is required' });
  }

  const db = getDb();
  const lead = db.contacts.find(c => Number(c.id) === Number(leadId));
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  // Update delivery status in waLog
  if (lead.waLog && lead.waLog.length > 0) {
    const lastMsg = lead.waLog[lead.waLog.length - 1];
    lastMsg.deliveryStatus = status; // 'delivered', 'read', 'failed'
    lastMsg.messageId = messageId;
    if (error) lastMsg.error = error;
  }

  // Log in automation log
  if (!lead.automationLog) lead.automationLog = [];
  lead.automationLog.push({
    templateId: 'delivery_status',
    label: `Delivery: ${status}`,
    status: status === 'failed' ? 'failed' : 'sent',
    error: error || null,
    timestamp: new Date().toISOString(),
    stage: lead.stage
  });

  saveDb();
  res.json({ success: true, message: 'Status updated' });
});

/**
 * POST /api/webhooks/n8n/message
 * n8n calls this when a WhatsApp message is received from a lead
 * Body: { leadId, message, timestamp? }
 */
router.post('/message', (req, res) => {
  const { leadId, message, phone, timestamp } = req.body;

  // If no leadId, try to find by phone
  let lead;
  const db = getDb();

  if (leadId) {
    lead = db.contacts.find(c => Number(c.id) === Number(leadId));
  } else if (phone) {
    const cleanPhone = phone.replace(/[\s-+]/g, '');
    lead = db.contacts.find(c => c.phone && c.phone.replace(/[\s-+]/g, '').includes(cleanPhone.slice(-10)));
  }

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  if (!message) {
    return res.status(400).json({ success: false, message: 'message is required' });
  }

  const msg = handleIncomingMessage(lead.id, message, 'in');

  res.json({
    success: true,
    data: msg,
    leadId: lead.id,
    leadName: lead.name,
    automationPaused: lead.automationPaused
  });
});

/**
 * GET /api/webhooks/n8n/status
 * Check if n8n webhook is reachable
 */
router.get('/status', async (req, res) => {
  const db = getDb();
  const settings = db.settings || {};
  const webhookUrl = settings.automation?.n8nWebhookUrl || process.env.N8N_WEBHOOK_URL;

  let n8nReachable = false;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'ping' }),
      signal: AbortSignal.timeout(3000)
    });
    n8nReachable = response.ok;
  } catch {
    n8nReachable = false;
  }

  // Count active automations
  const contacts = db.contacts || [];
  const activeLeads = contacts.filter(c => !['won', 'lost'].includes(c.stage) && !c.automationPaused);
  const pausedLeads = contacts.filter(c => c.automationPaused);
  const totalSent = contacts.reduce((sum, c) => {
    return sum + (c.automationLog || []).filter(l => l.status === 'sent').length;
  }, 0);

  res.json({
    success: true,
    data: {
      webhookUrl,
      n8nReachable,
      activeLeads: activeLeads.length,
      pausedLeads: pausedLeads.length,
      totalMessagesSent: totalSent,
      schedulerRunning: true
    }
  });
});

/**
 * POST /api/webhooks/n8n/trigger/:leadId
 * Manually trigger automation for a specific lead
 */
router.post('/trigger/:leadId', async (req, res) => {
  const db = getDb();
  const lead = db.contacts.find(c => Number(c.id) === Number(req.params.leadId));
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  if (['won', 'lost'].includes(lead.stage)) {
    return res.json({ success: false, message: 'Automation stopped for this stage' });
  }

  const project = db.projects.find(p => p.id === lead.projectId) || db.projects[0];
  const { getNextMessage } = await import('../data/messageTemplates.js');

  const hoursInStage = lead.stageEnteredAt
    ? (Date.now() - new Date(lead.stageEnteredAt).getTime()) / (1000 * 60 * 60)
    : 999;
  const remindersSent = (lead.automationLog || []).filter(l => l.status === 'sent').length;

  const nextMsg = getNextMessage(lead, project, hoursInStage, remindersSent);
  if (!nextMsg) {
    return res.json({ success: false, message: 'No message due for this lead' });
  }

  const { sendViaN8n } = await import('../data/automation.js');
  const payload = {
    leadId: lead.id,
    leadName: lead.name,
    phone: lead.phone,
    message: nextMsg.text,
    templateId: nextMsg.templateId,
    templateLabel: nextMsg.label,
    projectId: lead.projectId,
    projectName: project.name,
    stage: lead.stage,
    config: lead.config,
    event: 'manual_trigger'
  };

  const result = await sendViaN8n(payload);

  if (result.success) {
    if (!lead.waLog) lead.waLog = [];
    lead.waLog.push({
      id: lead.waLog.length + 1,
      text: nextMsg.text,
      time: new Date().toLocaleString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short'
      }),
      dir: 'out',
      auto: true,
      templateId: nextMsg.templateId,
      sentAt: new Date().toISOString()
    });

    if (!lead.automationLog) lead.automationLog = [];
    lead.automationLog.push({
      templateId: nextMsg.templateId,
      label: nextMsg.label,
      status: 'sent',
      timestamp: new Date().toISOString(),
      stage: lead.stage
    });

    saveDb();
  }

  res.json({
    success: result.success,
    message: result.success ? `Sent: ${nextMsg.label}` : `Failed: ${result.error}`,
    templateId: nextMsg.templateId,
    label: nextMsg.label
  });
});

/**
 * POST /api/webhooks/n8n/pause/:leadId
 * Pause/resume automation for a lead
 */
router.post('/pause/:leadId', (req, res) => {
  const { pause } = req.body; // true = pause, false = resume
  const db = getDb();
  const lead = db.contacts.find(c => Number(c.id) === Number(req.params.leadId));
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  lead.automationPaused = pause !== false;
  saveDb();

  res.json({
    success: true,
    message: lead.automationPaused ? 'Automation paused' : 'Automation resumed',
    automationPaused: lead.automationPaused
  });
});

export default router;
