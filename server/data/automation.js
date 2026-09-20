/**
 * WhatsApp Automation Engine
 *
 * Runs on the CRM server. Checks leads every 60 seconds and sends
 * WhatsApp messages directly via the Meta Cloud API.
 *
 * Flow:
 * 1. Lead created/updated → automation engine checks templates
 * 2. If a message is due → send via Meta WhatsApp Cloud API
 * 3. Message delivery status tracked in lead's automationLog
 * 4. Inbound messages auto-pause automation for human takeover
 */

import { getDb, saveDb } from '../data/db.js';
import { getNextMessage, isAutomationActive } from '../data/messageTemplates.js';
import {
  isConfigured,
  sendMessage,
  sendTextMessage,
  sendTemplateMessage,
  handleWebhookVerification,
  parseInboundWebhook,
  normalizePhone,
} from '../data/whatsapp-api.js';

/**
 * Send a message via WhatsApp (direct Meta API)
 */
export async function sendViaWhatsApp(payload) {
  const { phone, message, lead, templateName } = payload;

  if (!isConfigured()) {
    return { success: false, error: 'WhatsApp API not configured — add WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN to .env' };
  }

  const result = await sendMessage(
    phone,
    message,
    lead || null,
    templateName || 'hello_world'
  );

  return result;
}

/**
 * Store a WhatsApp message in the lead's waLog and timeline
 */
function storeMessage(lead, messageText, direction = 'out', isAuto = true, templateId = null, messageId = null) {
  if (!lead.waLog) lead.waLog = [];

  const msg = {
    id: lead.waLog.length + 1,
    text: messageText,
    time: new Date().toLocaleString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short'
    }),
    dir: direction,
    auto: isAuto,
    templateId: templateId,
    metaMessageId: messageId,
    sentAt: new Date().toISOString()
  };

  lead.waLog.push(msg);

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'whatsapp',
    text: `WhatsApp (${isAuto ? 'Auto' : 'Manual'}): "${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}"`,
    time: 'Just now',
    icon: 'messagecircle'
  });

  return msg;
}

/**
 * Log an automation event
 */
function logAutomation(lead, templateId, label, status, error = null, method = null) {
  if (!lead.automationLog) lead.automationLog = [];

  lead.automationLog.push({
    templateId,
    label,
    status,
    error,
    method,
    timestamp: new Date().toISOString(),
    stage: lead.stage
  });
}

/**
 * Calculate hours since a lead entered its current stage
 */
function getHoursInStage(lead) {
  if (!lead.stageEnteredAt) return 999;
  const entered = new Date(lead.stageEnteredAt);
  const now = new Date();
  return (now - entered) / (1000 * 60 * 60);
}

/**
 * MAIN: Process all eligible leads and send automation messages
 * Called by the scheduler every 60 seconds
 */
export async function processAutomation() {
  const db = getDb();
  const contacts = db.contacts || [];
  const projects = db.projects || [];
  const triggered = [];

  for (const lead of contacts) {
    if (!isAutomationActive(lead)) continue;
    if (lead.automationPaused) continue;

    const project = (projects || []).find(p => p.id === lead.projectId) || (projects || [])[0] || null;
    const hoursInStage = getHoursInStage(lead);
    const remindersSent = (lead.automationLog || []).filter(l => l.status === 'sent').length;

    const nextMsg = getNextMessage(lead, project, hoursInStage, remindersSent);
    if (!nextMsg) continue;

    const result = await sendViaWhatsApp({
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      message: nextMsg.text,
      templateId: nextMsg.templateId,
      templateLabel: nextMsg.label,
      projectId: lead.projectId || null,
      projectName: project?.name || lead.projectName || lead.project || 'Ashray Properties',
      stage: lead.stage,
      config: lead.config,
      lead,
      templateName: nextMsg.templateId,
    });

    if (result.success) {
      storeMessage(lead, nextMsg.text, 'out', true, nextMsg.templateId, result.messageId);
      logAutomation(lead, nextMsg.templateId, nextMsg.label, 'sent', null, result.method);

      triggered.push({
        leadId: lead.id,
        leadName: lead.name,
        stage: lead.stage,
        templateId: nextMsg.templateId,
        label: nextMsg.label,
        method: result.method,
      });
    } else {
      logAutomation(lead, nextMsg.templateId, nextMsg.label, 'failed', result.error, result.method);
    }
  }

  if (triggered.length > 0) {
    saveDb();
  }

  return triggered;
}

/**
 * Trigger welcome message for a newly created lead
 */
export async function triggerWelcomeMessage(lead) {
  const db = getDb();
  const project = (db.projects || []).find(p => p.id === lead.projectId) || (db.projects || [])[0] || null;

  lead.stageEnteredAt = new Date().toISOString();

  const firstMsg = getNextMessage(lead, project, 0, 0);
  if (!firstMsg) return null;

  // Try routing via n8n webhook first
  try {
    const n8nRes = await fetch('https://n8n.srv1173804.hstgr.cloud/webhook/lead-ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: lead.phone,
        name: lead.name,
        event: 'lead_created',
        project: project?.name,
        config: lead.config
      })
    });
    
    const n8nData = await n8nRes.json();
    const msgId = n8nData?.messages?.[0]?.id;
    
    if (msgId) {
      storeMessage(lead, firstMsg.text, 'out', true, firstMsg.templateId, msgId);
      logAutomation(lead, firstMsg.templateId, firstMsg.label, 'sent', null, 'n8n_webhook');
      saveDb();
      return { success: true, messageId: msgId };
    }
  } catch (err) {
    console.error('N8N webhook routing failed:', err.message);
  }

  // Fallback to direct Meta API
  const result = await sendViaWhatsApp({
    leadId: lead.id,
    leadName: lead.name,
    phone: lead.phone,
    message: firstMsg.text,
    templateId: firstMsg.templateId,
    templateLabel: firstMsg.label,
    projectId: lead.projectId || null,
    projectName: project?.name || lead.projectName || lead.project || 'Ashray Properties',
    stage: lead.stage,
    config: lead.config,
    lead,
    event: 'lead_created',
    templateName: firstMsg.templateId,
  });

  if (result.success) {
    storeMessage(lead, firstMsg.text, 'out', true, firstMsg.templateId, result.messageId);
    logAutomation(lead, firstMsg.templateId, firstMsg.label, 'sent', null, result.method);
  } else {
    logAutomation(lead, firstMsg.templateId, firstMsg.label, 'failed', result.error, result.method);
  }

  saveDb();
  return result;
}

/**
 * Handle stage change — reset automation timer and send stage-entry message
 */
export async function triggerStageChange(lead, oldStage, newStage) {
  const db = getDb();
  const project = (db.projects || []).find(p => p.id === lead.projectId) || (db.projects || [])[0] || null;

  lead.stageEnteredAt = new Date().toISOString();

  if (['won', 'lost'].includes(newStage)) {
    lead.automationPaused = false;

    const finalMsg = getNextMessage(lead, project, 0, 0);
    if (finalMsg) {
      const result = await sendViaWhatsApp({
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        message: finalMsg.text,
        templateId: finalMsg.templateId,
        templateLabel: finalMsg.label,
        projectId: lead.projectId || null,
        projectName: project?.name || lead.projectName || lead.project || 'Ashray Properties',
        stage: newStage,
        config: lead.config,
        lead,
        event: 'stage_change',
        templateName: finalMsg.templateId,
      });
      if (result.success) {
        storeMessage(lead, finalMsg.text, 'out', true, finalMsg.templateId, result.messageId);
        logAutomation(lead, finalMsg.templateId, finalMsg.label, 'sent', null, result.method);
      }
    }

    saveDb();
    return;
  }

  const stageMsg = getNextMessage(lead, project, 0, 0);
  if (stageMsg) {
    const result = await sendViaWhatsApp({
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      message: stageMsg.text,
      templateId: stageMsg.templateId,
      templateLabel: stageMsg.label,
      projectId: lead.projectId || null,
      projectName: project?.name || lead.projectName || lead.project || 'Ashray Properties',
      stage: newStage,
      config: lead.config,
      lead,
      event: 'stage_change',
      templateName: stageMsg.templateId,
    });
    if (result.success) {
      storeMessage(lead, stageMsg.text, 'out', true, stageMsg.templateId, result.messageId);
      logAutomation(lead, stageMsg.templateId, stageMsg.label, 'sent', null, result.method);
    }
  }

  saveDb();
}

/**
 * Handle incoming message from Meta webhook
 */
export function handleIncomingMessage(leadId, messageText, direction = 'in', metaMessageId = null) {
  const db = getDb();
  const lead = db.contacts.find(c => Number(c.id) === Number(leadId));
  if (!lead) return null;

  const msg = storeMessage(lead, messageText, direction, false, null, metaMessageId);

  if (direction === 'in') {
    lead.repliedAt = new Date().toISOString();
    lead.lastInboundAt = new Date().toISOString();
    lead.automationPaused = true;
  }

  saveDb();
  return msg;
}

/**
 * Process inbound messages from the Meta webhook
 */
export function processInboundWebhook(body) {
  const messages = parseInboundWebhook(body);
  const db = getDb();
  const results = [];

  for (const inbound of messages) {
    if (inbound.type === 'status') continue;
    if (!inbound.text) continue;

    const cleanPhone = normalizePhone(inbound.phone);
    const lead = db.contacts.find(c => {
      const leadPhone = normalizePhone(c.phone);
      return leadPhone && cleanPhone && leadPhone === cleanPhone;
    });

    if (!lead) {
      console.log(`📩 Inbound WhatsApp from unknown number: ${inbound.phone}`);
      continue;
    }

    const msg = handleIncomingMessage(lead.id, inbound.text, 'in', inbound.messageId);
    if (msg) {
      results.push({
        leadId: lead.id,
        leadName: lead.name,
        message: inbound.text,
        senderName: inbound.name,
      });
      console.log(`📩 Inbound from ${lead.name}: "${inbound.text.substring(0, 50)}"`);
    }
  }

  if (results.length > 0) {
    saveDb();
  }

  return results;
}

/**
 * Handle after-hours lead inquiries
 */
export function handleAfterHoursLead(lead, db) {
  if (!db) db = getDb();

  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hour = istTime.getUTCHours();
  const isAfterHours = hour < 9 || hour >= 20;

  if (!isAfterHours) {
    return { isAfterHours: false, message: null, task: null };
  }

  const projects = db.projects || [];
  const project = projects.find(p => Number(p.id) === Number(lead.projectId));
  const projectName = project ? project.name : 'our project';

  const message = `Hi ${lead.name}! Thank you for your interest in ${projectName}. Our team will contact you within 15 minutes during business hours (9 AM – 8 PM). In the meantime, feel free to browse our brochure!`;

  lead.afterHoursFlag = true;

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'auto-reply',
    text: `After-hours auto-reply sent`,
    time: 'Just now',
    icon: 'clock'
  });

  const tomorrow9AM = new Date(istTime);
  tomorrow9AM.setUTCHours(3, 30, 0, 0);
  if (hour >= 20) {
    tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dueStr = `${months[tomorrow9AM.getMonth()]} ${tomorrow9AM.getDate()}, 9:00 AM`;

  const task = {
    contactId: Number(lead.id),
    title: `Priority callback for ${lead.name} — after-hours inquiry`,
    type: 'follow-up',
    priority: 'high',
    due: dueStr,
    status: 'pending',
    assignee: lead.rep || null,
    description: `After-hours lead from ${lead.source || 'unknown source'}. Auto-reply sent. Schedule callback for 9 AM.`
  };

  if (!db.tasks) db.tasks = [];
  const nextId = db.tasks.length > 0 ? Math.max(...db.tasks.map(t => Number(t.id) || 0)) + 1 : 1;
  db.tasks.unshift({ id: nextId, ...task, createdAt: new Date().toISOString() });

  return { isAfterHours: true, message, task };
}

/**
 * Start the automation scheduler
 */
export function startAutomationScheduler() {
  if (!isConfigured()) {
    console.log('⚠️  WhatsApp API not configured — automation scheduler NOT started');
    console.log('   Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in server/.env');
    return;
  }

  console.log('⏰ WhatsApp Automation Scheduler started (every 60s) — Meta Cloud API direct');

  setInterval(async () => {
    try {
      const triggered = await processAutomation();
      if (triggered.length > 0) {
        console.log(`📱 Automation sent ${triggered.length} message(s):`);
        triggered.forEach(t => {
          console.log(`   → ${t.leadName} (${t.stage}): ${t.label} [${t.method}]`);
        });
      }
    } catch (err) {
      console.error('Automation scheduler error:', err.message);
    }
  }, 60000);
}

// Re-export webhook helpers for route usage
export { handleWebhookVerification, parseInboundWebhook, isConfigured as isWhatsAppConfigured };
