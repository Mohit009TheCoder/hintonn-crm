/**
 * Site Visit Auto-Reply Engine
 *
 * Handles the conversation flow when a client replies to a site visit reminder:
 *   Step 1: Client says "yes" → system replies with available time slots
 *   Step 2: Client picks a time → system validates (10am-7pm) → confirms or rejects
 *
 * Tracks per-lead conversation state so multi-step flows work correctly.
 */

import { getDb, saveDb } from './db.js';
import { sendTextMessage } from './whatsapp-api.js';

// ── Business hours config ────────────────────────────────────────────────────
const BUSINESS_START_HOUR = 10; // 10:00 AM IST
const BUSINESS_END_HOUR = 19;   // 7:00 PM IST (19:00 = 7 PM)

// Predefined time slots offered to clients
const TIME_SLOTS = [
  '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM',
  '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'
];

// ── Conversation State Tracking ──────────────────────────────────────────────
// Stored on lead object as lead.siteVisitConversation = { step, pendingVisitDate, ... }

/**
 * Get the current conversation state for a lead.
 */
export function getConversationState(lead) {
  return lead.siteVisitConversation || null;
}

/**
 * Set conversation state on a lead.
 */
function setConversationState(lead, state) {
  lead.siteVisitConversation = state;
}

/**
 * Clear conversation state (flow completed or timed out).
 */
function clearConversationState(lead) {
  lead.siteVisitConversation = null;
}

// ── Intent Detection ─────────────────────────────────────────────────────────

/**
 * Check if the client's message is a positive response (YES, Sure, Ok, etc.)
 * to a site visit reminder.
 */
export function isPositiveResponse(text) {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  const positivePatterns = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'okayy',
    'done', 'confirm', 'confirm', 'book', 'booked', 'schedule',
    'arrange', 'arrange', 'interested', 'haan', 'han', 'ji',
    'bilkul', 'acha', 'theek hai', 'thik hai', 'send', 'do it',
    'please', 'pls', 'plz', 'yes please', 'yes sure', 'yes ok',
    'yes confirm', 'yes book', 'yes schedule', 'yes arrange',
    'i am interested', 'i want', 'i would like', 'i\'d like',
    'let\'s do', 'lets do', 'go ahead', 'proceed', 'yes proceed'
  ];
  return positivePatterns.some(p => cleaned === p || cleaned.startsWith(p));
}

/**
 * Check if the client's message is a negative response (NO, not interested, etc.)
 * to a site visit reminder. When negative, reminders should continue normally.
 */
export function isNegativeResponse(text) {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  const negativePatterns = [
    'no', 'nope', 'nah', 'nahi', 'nahi chahiye', 'not interested',
    'not now', 'later', 'maybe later', 'some other time', 'busy',
    'cant', 'can\'t', 'cannot', 'not possible', 'not free',
    'next week', 'next time', 'will think', 'let me think',
    'will check', 'let me check', 'will discuss', 'let me discuss',
    'will talk', 'let me talk', 'will call', 'let me call',
    'baad mein', 'phir kabhi', 'abhi nahi', 'nahi abhi',
    'not today', 'some other day', 'different time'
  ];
  return negativePatterns.some(p => cleaned === p || cleaned.startsWith(p));
}

/**
 * Check if the client's message is a time slot selection.
 * Parses messages like "10am", "2 PM", "10:00 am", "2pm today", etc.
 */
export function parseTimeSelection(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  // Check slot NUMBER references first (ONLY pure numbers like "1", "2", "3")
  // Must be ONLY digits (no letters) to be a slot number
  const pureNumber = cleaned.match(/^(\d{1,2})$/);
  if (pureNumber) {
    const slotNumber = parseInt(pureNumber[1], 10);
    if (slotNumber >= 1 && slotNumber <= TIME_SLOTS.length) {
      const timeStr = TIME_SLOTS[slotNumber - 1];
      const hour24 = parseTimeToHour24(timeStr);
      return { time: timeStr, hour24 };
    }
  }

  // Now check time patterns with AM/PM
  const timePatterns = [
    /(\d{1,2})\s*:\s*00\s*(am|pm)/i,   // "10:00 am", "2:00 PM"
    /(\d{1,2})\s*(am|pm)/i,              // "10am", "2 PM", "10 am"
    /(\d{1,2})\s*baje/i,                 // Hindi: "4 baje"
    /(\d{1,2})\s*o'?clock/i,             // "4 o'clock"
  ];

  for (const pattern of timePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let hour = parseInt(match[1], 10);
      const period = match[2]?.toLowerCase();

      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;

      // Format as display string
      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const displayPeriod = hour >= 12 ? 'PM' : 'AM';
      const displayTime = `${displayHour}:00 ${displayPeriod}`;

      return { time: displayTime, hour24: hour };
    }
  }

  return null;
}

function parseTimeToHour24(timeStr) {
  const match = timeStr.match(/(\d{1,2}):00\s*(AM|PM)/i);
  if (!match) return 12;
  let hour = parseInt(match[1], 10);
  if (match[2].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (match[2].toUpperCase() === 'AM' && hour === 12) hour = 0;
  return hour;
}

/**
 * Check if a given hour is within business hours (10am-7pm).
 */
function isWithinBusinessHours(hour24) {
  return hour24 >= BUSINESS_START_HOUR && hour24 <= BUSINESS_END_HOUR;
}

// ── Message Builders ─────────────────────────────────────────────────────────

/**
 * Build the time slot selection message.
 */
function buildTimeSlotMessage(lead, project) {
  const first = lead.name.split(' ')[0];
  const projectName = project?.name || lead.projectName || lead.project || 'Ashray Group Properties';

  const slotList = TIME_SLOTS.map((slot, i) => `  ${i + 1}. ${slot}`).join('\n');

  return [
    `Great, ${first}! 🎉`,
    ``,
    `We'd love to schedule your site visit for *${projectName}*.`,
    ``,
    `📅 Available time slots (10 AM – 7 PM):`,
    slotList,
    ``,
    `Reply with the *time* (e.g., "10am", "2 PM") or *slot number* (e.g., "3").`,
    ``,
    `⏰ Our visit hours: 10:00 AM to 7:00 PM only.`
  ].join('\n');
}

/**
 * Build the time confirmation message.
 */
function buildTimeConfirmedMessage(lead, project, time) {
  const first = lead.name.split(' ')[0];
  const projectName = project?.name || lead.projectName || lead.project || 'Ashray Group Properties';

  return [
    `✅ *Site Visit Confirmed!*`,
    ``,
    `${first}, your visit to *${projectName}* is booked for *tomorrow at ${time}*.`,
    ``,
    `📋 What to expect:`,
    `• Property walkthrough with our expert`,
    `• Amenities tour`,
    `• Pricing & payment plan discussion`,
    ``,
    `Our team will send you the exact address and contact details shortly.`,
    `See you tomorrow! 🏠`
  ].join('\n');
}

/**
 * Build the time rejection message (outside business hours).
 */
function buildTimeRejectionMessage(lead) {
  const first = lead.name.split(' ')[0];

  return [
    `Sorry ${first}, but site visits are only available between *10:00 AM and 7:00 PM*. ⏰`,
    ``,
    `Please pick a time from these slots:`,
    ...TIME_SLOTS.map((slot, i) => `  ${i + 1}. ${slot}`),
    ``,
    `Reply with a valid time or slot number.`
  ].join('\n');
}

/**
 * Build an unclear response message when we can't parse the time.
 */
function buildUnclearResponseMessage(lead) {
  const first = lead.name.split(' ')[0];

  return [
    `Sorry ${first}, I didn't understand the time. 🤔`,
    ``,
    `Please reply with a time like:`,
    `• "10am" or "2 PM"`,
    `• Or a slot number (1-10)`,
    ``,
    `Available slots: 10 AM, 11 AM, 12 PM, 1 PM, 2 PM, 3 PM, 4 PM, 5 PM, 6 PM, 7 PM`
  ].join('\n');
}

// ── Main Handler ─────────────────────────────────────────────────────────────

/**
 * Process an inbound message and handle site visit conversation flow.
 *
 * Call this from the webhook handler for EVERY inbound message.
 * Returns { handled: boolean, reply?: string, action?: string }
 *
 * If handled=true, the caller should NOT process this message further
 * (it's part of the site visit flow).
 */
export function handleSiteVisitReply(lead, messageText) {
  const db = getDb();
  const projects = db.projects || [];
  const project = projects.find(p => Number(p.id) === Number(lead.projectId)) || projects[0];

  const state = getConversationState(lead);

  // ── No active conversation: check if this is a "yes" or "no" to a site visit prompt ──
  if (!state || state.step === 'idle') {
    // Check for NEGATIVE response first — let reminders continue
    if (isNegativeResponse(messageText)) {
      console.log(`👎 Client ${lead.name} said NO to site visit — reminders continue`);
      // Log the negative response in timeline
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({
        type: 'whatsapp',
        text: `Client declined site visit: "${messageText}"`,
        time: 'Just now',
        icon: 'messagecircle'
      });
      saveDb();
      return { handled: false, action: 'declined' };
    }

    // Check for POSITIVE response — start time selection flow
    if (isPositiveResponse(messageText)) {
      // Check if lead has a pending site visit reminder or is in a stage that
      // offers site visits (new, contacted, qualified)
      const shouldOffer = ['new', 'contacted', 'qualified'].includes(lead.stage)
        || (lead.tags || []).some(t => ['site-visit-scheduled', 'follow-up'].includes(t));

      if (shouldOffer) {
        // ── CHECK FOR COMBINED RESPONSE (e.g., "yes tomorrow 4pm") ──
        // If the message also contains a time, try to confirm directly
        const timeSelection = parseTimeSelection(messageText);
        
        if (timeSelection) {
          // Time found in the same message!
          if (isWithinBusinessHours(timeSelection.hour24)) {
            // ✅ Valid time — confirm directly (skip time slot step)
            const reply = buildTimeConfirmedMessage(lead, project, timeSelection.time);
            
            // Create site visit record
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            while (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const scheduledDate = `${months[tomorrow.getMonth()]} ${tomorrow.getDate()}, ${timeSelection.time}`;
            
            if (!db.siteVisits) db.siteVisits = [];
            const nextId = db.siteVisits.length > 0
              ? Math.max(...db.siteVisits.map(v => Number(v.id) || 0)) + 1
              : 1;
            const newVisit = {
              id: nextId,
              contactId: Number(lead.id),
              projectId: lead.projectId || 1,
              scheduledDate,
              status: 'scheduled',
              outcome: null,
              feedback: '',
              attendedBy: lead.rep || 'Team',
              duration: '45 min',
              nextAction: 'Site tour & sample flat walkthrough',
              confirmedVia: 'whatsapp_auto_reply',
              confirmedAt: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            db.siteVisits.unshift(newVisit);
            
            // Update lead
            lead.siteVisit = scheduledDate;
            if (!lead.tags) lead.tags = [];
            if (!lead.tags.includes('site-visit-scheduled')) lead.tags.push('site-visit-scheduled');
            
            // Auto-advance stage
            if (lead.stage === 'new' || lead.stage === 'contacted') {
              lead.stage = 'qualified';
              lead.dealProb = Math.max(lead.dealProb || 0, 65);
              if (!lead.timeline) lead.timeline = [];
              lead.timeline.unshift({
                type: 'stage-change',
                text: `Stage auto-advanced to QUALIFIED (site visit confirmed: ${scheduledDate})`,
                time: 'Just now',
                icon: 'target'
              });
            }
            
            saveDb();
            return { handled: true, reply, action: 'visit_confirmed', scheduledDate };
          } else {
            // Time is outside business hours — reject
            const reply = buildTimeRejectionMessage(lead);
            // Set state to awaiting_time so they can pick another time
            setConversationState(lead, {
              step: 'awaiting_time',
              startedAt: new Date().toISOString(),
              triggerMessage: messageText
            });
            saveDb();
            return { handled: true, reply, action: 'time_rejected' };
          }
        }
        
        // No time in message — show time slots as before
        setConversationState(lead, {
          step: 'awaiting_time',
          startedAt: new Date().toISOString(),
          triggerMessage: messageText
        });
        saveDb();

        const reply = buildTimeSlotMessage(lead, project);
        return { handled: true, reply, action: 'time_slots_sent' };
      }
    }
    return { handled: false };
  }

  // ── Active conversation: awaiting time selection ──────────────────────────
  if (state.step === 'awaiting_time') {
    const timeSelection = parseTimeSelection(messageText);

    if (!timeSelection) {
      // Can't parse the time — send help message but stay in same state
      const reply = buildUnclearResponseMessage(lead);
      return { handled: true, reply, action: 'unclear_time' };
    }

    // Validate business hours
    if (!isWithinBusinessHours(timeSelection.hour24)) {
      const reply = buildTimeRejectionMessage(lead);
      return { handled: true, reply, action: 'time_rejected' };
    }

    // ✅ Time is valid — confirm the visit
    const reply = buildTimeConfirmedMessage(lead, project, timeSelection.time);

    // Create site visit record
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Skip Sundays
    while (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const scheduledDate = `${months[tomorrow.getMonth()]} ${tomorrow.getDate()}, ${timeSelection.time}`;

    if (!db.siteVisits) db.siteVisits = [];
    const nextId = db.siteVisits.length > 0
      ? Math.max(...db.siteVisits.map(v => Number(v.id) || 0)) + 1
      : 1;
    const newVisit = {
      id: nextId,
      contactId: Number(lead.id),
      projectId: lead.projectId || 1,
      scheduledDate,
      status: 'scheduled',
      outcome: null,
      feedback: '',
      attendedBy: lead.rep || 'Team',
      duration: '45 min',
      nextAction: 'Site tour & sample flat walkthrough',
      confirmedVia: 'whatsapp_auto_reply',
      confirmedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    db.siteVisits.unshift(newVisit);

    // Update lead
    lead.siteVisit = scheduledDate;
    if (!lead.tags) lead.tags = [];
    if (!lead.tags.includes('site-visit-scheduled')) lead.tags.push('site-visit-scheduled');

    // Auto-advance stage if appropriate
    if (lead.stage === 'new' || lead.stage === 'contacted') {
      lead.stage = 'qualified';
      lead.dealProb = Math.max(lead.dealProb || 0, 65);
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({
        type: 'stage-change',
        text: `Stage auto-advanced to QUALIFIED (site visit confirmed: ${scheduledDate})`,
        time: 'Just now',
        icon: 'target'
      });
    }

    // Clear conversation state — flow complete
    clearConversationState(lead);

    saveDb();
    return { handled: true, reply, action: 'visit_confirmed', scheduledDate };
  }

  return { handled: false };
}

/**
 * Send a WhatsApp reply message and log it to the lead.
 * This is a convenience wrapper used by the webhook handler.
 */
export async function sendAutoReply(lead, replyText) {
  const result = await sendTextMessage(lead.phone, replyText);

  if (result.success) {
    // Log the auto-reply in waLog
    if (!lead.waLog) lead.waLog = [];
    lead.waLog.push({
      id: lead.waLog.length + 1,
      text: replyText,
      time: new Date().toLocaleString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
        day: 'numeric', month: 'short'
      }),
      dir: 'out',
      auto: true,
      templateId: 'site_visit_auto_reply',
      metaMessageId: result.messageId,
      sentAt: new Date().toISOString()
    });

    // Log in timeline
    if (!lead.timeline) lead.timeline = [];
    lead.timeline.unshift({
      type: 'whatsapp',
      text: `Auto-reply: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`,
      time: 'Just now',
      icon: 'messagecircle'
    });

    // Update lastInboundAt to keep the 24h window open
    lead.lastInboundAt = new Date().toISOString();

    saveDb();
  }

  return result;
}
