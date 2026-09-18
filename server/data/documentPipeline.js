/**
 * Document Collection Pipeline
 * Tracks required documents per lead stage, auto-reminds for missing docs.
 */

import { getDb, getCollection, saveDb } from './db.js';

export const DOCUMENT_CHECKLIST = [
  { id: 'pan', name: 'PAN Card', category: 'ID', required: true, stage: 'qualified' },
  { id: 'aadhaar', name: 'Aadhaar Card', category: 'ID', required: true, stage: 'qualified' },
  { id: 'income_proof', name: 'Income Proof (ITR/Salary Slip)', category: 'Financial', required: true, stage: 'qualified' },
  { id: 'bank_statement', name: 'Bank Statement (6 months)', category: 'Financial', required: true, stage: 'qualified' },
  { id: 'passport_photo', name: 'Passport Size Photo', category: 'ID', required: true, stage: 'new' },
  { id: 'booking_form', name: 'Signed Booking Form', category: 'Legal', required: true, stage: 'negotiation' },
  { id: 'token_receipt', name: 'Token Money Receipt', category: 'Financial', required: true, stage: 'negotiation' },
  { id: 'agreement', name: 'Sale Agreement', category: 'Legal', required: true, stage: 'won' },
  { id: 'noc', name: 'NOC from Bank', category: 'Legal', required: false, stage: 'won' },
  { id: 'registration_docs', name: 'Registration Documents', category: 'Legal', required: true, stage: 'won' },
];

const STAGE_ORDER = ['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost'];

function getRequiredDocs(stage) {
  const stageIdx = STAGE_ORDER.indexOf(stage);
  return DOCUMENT_CHECKLIST.filter(doc => {
    const docIdx = STAGE_ORDER.indexOf(doc.stage);
    return docIdx <= stageIdx;
  });
}

function normalizeDocName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchLeadDoc(leadDoc, checklistItem) {
  const leadName = normalizeDocName(leadDoc.name || leadDoc);
  const checkName = normalizeDocName(checklistItem.name);
  const checkId = checklistItem.id.replace(/_/g, '');
  return leadName.includes(checkId) || checkName.includes(leadName.substring(0, 8));
}

/**
 * Get document status for a lead.
 */
export function getDocumentStatus(lead, db) {
  if (!db) db = getDb();
  const requiredDocs = getRequiredDocs(lead.stage || 'new');
  const leadDocs = lead.documents || [];
  const collected = [];
  const missing = [];
  const pending = [];

  for (const doc of requiredDocs) {
    const found = leadDocs.some(ld => matchLeadDoc(ld, doc));
    if (found) {
      collected.push(doc);
    } else if (doc.required) {
      missing.push({ ...doc, urgency: getStageUrgency(lead.stage) });
    } else {
      pending.push(doc);
    }
  }

  return {
    leadId: lead.id,
    leadName: lead.name,
    stage: lead.stage,
    total: requiredDocs.length,
    collected: collected.length,
    missing: missing.length,
    pending: pending.length,
    percentage: requiredDocs.length > 0 ? Math.round((collected.length / requiredDocs.length) * 100) : 100,
    missingDocs: missing,
    pendingDocs: pending
  };
}

/**
 * Get all leads with missing documents.
 */
export function getLeadsWithMissingDocs(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const results = [];

  for (const lead of contacts) {
    if (['lost'].includes(lead.stage)) continue;
    const status = getDocumentStatus(lead, db);
    if (status.missing > 0) {
      results.push({
        leadId: lead.id,
        leadName: lead.name,
        stage: lead.stage,
        rep: lead.rep,
        missingCount: status.missing,
        missingDocs: status.missingDocs,
        percentage: status.percentage,
        urgency: getStageUrgency(lead.stage)
      });
    }
  }

  return results.sort((a, b) => {
    const urgOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (urgOrder[a.urgency] || 4) - (urgOrder[b.urgency] || 4);
  });
}

/**
 * Auto-remind for missing documents.
 */
export function getDocumentReminders(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const reminders = [];

  for (const lead of contacts) {
    if (['lost', 'new'].includes(lead.stage)) continue;
    const status = getDocumentStatus(lead, db);
    if (status.missing === 0) continue;

    // Check if a reminder was recently sent (within 24 hours)
    const lastDocReminder = (lead.timeline || []).find(t =>
      t.type === 'document-reminder' || (t.text && t.text.includes('document'))
    );
    if (lastDocReminder) {
      // Simple check — if it says "Just now" or "min ago", skip
      if (lastDocReminder.time && (lastDocReminder.time.includes('min') || lastDocReminder.time === 'Just now')) {
        continue;
      }
    }

    reminders.push({
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      stage: lead.stage,
      rep: lead.rep,
      missingDocs: status.missingDocs.map(d => d.name),
      missingCount: status.missing,
      urgency: getStageUrgency(lead.stage),
      message: `Hi ${lead.name}, we still need ${status.missing} document(s) to proceed: ${status.missingDocs.map(d => d.name).join(', ')}. Please share at your earliest convenience.`
    });
  }

  return reminders.sort((a, b) => {
    const urgOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (urgOrder[a.urgency] || 4) - (urgOrder[b.urgency] || 4);
  });
}

/**
 * Mark a document as collected for a lead.
 */
export function markDocumentCollected(leadId, docId, db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const lead = contacts.find(c => Number(c.id) === Number(leadId));
  if (!lead) return null;

  const checklistItem = DOCUMENT_CHECKLIST.find(d => d.id === docId);
  if (!checklistItem) return null;

  if (!lead.documents) lead.documents = [];
  const alreadyCollected = lead.documents.some(ld => matchLeadDoc(ld, checklistItem));
  if (alreadyCollected) return { status: 'already_collected' };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  lead.documents.push({
    name: checklistItem.name,
    type: checklistItem.category,
    date: `${months[now.getMonth()]} ${now.getDate()}`,
    collectedAt: now.toISOString()
  });

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'document',
    text: `Document collected: ${checklistItem.name}`,
    time: 'Just now',
    icon: 'filetext'
  });

  saveDb();
  return getDocumentStatus(lead, db);
}

function getStageUrgency(stage) {
  if (stage === 'won') return 'CRITICAL';
  if (stage === 'negotiation') return 'HIGH';
  if (stage === 'qualified') return 'MEDIUM';
  return 'LOW';
}
