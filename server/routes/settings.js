import express from 'express';
import { getDb, saveDb, insertItem, updateItem } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('settings', 'read'), (req, res) => {
  const db = getDb();
  res.json({
    success: true,
    data: {
      team: db.team || [],
      settings: db.settings || {},
      notifications: db.notifications || []
    }
  });
});

router.put('/', authorize('settings', 'update'), (req, res) => {
  const db = getDb();
  db.settings = { ...db.settings, ...req.body };
  saveDb();
  res.json({ success: true, data: db.settings });
});

router.post('/team', authorize('settings', 'update'), (req, res) => {
  const { name, role, email, phone } = req.body;
  if (!name || !role) return res.status(400).json({ success: false, message: 'Name and role are required' });

  const newMember = {
    name,
    role,
    email: email || `${name.toLowerCase().replace(/\s+/g, '')}@ashraygroup.in`,
    phone: phone || '+91 98000 00000',
    leadsCount: 0
  };

  const saved = insertItem('team', newMember);
  res.status(201).json({ success: true, data: saved });
});

router.post('/notifications/read-all', authorize('settings', 'read'), (req, res) => {
  const db = getDb();
  if (db.notifications) {
    db.notifications.forEach(n => { n.read = true; });
    saveDb();
  }
  res.json({ success: true, data: db.notifications });
});

export default router;
