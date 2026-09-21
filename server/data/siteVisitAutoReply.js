/**
 * Site Visit Auto-Reply Engine — Full Feature Version
 *
 * Handles:
 *  1. "yes" → time slots → confirm
 *  2. "yes, tomorrow 4pm" → direct confirm
 *  3. "yes, tomorrow 10pm" → rejected (outside hours)
 *  4. "no" → reminders continue
 *  5. "reschedule" / "change time" → new time slots
 *  6. "cancel" → mark visit cancelled
 *  7. "today 4pm" / "next Monday 3pm" → specific date support
 *  8. "10:30 AM" → half-hour slots
 *  9. Track no-response after "yes" for follow-up
 */

import { getDb, saveDb, flushDb } from './db.js';
import { sendTextMessage } from './whatsapp-api.js';

// ── Config ───────────────────────────────────────────────────────────────────
const BUSINESS_START_HOUR = 10;
const BUSINESS_END_HOUR = 19;

const TIME_SLOTS = [
  '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM',
  '4:00 PM', '4:30 PM', '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM',
  '7:00 PM'
];

// ── Conversation State ───────────────────────────────────────────────────────

export function getConversationState(lead) {
  return lead.siteVisitConversation || null;
}

function setConversationState(lead, state) {
  lead.siteVisitConversation = state;
}

function clearConversationState(lead) {
  lead.siteVisitConversation = null;
}

// ── Date Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse a date reference from message text.
 * Supports: "today", "tomorrow", "next monday", "monday", "sep 25", "25 sep"
 * Returns a Date object or null if no date found.
 */
function parseDateFromText(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();
  const now = new Date();

  // "today"
  if (/\btoday\b/.test(cleaned)) {
    return new Date(now);
  }

  // "tomorrow"
  if (/\btomorrow\b/.test(cleaned)) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d;
  }

  // "next monday", "next tuesday", etc.
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nextDayMatch = cleaned.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextDayMatch) {
    const targetDay = dayNames.indexOf(nextDayMatch[1]);
    const d = new Date(now);
    const currentDay = d.getDay();
    let daysAhead = targetDay - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    d.setDate(d.getDate() + daysAhead);
    return d;
  }

  // "monday", "tuesday", etc. (without "next")
  const dayMatch = cleaned.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch && !cleaned.includes('next')) {
    const targetDay = dayNames.indexOf(dayMatch[1]);
    const d = new Date(now);
    const currentDay = d.getDay();
    let daysAhead = targetDay - currentDay;
    if (daysAhead <= 0) daysAhead += 7;
    d.setDate(d.getDate() + daysAhead);
    return d;
  }

  // "sep 25", "25 sep", "september 25", "25 september"
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  // "sep 25" or "september 25"
  const monthDayMatch = cleaned.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/);
  if (monthDayMatch) {
    const monthIdx = months.indexOf(monthDayMatch[1]);
    const day = parseInt(monthDayMatch[2], 10);
    if (monthIdx >= 0 && day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), monthIdx, day);
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return d;
    }
  }

  // "25 sep" or "25 september"
  const dayMonthMatch = cleaned.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/);
  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1], 10);
    const monthIdx = months.indexOf(dayMonthMatch[2]);
    if (monthIdx >= 0 && day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), monthIdx, day);
      if (d < now) d.setFullYear(d.getFullYear() + 1);
      return d;
    }
  }

  return null;
}

function formatDate(date) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = date.toDateString() === tomorrow.toDateString();

  if (isToday) return 'Today';
  if (isTomorrow) return 'Tomorrow';
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

// ── Intent Detection ─────────────────────────────────────────────────────────

export function isPositiveResponse(text) {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  const positivePatterns = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'okayy',
    'done', 'confirm', 'book', 'booked', 'schedule',
    'arrange', 'interested', 'haan', 'han', 'ji',
    'bilkul', 'acha', 'theek hai', 'thik hai', 'send', 'do it',
    'please', 'pls', 'plz', 'yes please', 'yes sure', 'yes ok',
    'yes confirm', 'yes book', 'yes schedule', 'yes arrange',
    'i am interested', 'i want', 'i would like', "i'd like",
    "let's do", 'lets do', 'go ahead', 'proceed', 'yes proceed'
  ];
  return positivePatterns.some(p => cleaned === p || cleaned.startsWith(p));
}

export function isNegativeResponse(text) {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  const negativePatterns = [
    'no', 'nope', 'nah', 'nahi', 'nahi chahiye', 'not interested',
    'not now', 'later', 'maybe later', 'some other time', 'busy',
    'cant', "can't", 'cannot', 'not possible', 'not free',
    'next week', 'next time', 'will think', 'let me think',
    'will check', 'let me check', 'will discuss', 'let me discuss',
    'will talk', 'let me talk', 'will call', 'let me call',
    'baad mein', 'phir kabhi', 'abhi nahi', 'nahi abhi',
    'not today', 'some other day', 'different time'
  ];
  return negativePatterns.some(p => cleaned === p || cleaned.startsWith(p));
}

/**
 * Check if message is a reschedule request.
 */
export function isRescheduleRequest(text) {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  const patterns = [
    'reschedule', 're-schedule', 'change time', 'change date',
    'different time', 'different date', 'another time',
    'change my visit', 'move my visit', 'shift my visit',
    'postpone', 'prepone', 'change the time', 'change the date',
    'can we change', 'can i change', 'want to change',
    'time change', 'date change', 'slot change'
  ];
  return patterns.some(p => cleaned.includes(p));
}

/**
 * Check if message is a cancellation request.
 */
export function isCancelRequest(text) {
  if (!text) return false;
  const cleaned = text.trim().toLowerCase();
  const patterns = [
    'cancel', 'cancel my visit', 'cancel visit', 'cancel booking',
    'not coming', "can't come", 'cant come', 'cannot come',
    'wont come', "won't come", 'not able to come',
    'not able to visit', 'cancel it', 'cancel the visit',
    'remove my booking', 'remove visit', 'nahi aaunga', 'nahi aa paunga',
    'nahi aa sakte', 'cancel karde', 'cancel karo'
  ];
  return patterns.some(p => cleaned.includes(p));
}

// ── Time Parsing ─────────────────────────────────────────────────────────────

/**
 * Parse time from message. Handles half-hours, AM/PM, slot numbers.
 */
export function parseTimeSelection(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  // Check slot NUMBER references (ONLY pure digits)
  const pureNumber = cleaned.match(/^(\d{1,2})$/);
  if (pureNumber) {
    const slotNumber = parseInt(pureNumber[1], 10);
    if (slotNumber >= 1 && slotNumber <= TIME_SLOTS.length) {
      const timeStr = TIME_SLOTS[slotNumber - 1];
      const hour24 = parseTimeToHour24(timeStr);
      return { time: timeStr, hour24 };
    }
  }

  // Time patterns with half-hour support
  const timePatterns = [
    /(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)/i,   // "10:30 am", "2:00 PM"
    /(\d{1,2})\s*(am|pm)/i,                    // "10am", "2 PM"
    /(\d{1,2})\s*baje/i,                       // Hindi: "4 baje"
    /(\d{1,2})\s*o'?clock/i,                   // "4 o'clock"
  ];

  for (const pattern of timePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      let hour = parseInt(match[1], 10);
      let minutes = 0;
      let period;

      if (match.length === 4) {
        // Pattern with minutes: (\d):(\d{2})(am|pm)
        minutes = parseInt(match[2], 10);
        period = match[3]?.toLowerCase();
      } else {
        // Pattern without minutes: (\d)(am|pm)
        period = match[2]?.toLowerCase();
      }

      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;

      // Round minutes to nearest 30
      if (minutes > 0 && minutes < 30) minutes = 0;
      if (minutes > 30) { minutes = 0; hour += 1; }

      const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const displayPeriod = hour >= 12 ? 'PM' : 'AM';
      const displayMin = minutes === 0 ? '00' : '30';
      const displayTime = `${displayHour}:${displayMin} ${displayPeriod}`;

      return { time: displayTime, hour24: hour, minutes };
    }
  }

  return null;
}

function parseTimeToHour24(timeStr) {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 12;
  let hour = parseInt(match[1], 10);
  if (match[3].toUpperCase() === 'PM' && hour !== 12) hour += 12;
  if (match[3].toUpperCase() === 'AM' && hour === 12) hour = 0;
  return hour;
}

function isWithinBusinessHours(hour24) {
  return hour24 >= BUSINESS_START_HOUR && hour24 <= BUSINESS_END_HOUR;
}

// ── Site Visit CRUD ──────────────────────────────────────────────────────────

function hasExistingScheduledVisit(lead, db) {
  return (db.siteVisits || []).find(sv =>
    Number(sv.contactId) === Number(lead.id) && sv.status === 'scheduled'
  ) || null;
}

function createSiteVisit(lead, scheduledDate) {
  const db = getDb();
  if (!db.siteVisits) db.siteVisits = [];

  const existing = hasExistingScheduledVisit(lead, db);
  if (existing) {
    // Update existing visit
    existing.scheduledDate = scheduledDate;
    existing.updatedAt = new Date().toISOString();
    console.log(`🔄 Rescheduled visit for ${lead.name} to ${scheduledDate}`);
  } else {
    // Create new
    const nextId = db.siteVisits.length > 0
      ? Math.max(...db.siteVisits.map(v => Number(v.id) || 0)) + 1 : 1;
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
    console.log(`✅ Site visit created: ${lead.name} on ${scheduledDate} (ID: ${nextId})`);
  }

  // Update lead
  lead.siteVisit = scheduledDate;
  if (!lead.tags) lead.tags = [];
  if (!lead.tags.includes('site-visit-scheduled')) lead.tags.push('site-visit-scheduled');
  if (lead.stage === 'new' || lead.stage === 'contacted') {
    lead.stage = 'qualified';
    lead.dealProb = Math.max(lead.dealProb || 0, 65);
    if (!lead.timeline) lead.timeline = [];
    lead.timeline.unshift({
      type: 'stage-change',
      text: `Stage auto-advanced to QUALIFIED (site visit confirmed: ${scheduledDate})`,
      time: 'Just now', icon: 'target'
    });
  }

  clearConversationState(lead);
  lead._siteVisitResponseTime = null; // Clear no-response timer
  return existing || db.siteVisits[0];
}

function cancelSiteVisit(lead) {
  const db = getDb();
  const existing = hasExistingScheduledVisit(lead, db);
  if (existing) {
    existing.status = 'cancelled';
    existing.cancelledAt = new Date().toISOString();
    existing.cancelledVia = 'whatsapp_auto_reply';
  }

  lead.siteVisit = null;
  if (lead.tags) {
    lead.tags = lead.tags.filter(t => t !== 'site-visit-scheduled');
  }

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'site-visit',
    text: 'Site visit cancelled by client via WhatsApp',
    time: 'Just now',
    icon: 'xcircle'
  });

  clearConversationState(lead);
}

// ── Message Builders ─────────────────────────────────────────────────────────

function buildTimeSlotMessage(lead, project, isTodayAvailable = false) {
  const first = lead.name.split(' ')[0];
  const projectName = project?.name || lead.projectName || lead.project || 'Ashray Group Properties';

  const slotList = TIME_SLOTS.map((slot, i) => `  ${i + 1}. ${slot}`).join('\n');

  const dateHint = isTodayAvailable
    ? `Reply with a date + time (e.g., "today 4pm", "tomorrow 2pm", "next monday 11am")`
    : `Reply with a date + time (e.g., "tomorrow 2pm", "next monday 11am")`;

  return [
    `Great, ${first}! 🎉`,
    ``,
    `We'd love to schedule your site visit for *${projectName}*.`,
    ``,
    `📅 Available time slots (10 AM – 7 PM):`,
    slotList,
    ``,
    dateHint,
    `Or just reply a time like "4 PM" (defaults to tomorrow).`,
    ``,
    `⏰ Our visit hours: 10:00 AM to 7:00 PM only.`
  ].join('\n');
}

function buildTimeConfirmedMessage(lead, project, time, dateStr) {
  const first = lead.name.split(' ')[0];
  const projectName = project?.name || lead.projectName || lead.project || 'Ashray Group Properties';

  return [
    `✅ *Site Visit Confirmed!*`,
    ``,
    `${first}, your visit to *${projectName}* is booked for *${dateStr} at ${time}*.`,
    ``,
    `📋 What to expect:`,
    `• Property walkthrough with our expert`,
    `• Amenities tour`,
    `• Pricing & payment plan discussion`,
    ``,
    `Our team will send you the exact address and contact details shortly.`,
    `See you soon! 🏠`
  ].join('\n');
}

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

function buildUnclearResponseMessage(lead) {
  const first = lead.name.split(' ')[0];
  return [
    `Sorry ${first}, I didn't understand. 🤔`,
    ``,
    `Please reply with:`,
    `• A date + time: "tomorrow 4pm", "next monday 11am"`,
    `• Just a time: "4 PM" (defaults to tomorrow)`,
    `• A slot number: "3"`,
    ``,
    `Or reply *CANCEL* to cancel.`
  ].join('\n');
}

function buildCancelledMessage(lead) {
  const first = lead.name.split(' ')[0];
  return [
    `OK ${first}, your site visit has been cancelled. 👍`,
    ``,
    `No worries! Whenever you're ready to visit, just reply *YES* and we'll schedule a new time.`,
    `We're here to help! 🏠`
  ].join('\n');
}

function buildRescheduleMessage(lead, project) {
  const first = lead.name.split(' ')[0];
  const existing = hasExistingScheduledVisit(lead, getDb());
  const currentSlot = existing ? existing.scheduledDate : 'your current slot';

  return [
    `No problem, ${first}! 📅`,
    ``,
    `Your current visit is scheduled for *${currentSlot}*.`,
    `When would you like to reschedule?`,
    ``,
    `Reply with a new date + time:`,
    `• "tomorrow 4pm"`,
    `• "next monday 11am"`,
    `• "sep 25 3pm"`,
    ``,
    `⏰ Visit hours: 10:00 AM to 7:00 PM.`
  ].join('\n');
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export function handleSiteVisitReply(lead, messageText) {
  const db = getDb();
  const projects = db.projects || [];
  const project = projects.find(p => Number(p.id) === Number(lead.projectId)) || projects[0];

  const state = getConversationState(lead);

  // ── No active conversation ──────────────────────────────────────────────
  if (!state || state.step === 'idle') {

    // ── CANCEL request ───────────────────────────────────────────────────
    if (isCancelRequest(messageText)) {
      cancelSiteVisit(lead);
      const reply = buildCancelledMessage(lead);
      saveDb();
      return { handled: true, reply, action: 'visit_cancelled' };
    }

    // ── RESCHEDULE request ───────────────────────────────────────────────
    if (isRescheduleRequest(messageText)) {
      setConversationState(lead, {
        step: 'awaiting_time',
        startedAt: new Date().toISOString(),
        triggerMessage: messageText,
        isReschedule: true
      });
      saveDb();
      const reply = buildRescheduleMessage(lead, project);
      return { handled: true, reply, action: 'reschedule_prompt' };
    }

    // ── NEGATIVE response ────────────────────────────────────────────────
    if (isNegativeResponse(messageText)) {
      console.log(`👎 ${lead.name} said NO — reminders continue`);
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({
        type: 'whatsapp',
        text: `Client declined site visit: "${messageText}"`,
        time: 'Just now', icon: 'messagecircle'
      });
      saveDb();
      return { handled: false, action: 'declined' };
    }

    // ── POSITIVE response ────────────────────────────────────────────────
    if (isPositiveResponse(messageText)) {
      const shouldOffer = ['new', 'contacted', 'qualified'].includes(lead.stage)
        || (lead.tags || []).some(t => ['site-visit-scheduled', 'follow-up'].includes(t));

      if (shouldOffer) {
        // Check for combined response with date + time
        const timeSelection = parseTimeSelection(messageText);
        const parsedDate = parseDateFromText(messageText);

        if (timeSelection) {
          if (isWithinBusinessHours(timeSelection.hour24)) {
            // Determine date: use parsed date or default to tomorrow
            const visitDate = parsedDate || getDefaultDate();
            const dateStr = formatDate(visitDate);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const scheduledDate = `${months[visitDate.getMonth()]} ${visitDate.getDate()}, ${timeSelection.time}`;

            createSiteVisit(lead, scheduledDate);
            const reply = buildTimeConfirmedMessage(lead, project, timeSelection.time, dateStr);
            saveDb();
            return { handled: true, reply, action: 'visit_confirmed', scheduledDate };
          } else {
            // Outside hours
            const reply = buildTimeRejectionMessage(lead);
            setConversationState(lead, {
              step: 'awaiting_time',
              startedAt: new Date().toISOString(),
              triggerMessage: messageText
            });
            saveDb();
            return { handled: true, reply, action: 'time_rejected' };
          }
        }

        // No time in message — show time slots
        const now = new Date();
        const isTodayAvailable = now.getHours() < BUSINESS_END_HOUR;
        setConversationState(lead, {
          step: 'awaiting_time',
          startedAt: new Date().toISOString(),
          triggerMessage: messageText
        });
        // Track for no-response follow-up
        lead._siteVisitResponseTime = new Date().toISOString();
        saveDb();

        const reply = buildTimeSlotMessage(lead, project, isTodayAvailable);
        return { handled: true, reply, action: 'time_slots_sent' };
      }
    }
    return { handled: false };
  }

  // ── Active conversation: awaiting time selection ──────────────────────
  if (state.step === 'awaiting_time') {
    // Cancel during time selection
    if (isCancelRequest(messageText)) {
      cancelSiteVisit(lead);
      const reply = buildCancelledMessage(lead);
      saveDb();
      return { handled: true, reply, action: 'visit_cancelled' };
    }

    // Negative during time selection
    if (isNegativeResponse(messageText)) {
      clearConversationState(lead);
      saveDb();
      return { handled: false, action: 'declined' };
    }

    const timeSelection = parseTimeSelection(messageText);

    if (!timeSelection) {
      const reply = buildUnclearResponseMessage(lead);
      return { handled: true, reply, action: 'unclear_time' };
    }

    if (!isWithinBusinessHours(timeSelection.hour24)) {
      const reply = buildTimeRejectionMessage(lead);
      return { handled: true, reply, action: 'time_rejected' };
    }

    // Determine date
    const parsedDate = parseDateFromText(messageText);
    const visitDate = parsedDate || getDefaultDate();
    const dateStr = formatDate(visitDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const scheduledDate = `${months[visitDate.getMonth()]} ${visitDate.getDate()}, ${timeSelection.time}`;

    createSiteVisit(lead, scheduledDate);
    const reply = buildTimeConfirmedMessage(lead, project, timeSelection.time, dateStr);
    saveDb();
    return { handled: true, reply, action: 'visit_confirmed', scheduledDate };
  }

  return { handled: false };
}

function getDefaultDate() {
  const now = new Date();
  if (now.getHours() < BUSINESS_END_HOUR) {
    // Still today — offer today
    return new Date(now);
  }
  // After hours — default to tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  while (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

// ── Send Auto-Reply ──────────────────────────────────────────────────────────

export async function sendAutoReply(lead, replyText) {
  const result = await sendTextMessage(lead.phone, replyText);

  if (result.success) {
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

    if (!lead.timeline) lead.timeline = [];
    lead.timeline.unshift({
      type: 'whatsapp',
      text: `Auto-reply: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"`,
      time: 'Just now', icon: 'messagecircle'
    });

    lead.lastInboundAt = new Date().toISOString();
    saveDb();
  }

  return result;
}

// ── No-Response Follow-Up ────────────────────────────────────────────────────

/**
 * Check for leads that said "yes" but never picked a time.
 * Called by the scheduler every 15 minutes.
 */
export function checkNoResponseLeads() {
  const db = getDb();
  const leads = db.contacts || [];
  const now = new Date();
  const followUps = [];

  for (const lead of leads) {
    const state = getConversationState(lead);
    if (!state || state.step !== 'awaiting_time') continue;

    const startedAt = new Date(state.startedAt);
    const hoursElapsed = (now - startedAt) / (1000 * 60 * 60);

    // If waiting for more than 1 hour, send a follow-up
    if (hoursElapsed >= 1 && !lead._siteVisitFollowUpSent) {
      const first = lead.name.split(' ')[0];
      const msg = [
        `Hi ${first}! 👋`,
        ``,
        `Just checking — did you get a chance to pick a time for your site visit?`,
        `Reply with a time like "4 PM" or "tomorrow 2pm".`,
        ``,
        `Or reply *CANCEL* if you'd like to cancel.`
      ].join('\n');

      followUps.push({ lead, message: msg });
      lead._siteVisitFollowUpSent = true;
    }

    // If waiting for more than 24 hours, clear the state
    if (hoursElapsed > 24) {
      clearConversationState(lead);
      lead._siteVisitFollowUpSent = false;
      lead._siteVisitResponseTime = null;
    }
  }

  if (followUps.length > 0) {
    saveDb();
  }

  return followUps;
}
