import express from 'express';
import { getDb, saveDb } from '../data/db.js';
import { triggerStageChange } from '../data/automation.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('pipeline', 'read'), (req, res) => {
  const db = getDb();
  const stages = db.stages || [];
  let contacts = db.contacts || [];

  // Agent scoping — agents only see their own assigned leads in pipeline
  if (req.user?.role === 'agent') {
    const user = (db.users || []).find(u => u.id === req.user.id);
    if (user) {
      contacts = contacts.filter(c => c.rep === user.name);
    }
  }

  const board = {};
  stages.forEach(s => {
    board[s.id] = contacts.filter(c => c.stage === s.id);
  });

  const stageStats = stages.map(s => {
    const stageContacts = board[s.id] || [];
    const totalValue = stageContacts.reduce((sum, c) => sum + (c.value || 0), 0);
    return {
      stageId: s.id,
      stageName: s.name,
      count: stageContacts.length,
      totalValue
    };
  });

  const totalPipelineValue = contacts
    .filter(c => c.stage !== 'lost')
    .reduce((sum, c) => sum + (c.value || 0), 0);

  res.json({
    success: true,
    data: {
      stages,
      board,
      stageStats,
      totalLeads: contacts.length,
      totalPipelineValue
    }
  });
});

router.put('/:id/stage', authorize('pipeline', 'update'), (req, res) => {
  const { stage, lossReason, dealProb } = req.body;
  if (!stage) return res.status(400).json({ success: false, message: 'Stage is required' });

  const db = getDb();
  const contact = db.contacts.find(c => Number(c.id) === Number(req.params.id));
  if (!contact) {
    console.log(`[DEBUG] pipeline route 404: requested id=${req.params.id}. Available contact IDs: ${db.contacts.map(c => c.id).join(', ')}`);
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  // Agent scoping — agent can only move their own assigned leads
  if (req.user?.role === 'agent') {
    const user = (db.users || []).find(u => u.id === req.user.id);
    if (user && contact.rep !== user.name) {
      return res.status(403).json({ success: false, message: 'Permission denied: you can only update your own assigned leads' });
    }
  }

  const prevStage = contact.stage;
  contact.stage = stage;

  if (stage === 'won') {
    contact.dealProb = 100;
    contact.lossReason = null;
    const rate = (contact.commission && contact.commission.rate) || 2;
    contact.commission = {
      rate,
      earned: Math.round((contact.value || 0) * (rate / 100))
    };
  } else if (stage === 'lost') {
    contact.dealProb = 0;
    contact.lossReason = lossReason || 'Budget mismatch';
  } else if (dealProb !== undefined) {
    contact.dealProb = Number(dealProb);
  } else {
    // Default sensible probability
    const stageProbMap = { new: 30, contacted: 45, qualified: 65, negotiation: 80 };
    contact.dealProb = stageProbMap[stage] || 50;
    contact.lossReason = null;
  }

  if (!contact.timeline) contact.timeline = [];
  contact.timeline.unshift({
    type: 'stage-change',
    text: `Stage changed from ${prevStage.toUpperCase()} to ${stage.toUpperCase()}` + (stage === 'lost' && lossReason ? ` (${lossReason})` : ''),
    time: 'Just now',
    icon: 'target'
  });

  saveDb();

  // Trigger stage-change automation (fire-and-forget)
  triggerStageChange(contact, prevStage, stage).catch(err =>
    console.error('Stage change automation error:', err.message)
  );

  res.json({ success: true, data: contact });
});

export default router;
