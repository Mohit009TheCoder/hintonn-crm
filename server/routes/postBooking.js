import express from 'express';
import { getDb, saveDb } from '../data/db.js';
import { initMilestones, updateMilestoneStatus, getPaymentSummary, getOverduePayments } from '../data/paymentMilestones.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/summary', authorize('bookings', 'read'), (req, res) => {
  try {
    const db = getDb();
    const contacts = db.contacts || [];
    const wonLeads = contacts.filter(c => c.stage === 'won');
    const summaries = wonLeads.map(lead => getPaymentSummary(lead, db));
    const totalValue = summaries.reduce((s, x) => s + x.totalValue, 0);
    const totalPaid = summaries.reduce((s, x) => s + x.totalPaid, 0);
    const totalPending = summaries.reduce((s, x) => s + x.totalPending, 0);
    res.json({
      success: true,
      data: {
        totalValue,
        totalPaid,
        totalPending,
        leads: summaries,
        count: summaries.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/overdue', authorize('bookings', 'read'), (req, res) => {
  try {
    const db = getDb();
    const overdue = getOverduePayments(db);
    res.json({ success: true, data: overdue, total: overdue.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:leadId/milestones', authorize('bookings', 'read'), (req, res) => {
  try {
    const db = getDb();
    const lead = (db.contacts || []).find(c => Number(c.id) === Number(req.params.leadId));
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const summary = getPaymentSummary(lead, db);
    res.json({ success: true, data: summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:leadId/milestones/:milestoneId', authorize('bookings', 'update'), (req, res) => {
  try {
    const db = getDb();
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });
    const updated = updateMilestoneStatus(req.params.leadId, req.params.milestoneId, status, db);
    if (!updated) return res.status(404).json({ success: false, message: 'Milestone not found' });
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:leadId/init', authorize('bookings', 'update'), (req, res) => {
  try {
    const db = getDb();
    const lead = (db.contacts || []).find(c => Number(c.id) === Number(req.params.leadId));
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    if (lead.stage !== 'won') {
      return res.status(400).json({ success: false, message: 'Lead must be in won stage to initialize milestones' });
    }
    const milestones = initMilestones(lead, db);
    res.status(201).json({ success: true, data: milestones, total: milestones.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
