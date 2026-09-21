import express from 'express';
import { getCollection, insertItem, updateItem, getDb, saveDb } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('leads', 'read'), (req, res) => {
  const visits = getCollection('siteVisits');
  const db = getDb();
  const contacts = db.contacts || [];

  const total = visits.length;
  const scheduled = visits.filter(sv => sv.status === 'scheduled').length;
  const completed = visits.filter(sv => sv.status === 'completed').length;
  const cancelled = visits.filter(sv => sv.status === 'cancelled').length;
  const booked = visits.filter(sv => sv.outcome === 'Booked').length;
  const convRate = completed > 0 ? Math.round((booked / completed) * 100) : 0;
  const avgDur = completed > 0
    ? Math.round(visits.filter(sv => sv.status === 'completed').reduce((s, sv) => s + (parseInt(sv.duration) || 45), 0) / completed)
    : 45;

  // Auto-reply stats
  const autoConfirmed = visits.filter(sv => sv.confirmedVia === 'whatsapp_auto_reply').length;
  const pendingConversations = contacts.filter(c => 
    c.siteVisitConversation && c.siteVisitConversation.step === 'awaiting_time'
  ).length;

  res.json({
    success: true,
    data: visits,
    stats: {
      total, scheduled, completed, cancelled, booked,
      convRate, avgDur,
      autoConfirmed,
      pendingConversations
    }
  });
});

router.post('/', authorize('leads', 'update'), (req, res) => {
  const { contactId, projectId, scheduledDate, attendedBy, duration, nextAction } = req.body;
  if (!contactId || !scheduledDate) {
    return res.status(400).json({ success: false, message: 'Contact and scheduled date are required' });
  }

  const newVisit = {
    contactId: Number(contactId),
    projectId: projectId ? Number(projectId) : 1,
    scheduledDate,
    status: 'scheduled',
    outcome: null,
    feedback: '',
    attendedBy: attendedBy || 'Rohan Mehta',
    duration: duration || '45 min',
    nextAction: nextAction || 'Site tour & sample flat walkthrough'
  };

  const saved = insertItem('siteVisits', newVisit);

  // Link to contact timeline
  const db = getDb();
  const contact = db.contacts.find(c => Number(c.id) === Number(contactId));
  if (contact) {
    contact.siteVisit = scheduledDate;
    if (!contact.timeline) contact.timeline = [];
    contact.timeline.unshift({
      type: 'site-visit',
      text: `Site visit scheduled for ${scheduledDate}`,
      time: 'Just now',
      icon: 'mappin'
    });
    if (!contact.tags) contact.tags = [];
    if (!contact.tags.includes('site-visit-scheduled')) contact.tags.push('site-visit-scheduled');

    // Automatically update stage to 'qualified' if still 'new' or 'contacted'
    if (contact.stage === 'new' || contact.stage === 'contacted') {
      contact.stage = 'qualified';
      contact.dealProb = Math.max(contact.dealProb || 0, 65);
      contact.timeline.unshift({
        type: 'stage-change',
        text: 'Stage automatically updated to QUALIFIED (Site visit scheduled)',
        time: 'Just now',
        icon: 'target'
      });
    }

    saveDb();
  }

  res.status(201).json({ success: true, data: saved });
});

router.put('/:id', authorize('leads', 'update'), (req, res) => {
  const updated = updateItem('siteVisits', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Site visit not found' });

  // If booked or feedback outcome given, auto-update lead stage
  if (req.body.outcome) {
    const db = getDb();
    const contact = db.contacts.find(c => Number(c.id) === Number(updated.contactId));
    if (contact) {
      if (!contact.timeline) contact.timeline = [];
      contact.timeline.unshift({
        type: 'site-visit',
        text: `Site visit outcome: ${req.body.outcome}` + (req.body.feedback ? ` - ${req.body.feedback}` : ''),
        time: 'Just now',
        icon: 'checkcircle'
      });

      if (req.body.outcome === 'Booked') {
        contact.stage = 'won';
        contact.dealProb = 100;
        const rate = (contact.commission && contact.commission.rate) || 2;
        contact.commission = { rate, earned: Math.round((contact.value || 0) * (rate / 100)) };
        contact.timeline.unshift({
          type: 'stage-change',
          text: 'Stage automatically updated to WON (Booking confirmed)',
          time: 'Just now',
          icon: 'target'
        });
      } else if (req.body.outcome === 'Not Interested') {
        contact.stage = 'lost';
        contact.dealProb = 0;
        contact.lossReason = req.body.feedback || 'Not interested after site walkthrough';
        contact.timeline.unshift({
          type: 'stage-change',
          text: `Stage automatically updated to LOST (${contact.lossReason})`,
          time: 'Just now',
          icon: 'target'
        });
      } else if (req.body.outcome === 'Interested') {
        if (contact.stage !== 'won' && contact.stage !== 'lost') {
          contact.stage = 'negotiation';
          contact.dealProb = Math.max(contact.dealProb || 0, 75);
          contact.timeline.unshift({
            type: 'stage-change',
            text: 'Stage automatically updated to NEGOTIATION (High buyer interest)',
            time: 'Just now',
            icon: 'target'
          });
        }
      }
      saveDb();
    }
  }

  res.json({ success: true, data: updated });
});

export default router;
