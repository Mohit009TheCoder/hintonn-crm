/**
 * WhatsApp Automation Engine
 * 
 * Runs on the CRM server. Checks leads every 60 seconds and triggers
 * n8n webhooks to send WhatsApp messages.
 * 
 * Flow:
 * 1. Lead created/updated → automation engine checks templates
 * 2. If a message is due → POST to n8n webhook with message + lead data
 * 3. n8n sends WhatsApp via Meta Cloud API
 * 4. n8n POSTs back to /api/whatsapp/automation/callback with delivery status
 * 5. CRM stores message in Firebase + updates lead timeline
 */

import { getDb, saveDb } from '../data/db.js';
import { getNextMessage, isAutomationActive } from '../data/messageTemplates.js';

// n8n webhook URL (configurable)
let N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/crm-whatsapp';

/**
 * Set the n8n webhook URL dynamically (from settings)
 */
export function setWebhookUrl(url) {
  if (url) N8N_WEBHOOK_URL = url;
}

/**
 * Send a message via n8n webhook
 * @param {object} payload - { leadId, leadName, phone, message, templateId, projectId, stage }
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendViaN8n(payload) {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'send_whatsapp',
        timestamp: new Date().toISOString(),
        data: payload
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `n8n returned ${response.status}: ${text}` };
    }

    const result = await response.json().catch(() => ({}));
    return { success: true, ...result };
  } catch (err) {
    // n8n not running or unreachable — log but don't crash
    return { success: false, error: err.message };
  }
}

/**
 * Store a WhatsApp message in the lead's waLog and timeline
 */
function storeMessage(lead, messageText, direction = 'out', isAuto = true, templateId = null) {
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
    sentAt: new Date().toISOString()
  };

  lead.waLog.push(msg);

  // Add to timeline
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
function logAutomation(lead, templateId, label, status, error = null) {
  if (!lead.automationLog) lead.automationLog = [];

  lead.automationLog.push({
    templateId,
    label,
    status, // 'sent', 'failed', 'skipped'
    error,
    timestamp: new Date().toISOString(),
    stage: lead.stage
  });
}

/**
 * Calculate hours since a lead entered its current stage
 */
function getHoursInStage(lead) {
  if (!lead.stageEnteredAt) return 999; // Default: treat as old
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
    // Skip inactive automation
    if (!isAutomationActive(lead)) continue;

    // Skip if lead has replied recently (pause automation for human takeover)
    if (lead.automationPaused) continue;

    const project = (projects || []).find(p => p.id === lead.projectId) || (projects || [])[0] || null;
    const hoursInStage = getHoursInStage(lead);
    const remindersSent = (lead.automationLog || []).filter(l => l.status === 'sent').length;

    // Get next message based on stage + timing
    const nextMsg = getNextMessage(lead, project, hoursInStage, remindersSent);
    if (!nextMsg) continue;

    // Send via n8n webhook
    const payload = {
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      message: nextMsg.text,
      templateId: nextMsg.templateId,
      templateLabel: nextMsg.label,
      projectId: lead.projectId || null,
      projectName: project?.name || lead.projectName || lead.project || 'Ashray Properties',
      stage: lead.stage,
      config: lead.config
    };

    const result = await sendViaN8n(payload);

    if (result.success) {
      // Store message in lead's waLog
      storeMessage(lead, nextMsg.text, 'out', true, nextMsg.templateId);
      logAutomation(lead, nextMsg.templateId, nextMsg.label, 'sent');

      triggered.push({
        leadId: lead.id,
        leadName: lead.name,
        stage: lead.stage,
        templateId: nextMsg.templateId,
        label: nextMsg.label
      });
    } else {
      logAutomation(lead, nextMsg.templateId, nextMsg.label, 'failed', result.error);
    }
  }

  if (triggered.length > 0) {
    saveDb();
  }

  return triggered;
}

/**
 * Trigger welcome message for a newly created lead
 * Called immediately when a lead is created
 */
export async function triggerWelcomeMessage(lead) {
  const db = getDb();
  const project = (db.projects || []).find(p => p.id === lead.projectId) || (db.projects || [])[0] || null;

  // Mark stage entry time
  lead.stageEnteredAt = new Date().toISOString();

  const firstMsg = getNextMessage(lead, project, 0, 0);
  if (!firstMsg) return null;

  const payload = {
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
    event: 'lead_created'
  };

  const result = await sendViaN8n(payload);

  if (result.success) {
    storeMessage(lead, firstMsg.text, 'out', true, firstMsg.templateId);
    logAutomation(lead, firstMsg.templateId, firstMsg.label, 'sent');
  } else {
    logAutomation(lead, firstMsg.templateId, firstMsg.label, 'failed', result.error);
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

  // Update stage entry time
  lead.stageEnteredAt = new Date().toISOString();

  // If won or lost — stop automation
  if (['won', 'lost'].includes(newStage)) {
    lead.automationPaused = false; // Allow final message

    // Send final message (thank you or win-back)
    const finalMsg = getNextMessage(lead, project, 0, 0);
    if (finalMsg) {
      const payload = {
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
        event: 'stage_change',
        oldStage,
        newStage
      };

      const result = await sendViaN8n(payload);
      if (result.success) {
        storeMessage(lead, finalMsg.text, 'out', true, finalMsg.templateId);
        logAutomation(lead, finalMsg.templateId, finalMsg.label, 'sent');
      }
    }

    saveDb();
    return;
  }

  // For other stage changes — send stage-entry message
  const stageMsg = getNextMessage(lead, project, 0, 0);
  if (stageMsg) {
    const payload = {
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
      event: 'stage_change',
      oldStage,
      newStage
    };

    const result = await sendViaN8n(payload);
    if (result.success) {
      storeMessage(lead, stageMsg.text, 'out', true, stageMsg.templateId);
      logAutomation(lead, stageMsg.templateId, stageMsg.label, 'sent');
    }
  }

  saveDb();
}

/**
 * Handle incoming message from n8n (delivery callback or inbound message)
 */
export function handleIncomingMessage(leadId, messageText, direction = 'in') {
  const db = getDb();
  const lead = db.contacts.find(c => Number(c.id) === Number(leadId));
  if (!lead) return null;

  // Store the incoming message
  const msg = storeMessage(lead, messageText, direction, false);

  // Mark that lead has replied — pause automation for human takeover
  if (direction === 'in') {
    lead.repliedAt = new Date().toISOString();
    lead.automationPaused = true; // Pause until human responds
  }

  saveDb();
  return msg;
}

/**
 * Handle after-hours lead inquiries.
 * Sends auto-reply and creates priority callback task.
 */
export function handleAfterHoursLead(lead, db) {
  if (!db) db = getDb();

  // IST is UTC+5:30
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hour = istTime.getUTCHours();
  const isAfterHours = hour < 9 || hour >= 20;

  if (!isAfterHours) {
    return { isAfterHours: false, message: null, task: null };
  }

  // Get project name
  const projects = db.projects || [];
  const project = projects.find(p => Number(p.id) === Number(lead.projectId));
  const projectName = project ? project.name : 'our project';

  // Auto-reply message
  const message = `Hi ${lead.name}! Thank you for your interest in ${projectName}. Our team will contact you within 15 minutes during business hours (9 AM – 8 PM). In the meantime, feel free to browse our brochure!`;

  // Set after-hours flag
  lead.afterHoursFlag = true;

  // Add to timeline
  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'auto-reply',
    text: `After-hours auto-reply sent`,
    time: 'Just now',
    icon: 'clock'
  });

  // Create priority callback task for 9 AM next day
  const tomorrow9AM = new Date(istTime);
  tomorrow9AM.setUTCHours(3, 30, 0, 0); // 9 AM IST = 3:30 UTC
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
 * Runs every 60 seconds and checks all eligible leads
 */
export function startAutomationScheduler() {
  console.log('⏰ WhatsApp Automation Scheduler started (every 60s)');

  setInterval(async () => {
    try {
      const triggered = await processAutomation();
      if (triggered.length > 0) {
        console.log(`📱 Automation sent ${triggered.length} message(s):`);
        triggered.forEach(t => {
          console.log(`   → ${t.leadName} (${t.stage}): ${t.label}`);
        });
      }
    } catch (err) {
      console.error('Automation scheduler error:', err.message);
    }
  }, 60000); // Every 60 seconds
}
