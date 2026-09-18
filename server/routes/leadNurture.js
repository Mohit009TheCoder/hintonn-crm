/**
 * Lead Nurture Sequence Management Routes
 * 
 * Manages nurture sequences, active nurtures, and analytics.
 */

import express from 'express';
import { getCollection, insertItem, updateItem, deleteItem, getDb, saveDb } from '../data/db.js';
import { getNurtureSequence, processNurtureStep } from '../data/leadEngine.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// ── GET /api/nurture/sequences — List all nurture sequences ──────────────────

router.get('/sequences', authorize('leads', 'read'), (req, res) => {
  const sequences = getCollection('nurtureSequences');
  res.json({ success: true, count: sequences.length, data: sequences });
});

// ── POST /api/nurture/sequences — Create new sequence ────────────────────────

router.post('/sequences', authorize('leads', 'update'), (req, res) => {
  const { name, description, trigger, steps, status } = req.body;
  
  if (!name || !steps || !Array.isArray(steps)) {
    return res.status(400).json({ success: false, message: 'Name and steps array are required' });
  }

  const newSequence = {
    name,
    description: description || '',
    trigger: trigger || '',
    steps: steps.map((step, idx) => ({
      stepNumber: idx + 1,
      delayHours: step.delayHours || 0,
      messageType: step.messageType || 'whatsapp',
      template: step.template || '',
      channel: step.channel || 'whatsapp',
    })),
    status: status || 'active',
    activeLeads: 0,
    createdAt: new Date().toISOString(),
  };

  const saved = insertItem('nurtureSequences', newSequence);
  saveDb();

  res.status(201).json({ success: true, data: saved });
});

// ── PUT /api/nurture/sequences/:id — Update sequence ─────────────────────────

router.put('/sequences/:id', authorize('leads', 'update'), (req, res) => {
  const { name, description, trigger, steps, status } = req.body;
  const db = getDb();
  const sequences = db.nurtureSequences || [];
  const sequence = sequences.find(s => Number(s.id) === Number(req.params.id));
  
  if (!sequence) {
    return res.status(404).json({ success: false, message: 'Sequence not found' });
  }

  if (name) sequence.name = name;
  if (description !== undefined) sequence.description = description;
  if (trigger) sequence.trigger = trigger;
  if (status) sequence.status = status;
  
  if (steps && Array.isArray(steps)) {
    sequence.steps = steps.map((step, idx) => ({
      stepNumber: idx + 1,
      delayHours: step.delayHours || 0,
      messageType: step.messageType || 'whatsapp',
      template: step.template || '',
      channel: step.channel || 'whatsapp',
    }));
  }

  sequence.updatedAt = new Date().toISOString();
  saveDb();

  res.json({ success: true, data: sequence });
});

// ── DELETE /api/nurture/sequences/:id — Delete sequence ──────────────────────

router.delete('/sequences/:id', authorize('leads', 'update'), (req, res) => {
  const success = deleteItem('nurtureSequences', req.params.id);
  
  if (!success) {
    return res.status(404).json({ success: false, message: 'Sequence not found' });
  }

  saveDb();
  res.json({ success: true, message: 'Sequence deleted' });
});

// ── GET /api/nurture/active — Get all leads currently in nurture ─────────────

router.get('/active', authorize('leads', 'read'), (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];
  const nurtureLog = db.nurtureLog || [];
  const sequences = db.nurtureSequences || [];

  const activeNurtures = [];

  for (const lead of contacts) {
    if (['won', 'lost'].includes(lead.stage)) continue;
    if (lead.nurturePaused) continue;

    // Check if lead has nurture activity
    const leadLogs = nurtureLog.filter(log => log.leadId === lead.id);
    if (leadLogs.length === 0) continue;

    // Find the sequence this lead is in
    const sequence = getNurtureSequence(lead.stage, lead);
    if (!sequence || sequence.length === 0) continue;

    const completedSteps = leadLogs.filter(log => log.status === 'sent').length;
    const totalSteps = sequence.length;

    activeNurtures.push({
      leadId: lead.id,
      leadName: lead.name,
      phone: lead.phone,
      stage: lead.stage,
      rep: lead.rep,
      sequenceName: findSequenceName(lead.stage, lead, sequences),
      completedSteps,
      totalSteps,
      progress: Math.round((completedSteps / totalSteps) * 100),
      lastActivity: leadLogs.length > 0 ? leadLogs[leadLogs.length - 1].sentAt : null,
      isPaused: !!lead.nurturePaused,
    });
  }

  res.json({
    success: true,
    count: activeNurtures.length,
    data: activeNurtures,
  });
});

// ── POST /api/nurture/pause/:leadId — Pause nurture for a lead ──────────────

router.post('/pause/:leadId', authorize('leads', 'update'), (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];
  const lead = contacts.find(c => Number(c.id) === Number(req.params.leadId));
  
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  lead.nurturePaused = true;
  lead.nurturePausedAt = new Date().toISOString();
  lead.nurturePausedReason = req.body.reason || 'Manual pause';

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'nurture',
    text: 'Nurture sequence paused',
    time: 'Just now',
    icon: 'pause',
  });

  saveDb();
  res.json({ success: true, message: 'Nurture paused', data: { leadId: lead.id, isPaused: true } });
});

// ── POST /api/nurture/resume/:leadId — Resume nurture ───────────────────────

router.post('/resume/:leadId', authorize('leads', 'update'), (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];
  const lead = contacts.find(c => Number(c.id) === Number(req.params.leadId));
  
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  lead.nurturePaused = false;
  delete lead.nurturePausedAt;
  delete lead.nurturePausedReason;

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'nurture',
    text: 'Nurture sequence resumed',
    time: 'Just now',
    icon: 'play',
  });

  saveDb();
  res.json({ success: true, message: 'Nurture resumed', data: { leadId: lead.id, isPaused: false } });
});

// ── POST /api/nurture/manual-step/:leadId — Manually trigger next step ───────

router.post('/manual-step/:leadId', authorize('leads', 'update'), (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];
  const lead = contacts.find(c => Number(c.id) === Number(req.params.leadId));
  
  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  // Force process nurture step (ignoring timing)
  const nurtureLog = db.nurtureLog || [];
  const leadLogs = nurtureLog.filter(log => log.leadId === lead.id);
  const sequence = getNurtureSequence(lead.stage, lead);

  if (!sequence || sequence.length === 0) {
    return res.status(400).json({ success: false, message: 'No nurture sequence found for this lead' });
  }

  const completedSteps = leadLogs.filter(log => log.status === 'sent').length;
  
  if (completedSteps >= sequence.length) {
    return res.status(400).json({ success: false, message: 'All nurture steps already completed' });
  }

  const nextStep = sequence[completedSteps];
  
  // Replace template variables
  const project = (db.projects || []).find(p => p.id === lead.projectId);
  const message = nextStep.template
    .replace(/\{\{name\}\}/g, lead.name || '')
    .replace(/\{\{project\}\}/g, project ? project.name : 'our project')
    .replace(/\{\{config\}\}/g, lead.config || '')
    .replace(/\{\{rep\}\}/g, lead.rep || 'our team');

  // Log the nurture step
  if (!db.nurtureLog) db.nurtureLog = [];
  db.nurtureLog.push({
    leadId: lead.id,
    leadName: lead.name,
    sequenceName: findSequenceName(lead.stage, lead, db.nurtureSequences || []),
    stepNumber: nextStep.stepNumber,
    messageType: nextStep.messageType,
    channel: nextStep.channel,
    message,
    status: 'sent',
    sentAt: new Date().toISOString(),
    sentBy: 'manual',
  });

  // Add to lead timeline
  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'nurture',
    text: `Nurture step ${nextStep.stepNumber}: ${message.substring(0, 50)}...`,
    time: 'Just now',
    icon: 'send',
  });

  // Add to lead's waLog if WhatsApp
  if (nextStep.channel === 'whatsapp') {
    if (!lead.waLog) lead.waLog = [];
    lead.waLog.push({
      id: lead.waLog.length + 1,
      text: message,
      time: new Date().toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, day: 'numeric', month: 'short' }),
      dir: 'out',
      auto: false,
      nurtureStep: nextStep.stepNumber,
      sentAt: new Date().toISOString(),
    });
  }

  saveDb();

  res.json({
    success: true,
    data: {
      leadId: lead.id,
      stepNumber: nextStep.stepNumber,
      message,
      channel: nextStep.channel,
      remainingSteps: sequence.length - completedSteps - 1,
    },
  });
});

// ── GET /api/nurture/analytics — Nurture performance metrics ─────────────────

router.get('/analytics', authorize('leads', 'read'), (req, res) => {
  const db = getDb();
  const nurtureLog = db.nurtureLog || [];
  const contacts = db.contacts || [];
  const sequences = db.nurtureSequences || [];

  // Overall stats
  const totalMessages = nurtureLog.length;
  const uniqueLeads = new Set(nurtureLog.map(log => log.leadId)).size;
  const activeNurtures = contacts.filter(c => !['won', 'lost'].includes(c.stage) && !c.nurturePaused).length;
  const pausedNurtures = contacts.filter(c => c.nurturePaused).length;

  // Per-sequence stats
  const sequenceStats = sequences.map(seq => {
    const seqLogs = nurtureLog.filter(log => log.sequenceName === seq.name);
    const uniqueSeqLeads = new Set(seqLogs.map(log => log.leadId)).size;
    
    return {
      id: seq.id,
      name: seq.name,
      totalMessages: seqLogs.length,
      uniqueLeads: uniqueSeqLeads,
      avgStepsCompleted: uniqueSeqLeads > 0 ? Math.round(seqLogs.length / uniqueSeqLeads * 10) / 10 : 0,
      completionRate: seq.steps ? Math.round((seqLogs.length / (uniqueSeqLeads * seq.steps.length)) * 100) : 0,
    };
  });

  // Conversion from nurture
  const nurturedLeadIds = new Set(nurtureLog.map(log => log.leadId));
  const nurturedLeads = contacts.filter(c => nurturedLeadIds.has(c.id));
  const nurturedWon = nurturedLeads.filter(c => c.stage === 'won').length;
  const nurturedLost = nurturedLeads.filter(c => c.stage === 'lost').length;

  res.json({
    success: true,
    data: {
      overview: {
        totalMessages,
        uniqueLeads,
        activeNurtures,
        pausedNurtures,
        conversionRate: nurturedLeads.length > 0 ? Math.round((nurturedWon / nurturedLeads.length) * 100) : 0,
        lossRate: nurturedLeads.length > 0 ? Math.round((nurturedLost / nurturedLeads.length) * 100) : 0,
      },
      sequences: sequenceStats,
    },
  });
});

// ── Helper: Find sequence name for a lead ────────────────────────────────────

function findSequenceName(stage, lead, sequences) {
  if (stage === 'new') return 'New Lead Welcome';
  if (stage === 'contacted') return 'New Lead Welcome';
  if (stage === 'qualified') return lead.siteVisit ? 'Site Visit Follow-up' : 'New Lead Welcome';
  if (stage === 'negotiation') return 'Negotiation Re-engage';
  if (stage === 'lost') return 'Lost Lead Win-back';
  if (stage === 'won') return 'Post Booking Thank You';
  
  const budget = lead.budget || lead.value || 0;
  if (budget > 10000000) return 'High Budget VIP';
  
  return 'New Lead Welcome';
}

export default router;
