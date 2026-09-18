/**
 * Lead Capture Routes
 * 
 * Universal webhook endpoint for capturing leads from any platform.
 * Handles lead scoring, assignment, duplicate detection, and SLA monitoring.
 */

import express from 'express';
import { getCollection, insertItem, updateItem, getDb, saveDb } from '../data/db.js';
import { triggerWelcomeMessage } from '../data/automation.js';
import { handleAfterHoursLead } from '../data/automation.js';
import {
  calculateLeadScore,
  assignLead,
  checkSLAViolations,
  findDuplicates,
  getSourceStats,
  normalizeSource,
  getSupportedSources,
} from '../data/leadEngine.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── POST /api/lead-capture/webhook — Universal lead capture ──────────────────

router.post(['/webhook', '/webhook/:source'], async (req, res) => {
  try {
    const {
      source,
      name,
      phone,
      email,
      message,
      projectId,
      config,
      budget,
      utm_source,
      utm_campaign,
      utm_medium,
      referrerName,
      location,
      propertyName,
      platformLeadId,
      adId,
      formId,
    } = req.body;

    // 1. Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required',
        missingFields: {
          name: !name,
          phone: !phone,
        },
      });
    }

    const db = getDb();
    const effectiveSource = req.params.source || source || 'Website';
    const normalizedSource = normalizeSource(effectiveSource);

    // 2. Check for duplicates
    const duplicates = findDuplicates({ phone, email }, db);
    const isDuplicate = duplicates.length > 0;

    // 3. Calculate lead score
    const leadData = {
      source: normalizedSource,
      config: config || '',
      budget: budget ? Number(budget) : 0,
      value: budget ? Number(budget) : 0,
      repliedAt: message ? new Date().toISOString() : null,
      tags: [],
    };
    const score = calculateLeadScore(leadData, db);

    // 4. Auto-assign rep
    const assignedRep = assignLead(leadData, db);

    // 5. Create lead in contacts collection
    const newLead = {
      name,
      phone,
      email: email || '',
      source: normalizedSource,
      projectId: projectId ? Number(projectId) : null,
      config: config || '',
      value: budget ? Number(budget) : 0,
      budget: budget ? Number(budget) : 0,
      stage: 'new',
      createdMinutesAgo: 0,
      reminderHoursAgo: 0,
      rep: assignedRep,
      score,
      duplicateOf: isDuplicate ? duplicates[0].id : null,
      tags: isDuplicate ? ['duplicate-candidate'] : [],
      notes: message ? [
        { id: 1, text: `Initial inquiry: ${message}`, author: 'System', time: 'Just now' },
      ] : [],
      timeline: [
        { type: 'whatsapp', text: `Lead captured from ${normalizedSource}`, time: 'Just now', icon: 'messagecircle' },
      ],
      dealProb: 35,
      expectedClose: null,
      lossReason: null,
      preferences: {
        bedrooms: config || '',
        locations: location ? [location] : [],
        amenities: [],
        budgetRange: budget ? [Number(budget) * 0.8, Number(budget) * 1.2] : [],
      },
      documents: [],
      commission: { rate: 2, earned: 0 },
      utm: {
        source: utm_source || source || '',
        campaign: utm_campaign || '',
        medium: utm_medium || '',
      },
      capture: {
        platformLeadId: platformLeadId || null,
        adId: adId || null,
        formId: formId || null,
        referrerName: referrerName || null,
        propertyName: propertyName || null,
        capturedAt: new Date().toISOString(),
        sourceIp: req.ip,
        userAgent: req.headers['user-agent'],
      },
      stageEnteredAt: new Date().toISOString(),
    };

    let savedLead;
    if (isDuplicate) {
      // Map to duplicate_leads schema structure
      const duplicateData = {
        name,
        phone,
        email: email || '',
        source: normalizedSource,
        config: config || '',
        budget: budget ? Number(budget) : 0,
        message: message || '',
        duplicate_of: duplicates[0].id,
        match_type: duplicates[0].matchType || 'phone',
        status: 'pending',
        capture_data: newLead.capture,
      };
      savedLead = insertItem('duplicateLeads', duplicateData);
    } else {
      savedLead = insertItem('contacts', newLead);
    }

    // 6. Create initial task (only if not a duplicate)
    if (!isDuplicate) {
      const taskTitle = `Follow up with ${name} from ${normalizedSource}`;
      insertItem('tasks', {
        contactId: savedLead.id,
        title: taskTitle,
        type: 'follow-up',
        priority: score > 70 ? 'high' : 'medium',
        due: 'Today, 5:00 PM',
        status: 'pending',
        assignee: assignedRep,
        description: `New lead from ${normalizedSource}. Score: ${score}. ${message || ''}`,
      });
    }

    // 7. Log UTM data if present
    if (utm_source || utm_campaign || utm_medium) {
      if (!db.leadActivities) db.leadActivities = [];
      db.leadActivities.push({
        leadId: savedLead.id,
        type: 'utm_capture',
        data: { utm_source, utm_campaign, utm_medium, source: normalizedSource },
        timestamp: new Date().toISOString(),
      });
    }

    // 8. Trigger welcome automation (fire-and-forget, only for non-duplicates)
    if (!isDuplicate) {
      triggerWelcomeMessage(savedLead).catch(err =>
        console.error('Welcome automation error:', err.message)
      );
    }

    // 8b. After-hours auto-response (only for non-duplicates)
    const afterHours = !isDuplicate ? handleAfterHoursLead(savedLead, db) : null;

    // 9. Check SLA
    const slaViolations = checkSLAViolations(db);

    // Save any changes
    saveDb();

    res.status(201).json({
      success: true,
      data: {
        lead: savedLead,
        score,
        assignedRep,
        isDuplicate,
        duplicates: isDuplicate ? duplicates : [],
        slaStatus: slaViolations.length > 0 ? 'violations_exist' : 'ok',
        afterHours: afterHours ? afterHours.isAfterHours : false,
      },
      message: isDuplicate
        ? `Lead captured but potential duplicate found (ID: ${duplicates[0].id})`
        : 'Lead captured successfully',
    });
  } catch (err) {
    console.error('Lead capture error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

// ── GET /api/lead-capture/sources — List all supported sources ───────────────

router.get('/sources', authenticate, authorize('leads', 'read'), (req, res) => {
  const sources = getSupportedSources();
  const db = getDb();
  const contacts = db.contacts || [];

  const enrichedSources = sources.map(src => {
    // Match leads by source name or id
    const matchLeads = contacts.filter(c => {
      if (!c.source) return false;
      const sLower = c.source.toLowerCase().replace(/[\s_-]/g, '');
      const srcNameLower = src.name.toLowerCase().replace(/[\s_-]/g, '');
      const srcIdLower = src.id.toLowerCase().replace(/[\s_-]/g, '');
      return sLower === srcNameLower || sLower === srcIdLower;
    });

    const totalLeads = matchLeads.length;
    const wonLeads = matchLeads.filter(c => c.stage === 'won').length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) + '%' : '0%';

    let lastLeadTime = '—';
    if (totalLeads > 0) {
      const sorted = [...matchLeads].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      if (sorted[0].createdAt) {
        lastLeadTime = new Date(sorted[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        lastLeadTime = 'Recent';
      }
    }

    return {
      ...src,
      totalLeads,
      conversionRate,
      lastLeadTime,
      avgResponseTime: totalLeads > 0 ? '5m' : '—',
    };
  });

  res.json({ success: true, data: enrichedSources });
});

// ── GET /api/lead-capture/stats — Source-wise lead statistics ────────────────

router.get('/stats', authenticate, authorize('leads', 'read'), (req, res) => {
  const db = getDb();
  const stats = getSourceStats(db);
  res.json({ success: true, data: stats });
});

// ── GET /api/lead-capture/sla — Current SLA violations ──────────────────────

router.get('/sla', authenticate, authorize('leads', 'read'), (req, res) => {
  const db = getDb();
  const violations = checkSLAViolations(db);
  res.json({
    success: true,
    data: {
      violations,
      totalViolations: violations.length,
      criticalCount: violations.filter(v => v.severity === 'critical').length,
      warningCount: violations.filter(v => v.severity === 'warning').length,
    },
  });
});

// ── POST /api/lead-capture/bulk — Bulk import leads ─────────────────────────

router.post('/bulk', authenticate, authorize('leads', 'create'), async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ success: false, message: 'leads array is required' });
    }

    const results = {
      imported: 0,
      duplicates: 0,
      errors: [],
    };

    for (const leadInput of leads) {
      try {
        const { source, name, phone, email, config, budget, projectId } = leadInput;
        
        if (!name || !phone) {
          results.errors.push({ lead: leadInput, error: 'Name and phone are required' });
          continue;
        }

        const db = getDb();
        const normalizedSource = normalizeSource(source);

        // Check for duplicates
        const duplicates = findDuplicates({ phone, email }, db);
        if (duplicates.length > 0) {
          results.duplicates++;
          continue;
        }

        // Calculate score
        const leadData = {
          source: normalizedSource,
          config: config || '',
          budget: budget ? Number(budget) : 0,
          value: budget ? Number(budget) : 0,
          tags: [],
        };
        const score = calculateLeadScore(leadData, db);

        // Assign rep
        const assignedRep = assignLead(leadData, db);

        // Create lead
        const newLead = {
          name,
          phone,
          email: email || '',
          source: normalizedSource,
          projectId: projectId ? Number(projectId) : null,
          config: config || '',
          value: budget ? Number(budget) : 0,
          budget: budget ? Number(budget) : 0,
          stage: 'new',
          createdMinutesAgo: 0,
          reminderHoursAgo: 0,
          rep: assignedRep,
          score,
          tags: [],
          notes: [],
          timeline: [
            { type: 'whatsapp', text: `Bulk imported from ${normalizedSource}`, time: 'Just now', icon: 'messagecircle' },
          ],
          dealProb: 35,
          expectedClose: null,
          lossReason: null,
          preferences: { bedrooms: config || '', locations: [], amenities: [], budgetRange: [] },
          documents: [],
          commission: { rate: 2, earned: 0 },
          stageEnteredAt: new Date().toISOString(),
        };

        insertItem('contacts', newLead);
        results.imported++;
      } catch (err) {
        results.errors.push({ lead: leadInput, error: err.message });
      }
    }

    saveDb();

    res.json({
      success: true,
      data: results,
      message: `Imported ${results.imported} leads, ${results.duplicates} duplicates skipped, ${results.errors.length} errors`,
    });
  } catch (err) {
    console.error('Bulk import error:', err.message);
    res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
  }
});

export default router;
