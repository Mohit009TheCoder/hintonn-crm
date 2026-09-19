import express from 'express';
import { getCollection, insertItem, updateItem } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validatePartner } from '../middleware/validate.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('partners', 'read'), (req, res) => {
  const partners = getCollection('partners');
  const totalReferred = partners.reduce((s, p) => s + (p.leadsReferred || 0), 0);
  const totalDeals = partners.reduce((s, p) => s + (p.dealsClosed || 0), 0);
  const totalRevenue = partners.reduce((s, p) => s + (p.totalRevenue || 0), 0);
  const totalCommission = partners.reduce((s, p) => s + (p.commissionEarned || 0), 0);

  res.json({
    success: true,
    data: partners,
    stats: {
      totalPartners: partners.length,
      totalReferred,
      totalDeals,
      totalRevenue,
      totalCommission
    }
  });
});

router.post('/', authorize('partners', 'create'), validatePartner, (req, res) => {
  const { name, company, phone, email, type, commissionRate } = req.body;
  if (!name || !company) {
    return res.status(400).json({ success: false, message: 'Name and company are required' });
  }

  const newPartner = {
    name,
    company,
    phone: phone || '+91 98000 00000',
    email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
    type: type || 'broker',
    leadsReferred: 0,
    dealsClosed: 0,
    totalRevenue: 0,
    commissionRate: commissionRate ? Number(commissionRate) : 1.5,
    commissionEarned: 0,
    status: 'active',
    joinDate: 'Sep 2026',
    lastActive: 'Today',
    rating: 5
  };

  const saved = insertItem('partners', newPartner);
  res.status(201).json({ success: true, data: saved });
});

router.put('/:id', authorize('partners', 'update'), (req, res) => {
  const updated = updateItem('partners', req.params.id, req.body);
  if (!updated) return res.status(404).json({ success: false, message: 'Partner not found' });
  res.json({ success: true, data: updated });
});

export default router;
