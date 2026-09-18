import express from 'express';
import { getCollection, insertItem, getDb, saveDb } from '../data/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', authorize('calls', 'read'), (req, res) => {
  const { filter } = req.query;
  const db = getDb();
  let calls = db.calls || [];

  if (filter === 'outgoing') calls = calls.filter(c => c.type === 'outgoing');
  else if (filter === 'incoming') calls = calls.filter(c => c.type === 'incoming');
  else if (filter === 'missed') calls = calls.filter(c => c.type === 'missed');
  else if (filter === 'today') calls = calls.filter(c => c.time && c.time.includes('Today'));
  else if (filter === 'week') calls = calls.filter(c => c.time && (c.time.includes('Today') || c.time.includes('Yesterday') || c.time.includes('days ago')));

  const todayCalls = (db.calls || []).filter(c => c.time && c.time.includes('Today'));
  const totalTalkTime = (db.calls || []).reduce((s, c) => s + (c.talkTime || 0), 0);
  const missedCalls = (db.calls || []).filter(c => c.type === 'missed').length;
  const connectRate = db.calls.length > 0 ? Math.round(((db.calls.length - missedCalls) / db.calls.length) * 100) : 0;
  const avgTalkTime = db.calls.length > 0 ? Math.round(totalTalkTime / db.calls.length) : 0;

  // Agent metrics
  const team = db.team || [];
  const agentPerf = team.map(member => {
    const agentCalls = (db.calls || []).filter(c => c.rep === member.name);
    const missed = agentCalls.filter(c => c.type === 'missed').length;
    const talkTime = agentCalls.reduce((s, c) => s + (c.talkTime || 0), 0);
    const avg = agentCalls.length > 0 ? Math.round(talkTime / agentCalls.length) : 0;
    const rate = agentCalls.length > 0 ? Math.round(((agentCalls.length - missed) / agentCalls.length) * 100) : 0;
    return {
      name: member.name,
      totalCalls: agentCalls.length,
      avgTalkTime: Math.floor(avg / 60) + ':' + String(avg % 60).padStart(2, '0'),
      connectRate: rate,
      missed
    };
  });

  res.json({
    success: true,
    data: calls,
    stats: {
      callsToday: todayCalls.length,
      avgTalkTime: Math.floor(avgTalkTime / 60) + ':' + String(avgTalkTime % 60).padStart(2, '0'),
      missedCalls,
      connectRate: connectRate + '%'
    },
    agentPerf,
    volumeChart: [
      { day: 'Mon', volume: 18 },
      { day: 'Tue', volume: 24 },
      { day: 'Wed', volume: 21 },
      { day: 'Thu', volume: 28 },
      { day: 'Fri', volume: 22 },
      { day: 'Sat', volume: 15 },
      { day: 'Sun', volume: 12 }
    ]
  });
});

router.post('/', authorize('calls', 'log'), (req, res) => {
  const { contactId, type, duration, rep, notes, talkTime } = req.body;

  const db = getDb();
  const contact = db.contacts.find(c => Number(c.id) === Number(contactId));

  const newCall = {
    contactId: contact ? contact.id : null,
    type: type || 'outgoing',
    duration: duration || '01:30',
    time: 'Today, Just now',
    rep: rep || 'Rohan Mehta',
    notes: notes || 'Call logged via 1-click dialer',
    talkTime: talkTime || 90
  };

  const saved = insertItem('calls', newCall);

  if (contact) {
    if (!contact.timeline) contact.timeline = [];
    contact.timeline.unshift({
      type: 'call',
      text: `${type === 'missed' ? 'Missed call' : 'Call completed'} (${duration || '1:30'}) - ${notes || 'Discussion'}`,
      time: 'Just now',
      icon: 'phone'
    });

    // Automatically update stage to 'contacted' if still 'new'
    if (contact.stage === 'new') {
      contact.stage = 'contacted';
      contact.dealProb = Math.max(contact.dealProb || 0, 45);
      contact.timeline.unshift({
        type: 'stage-change',
        text: 'Stage automatically updated to CONTACTED (Call completed)',
        time: 'Just now',
        icon: 'target'
      });
    }

    saveDb();
  }

  res.status(201).json({ success: true, data: saved });
});

export default router;
