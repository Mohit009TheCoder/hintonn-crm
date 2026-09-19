import express from 'express';
import { getCollection, insertItem, updateItem, deleteItem, getDb, saveDb } from '../data/db.js';
import { triggerWelcomeMessage, triggerStageChange } from '../data/automation.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('leads', 'read'), (req, res) => {
  const { q, stage, tag, sort } = req.query;
  let leads = getCollection('contacts');

  // Agent scoping — agents only see their own leads
  const authUser = req.user;
  const db = getDb();
  if (authUser && authUser.role === 'agent') {
    const user = (db.users || []).find(u => u.id === authUser.id);
    if (user) leads = leads.filter(l => l.rep === user.name);
  }

  if (q) {
    const term = q.toLowerCase();
    leads = leads.filter(l =>
      (l.name && l.name.toLowerCase().includes(term)) ||
      (l.phone && l.phone.includes(term)) ||
      (l.config && l.config.toLowerCase().includes(term)) ||
      (l.source && l.source.toLowerCase().includes(term))
    );
  }

  if (stage && stage !== 'all') {
    leads = leads.filter(l => l.stage === stage);
  }

  if (tag && tag !== 'all') {
    leads = leads.filter(l => l.tags && l.tags.includes(tag));
  }

  if (sort) {
    if (sort === 'name') leads.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'value') leads.sort((a, b) => (b.value || 0) - (a.value || 0));
    else if (sort === 'score') leads.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  res.json({ success: true, count: leads.length, data: leads });
});

function checkLeadAccess(req, res, leadId) {
  const db = getDb();
  const lead = (db.contacts || []).find(l => Number(l.id) === Number(leadId));
  if (!lead) {
    res.status(404).json({ success: false, message: 'Lead not found' });
    return null;
  }
  // Agent scoping — can only see/manage their own assigned leads
  if (req.user?.role === 'agent') {
    const user = (db.users || []).find(u => u.id === req.user.id);
    if (user && lead.rep !== user.name) {
      res.status(403).json({ success: false, message: 'Permission denied: you can only access your own assigned leads' });
      return null;
    }
  }
  return lead;
}

router.get('/duplicates', authorize('leads', 'read'), (req, res) => {
  const duplicates = getCollection('duplicateLeads');
  // Sort descending by created_at
  duplicates.sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0));
  res.json({ success: true, count: duplicates.length, data: duplicates });
});

router.get('/:id', authorize('leads', 'read'), (req, res) => {
  const lead = checkLeadAccess(req, res, req.params.id);
  if (!lead) return;
  res.json({ success: true, data: lead });
});

router.post('/', authorize('leads', 'create'), (req, res) => {
  const { name, phone, email, source, projectId, config, value, stage, rep, tags, preferences } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, message: 'Name and phone are required' });
  }

  const db = getDb();
  const currentUser = (db.users || []).find(u => u.id === req.user?.id);
  const assignedRep = (req.user?.role === 'agent' && currentUser)
    ? currentUser.name
    : (rep || currentUser?.name || 'Rohan Mehta');

  const existingLeads = getCollection('contacts');
  const cleanPhone = phone ? phone.replace(/[\s-]/g, '') : '';
  const cleanEmail = email ? email.toLowerCase().trim() : '';
  const dup = existingLeads.find(l => {
    const lPhone = l.phone ? l.phone.replace(/[\s-]/g, '') : '';
    const lEmail = l.email ? l.email.toLowerCase().trim() : '';
    return (lPhone && lPhone === cleanPhone) || (cleanEmail && lEmail && lEmail === cleanEmail);
  });

  const initialScore = Math.floor(Math.random() * 35) + 50; // 50-85
  const newLead = {
    name,
    phone,
    email: email || '',
    source: source || 'Website',
    projectId: projectId ? Number(projectId) : 1,
    config: config || '2 BHK',
    value: value ? Number(value) : 6000000,
    stage: stage || 'new',
    createdMinutesAgo: 0,
    reminderHoursAgo: 0,
    rep: assignedRep,
    score: initialScore,
    duplicateOf: dup ? dup.id : null,
    tags: tags || ['hot-lead'],
    notes: [
      { id: 1, text: 'Lead created in system', author: assignedRep, time: 'Just now' }
    ],
    timeline: [
      { type: 'whatsapp', text: 'Lead registered from ' + (source || 'Website'), time: 'Just now', icon: 'messagecircle' }
    ],
    dealProb: stage === 'won' ? 100 : (stage === 'negotiation' ? 75 : (stage === 'qualified' ? 60 : 35)),
    expectedClose: 'Nov 2026',
    lossReason: null,
    preferences: preferences || { bedrooms: config || '2 BHK', locations: ['Bopal'], amenities: ['Gym', 'Parking'], budgetRange: [5000000, 8000000] },
    documents: [],
    commission: { rate: 2, earned: 0 },
    waLog: [
      { id: 1, text: 'Hi ' + name.split(' ')[0] + ', thank you for contacting Ashray Group! How can we assist you today?', time: 'Just now', dir: 'out' }
    ]
  };

  const saved = insertItem('contacts', newLead);

  // Trigger WhatsApp welcome automation (fire-and-forget)
  triggerWelcomeMessage(saved).catch(err =>
    console.error('Welcome automation error:', err.message)
  );

  res.status(201).json({ success: true, data: saved, isDuplicate: !!dup });
});

router.put('/:id', authorize('leads', 'update'), (req, res) => {
  const lead = checkLeadAccess(req, res, req.params.id);
  if (!lead) return;

  const updated = updateItem('contacts', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Lead not found' });
  res.json({ success: true, data: updated });
});

router.post('/:id/notes', authorize('leads', 'update'), (req, res) => {
  const { text, author } = req.body;
  if (!text) return res.status(400).json({ success: false, message: 'Note text is required' });

  const lead = checkLeadAccess(req, res, req.params.id);
  if (!lead) return;

  const db = getDb();
  const currentUser = (db.users || []).find(u => u.id === req.user?.id);
  const noteAuthor = author || currentUser?.name || 'Rohan Mehta';

  if (!lead.notes) lead.notes = [];
  const nextNoteId = lead.notes.length + 1;
  const newNote = {
    id: nextNoteId,
    text,
    author: noteAuthor,
    time: 'Just now'
  };
  lead.notes.push(newNote);

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'note',
    text: 'Note added: ' + text.substring(0, 45) + (text.length > 45 ? '...' : ''),
    time: 'Just now',
    icon: 'filetext'
  });

  saveDb();
  res.json({ success: true, data: lead });
});

router.post('/:id/send-brochure', authorize('leads', 'update'), (req, res) => {
  const lead = checkLeadAccess(req, res, req.params.id);
  if (!lead) return;

  const db = getDb();
  const project = db.projects.find(p => p.id === lead.projectId) || db.projects[0];
  const brochureName = project.name + ' - ' + (lead.config || 'General') + ' Brochure';

  const newBrochure = {
    id: db.brochures.length + 1,
    contactId: lead.id,
    brochureName,
    viewedAt: 'Just now',
    duration: '0s',
    pages: 4
  };
  db.brochures.unshift(newBrochure);

  if (!lead.timeline) lead.timeline = [];
  lead.timeline.unshift({
    type: 'whatsapp',
    text: 'Sent ' + brochureName + ' via WhatsApp',
    time: 'Just now',
    icon: 'share2'
  });

  saveDb();
  res.json({ success: true, data: newBrochure, lead });
});

export function autoUpdateLeadStages(db) {
  const updates = [];
  const contacts = db.contacts || [];
  const calls = db.calls || [];
  const siteVisits = db.siteVisits || [];
  const brochures = db.brochures || [];

  contacts.forEach(lead => {
    const oldStage = lead.stage;
    let newStage = oldStage;
    let autoReason = '';

    // Check 1: Completed site visit with "Booked" or booking note -> Won
    const bookedVisit = siteVisits.find(sv => sv.contactId === lead.id && (sv.outcome === 'Booked' || (sv.status === 'completed' && sv.outcome === 'Booked')));
    const isBookingNote = (lead.notes || []).some(n => n.text.toLowerCase().includes('booked') || n.text.toLowerCase().includes('booking'));

    if (bookedVisit || isBookingNote) {
      newStage = 'won';
      autoReason = 'Booking confirmed';
    } else if (lead.lossReason || siteVisits.some(sv => sv.contactId === lead.id && sv.outcome === 'Not Interested')) {
      newStage = 'lost';
      autoReason = lead.lossReason || 'Not interested after walkthrough';
    } else if (
      // Check 2: Active negotiation
      (lead.notes || []).some(n => n.text.toLowerCase().includes('discount') || n.text.toLowerCase().includes('negotiat') || n.text.toLowerCase().includes('quote'))
    ) {
      if (oldStage !== 'won' && oldStage !== 'lost') {
        newStage = 'negotiation';
        autoReason = 'Active price/terms negotiation detected';
      }
    } else if (
      // Check 3: Site visit scheduled or completed interested
      siteVisits.some(sv => sv.contactId === lead.id && (sv.status === 'scheduled' || sv.outcome === 'Interested')) ||
      lead.siteVisit
    ) {
      if (oldStage === 'new' || oldStage === 'contacted') {
        newStage = 'qualified';
        autoReason = 'Site visit scheduled or completed';
      }
    } else if (
      // Check 4: Contacted (calls logged, brochure sent, or messages exchanged)
      calls.some(c => c.contactId === lead.id && c.duration !== '0:00') ||
      brochures.some(b => b.contactId === lead.id) ||
      (lead.waLog && lead.waLog.length > 1) ||
      (lead.notes && lead.notes.length > 1)
    ) {
      if (oldStage === 'new') {
        newStage = 'contacted';
        autoReason = 'Outbound call, brochure or WhatsApp communication initiated';
      }
    }

    if (newStage !== oldStage) {
      lead.stage = newStage;
      if (newStage === 'won') {
        lead.dealProb = 100;
        const rate = (lead.commission && lead.commission.rate) || 2;
        lead.commission = { rate, earned: Math.round((lead.value || 0) * (rate / 100)) };
      } else if (newStage === 'lost') {
        lead.dealProb = 0;
        if (!lead.lossReason) lead.lossReason = autoReason;
      } else if (newStage === 'negotiation') {
        lead.dealProb = Math.max(lead.dealProb || 0, 75);
      } else if (newStage === 'qualified') {
        lead.dealProb = Math.max(lead.dealProb || 0, 65);
      } else if (newStage === 'contacted') {
        lead.dealProb = Math.max(lead.dealProb || 0, 45);
      }

      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({
        type: 'stage-change',
        text: `Auto-updated stage to ${newStage.toUpperCase()} (${autoReason})`,
        time: 'Just now',
        icon: 'target'
      });

      updates.push({
        leadId: lead.id,
        leadName: lead.name,
        oldStage,
        newStage,
        reason: autoReason
      });
    }
  });

  if (updates.length > 0) {
    saveDb();
  }
  return updates;
}

router.post('/auto-update-stages', authorize('leads', 'update'), (req, res) => {
  const db = getDb();
  const updates = autoUpdateLeadStages(db);
  res.json({
    success: true,
    updatedCount: updates.length,
    updates,
    leads: db.contacts
  });
});

router.delete('/:id', authorize('leads', 'delete'), (req, res) => {
  const success = deleteItem('contacts', req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Lead not found' });
  res.json({ success: true, message: 'Lead deleted' });
});

export default router;

