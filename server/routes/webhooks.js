/**
 * Webhook Routes — WhatsApp Direct Meta API
 *
 * Outbound: CRM → Meta Cloud API (send WhatsApp messages)
 * Inbound: Meta → CRM (delivery status, incoming messages)
 *
 * Endpoints:
 * POST /api/webhooks/n8n/outbound    — Send message (backward compat)
 * POST /api/webhooks/n8n/inbound     — Receive delivery status
 * POST /api/webhooks/n8n/message     — Receive incoming WhatsApp messages
 * GET  /api/webhooks/n8n/status      — Check WhatsApp API connection status
 * POST /api/webhooks/n8n/trigger/:id — Manually trigger automation for a lead
 * POST /api/webhooks/n8n/pause/:id   — Pause/resume automation for a lead
 */

import express from 'express';
import { getDb, saveDb } from '../data/db.js';
import { sendViaWhatsApp, handleIncomingMessage } from '../data/automation.js';
import { isConfigured as isWhatsAppConfigured } from '../data/whatsapp-api.js';

const router = express.Router();

/**
 * POST /api/webhooks/n8n/outbound
 * Manually trigger an outbound message
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

  const result = await sendViaWhatsApp({
    leadId: lead.id,
    leadName: lead.name,
    phone: lead.phone,
    message,
    lead,
    templateName: templateId || 'hello_world',
  });

  if (result.success) {
    if (!lead.waLog) lead.waLog = [];
    lead.waLog.push({
      id: lead.waLog.length + 1,
      text: message,
      time: new Date().toLocaleString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short'
      }),
      dir: 'out',
      auto: false,
      metaMessageId: result.messageId,
      sentAt: new Date().toISOString()
    });

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
    res.status(502).json({ success: false, message: 'Failed to send', error: result.error });
  }
});

/**
 * POST /api/webhooks/n8n/inbound
 * Receive delivery status updates (called by Meta or manual entry)
 */
router.post('/inbound', (req, res) => {
  const { leadId, status, messageId, error } = req.body;
  if (!leadId) {
    return res.status(400).json({ success: false, message: 'leadId is required' });
  }

  const db = getDb();
  const lead = db.contacts.find(c => Number(c.id) === Number(leadId));
  if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

  if (lead.waLog && lead.waLog.length > 0) {
    const lastMsg = lead.waLog[lead.waLog.length - 1];
    lastMsg.deliveryStatus = status;
    lastMsg.metaMessageId = lastMsg.metaMessageId || messageId;
    if (error) lastMsg.error = error;
  }

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
 * Receive incoming WhatsApp messages (manual or from n8n)
 */
router.post('/message', (req, res) => {
  const { leadId, message, phone, timestamp } = req.body;

  let lead;
  const db = getDb();

  if (leadId) {
    lead = db.contacts.find(c => Number(c.id) === Number(leadId));
  } else if (phone) {
    const cleanPhone = String(phone).replace(/[\s\-+]/g, '');
    lead = db.contacts.find(c => c.phone && String(c.phone).replace(/[\s\-+]/g, '').includes(cleanPhone.slice(-10)));
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
 * Check WhatsApp API connection status
 */
router.get('/status', async (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];
  const activeLeads = contacts.filter(c => !['won', 'lost'].includes(c.stage) && !c.automationPaused);
  const pausedLeads = contacts.filter(c => c.automationPaused);
  const totalSent = contacts.reduce((sum, c) => {
    return sum + (c.automationLog || []).filter(l => l.status === 'sent').length;
  }, 0);

  res.json({
    success: true,
    data: {
      configured: isWhatsAppConfigured(),
      mode: 'direct_meta_api',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || null,
      n8nReachable: false, // No longer using n8n
      activeLeads: activeLeads.length,
      pausedLeads: pausedLeads.length,
      totalMessagesSent: totalSent,
      schedulerRunning: isWhatsAppConfigured()
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

  const { sendViaWhatsApp } = await import('../data/automation.js');
  const result = await sendViaWhatsApp({
    leadId: lead.id,
    leadName: lead.name,
    phone: lead.phone,
    message: nextMsg.text,
    lead,
    templateName: nextMsg.templateId,
  });

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
      metaMessageId: result.messageId,
      sentAt: new Date().toISOString()
    });

    if (!lead.automationLog) lead.automationLog = [];
    lead.automationLog.push({
      templateId: nextMsg.templateId,
      label: nextMsg.label,
      status: 'sent',
      method: result.method,
      timestamp: new Date().toISOString(),
      stage: lead.stage
    });

    saveDb();
  }

  res.json({
    success: result.success,
    message: result.success ? `Sent: ${nextMsg.label}` : `Failed: ${result.error}`,
    templateId: nextMsg.templateId,
    label: nextMsg.label,
    method: result.method
  });
});

/**
 * POST /api/webhooks/n8n/pause/:leadId
 * Pause/resume automation for a lead
 */
router.post('/pause/:leadId', (req, res) => {
  const { pause } = req.body;
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
