/**
 * Site Visit Auto-Reply Test Endpoint
 *
 * Simulates inbound WhatsApp messages for testing the site visit flow.
 * Only works in development mode.
 *
 * Usage:
 *   POST /api/site-visit-test/simulate
 *   Body: { "phone": "917940001234", "message": "yes" }
 *
 *   POST /api/site-visit-test/state/:leadId
 *   GET  — view conversation state for a lead
 */

import express from 'express';
import { getDb, saveDb } from '../data/db.js';
import { normalizePhone } from '../data/whatsapp-api.js';
import { handleSiteVisitReply, sendAutoReply } from '../data/siteVisitAutoReply.js';
import { handleIncomingMessage } from '../data/automation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Only allow in development
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ success: false, message: 'Not available in production' });
  }
  next();
});

/**
 * Simulate an inbound WhatsApp message (for testing).
 * Finds the lead by phone number and runs the site visit auto-reply logic.
 */
router.post('/simulate', authenticate, async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'phone and message are required'
      });
    }

    const db = getDb();
    const cleanPhone = normalizePhone(phone);

    // Find lead by phone
    const lead = db.contacts.find(c => {
      const leadPhone = normalizePhone(c.phone);
      return leadPhone && cleanPhone && leadPhone === cleanPhone;
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: `No lead found with phone ${phone}. Available phones: ${db.contacts.slice(0, 5).map(c => c.phone).join(', ')}...`
      });
    }

    // Store inbound message
    handleIncomingMessage(lead.id, message, 'in', `test_${Date.now()}`);

    // Run site visit auto-reply logic
    const svResult = handleSiteVisitReply(lead, message);

    let sendResult = null;
    if (svResult.handled && svResult.reply) {
      // In test mode, we DON'T actually send via WhatsApp API
      // Instead, we just log the reply to waLog
      if (!lead.waLog) lead.waLog = [];
      lead.waLog.push({
        id: lead.waLog.length + 1,
        text: svResult.reply,
        time: new Date().toLocaleString('en-IN', {
          hour: '2-digit', minute: '2-digit', hour12: true,
          day: 'numeric', month: 'short'
        }),
        dir: 'out',
        auto: true,
        templateId: 'site_visit_auto_reply_test',
        sentAt: new Date().toISOString()
      });

      if (!lead.timeline) lead.timeline = [];
      lead.timeline.unshift({
        type: 'whatsapp',
        text: `[TEST] Auto-reply: "${svResult.reply.substring(0, 50)}..."`,
        time: 'Just now',
        icon: 'messagecircle'
      });

      sendResult = { success: true, simulated: true };
      saveDb();
    }

    res.json({
      success: true,
      data: {
        leadId: lead.id,
        leadName: lead.name,
        leadStage: lead.stage,
        inbound: message,
        handled: svResult.handled,
        action: svResult.action || null,
        reply: svResult.reply || null,
        scheduledDate: svResult.scheduledDate || null,
        conversationState: lead.siteVisitConversation || null,
        sendResult,
      }
    });
  } catch (err) {
    console.error('Test simulate error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * View conversation state for a lead.
 */
router.get('/state/:leadId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const lead = db.contacts.find(c => Number(c.id) === Number(req.params.leadId));
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    res.json({
      success: true,
      data: {
        leadId: lead.id,
        leadName: lead.name,
        stage: lead.stage,
        conversationState: lead.siteVisitConversation || null,
        siteVisit: lead.siteVisit || null,
        tags: lead.tags || [],
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Reset conversation state for a lead (clear stuck flows).
 */
router.post('/reset/:leadId', authenticate, (req, res) => {
  try {
    const db = getDb();
    const lead = db.contacts.find(c => Number(c.id) === Number(req.params.leadId));
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    lead.siteVisitConversation = null;
    saveDb();

    res.json({
      success: true,
      message: `Conversation state cleared for ${lead.name}`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
