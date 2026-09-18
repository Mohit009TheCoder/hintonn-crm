import express from 'express';
import { getDb, saveDb } from '../data/db.js';
import { DOCUMENT_CHECKLIST, getDocumentStatus, getLeadsWithMissingDocs, getDocumentReminders, markDocumentCollected } from '../data/documentPipeline.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/checklist', authorize('documents', 'read'), (req, res) => {
  try {
    res.json({ success: true, data: DOCUMENT_CHECKLIST, total: DOCUMENT_CHECKLIST.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/status/:leadId', authorize('documents', 'read'), (req, res) => {
  try {
    const db = getDb();
    const lead = (db.contacts || []).find(c => Number(c.id) === Number(req.params.leadId));
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    const status = getDocumentStatus(lead, db);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/missing', authorize('documents', 'read'), (req, res) => {
  try {
    const db = getDb();
    const missing = getLeadsWithMissingDocs(db);
    res.json({ success: true, data: missing, total: missing.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/collect/:leadId/:docId', authorize('documents', 'update'), (req, res) => {
  try {
    const db = getDb();
    const result = markDocumentCollected(req.params.leadId, req.params.docId, db);
    if (!result) return res.status(404).json({ success: false, message: 'Lead or document not found' });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/reminders', authorize('documents', 'read'), (req, res) => {
  try {
    const db = getDb();
    const reminders = getDocumentReminders(db);
    res.json({ success: true, data: reminders, total: reminders.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
