/**
 * Lead Intelligence Engine
 * 
 * Provides lead scoring, assignment, SLA monitoring, duplicate detection,
 * source analytics, and nurture sequence processing.
 */

import { getCollection, getDb, insertItem, updateItem, saveDb } from './db.js';

// ── Source Quality Scores ────────────────────────────────────────────────────
const SOURCE_SCORES = {
  'Referral': 90,
  'Walk-in': 85,
  'Google Ads': 80,
  '99acres': 75,
  'MagicBricks': 75,
  'Facebook': 70,
  'Instagram': 70,
  'Call-in': 70,
  'Housing.com': 65,
  'JustDial': 65,
  'WhatsApp': 60,
  'Website': 55,
};

// Source alias mapping (webhook source → display name)
const SOURCE_ALIASES = {
  'referral': 'Referral',
  'walk_in': 'Walk-in',
  'walk-in': 'Walk-in',
  'call_in': 'Call-in',
  'call-in': 'Call-in',
  'google_ads': 'Google Ads',
  'google-ads': 'Google Ads',
  'facebook': 'Facebook',
  'instagram': 'Instagram',
  'whatsapp': 'WhatsApp',
  '99acres': '99acres',
  'magicbricks': 'MagicBricks',
  'housing_com': 'Housing.com',
  'housing': 'Housing.com',
  'justdial': 'JustDial',
  'just_dial': 'JustDial',
  'website': 'Website',
};

// ── Rep Specializations ──────────────────────────────────────────────────────
const REP_SPECIALIZATIONS = {
  'Karan Thakkar': { tags: ['luxury', 'villa', '4bhk', 'investor', 'nri'], budgetMin: 10000000 },
  'Ananya Iyer': { tags: ['residential', '2bhk', '3bhk'], budgetMin: 0 },
  'Simran Kaur': { tags: ['new-lead', 'first-time'], budgetMin: 0 },
  'Rohan Mehta': { tags: ['commercial', 'office', 'shop', 'investor'], budgetMin: 0 },
};

// Round-robin counter for assignment
let assignmentCounter = 0;

// ── SLA Configuration ────────────────────────────────────────────────────────
const SLA_LIMITS = {
  'new': 15,        // 15 minutes for new leads
  'contacted': 1440, // 24 hours for contacted leads
  'qualified': 2880, // 48 hours for qualified leads
  'negotiation': 4320, // 72 hours for negotiation
};

// ── Lead Scoring ─────────────────────────────────────────────────────────────

/**
 * Calculate lead score (0-100) based on source, budget, config, and engagement.
 * @param {object} lead - Lead/contact object
 * @param {object} db - Database object (optional, uses getDb if not provided)
 * @returns {number} Score from 0 to 100
 */
export function calculateLeadScore(lead, db) {
  if (!db) db = getDb();
  
  let score = 0;
  
  // 1. Source quality (0-40 points)
  const sourceName = SOURCE_ALIASES[lead.source] || lead.source || 'Website';
  const sourceScore = SOURCE_SCORES[sourceName] || 50;
  score += Math.round(sourceScore * 0.4); // Scale to 40 points max
  
  // 2. Budget tier (0-15 points)
  const budget = lead.budget || lead.value || 0;
  if (budget > 10000000) score += 15;       // > 1 Cr
  else if (budget >= 5000000) score += 10;  // 50L - 1 Cr
  else if (budget >= 2000000) score += 5;   // 20L - 50L
  
  // 3. Config preference (0-10 points)
  const config = (lead.config || '').toLowerCase();
  if (config.includes('4 bhk') || config.includes('villa')) score += 10;
  else if (config.includes('3 bhk')) score += 5;
  
  // 4. Engagement signals (0-35 points)
  // Check WhatsApp replies
  if (lead.repliedAt || (lead.waLog && lead.waLog.some(m => m.dir === 'in'))) {
    score += 10;
  }
  
  // Check site visit booked
  const siteVisits = db.siteVisits || [];
  const hasSiteVisit = siteVisits.some(sv => sv.contactId === lead.id);
  if (hasSiteVisit || lead.siteVisit) {
    score += 15;
  }
  
  // Check brochure viewed
  const brochures = db.brochures || [];
  const hasBrochure = brochures.some(b => b.contactId === lead.id);
  if (hasBrochure) {
    score += 5;
  }
  
  // Check notes (indicates engagement)
  if (lead.notes && lead.notes.length > 2) {
    score += 5;
  }
  
  return Math.min(100, Math.max(0, score));
}

// ── Lead Assignment ──────────────────────────────────────────────────────────

/**
 * Assign a lead to the best available rep using round-robin with specialization matching.
 * @param {object} lead - Lead object
 * @param {object} db - Database object
 * @returns {string} Rep name
 */
export function assignLead(lead, db) {
  if (!db) db = getDb();
  
  const team = db.team || [];
  if (team.length === 0) return 'Unassigned';
  
  // Get active reps only
  const activeReps = team.filter(m => m.role && m.name);
  if (activeReps.length === 0) return 'Unassigned';
  
  // Try to match by specialization
  const leadTags = (lead.tags || []).map(t => t.toLowerCase());
  const leadConfig = (lead.config || '').toLowerCase();
  const leadBudget = lead.budget || lead.value || 0;
  const leadSource = (lead.source || '').toLowerCase();
  
  // Check for luxury/villa match → Karan
  if (leadConfig.includes('4 bhk') || leadConfig.includes('villa') || leadBudget > 10000000) {
    const karan = activeReps.find(r => r.name === 'Karan Thakkar');
    if (karan) return karan.name;
  }
  
  // Check for commercial match → Rohan
  if (leadConfig.includes('office') || leadConfig.includes('shop') || leadSource.includes('commercial')) {
    const rohan = activeReps.find(r => r.name === 'Rohan Mehta');
    if (rohan) return rohan.name;
  }
  
  // Check if new lead → Simran
  if (!lead.stage || lead.stage === 'new') {
    const simran = activeReps.find(r => r.name === 'Simran Kaur');
    if (simran) return simran.name;
  }
  
  // Default: round-robin
  assignmentCounter = (assignmentCounter + 1) % activeReps.length;
  return activeReps[assignmentCounter].name;
}

// ── SLA Monitoring ───────────────────────────────────────────────────────────

/**
 * Check all uncontacted leads for SLA response time violations.
 * @param {object} db - Database object
 * @returns {Array} Array of SLA violation objects
 */
export function checkSLAViolations(db) {
  if (!db) db = getDb();
  
  const contacts = db.contacts || [];
  const violations = [];
  const now = new Date();
  
  for (const lead of contacts) {
    // Skip won/lost leads
    if (['won', 'lost'].includes(lead.stage)) continue;
    
    const stage = lead.stage || 'new';
    const slaLimit = SLA_LIMITS[stage] || 15;
    
    // Calculate time since creation
    const createdAt = lead.createdAt ? new Date(lead.createdAt) : null;
    if (!createdAt) continue;
    
    const minutesSinceCreated = Math.floor((now - createdAt) / (1000 * 60));
    
    // Check if SLA is violated
    // For 'new' leads, check if they've been contacted
    if (stage === 'new' && !lead.rep && minutesSinceCreated > slaLimit) {
      violations.push({
        leadId: lead.id,
        leadName: lead.name,
        phone: lead.phone,
        source: lead.source,
        minutesSinceCreated,
        slaLimit,
        isViolation: true,
        severity: minutesSinceCreated > slaLimit * 2 ? 'critical' : 'warning',
        message: `Lead unassigned for ${minutesSinceCreated} minutes (SLA: ${slaLimit} min)`,
      });
    }
    
    // For other stages, check last activity time
    if (stage !== 'new' && lead.rep) {
      const lastActivity = getLastActivityTime(lead);
      if (lastActivity) {
        const minutesSinceActivity = Math.floor((now - lastActivity) / (1000 * 60));
        if (minutesSinceActivity > slaLimit) {
          violations.push({
            leadId: lead.id,
            leadName: lead.name,
            phone: lead.phone,
            source: lead.source,
            rep: lead.rep,
            stage,
            minutesSinceCreated: minutesSinceActivity,
            slaLimit,
            isViolation: true,
            severity: minutesSinceActivity > slaLimit * 2 ? 'critical' : 'warning',
            message: `No activity for ${minutesSinceActivity} minutes in ${stage} stage (SLA: ${slaLimit} min)`,
          });
        }
      }
    }
  }
  
  return violations;
}

/**
 * Get the timestamp of the last activity on a lead.
 */
function getLastActivityTime(lead) {
  const times = [];
  
  // Check timeline
  if (lead.timeline && lead.timeline.length > 0) {
    const lastEntry = lead.timeline[0];
    if (lastEntry.time) {
      // Parse relative time strings
      const parsed = parseRelativeTime(lastEntry.time);
      if (parsed) times.push(parsed);
    }
  }
  
  // Check notes
  if (lead.notes && lead.notes.length > 0) {
    const lastNote = lead.notes[lead.notes.length - 1];
    if (lastNote.time) {
      const parsed = parseRelativeTime(lastNote.time);
      if (parsed) times.push(parsed);
    }
  }
  
  // Check updatedAt
  if (lead.updatedAt) {
    times.push(new Date(lead.updatedAt));
  }
  
  return times.length > 0 ? new Date(Math.max(...times)) : null;
}

/**
 * Parse relative time strings like "2 hours ago", "Just now", etc.
 */
function parseRelativeTime(timeStr) {
  if (!timeStr) return null;
  
  const now = new Date();
  const str = timeStr.toLowerCase();
  
  if (str.includes('just now') || str.includes('now')) return now;
  if (str.includes('min')) {
    const mins = parseInt(str);
    return new Date(now - mins * 60 * 1000);
  }
  if (str.includes('hour')) {
    const hours = parseInt(str);
    return new Date(now - hours * 60 * 60 * 1000);
  }
  if (str.includes('day')) {
    const days = parseInt(str);
    return new Date(now - days * 24 * 60 * 60 * 1000);
  }
  
  return null;
}

// ── Duplicate Detection ──────────────────────────────────────────────────────

/**
 * Find potential duplicate leads by phone or email.
 * @param {object} lead - Lead to check
 * @param {object} db - Database object
 * @returns {Array} Array of potential duplicates
 */
export function findDuplicates(lead, db) {
  if (!db) db = getDb();
  
  const contacts = db.contacts || [];
  const duplicates = [];
  
  const cleanPhone = (lead.phone || '').replace(/[\s\-+]/g, '');
  const email = (lead.email || '').toLowerCase().trim();
  
  for (const existing of contacts) {
    // Skip self
    if (existing.id === lead.id) continue;
    
    const existingPhone = (existing.phone || '').replace(/[\s\-+]/g, '');
    const existingEmail = (existing.email || '').toLowerCase().trim();
    
    // Phone match
    if (cleanPhone && existingPhone && cleanPhone === existingPhone) {
      duplicates.push({
        id: existing.id,
        name: existing.name,
        phone: existing.phone,
        email: existing.email,
        source: existing.source,
        stage: existing.stage,
        matchType: 'phone',
        createdAt: existing.createdAt,
      });
    }
    
    // Email match (only if email provided)
    if (email && existingEmail && email === existingEmail) {
      // Avoid duplicate entries if already matched by phone
      if (!duplicates.find(d => d.id === existing.id)) {
        duplicates.push({
          id: existing.id,
          name: existing.name,
          phone: existing.phone,
          email: existing.email,
          source: existing.source,
          stage: existing.stage,
          matchType: 'email',
          createdAt: existing.createdAt,
        });
      }
    }
  }
  
  return duplicates;
}

// ── Source Statistics ─────────────────────────────────────────────────────────

/**
 * Get aggregate metrics per lead source channel.
 * @param {object} db - Database object
 * @returns {Array} Array of source stats
 */
export function getSourceStats(db) {
  if (!db) db = getDb();
  
  const contacts = db.contacts || [];
  const siteVisits = db.siteVisits || [];
  const sourceMap = {};
  
  for (const lead of contacts) {
    const source = lead.source || 'Unknown';
    
    if (!sourceMap[source]) {
      sourceMap[source] = {
        source,
        totalLeads: 0,
        wonDeals: 0,
        totalRevenue: 0,
        conversionRate: 0,
        avgResponseTime: 0,
        costPerLead: 0,
        responseTimes: [],
      };
    }
    
    const stats = sourceMap[source];
    stats.totalLeads++;
    
    if (lead.stage === 'won') {
      stats.wonDeals++;
      stats.totalRevenue += lead.value || 0;
    }
    
    // Calculate response time (time from creation to first contact)
    if (lead.createdAt) {
      const created = new Date(lead.createdAt);
      const firstContact = getFirstContactTime(lead, siteVisits);
      if (firstContact) {
        const responseMinutes = Math.floor((firstContact - created) / (1000 * 60));
        stats.responseTimes.push(responseMinutes);
      }
    }
  }
  
  // Calculate averages and conversion rates
  const result = Object.values(sourceMap).map(stats => {
    stats.conversionRate = stats.totalLeads > 0 
      ? Math.round((stats.wonDeals / stats.totalLeads) * 100) 
      : 0;
    
    stats.avgResponseTime = stats.responseTimes.length > 0
      ? Math.round(stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length)
      : 0;
    
    delete stats.responseTimes;
    
    return stats;
  });
  
  return result.sort((a, b) => b.totalLeads - a.totalLeads);
}

/**
 * Get the time of first contact activity for a lead.
 */
function getFirstContactTime(lead, siteVisits) {
  const times = [];
  
  // Check timeline for first contact
  if (lead.timeline) {
    for (const entry of lead.timeline) {
      if (['call', 'whatsapp', 'email', 'site-visit'].includes(entry.type)) {
        const parsed = parseRelativeTime(entry.time);
        if (parsed) times.push(parsed);
      }
    }
  }
  
  // Check site visits
  const leadVisits = siteVisits.filter(sv => sv.contactId === lead.id);
  for (const sv of leadVisits) {
    if (sv.scheduledDate) {
      // Parse date string
      const parsed = new Date(sv.scheduledDate);
      if (!isNaN(parsed)) times.push(parsed);
    }
  }
  
  return times.length > 0 ? new Date(Math.min(...times)) : null;
}

// ── Nurture Sequences ────────────────────────────────────────────────────────

/**
 * Get the nurture sequence steps for a given stage and lead.
 * @param {string} stage - Lead stage
 * @param {object} lead - Lead object
 * @returns {Array} Array of nurture step objects
 */
export function getNurtureSequence(stage, lead) {
  const db = getDb();
  const sequences = db.nurtureSequences || [];
  
  // Find matching sequence based on stage
  let sequence = null;
  
  if (stage === 'new') {
    sequence = sequences.find(s => s.name === 'New Lead Welcome');
  } else if (stage === 'contacted') {
    sequence = sequences.find(s => s.name === 'New Lead Welcome');
  } else if (stage === 'qualified') {
    // Check if site visit is scheduled
    if (lead.siteVisit) {
      sequence = sequences.find(s => s.name === 'Site Visit Follow-up');
    } else {
      sequence = sequences.find(s => s.name === 'New Lead Welcome');
    }
  } else if (stage === 'negotiation') {
    sequence = sequences.find(s => s.name === 'Negotiation Re-engage');
  } else if (stage === 'lost') {
    sequence = sequences.find(s => s.name === 'Lost Lead Win-back');
  } else if (stage === 'won') {
    sequence = sequences.find(s => s.name === 'Post Booking Thank You');
  }
  
  // Check for VIP/high-budget override
  const budget = lead.budget || lead.value || 0;
  if (budget > 10000000) {
    const vipSequence = sequences.find(s => s.name === 'High Budget VIP');
    if (vipSequence) sequence = vipSequence;
  }
  
  if (!sequence || !sequence.steps) return [];
  
  return sequence.steps.map((step, idx) => ({
    stepNumber: idx + 1,
    delayHours: step.delayHours || 0,
    messageType: step.messageType || 'whatsapp',
    template: step.template || '',
    channel: step.channel || 'whatsapp',
  }));
}

/**
 * Process nurture step for a lead — check if a message is due.
 * @param {object} lead - Lead object
 * @param {object} db - Database object
 * @returns {object|null} The nurture step to execute, or null
 */
export function processNurtureStep(lead, db) {
  if (!db) db = getDb();
  
  // Skip if nurture is paused
  if (lead.nurturePaused) return null;
  
  // Skip won/lost
  if (['won', 'lost'].includes(lead.stage)) return null;
  
  const nurtureLog = db.nurtureLog || [];
  const leadLogs = nurtureLog.filter(log => log.leadId === lead.id);
  
  // Get the sequence for this lead
  const sequence = getNurtureSequence(lead.stage, lead);
  if (!sequence || sequence.length === 0) return null;
  
  // Find the next step to execute
  const completedSteps = leadLogs.filter(log => log.status === 'sent').length;
  
  if (completedSteps >= sequence.length) return null; // All steps done
  
  const nextStep = sequence[completedSteps];
  
  // Check if enough time has passed since the last step
  if (leadLogs.length > 0) {
    const lastLog = leadLogs[leadLogs.length - 1];
    const lastSent = new Date(lastLog.sentAt);
    const hoursSinceLastStep = (Date.now() - lastSent.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastStep < nextStep.delayHours) {
      return null; // Not time yet
    }
  } else {
    // First step — check if enough time since lead creation
    if (lead.createdAt) {
      const created = new Date(lead.createdAt);
      const hoursSinceCreated = (Date.now() - created.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceCreated < nextStep.delayHours) {
        return null; // Not time yet
      }
    }
  }
  
  // Replace template variables
  const project = (db.projects || []).find(p => p.id === lead.projectId);
  const template = nextStep.template
    .replace(/\{\{name\}\}/g, lead.name || '')
    .replace(/\{\{project\}\}/g, project ? project.name : 'our project')
    .replace(/\{\{config\}\}/g, lead.config || '')
    .replace(/\{\{rep\}\}/g, lead.rep || 'our team');
  
  return {
    stepNumber: nextStep.stepNumber,
    messageType: nextStep.messageType,
    channel: nextStep.channel,
    template,
    leadId: lead.id,
    leadName: lead.name,
    phone: lead.phone,
  };
}

// ── Lead Temperature Decay ───────────────────────────────────────────────────

/**
 * Apply temperature decay to lead scores based on inactivity.
 * Run periodically (e.g., every hour).
 * @param {object} db - Database object
 * @returns {Array} Array of { leadId, oldScore, newScore, daysSinceActivity }
 */
export function applyTemperatureDecay(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const results = [];
  const now = new Date();

  for (const lead of contacts) {
    if (['won', 'lost'].includes(lead.stage)) continue;
    if (!lead.score || lead.score <= 10) continue;

    const lastActivity = getLastActivityTime(lead);
    if (!lastActivity) continue;

    const hoursSince = (now - lastActivity) / (1000 * 60 * 60);
    const daysSince = Math.floor(hoursSince / 24);
    const oldScore = lead.score;
    let deduction = 0;

    if (hoursSince >= 336) {        // 14 days
      deduction = 50;                // 24h: -5, 48h: -15, 72h: -25, 7d: -40, 14d: -50
    } else if (hoursSince >= 168) {  // 7 days
      deduction = 40;
    } else if (hoursSince >= 72) {   // 72 hours
      deduction = 25;
    } else if (hoursSince >= 48) {   // 48 hours
      deduction = 15;
    } else if (hoursSince >= 24) {   // 24 hours
      deduction = 5;
    }

    if (deduction > 0) {
      const newScore = Math.max(10, oldScore - deduction);
      if (newScore !== oldScore) {
        lead.score = newScore;

        // Add timeline entry if score changed significantly (>10 points)
        if (oldScore - newScore > 10) {
          if (!lead.timeline) lead.timeline = [];
          lead.timeline.unshift({
            type: 'score',
            text: `Lead temperature dropped: ${oldScore} → ${newScore} (${daysSince}d inactive)`,
            time: 'Just now',
            icon: 'thermometer'
          });
        }

        results.push({
          leadId: lead.id,
          leadName: lead.name,
          oldScore,
          newScore,
          daysSinceActivity: daysSince,
          deduction
        });
      }
    }
  }

  return results;
}

// ── Utility: Normalize source name from webhook input ────────────────────────

/**
 * Normalize a source string from webhook to display name.
 * @param {string} source - Raw source from webhook
 * @returns {string} Normalized display name
 */
export function normalizeSource(source) {
  if (!source) return 'Website';
  return SOURCE_ALIASES[source.toLowerCase()] || source;
}

/**
 * Get all supported lead sources with configuration.
 * @returns {Array} Array of source config objects
 */
export function getSupportedSources() {
  return [
    { id: 'instagram', name: 'Instagram', icon: 'instagram', color: '#E1306C', costPerLead: 45, active: true },
    { id: 'facebook', name: 'Facebook', icon: 'facebook', color: '#1877F2', costPerLead: 40, active: true },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'message-circle', color: '#25D366', costPerLead: 5, active: true },
    { id: 'google-ads', name: 'Google Ads', icon: 'search', color: '#4285F4', costPerLead: 60, active: true },
    { id: '99acres', name: '99acres', icon: 'home', color: '#FF6600', costPerLead: 35, active: true },
    { id: 'magicbricks', name: 'MagicBricks', icon: 'building', color: '#0066CC', costPerLead: 35, active: true },
    { id: 'housing', name: 'Housing.com', icon: 'building-2', color: '#00A699', costPerLead: 30, active: true },
    { id: 'website', name: 'Website', icon: 'globe', color: '#6366F1', costPerLead: 10, active: true },
    { id: 'walk-in', name: 'Walk-in', icon: 'footprints', color: '#10B981', costPerLead: 0, active: true },
    { id: 'call-in', name: 'Call-in', icon: 'phone', color: '#F59E0B', costPerLead: 0, active: true },
    { id: 'referral', name: 'Referral', icon: 'users', color: '#8B5CF6', costPerLead: 0, active: true },
  ];
}
