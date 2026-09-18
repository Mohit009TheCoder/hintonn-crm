import express from 'express';
import { getDb, getCollection, saveDb } from '../data/db.js';
import { suggestSiteVisits, getPreVisitReminders, getPostVisitFollowUps } from '../data/siteVisitAutomation.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/suggestions', authorize('leads', 'read'), (req, res) => {
  try {
    const db = getDb();
    const suggestions = suggestSiteVisits(db);
    res.json({ success: true, data: suggestions, total: suggestions.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reminders', authorize('leads', 'read'), (req, res) => {
  try {
    const db = getDb();
    const reminders = getPreVisitReminders(db);
    res.json({ success: true, data: reminders, total: reminders.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/follow-ups', authorize('leads', 'read'), (req, res) => {
  try {
    const db = getDb();
    const followUps = getPostVisitFollowUps(db);
    res.json({ success: true, data: followUps, total: followUps.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/schedule/:leadId', authorize('leads', 'update'), (req, res) => {
  try {
    const db = getDb();
    const contacts = db.contacts || [];
    const lead = contacts.find(c => Number(c.id) === Number(req.params.leadId));
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const now = new Date();
    const visitDate = new Date(now);
    visitDate.setDate(visitDate.getDate() + 1);
    while (visitDate.getDay() === 0) visitDate.setDate(visitDate.getDate() + 1);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const scheduledDate = req.body.scheduledDate || `${months[visitDate.getMonth()]} ${visitDate.getDate()}, 11:00 AM`;

    const newVisit = {
      contactId: Number(lead.id),
      projectId: lead.projectId || 1,
      scheduledDate,
      status: 'scheduled',
      outcome: null,
      feedback: '',
      attendedBy: req.body.attendedBy || lead.rep || 'Rohan Mehta',
      duration: req.body.duration || '45 min',
      nextAction: req.body.nextAction || 'Site tour & sample flat walkthrough'
    };

    if (!db.siteVisits) db.siteVisits = [];
    const nextId = db.siteVisits.length > 0 ? Math.max(...db.siteVisits.map(v => Number(v.id) || 0)) + 1 : 1;
    const saved = { id: nextId, ...newVisit, createdAt: new Date().toISOString() };
    db.siteVisits.unshift(saved);

    // Update lead
    lead.siteVisit = scheduledDate;
    if (!lead.tags) lead.tags = [];
    if (!lead.tags.includes('site-visit-scheduled')) lead.tags.push('site-visit-scheduled');
    if (!lead.timeline) lead.timeline = [];
    lead.timeline.unshift({
      type: 'site-visit',
      text: `Site visit scheduled for ${scheduledDate} (auto-suggested)`,
      time: 'Just now',
      icon: 'mappin'
    });

    saveDb();
    res.status(201).json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
