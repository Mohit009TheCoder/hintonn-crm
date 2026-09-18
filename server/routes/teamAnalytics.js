import express from 'express';
import { getDb } from '../data/db.js';
import { getRepSourceMatrix, getRepPerformance, getSourceEffectiveness, getAssignmentSuggestions } from '../data/teamAnalytics.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/rep-source-matrix', authorize('analytics', 'read'), (req, res) => {
  try {
    const db = getDb();
    const matrix = getRepSourceMatrix(db);
    res.json({ success: true, data: matrix });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/rep-performance', authorize('analytics', 'read'), (req, res) => {
  try {
    const db = getDb();
    const performance = getRepPerformance(db);
    res.json({ success: true, data: performance, total: performance.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/source-effectiveness', authorize('analytics', 'read'), (req, res) => {
  try {
    const db = getDb();
    const sources = getSourceEffectiveness(db);
    res.json({ success: true, data: sources, total: sources.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/assignment-suggestions', authorize('analytics', 'read'), (req, res) => {
  try {
    const db = getDb();
    const suggestions = getAssignmentSuggestions(db);
    res.json({ success: true, data: suggestions, total: suggestions.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
