/**
 * Commission Auto-Calculation Engine
 * Calculates commissions for channel partners on deal close.
 */

import { getDb, getCollection, updateItem, saveDb } from './db.js';

/**
 * Auto-calculate commission when a deal closes.
 */
export function calculateCommission(lead, partner, db) {
  if (!db) db = getDb();
  const dealValue = lead.value || 0;
  const rate = partner.commissionRate || 2;
  const commissionAmount = Math.round(dealValue * (rate / 100));

  return {
    commissionAmount,
    rate,
    dealValue,
    partnerId: partner.id,
    partnerName: partner.name,
    breakdown: {
      baseValue: dealValue,
      commissionRate: rate,
      percentage: `${rate}%`,
      calculatedAmount: commissionAmount,
      currency: 'INR',
      formattedAmount: `₹${(commissionAmount / 100000).toFixed(1)}L`
    }
  };
}

/**
 * Process commission for all won leads linked to partners.
 */
export function processAllCommissions(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const partners = db.partners || [];
  const results = [];

  const wonLeads = contacts.filter(c => c.stage === 'won');

  for (const lead of wonLeads) {
    // Find partner linked to this lead (via source matching or referral tag)
    const partner = partners.find(p => {
      if (lead.referredBy && Number(lead.referredBy) === Number(p.id)) return true;
      if ((lead.tags || []).includes(`partner-${p.id}`)) return true;
      if (lead.source === 'Referral' && p.type === 'referral') return true;
      return false;
    });

    if (!partner) continue;

    // Check if commission already processed
    if (lead.commission && lead.commission.processed) continue;

    const calc = calculateCommission(lead, partner, db);

    // Update lead commission
    lead.commission = {
      ...lead.commission,
      rate: calc.rate,
      earned: calc.commissionAmount,
      processed: true,
      processedAt: new Date().toISOString(),
      partnerId: partner.id,
      partnerName: partner.name
    };

    // Update partner totals
    partner.commissionEarned = (partner.commissionEarned || 0) + calc.commissionAmount;
    partner.dealsClosed = (partner.dealsClosed || 0) + 1;
    partner.totalRevenue = (partner.totalRevenue || 0) + calc.dealValue;

    results.push({
      leadId: lead.id,
      partnerId: partner.id,
      partnerName: partner.name,
      amount: calc.commissionAmount,
      dealValue: calc.dealValue,
      rate: calc.rate,
      status: 'processed'
    });
  }

  if (results.length > 0) saveDb();
  return results;
}

/**
 * Get commission summary across all partners.
 */
export function getCommissionSummary(db) {
  if (!db) db = getDb();
  const contacts = db.contacts || [];
  const partners = db.partners || [];

  let totalPaid = 0;
  let totalPending = 0;
  const byPartner = [];
  const byMonth = {};

  for (const partner of partners) {
    const earned = partner.commissionEarned || 0;
    totalPaid += earned;

    byPartner.push({
      partnerId: partner.id,
      partnerName: partner.name,
      company: partner.company,
      totalEarned: earned,
      commissionRate: partner.commissionRate,
      dealsClosed: partner.dealsClosed || 0
    });
  }

  // Pending commissions from won leads not yet processed
  const wonLeads = contacts.filter(c => c.stage === 'won');
  for (const lead of wonLeads) {
    if (lead.commission && !lead.commission.processed && lead.commission.earned > 0) {
      totalPending += lead.commission.earned;
    }
  }

  // By month breakdown (from lead close dates)
  for (const lead of wonLeads) {
    const closeDate = lead.updatedAt || lead.createdAt;
    if (!closeDate) continue;
    const month = new Date(closeDate).toISOString().substring(0, 7); // YYYY-MM
    if (!byMonth[month]) byMonth[month] = { month, totalCommission: 0, dealCount: 0 };
    byMonth[month].totalCommission += (lead.commission && lead.commission.earned) || 0;
    byMonth[month].dealCount += 1;
  }

  return {
    totalPaid,
    totalPending,
    totalCommission: totalPaid + totalPending,
    byPartner: byPartner.sort((a, b) => b.totalEarned - a.totalEarned),
    byMonth: Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month))
  };
}

/**
 * Get partner performance rankings.
 */
export function getPartnerRankings(db) {
  if (!db) db = getDb();
  const partners = db.partners || [];

  return partners
    .map(p => ({
      partnerId: p.id,
      partnerName: p.name,
      company: p.company,
      type: p.type,
      leadsReferred: p.leadsReferred || 0,
      dealsClosed: p.dealsClosed || 0,
      conversionRate: p.leadsReferred > 0
        ? Math.round((p.dealsClosed / p.leadsReferred) * 100)
        : 0,
      totalRevenue: p.totalRevenue || 0,
      commissionEarned: p.commissionEarned || 0,
      commissionRate: p.commissionRate || 0,
      rating: p.rating || 0,
      status: p.status
    }))
    .sort((a, b) => b.conversionRate - a.conversionRate);
}
