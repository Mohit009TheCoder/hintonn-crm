/**
 * Site Visit Scheduling Automation Engine
 * Auto-suggests site visits, pre-visit reminders, post-visit follow-ups.
 */

import { getDb, getCollection } from './db.js';

/**
 * Auto-suggest site visits for qualified leads that haven't had one.
 */
export function suggestSiteVisits(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const siteVisits = db.siteVisits || [];
  const projects = db.projects || [];
  const suggestions = [];
  const now = new Date();

  for (const lead of contacts) {
    if (['won', 'lost'].includes(lead.stage)) continue;

    const leadVisits = siteVisits.filter(sv => Number(sv.contactId) === Number(lead.id));
    const hasScheduledVisit = leadVisits.some(sv => sv.status === 'scheduled');
    const project = projects.find(p => Number(p.id) === Number(lead.projectId));

    // 'qualified' stage with no site visit scheduled → HIGH
    if (lead.stage === 'qualified' && !hasScheduledVisit) {
      suggestions.push({
        leadId: lead.id,
        leadName: lead.name,
        reason: 'Qualified lead with no site visit scheduled',
        suggestedDate: getNextBusinessDay(now),
        projectId: lead.projectId,
        projectName: project ? project.name : 'Unknown',
        priority: 'HIGH',
        rep: lead.rep || 'Unassigned'
      });
      continue;
    }

    // 'contacted' stage >3 days with score >65 → MEDIUM
    if (lead.stage === 'contacted' && (lead.score || 0) > 65) {
      const createdAt = lead.createdAt ? new Date(lead.createdAt) : now;
      const daysSince = Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
      if (daysSince > 3) {
        suggestions.push({
          leadId: lead.id,
          leadName: lead.name,
          reason: `Contacted ${daysSince} days ago, score ${lead.score} — ready for site visit`,
          suggestedDate: getNextBusinessDay(now),
          projectId: lead.projectId,
          projectName: project ? project.name : 'Unknown',
          priority: 'MEDIUM',
          rep: lead.rep || 'Unassigned'
        });
        continue;
      }
    }

    // 'negotiation' with no recent site visit (>7 days) → follow-up visit
    if (lead.stage === 'negotiation') {
      const recentVisit = leadVisits
        .filter(sv => sv.status === 'completed')
        .sort((a, b) => new Date(b.scheduledDate) - new Date(a.scheduledDate))[0];
      if (!recentVisit) {
        suggestions.push({
          leadId: lead.id,
          leadName: lead.name,
          reason: 'In negotiation with no completed site visit — suggest follow-up visit',
          suggestedDate: getNextBusinessDay(now),
          projectId: lead.projectId,
          projectName: project ? project.name : 'Unknown',
          priority: 'HIGH',
          rep: lead.rep || 'Unassigned'
        });
      } else {
        const visitDate = new Date(recentVisit.scheduledDate);
        const daysSinceVisit = Math.floor((now - visitDate) / (1000 * 60 * 60 * 24));
        if (daysSinceVisit > 7) {
          suggestions.push({
            leadId: lead.id,
            leadName: lead.name,
            reason: `Last site visit ${daysSinceVisit} days ago — suggest follow-up visit`,
            suggestedDate: getNextBusinessDay(now),
            projectId: lead.projectId,
            projectName: project ? project.name : 'Unknown',
            priority: 'MEDIUM',
            rep: lead.rep || 'Unassigned'
          });
        }
      }
      continue;
    }

    // Leads with 'site-visit-scheduled' tag but no matching siteVisits entry → ALERT
    if ((lead.tags || []).includes('site-visit-scheduled') && !hasScheduledVisit) {
      suggestions.push({
        leadId: lead.id,
        leadName: lead.name,
        reason: 'Tagged as site-visit-scheduled but no matching site visit record — needs attention',
        suggestedDate: getNextBusinessDay(now),
        projectId: lead.projectId,
        projectName: project ? project.name : 'Unknown',
        priority: 'ALERT',
        rep: lead.rep || 'Unassigned'
      });
    }
  }

  return suggestions.sort((a, b) => {
    const prio = { ALERT: 0, HIGH: 1, MEDIUM: 2 };
    return (prio[a.priority] || 3) - (prio[b.priority] || 3);
  });
}

/**
 * Pre-visit reminders (1 hour before scheduled visit).
 */
export function getPreVisitReminders(db) {
  if (!db) db = getDb();
  const siteVisits = db.siteVisits || [];
  const contacts = db.contacts || [];
  const projects = db.projects || [];
  const reminders = [];
  const now = new Date();

  for (const visit of siteVisits) {
    if (visit.status !== 'scheduled') continue;

    const visitTime = parseVisitDate(visit.scheduledDate);
    if (!visitTime) continue;

    const minutesUntil = Math.floor((visitTime - now) / (1000 * 60));
    if (minutesUntil > 0 && minutesUntil <= 60) {
      const lead = contacts.find(c => Number(c.id) === Number(visit.contactId));
      const project = projects.find(p => Number(p.id) === Number(visit.projectId));
      reminders.push({
        visitId: visit.id,
        leadId: visit.contactId,
        leadName: lead ? lead.name : 'Unknown',
        projectName: project ? project.name : 'Unknown',
        scheduledDate: visit.scheduledDate,
        rep: visit.attendedBy,
        minutesUntil,
        preferences: lead ? lead.preferences : null
      });
    }
  }

  return reminders.sort((a, b) => a.minutesUntil - b.minutesUntil);
}

/**
 * Post-visit follow-up suggestions (day after visit).
 */
export function getPostVisitFollowUps(db) {
  if (!db) db = getDb();
  const siteVisits = db.siteVisits || [];
  const contacts = db.contacts || [];
  const followUps = [];
  const now = new Date();

  for (const visit of siteVisits) {
    if (visit.status !== 'completed') continue;
    if (!visit.scheduledDate) continue;

    const visitTime = parseVisitDate(visit.scheduledDate);
    if (!visitTime) continue;

    const daysSinceVisit = Math.floor((now - visitTime) / (1000 * 60 * 60 * 24));
    if (daysSinceVisit >= 1 && daysSinceVisit <= 3) {
      const lead = contacts.find(c => Number(c.id) === Number(visit.contactId));
      if (!lead || ['won', 'lost'].includes(lead.stage)) continue;

      let suggestedAction = 'Send thank-you message and check interest level';
      if (visit.outcome === 'Interested') {
        suggestedAction = 'Lead is interested — schedule follow-up call to discuss pricing and next steps';
      } else if (visit.outcome === 'Needs Follow-up') {
        suggestedAction = 'Lead needs more information — send comparison doc or additional floor plans';
      } else if (!visit.outcome) {
        suggestedAction = 'No outcome recorded — follow up to capture visit feedback';
      }

      followUps.push({
        visitId: visit.id,
        leadId: visit.contactId,
        leadName: lead ? lead.name : 'Unknown',
        outcome: visit.outcome || 'Not recorded',
        daysSinceVisit,
        suggestedAction
      });
    }
  }

  return followUps.sort((a, b) => a.daysSinceVisit - b.daysSinceVisit);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseVisitDate(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  let cleaned = dateStr.replace(/,\s*(\d{1,2}:\d{2}\s*(AM|PM))/i, ' $1');
  // Handle "Sep 19, 11:00 AM" → "Sep 19 11:00 AM 2026"
  if (!cleaned.match(/\d{4}/)) {
    cleaned += ` ${now.getFullYear()}`;
  }
  const parsed = new Date(cleaned);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getNextBusinessDay(fromDate) {
  const d = new Date(fromDate);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0) d.setDate(d.getDate() + 1);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, 11:00 AM`;
}
