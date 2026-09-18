import express from 'express';
import { getDb } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', authorize('reports', 'read'), (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];

  // 1. Revenue Forecast
  const activeContacts = contacts.filter(c => c.stage !== 'lost');
  const weightedPipeline = activeContacts.reduce((sum, c) => sum + Math.round((c.value || 0) * ((c.dealProb || 50) / 100)), 0);
  const totalPipeline = activeContacts.reduce((sum, c) => sum + (c.value || 0), 0);
  const wonRevenue = contacts.filter(c => c.stage === 'won').reduce((sum, c) => sum + (c.value || 0), 0);

  // 2. Conversion Funnel
  const funnelStages = ['new', 'contacted', 'qualified', 'negotiation', 'won'];
  const funnel = funnelStages.map(stage => {
    const count = contacts.filter(c => c.stage === stage).length;
    const value = contacts.filter(c => c.stage === stage).reduce((s, c) => s + (c.value || 0), 0);
    return { stage, count, value };
  });

  // 3. Loss Reasons
  const lostContacts = contacts.filter(c => c.stage === 'lost' || c.lossReason);
  const lossReasonCounts = {};
  lostContacts.forEach(c => {
    const r = c.lossReason || 'Budget mismatch';
    lossReasonCounts[r] = (lossReasonCounts[r] || 0) + 1;
  });
  const lossReasons = Object.entries(lossReasonCounts).map(([reason, count]) => ({ reason, count }));

  // 4. Marketing Source ROI
  const sources = ['Facebook Ads', 'Google Ads', '99acres', 'MagicBricks', 'Instagram', 'Referral', 'Website', 'Walk-in'];
  const sourceROI = sources.map(src => {
    const srcLeads = contacts.filter(c => c.source === src);
    const wonLeads = srcLeads.filter(c => c.stage === 'won');
    const totalVal = srcLeads.reduce((s, c) => s + (c.value || 0), 0);
    const wonVal = wonLeads.reduce((s, c) => s + (c.value || 0), 0);
    const convRate = srcLeads.length > 0 ? Math.round((wonLeads.length / srcLeads.length) * 100) : 0;
    return {
      source: src,
      leads: srcLeads.length,
      dealsClosed: wonLeads.length,
      pipelineValue: totalVal,
      closedRevenue: wonVal,
      conversionRate: convRate
    };
  });

  // 5. Agent Leaderboard
  const team = db.team || [];
  const leaderboard = team.map(member => {
    const agentLeads = contacts.filter(c => c.rep === member.name);
    const won = agentLeads.filter(c => c.stage === 'won');
    const closedVal = won.reduce((s, c) => s + (c.value || 0), 0);
    const commission = won.reduce((s, c) => s + ((c.commission && c.commission.earned) || 0), 0);
    return {
      name: member.name,
      role: member.role,
      activeLeads: agentLeads.length,
      dealsWon: won.length,
      closedRevenue: closedVal,
      commissionEarned: commission
    };
  });

  res.json({
    success: true,
    data: {
      forecast: {
        weightedPipeline,
        totalPipeline,
        wonRevenue,
        quarterTarget: 50000000,
        progressPct: Math.min(100, Math.round((wonRevenue / 50000000) * 100))
      },
      funnel,
      lossReasons,
      sourceROI,
      leaderboard,
      dealVelocity: [
        { stage: 'New to Contacted', avgDays: 0.2 },
        { stage: 'Contacted to Qualified', avgDays: 1.8 },
        { stage: 'Qualified to Site Visit', avgDays: 3.4 },
        { stage: 'Site Visit to Negotiation', avgDays: 5.2 },
        { stage: 'Negotiation to Closed Won', avgDays: 7.1 }
      ]
    }
  });
});

export default router;
