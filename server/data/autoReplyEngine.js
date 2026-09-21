/**
 * Complete Auto-Reply Engine — Handles ALL WhatsApp responses
 *
 * Detects client intent from ANY message and responds appropriately.
 * Works with all message templates: YES, CALL, PLAN, HOLD, VISIT, BOOK, DONE, etc.
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

// ── Intent Detection ─────────────────────────────────────────────────────────

function matchIntent(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  // CANCEL
  if (/\b(cancel|cancel my visit|cancel visit|not coming|can't come|cant come|wont come|cancel it|nahi aaunga|cancel kar)\b/.test(cleaned)) {
    return 'cancel';
  }

  // RESCHEDULE
  if (/\b(reschedule|re-schedule|change time|change date|different time|postpone|prepone)\b/.test(cleaned)) {
    return 'reschedule';
  }

  // CALLBACK (CALL)
  if (/\b(call|callback|call me|call back|phone|ring|baat karo|phone karo)\b/.test(cleaned)) {
    return 'callback';
  }

  // FLOOR PLAN (PLAN)
  if (/\b(plan|floor plan|layout|brochure|details|send plan|share plan|pdf)\b/.test(cleaned)) {
    return 'floor_plan';
  }

  // HOLD / RESERVE
  if (/\b(hold|reserve|hold a unit|reserve unit|book unit)\b/.test(cleaned)) {
    return 'hold';
  }

  // VISIT / SCHEDULE (also catches "visit", "schedule", "arrange")
  if (/\b(visit|schedule|arrange visit|come|aana|site visit)\b/.test(cleaned)) {
    return 'visit';
  }

  // BOOK
  if (/\b(book|booking|confirm booking|proceed|done|final|confirm)\b/.test(cleaned)) {
    return 'book';
  }

  // POSITIVE (yes, sure, ok, etc.) — check AFTER specific intents
  if (/\b(yes|yeah|yep|yup|sure|ok|okay|haan|han|ji|bilkul|acha|theek hai|interested|i want|i would like|go ahead|proceed)\b/.test(cleaned)) {
    return 'yes';
  }

  // NEGATIVE
  if (/\b(no|nope|nah|nahi|not interested|not now|later|maybe later|busy|can't|cannot|not possible|baad mein|phir kabhi|abhi nahi)\b/.test(cleaned)) {
    return 'no';
  }

  // TIME SELECTION (standalone time like "4 PM", "10am")
  const timeMatch = parseTimeFromText(cleaned);
  if (timeMatch) {
    return 'time_selection';
  }

  return null;
}

function parseTimeFromText(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();

  // Pure number (slot reference)
  const pureNum = cleaned.match(/^(\d{1,2})$/);
  if (pureNum) {
    const n = parseInt(pureNum[1], 10);
    if (n >= 1 && n <= TIME_SLOTS.length) {
      return { time: TIME_SLOTS[n - 1], hour24: parseTimeToHour24(TIME_SLOTS[n - 1]) };
    }
  }

  // Time with AM/PM
  const patterns = [
    /(\d{1,2})\s*:\s*(\d{2})\s*(am|pm)/i,
    /(\d{1,2})\s*(am|pm)/i,
  ];

  for (const p of patterns) {
    const m = cleaned.match(p);
    if (m) {
      let hour = parseInt(m[1], 10);
      let min = m.length === 4 ? parseInt(m[2], 10) : 0;
      const period = (m[m.length - 1] || '').toLowerCase();

      if (period === 'pm' && hour !== 12) hour += 12;
      if (period === 'am' && hour === 12) hour = 0;

      if (min > 0 && min < 30) min = 0;
      if (min > 30) { min = 0; hour += 1; }

      const dh = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      const dp = hour >= 12 ? 'PM' : 'AM';
      const dm = min === 0 ? '00' : '30';

      return { time: `${dh}:${dm} ${dp}`, hour24: hour };
    }
  }

  return null;
}

function parseTimeToHour24(timeStr) {
  const m = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 12;
  let h = parseInt(m[1], 10);
  if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
  if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
  return h;
}

function parseDateFromText(text) {
  if (!text) return null;
  const cleaned = text.trim().toLowerCase();
  const now = new Date();

  if (/\btoday\b/.test(cleaned)) return new Date(now);
  if (/\btomorrow\b/.test(cleaned)) {
    const d = new Date(now); d.setDate(d.getDate() + 1); return d;
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const nextMatch = cleaned.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (nextMatch) {
    const target = dayNames.indexOf(nextMatch[1]);
    const d = new Date(now);
    let ahead = target - d.getDay();
    if (ahead <= 0) ahead += 7;
    d.setDate(d.getDate() + ahead);
    return d;
  }

  const dayMatch = cleaned.match(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (dayMatch && !cleaned.includes('next')) {
    const target = dayNames.indexOf(dayMatch[1]);
    const d = new Date(now);
    let ahead = target - d.getDay();
    if (ahead <= 0) ahead += 7;
    d.setDate(d.getDate() + ahead);
    return d;
  }

  return null;
}

function getDefaultVisitDate() {
  const now = new Date();
  if (now.getHours() < BUSINESS_END_HOUR) return new Date(now);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  while (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}

function formatDate(date) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return 'Today';
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function isWithinBusinessHours(hour24) {
  return hour24 >= BUSINESS_START_HOUR && hour24 <= BUSINESS_END_HOUR;
}

// ── Callback Task Creator ────────────────────────────────────────────────────

function createCallbackTask(lead, project, db) {
  if (!db.tasks) db.tasks = [];
  const taskId = db.tasks.length > 0 ? Math.max(...db.tasks.map(t => Number(t.id) || 0)) + 1 : 1;

  const callbackDue = new Date(Date.now() + 15 * 60 * 1000);
  const dueStr = callbackDue.toLocaleString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short'
  });

  db.tasks.unshift({
    id: taskId, contactId: Number(lead.id),
    title: `📞 CALLBACK: ${lead.name} (${lead.phone})`,
    type: 'callback', priority: 'high',
    due: dueStr, dueAt: callbackDue.toISOString(),
    status: 'pending',
    assignee: lead.rep || 'Sales Team',
    description: [
      `Client requested callback via WhatsApp`,
      `Phone: ${lead.phone}`,
      `Project: ${project?.name || 'N/A'}`,
      `Config: ${lead.config || 'N/A'}`,
      `Stage: ${lead.stage}`,
      `Source: ${lead.source || 'WhatsApp'}`,
      ``,
      `⏰ SLA: Call within 15 minutes`
    ].join('\n'),
    createdAt: new Date().toISOString(),
    slaMinutes: 15,
    channel: 'whatsapp'
  });

  // Add notification
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift({
    id: db.notifications.length + 1,
    type: 'callback_request',
    title: `Callback Requested`,
    message: `${lead.name} requested a callback for ${project?.name || 'project'}`,
    leadId: Number(lead.id), leadName: lead.name,
    priority: 'high', read: false,
    createdAt: new Date().toISOString()
  });

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({ type: 'call', text: 'Callback requested via WhatsApp', time: 'Just now', icon: 'phone' });
  if (!lead.tags) lead.tags = [];
  if (!lead.tags.includes('callback-requested')) lead.tags.push('callback-requested');
}

// ── Site Visit CRUD ──────────────────────────────────────────────────────────

function getExistingVisit(lead, db) {
  return (db.siteVisits || []).find(sv =>
    Number(sv.contactId) === Number(lead.id) && sv.status === 'scheduled'
  ) || null;
}

function createSiteVisit(lead, scheduledDate) {
  const db = getDb();
  if (!db.siteVisits) db.siteVisits = [];

  const existing = getExistingVisit(lead, db);
  if (existing) {
    existing.scheduledDate = scheduledDate;
    existing.updatedAt = new Date().toISOString();
  } else {
    const nextId = db.siteVisits.length > 0
      ? Math.max(...db.siteVisits.map(v => Number(v.id) || 0)) + 1 : 1;
    db.siteVisits.unshift({
      id: nextId, contactId: Number(lead.id), projectId: lead.projectId || 1,
      scheduledDate, status: 'scheduled', outcome: null, feedback: '',
      attendedBy: lead.rep || 'Team', duration: '45 min',
      nextAction: 'Site tour & sample flat walkthrough',
      confirmedVia: 'whatsapp_auto_reply',
      confirmedAt: new Date().toISOString(), createdAt: new Date().toISOString()
    });
  }

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
}

function cancelSiteVisit(lead) {
  const db = getDb();
  const existing = getExistingVisit(lead, db);
  if (existing) {
    existing.status = 'cancelled';
    existing.cancelledAt = new Date().toISOString();
  }
  lead.siteVisit = null;
  if (lead.tags) lead.tags = lead.tags.filter(t => t !== 'site-visit-scheduled');
  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'site-visit', text: 'Site visit cancelled by client via WhatsApp',
    time: 'Just now', icon: 'xcircle'
  });
  clearConversationState(lead);
}

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

// ── Response Builders ────────────────────────────────────────────────────────

function buildReply(lines) { return lines.join('\n'); }

function replyCallback(lead, project) {
  const first = lead.name.split(' ')[0];
  const pName = project?.name || 'our project';
  return buildReply([
    `Thank you, ${first}! 📞`,
    ``,
    `I've noted your callback request for *${pName}*.`,
    `Our sales team will call you within the next *15 minutes*.`,
    ``,
    `In the meantime, is there a preferred time that works best for you?`,
    `Or reply *YES* if you'd also like to schedule a site visit! 🏠`
  ]);
}

function replyFloorPlan(lead, project) {
  const first = lead.name.split(' ')[0];
  const pName = project?.name || 'our project';
  return buildReply([
    `Sure, ${first}! 📋`,
    ``,
    `Here's the floor plan for *${pName}*:`,
    `🔗 [Floor Plan PDF will be shared here]`,
    ``,
    `Would you like to see the property in person?`,
    `Reply *YES* to schedule a site visit, or *CALL* if you'd like to discuss first. 🏠`
  ]);
}

function replyHold(lead, project) {
  const first = lead.name.split(' ')[0];
  const pName = project?.name || 'our project';
  return buildReply([
    `Great choice, ${first}! 🏡`,
    ``,
    `I've marked a unit on hold for you at *${pName}*.`,
    `This hold is valid for *48 hours*.`,
    ``,
    `To complete the reservation, we'll need:`,
    `1️⃣ A brief site visit (we'll arrange pickup)`,
    `2️⃣ Discussion on payment plan`,
    ``,
    `When would you like to visit? Reply with a date + time.`,
    `Or reply *CALL* to discuss over phone. 📞`
  ]);
}

function replyVisit(lead, project, timeSelection) {
  const first = lead.name.split(' ')[0];
  const pName = project?.name || 'our project';

  if (timeSelection && isWithinBusinessHours(timeSelection.hour24)) {
    const visitDate = parseDateFromText(lead._lastMessage) || getDefaultVisitDate();
    const dateStr = formatDate(visitDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const scheduledDate = `${months[visitDate.getMonth()]} ${visitDate.getDate()}, ${timeSelection.time}`;
    createSiteVisit(lead, scheduledDate);
    return buildReply([
      `✅ *Site Visit Confirmed!*`,
      ``,
      `${first}, your visit to *${pName}* is booked for *${dateStr} at ${timeSelection.time}*.`,
      ``,
      `📋 What to expect:`,
      `• Property walkthrough with our expert`,
      `• Amenities tour`,
      `• Pricing & payment plan discussion`,
      ``,
      `Our team will send you the exact address shortly.`,
      `See you soon! 🏠`
    ]);
  }

  // Show time slots
  const slots = TIME_SLOTS.map((s, i) => `  ${i + 1}. ${s}`).join('\n');
  return buildReply([
    `We'd love to show you *${pName}*, ${first}! 🎉`,
    ``,
    `📅 Available time slots (10 AM – 7 PM):`,
    slots,
    ``,
    `Reply with a time like "tomorrow 4pm" or a slot number.`
  ]);
}

function replyBook(lead, project) {
  const first = lead.name.split(' ')[0];
  const pName = project?.name || 'our project';
  return buildReply([
    `Wonderful, ${first}! 🎉`,
    ``,
    `We're excited to move forward with your booking at *${pName}*.`,
    ``,
    `To complete the booking, we need:`,
    `1️⃣ Site visit confirmation`,
    `2️⃣ Document verification`,
    `3️⃣ Token amount discussion`,
    ``,
    `Our senior sales manager will call you within the next *30 minutes*`,
    `to discuss the final terms and payment schedule. 📞`,
    ``,
    `Thank you for choosing Ashray Group! 🏠`
  ]);
}

function replyYes(lead, project) {
  const first = lead.name.split(' ')[0];
  const pName = project?.name || 'our project';

  // If lead already has a site visit, thank them
  if (lead.siteVisit) {
    return buildReply([
      `Thank you for your interest, ${first}! 🙏`,
      ``,
      `Your site visit is already confirmed for *${lead.siteVisit}*.`,
      `Our team is preparing everything for your visit.`,
      ``,
      `Looking forward to seeing you! 🏠`
    ]);
  }

  // Otherwise, show time slots for site visit
  const slots = TIME_SLOTS.map((s, i) => `  ${i + 1}. ${s}`).join('\n');
  return buildReply([
    `Great, ${first}! 🎉`,
    ``,
    `Let's schedule your site visit for *${pName}*.`,
    ``,
    `📅 Available time slots (10 AM – 7 PM):`,
    slots,
    ``,
    `Reply with a time like "tomorrow 4pm" or a slot number.`
  ]);
}

function replyNo(lead) {
  const first = lead.name.split(' ')[0];
  return buildReply([
    `No problem, ${first}! 👍`,
    ``,
    `We understand. Whenever you're ready, just reach out.`,
    `We're always here to help you find your dream home. 🏠`
  ]);
}

function replyCancelled(lead) {
  const first = lead.name.split(' ')[0];
  return buildReply([
    `OK ${first}, your site visit has been cancelled. 👍`,
    ``,
    `Whenever you're ready to visit, just reply *YES* and we'll schedule a new time.`,
    `We're here to help! 🏠`
  ]);
}

function replyReschedule(lead) {
  const first = lead.name.split(' ')[0];
  const existing = getExistingVisit(lead, getDb());
  const current = existing ? existing.scheduledDate : 'your current slot';
  return buildReply([
    `No problem, ${first}! 📅`,
    ``,
    `Your current visit is scheduled for *${current}*.`,
    `When would you like to reschedule?`,
    ``,
    `Reply with a new date + time:`,
    `• "tomorrow 4pm"`,
    `• "next monday 11am"`,
    ``,
    `⏰ Visit hours: 10:00 AM to 7:00 PM.`
  ]);
}

// ── Main Handler ─────────────────────────────────────────────────────────────

/**
 * Process an inbound message and handle ALL auto-reply flows.
 * Returns { handled: boolean, reply?: string, action?: string }
 */
export function handleAutoReply(lead, messageText) {
  const db = getDb();
  const projects = db.projects || [];
  const project = projects.find(p => Number(p.id) === Number(lead.projectId)) || projects[0];

  // Store last message for date parsing
  lead._lastMessage = messageText;

  const intent = matchIntent(messageText);
  const state = getConversationState(lead);

  // ── If in active time-selection conversation ───────────────────────────
  if (state && state.step === 'awaiting_time') {
    // Cancel
    if (intent === 'cancel') {
      cancelSiteVisit(lead);
      saveDb(); flushAsync();
      return { handled: true, reply: replyCancelled(lead), action: 'visit_cancelled' };
    }

    // Negative
    if (intent === 'no') {
      clearConversationState(lead);
      saveDb();
      return { handled: false, action: 'declined' };
    }

    // Callback request during time selection — clear state and handle
    if (intent === 'callback') {
      clearConversationState(lead);
      createCallbackTask(lead, project, db);
      saveDb(); flushAsync();
      return { handled: true, reply: replyCallback(lead, project), action: 'callback_requested' };
    }

    // Floor plan request during time selection — clear state and handle
    if (intent === 'floor_plan') {
      clearConversationState(lead);
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({ type: 'brochure', text: 'Floor plan requested via WhatsApp', time: 'Just now', icon: 'file' });
      saveDb(); flushAsync();
      return { handled: true, reply: replyFloorPlan(lead, project), action: 'floor_plan_sent' };
    }

    // Hold request during time selection — clear state and handle
    if (intent === 'hold') {
      clearConversationState(lead);
      if (!lead.tags) lead.tags = [];
      if (!lead.tags.includes('unit-hold')) lead.tags.push('unit-hold');
      saveDb(); flushAsync();
      return { handled: true, reply: replyHold(lead, project), action: 'unit_hold_requested' };
    }

    // Book request during time selection — clear state and handle
    if (intent === 'book') {
      clearConversationState(lead);
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({ type: 'deal', text: 'Booking intent confirmed via WhatsApp', time: 'Just now', icon: 'checkcircle' });
      if (lead.stage !== 'won' && lead.stage !== 'negotiation') {
        lead.stage = 'negotiation';
        lead.dealProb = Math.max(lead.dealProb || 0, 80);
        lead.timeline.unshift({ type: 'stage-change', text: 'Stage auto-advanced to NEGOTIATION (booking intent)', time: 'Just now', icon: 'target' });
      }
      saveDb(); flushAsync();
      return { handled: true, reply: replyBook(lead, project), action: 'booking_intent' };
    }

    // Parse time
    const timeSelection = parseTimeFromText(messageText);
    if (!timeSelection) {
      return { handled: true, reply: replyVisit(lead, project, null), action: 'unclear_time' };
    }

    if (!isWithinBusinessHours(timeSelection.hour24)) {
      return { handled: true, reply: replyVisit(lead, project, null), action: 'time_rejected' };
    }

    // Valid time — confirm
    const visitDate = parseDateFromText(messageText) || getDefaultVisitDate();
    const dateStr = formatDate(visitDate);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const scheduledDate = `${months[visitDate.getMonth()]} ${visitDate.getDate()}, ${timeSelection.time}`;
    createSiteVisit(lead, scheduledDate);
    saveDb(); flushAsync();
    return { handled: true, reply: replyVisit(lead, project, timeSelection), action: 'visit_confirmed', scheduledDate };
  }

  // ── No active conversation — match intent ──────────────────────────────
  if (!intent) {
    // Unknown message — don't auto-reply, let human handle it
    return { handled: false };
  }

  switch (intent) {
    case 'cancel':
      cancelSiteVisit(lead);
      saveDb(); flushAsync();
      return { handled: true, reply: replyCancelled(lead), action: 'visit_cancelled' };

    case 'reschedule':
      setConversationState(lead, { step: 'awaiting_time', startedAt: new Date().toISOString() });
      saveDb();
      return { handled: true, reply: replyReschedule(lead), action: 'reschedule_prompt' };

    case 'callback':
      // Create a follow-up task
      if (!db.tasks) db.tasks = [];
      createCallbackTask(lead, project, db);
      saveDb(); flushAsync();
      return { handled: true, reply: replyCallback(lead, project), action: 'callback_requested' };

    case 'floor_plan':
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({ type: 'brochure', text: 'Floor plan requested via WhatsApp', time: 'Just now', icon: 'file' });
      saveDb(); flushAsync();
      return { handled: true, reply: replyFloorPlan(lead, project), action: 'floor_plan_sent' };

    case 'hold':
      if (!lead.tags) lead.tags = [];
      if (!lead.tags.includes('unit-hold')) lead.tags.push('unit-hold');
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({ type: 'deal', text: 'Unit hold requested via WhatsApp', time: 'Just now', icon: 'lock' });
      saveDb(); flushAsync();
      return { handled: true, reply: replyHold(lead, project), action: 'unit_hold_requested' };

    case 'visit':
      setConversationState(lead, { step: 'awaiting_time', startedAt: new Date().toISOString() });
      saveDb();
      return { handled: true, reply: replyVisit(lead, project, null), action: 'time_slots_sent' };

    case 'book':
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({ type: 'deal', text: 'Booking intent confirmed via WhatsApp', time: 'Just now', icon: 'checkcircle' });
      if (lead.stage !== 'won' && lead.stage !== 'negotiation') {
        lead.stage = 'negotiation';
        lead.dealProb = Math.max(lead.dealProb || 0, 80);
        lead.timeline.unshift({ type: 'stage-change', text: 'Stage auto-advanced to NEGOTIATION (booking intent)', time: 'Just now', icon: 'target' });
      }
      saveDb(); flushAsync();
      return { handled: true, reply: replyBook(lead, project), action: 'booking_intent' };

    case 'yes':
      // Check for combined "yes + time"
      const timeSelection = parseTimeFromText(messageText);
      if (timeSelection && isWithinBusinessHours(timeSelection.hour24)) {
        const visitDate = parseDateFromText(messageText) || getDefaultVisitDate();
        const dateStr = formatDate(visitDate);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const scheduledDate = `${months[visitDate.getMonth()]} ${visitDate.getDate()}, ${timeSelection.time}`;
        createSiteVisit(lead, scheduledDate);
        saveDb(); flushAsync();
        return { handled: true, reply: replyVisit(lead, project, timeSelection), action: 'visit_confirmed', scheduledDate };
      }

      // Show time slots
      setConversationState(lead, { step: 'awaiting_time', startedAt: new Date().toISOString() });
      saveDb();
      return { handled: true, reply: replyYes(lead, project), action: 'time_slots_sent' };

    case 'no':
      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({ type: 'whatsapp', text: `Client declined: "${messageText}"`, time: 'Just now', icon: 'messagecircle' });
      saveDb();
      return { handled: false, action: 'declined' };

    case 'time_selection':
      // Standalone time message — treat as visit request
      const ts = parseTimeFromText(messageText);
      if (ts && isWithinBusinessHours(ts.hour24)) {
        setConversationState(lead, { step: 'awaiting_time', startedAt: new Date().toISOString() });
        const visitDate = getDefaultVisitDate();
        const dateStr = formatDate(visitDate);
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const scheduledDate = `${months[visitDate.getMonth()]} ${visitDate.getDate()}, ${ts.time}`;
        createSiteVisit(lead, scheduledDate);
        saveDb(); flushAsync();
        return { handled: true, reply: replyVisit(lead, project, ts), action: 'visit_confirmed', scheduledDate };
      }
      return { handled: false };

    default:
      return { handled: false };
  }
}

// ── Send Auto-Reply ──────────────────────────────────────────────────────────

export async function sendAutoReply(lead, replyText) {
  const result = await sendTextMessage(lead.phone, replyText);

  if (result.success) {
    if (!lead.waLog) lead.waLog = [];
    lead.waLog.push({
      id: lead.waLog.length + 1, text: replyText,
      time: new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' }),
      dir: 'out', auto: true, templateId: 'auto_reply',
      metaMessageId: result.messageId, sentAt: new Date().toISOString()
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

export function checkNoResponseLeads() {
  const db = getDb();
  const now = new Date();
  const followUps = [];

  for (const lead of (db.contacts || [])) {
    const state = getConversationState(lead);
    if (!state || state.step !== 'awaiting_time') continue;

    const hoursElapsed = (now - new Date(state.startedAt)) / (1000 * 60 * 60);
    if (hoursElapsed >= 1 && !lead._siteVisitFollowUpSent) {
      const first = lead.name.split(' ')[0];
      followUps.push({
        lead,
        message: `Hi ${first}! 👋\n\nJust checking — did you get a chance to pick a time for your site visit?\nReply with a time like "4 PM" or "tomorrow 2pm".\n\nOr reply *CANCEL* if you'd like to cancel.`
      });
      lead._siteVisitFollowUpSent = true;
    }

    if (hoursElapsed > 24) {
      clearConversationState(lead);
      lead._siteVisitFollowUpSent = false;
    }
  }

  if (followUps.length > 0) saveDb();
  return followUps;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function flushAsync() {
  try { await flushDb(); } catch (e) { /* ignore */ }
}

export { isPositiveResponse, isNegativeResponse } from './siteVisitAutoReply.js';

// Backward compat export
export const handleSiteVisitReply = handleAutoReply;
