import express from 'express';
import { getDb, saveDb, insertItem } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

function fmtINR(val) {
  if (val >= 10000000) return '₹' + (val / 10000000).toFixed(2) + ' Cr';
  if (val >= 100000) return '₹' + (val / 100000).toFixed(1) + ' L';
  return '₹' + val.toLocaleString('en-IN');
}

router.get('/', authorize('projects', 'read'), (req, res) => {
  const db = getDb();
  const contacts = db.contacts || [];

  const projectsWithStats = (db.projects || []).map(p => {
    const leadsForProject = contacts.filter(c => c.projectId === p.id);
    const matchedLeads = contacts.filter(c => {
      if (c.stage === 'won' || c.stage === 'lost') return false;
      const pref = c.preferences || {};
      const budgetMatch = (!pref.budgetRange || (pref.budgetRange[0] <= p.priceMax && pref.budgetRange[1] >= p.priceMin));
      const configMatch = (!pref.bedrooms || (p.configs && p.configs.includes(pref.bedrooms)));
      return budgetMatch && configMatch;
    });

    const brochures = (db.brochures || []).filter(b => {
      const c = contacts.find(ct => ct.id === b.contactId);
      return c && c.projectId === p.id;
    });
    const openedBrochures = brochures.filter(b => b.duration && b.duration !== '0s').length;
    const brochureOpenRate = brochures.length > 0 ? Math.round((openedBrochures / brochures.length) * 100) : 0;

    return {
      ...p,
      leadCount: leadsForProject.length,
      matchedLeadCount: matchedLeads.length,
      brochureStats: {
        sent: brochures.length,
        opened: openedBrochures,
        openRate: brochureOpenRate
      }
    };
  });

  res.json({ success: true, data: projectsWithStats });
});

router.post('/', authorize('projects', 'create'), (req, res) => {
  const { name, type, loc, configs, priceMin, priceMax, totalUnits, available, possession, units } = req.body;
  if (!name || !loc) {
    return res.status(400).json({ success: false, message: 'Project name and location are required' });
  }

  const parsedConfigs = Array.isArray(configs)
    ? configs
    : (typeof configs === 'string' ? configs.split(',').map(s => s.trim()) : ['2 BHK', '3 BHK']);

  const totUnits = Number(totalUnits) || 24;
  const availUnits = available !== undefined ? Number(available) : totUnits;

  let projectUnits = units;
  if (!Array.isArray(projectUnits) || projectUnits.length === 0) {
    projectUnits = [];
    const unitCount = Math.min(totUnits, 36);
    const floors = Math.max(1, Math.ceil(unitCount / 4));
    let uid = 1;
    for (let f = 1; f <= floors && uid <= unitCount; f++) {
      for (let u = 1; u <= 4 && uid <= unitCount; u++) {
        const cfg = parsedConfigs[(uid - 1) % parsedConfigs.length] || '2 BHK';
        const isSold = uid > availUnits;
        projectUnits.push({
          id: uid,
          unitNumber: `${f}0${u}`,
          floor: f,
          config: cfg,
          status: isSold ? 'sold' : 'available',
          price: Number(priceMin) || 5000000
        });
        uid++;
      }
    }
  }

  const newProject = {
    name,
    type: type || 'Residential',
    loc,
    configs: parsedConfigs,
    priceMin: Number(priceMin) || 4500000,
    priceMax: Number(priceMax) || 8500000,
    totalUnits: totUnits,
    available: availUnits,
    possession: possession || 'Dec 2026',
    units: projectUnits,
  };

  const saved = insertItem('projects', newProject);
  res.status(201).json({
    success: true,
    data: {
      ...saved,
      leadCount: 0,
      matchedLeadCount: 0,
      brochureStats: { sent: 0, opened: 0, openRate: 0 }
    }
  });
});

router.get('/:id', authorize('projects', 'read'), (req, res) => {
  const db = getDb();
  const project = (db.projects || []).find(p => Number(p.id) === Number(req.params.id));
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
  res.json({ success: true, data: project });
});

router.put('/:id/units/:unitId', authorize('projects', 'update'), (req, res) => {
  const { status, lockedFor, lockedExpiry } = req.body;
  const db = getDb();
  const project = db.projects.find(p => Number(p.id) === Number(req.params.id));
  if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

  const unit = project.units.find(u => Number(u.id) === Number(req.params.unitId));
  if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });

  unit.status = status || unit.status;
  unit.lockedFor = status === 'locked' ? (lockedFor || null) : null;
  unit.lockedExpiry = status === 'locked' ? (lockedExpiry || 'Sep 30, 2026') : null;

  // Recalculate available count
  const nonAvailable = project.units.filter(u => u.status === 'sold' || u.status === 'locked').length;
  project.available = project.totalUnits - nonAvailable;

  saveDb();
  res.json({ success: true, data: unit, projectAvailable: project.available });
});

router.post('/:id/ai-listing', authorize('projects', 'read'), (req, res) => {
  const db = getDb();
  const p = db.projects.find(pr => Number(pr.id) === Number(req.params.id));
  if (!p) return res.status(404).json({ success: false, message: 'Project not found' });

  const priceStr = fmtINR(p.priceMin) + ' – ' + fmtINR(p.priceMax);
  const text = `✨ ${p.name} — ${p.type} Excellence in ${p.loc.split(',')[0]}\n\n` +
    `Discover your dream ${p.configs.join('/')} at ${p.name}, nestled in the heart of ${p.loc}. ` +
    `With prices starting from ${priceStr}, this premium development offers world-class amenities and modern living at its finest.\n\n` +
    `🏡 Key Highlights:\n` +
    `• Configurations: ${p.configs.join(', ')}\n` +
    `• Price Range: ${priceStr}\n` +
    `• Total Units: ${p.totalUnits} (${p.available} available)\n` +
    `• Possession: ${p.possession}\n\n` +
    `Whether you're a first-time buyer or seasoned investor, ${p.name} offers unmatched value in Ahmedabad's most sought-after location. ` +
    `Schedule your exclusive site visit today!\n\n` +
    `📞 Contact: Rohan Mehta, Ashray Group\n` +
    `📍 ${p.loc}`;

  res.json({ success: true, data: { listing: text, projectId: p.id, projectName: p.name } });
});

export default router;
