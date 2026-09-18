/**
 * Payment Milestone Tracking
 * Tracks construction-linked payment milestones for post-booking leads.
 */

import { getDb, getCollection, insertItem, updateItem, saveDb } from './db.js';

export const MILESTONE_TEMPLATES = [
  { id: 'booking', name: 'Booking Amount', percentage: 10, trigger: 'On booking', order: 1 },
  { id: 'agreement', name: 'Agreement Execution', percentage: 15, trigger: 'Within 30 days of booking', order: 2 },
  { id: 'slab_1', name: '1st Slab Completion', percentage: 15, trigger: 'On structure milestone', order: 3 },
  { id: 'slab_2', name: '2nd Slab Completion', percentage: 15, trigger: 'On structure milestone', order: 4 },
  { id: 'slab_3', name: '3rd Slab Completion', percentage: 10, trigger: 'On structure milestone', order: 5 },
  { id: 'brickwork', name: 'Brickwork Complete', percentage: 10, trigger: 'On construction milestone', order: 6 },
  { id: 'plaster', name: 'Plastering Complete', percentage: 10, trigger: 'On construction milestone', order: 7 },
  { id: 'possession', name: 'Possession', percentage: 15, trigger: 'On handover', order: 8 },
];

/**
 * Initialize milestones for a won lead.
 */
export function initMilestones(lead, db) {
  if (!db) db = getDb();
  const dealValue = lead.value || 0;
  const milestones = MILESTONE_TEMPLATES.map(t => ({
    id: `${lead.id}_${t.id}`,
    leadId: lead.id,
    milestoneId: t.id,
    name: t.name,
    percentage: t.percentage,
    amount: Math.round(dealValue * (t.percentage / 100)),
    trigger: t.trigger,
    order: t.order,
    status: t.order === 1 ? 'paid' : 'pending',
    dueDate: calculateDueDate(t.order),
    paidAt: t.order === 1 ? new Date().toISOString() : null,
    createdAt: new Date().toISOString()
  }));

  // Store in paymentMilestones collection
  const existing = (db.paymentMilestones || []).filter(m => Number(m.leadId) !== Number(lead.id));
  db.paymentMilestones = [...existing, ...milestones];

  // Update lead
  lead.paymentMilestones = milestones.map(m => m.id);
  lead.paymentStatus = {
    totalValue: dealValue,
    totalPaid: milestones.filter(m => m.status === 'paid').reduce((s, m) => s + m.amount, 0),
    totalPending: milestones.filter(m => m.status !== 'paid').reduce((s, m) => s + m.amount, 0),
    milestonesCompleted: milestones.filter(m => m.status === 'paid').length,
    totalMilestones: milestones.length,
    lastUpdated: new Date().toISOString()
  };

  saveDb();
  return milestones;
}

/**
 * Update milestone status.
 */
export function updateMilestoneStatus(leadId, milestoneId, status, db) {
  if (!db) db = getDb();
  const milestones = db.paymentMilestones || [];
  const milestone = milestones.find(m =>
    Number(m.leadId) === Number(leadId) && m.milestoneId === milestoneId
  );
  if (!milestone) return null;

  const validStatuses = ['pending', 'due', 'paid', 'overdue'];
  if (!validStatuses.includes(status)) return null;

  milestone.status = status;
  if (status === 'paid') milestone.paidAt = new Date().toISOString();
  milestone.updatedAt = new Date().toISOString();

  // Update lead payment status
  const leadMilestones = milestones.filter(m => Number(m.leadId) === Number(leadId));
  const contacts = db.contacts || [];
  const lead = contacts.find(c => Number(c.id) === Number(leadId));
  if (lead) {
    lead.paymentStatus = {
      totalValue: lead.value || 0,
      totalPaid: leadMilestones.filter(m => m.status === 'paid').reduce((s, m) => s + m.amount, 0),
      totalPending: leadMilestones.filter(m => m.status !== 'paid').reduce((s, m) => s + m.amount, 0),
      milestonesCompleted: leadMilestones.filter(m => m.status === 'paid').length,
      totalMilestones: leadMilestones.length,
      lastUpdated: new Date().toISOString()
    };
  }

  saveDb();
  return milestone;
}

/**
 * Get payment summary for a lead.
 */
export function getPaymentSummary(lead, db) {
  if (!db) db = getDb();
  const milestones = (db.paymentMilestones || [])
    .filter(m => Number(m.leadId) === Number(lead.id))
    .sort((a, b) => a.order - b.order);

  const totalValue = lead.value || 0;
  const totalPaid = milestones.filter(m => m.status === 'paid').reduce((s, m) => s + m.amount, 0);
  const totalPending = milestones.filter(m => m.status !== 'paid').reduce((s, m) => s + m.amount, 0);
  const nextDue = milestones.find(m => m.status === 'pending' || m.status === 'due');
  const overdueCount = milestones.filter(m => m.status === 'overdue').length;

  return {
    leadId: lead.id,
    leadName: lead.name,
    totalValue,
    totalPaid,
    totalPending,
    paidPercentage: totalValue > 0 ? Math.round((totalPaid / totalValue) * 100) : 0,
    milestones,
    nextDue: nextDue ? { name: nextDue.name, amount: nextDue.amount, dueDate: nextDue.dueDate } : null,
    overdueCount
  };
}

/**
 * Get all overdue payments across all won leads.
 */
export function getOverduePayments(db) {
  if (!db) db = getDb();
  const milestones = db.paymentMilestones || [];
  const contacts = db.contacts || [];
  const now = new Date();
  const overdue = [];

  for (const m of milestones) {
    if (m.status === 'paid' || m.status === 'overdue') {
      if (m.status === 'overdue') {
        const lead = contacts.find(c => Number(c.id) === Number(m.leadId));
        overdue.push({
          leadId: m.leadId,
          leadName: lead ? lead.name : 'Unknown',
          milestoneId: m.milestoneId,
          milestoneName: m.name,
          amount: m.amount,
          dueDate: m.dueDate,
          daysOverdue: m.dueDate ? Math.floor((now - new Date(m.dueDate)) / (1000 * 60 * 60 * 24)) : 0
        });
      }
      continue;
    }

    // Check if pending/due milestones are past their due date
    if (m.dueDate && new Date(m.dueDate) < now && m.status !== 'paid') {
      m.status = 'overdue';
      const lead = contacts.find(c => Number(c.id) === Number(m.leadId));
      overdue.push({
        leadId: m.leadId,
        leadName: lead ? lead.name : 'Unknown',
        milestoneId: m.milestoneId,
        milestoneName: m.name,
        amount: m.amount,
        dueDate: m.dueDate,
        daysOverdue: Math.floor((now - new Date(m.dueDate)) / (1000 * 60 * 60 * 24))
      });
    }
  }

  saveDb();
  return overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function calculateDueDate(order) {
  const now = new Date();
  const daysToAdd = order === 1 ? 0 : order * 30;
  now.setDate(now.getDate() + daysToAdd);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}
