/**
 * Input validation middleware using express-validator
 * Import and use in routes:
 *   import { validateLead, validatePartner, validate } from '../middleware/validate.js';
 *   router.post('/', validateLead, async (req, res) => { ... });
 */
import { body, param, query, validationResult } from 'express-validator';

// Generic error handler — call after validators
export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// ── Lead validation ──────────────────────────────────────────────────────────
export const validateLead = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }).withMessage('Name too long'),
  body('phone').optional({ checkFalsy: true }).trim().matches(/^[\d\s\-+()]{7,20}$/).withMessage('Invalid phone number'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('budget').optional({ checkFalsy: true }).isNumeric().withMessage('Budget must be a number'),
  body('stage').optional({ checkFalsy: true }).isIn(['new', 'contacted', 'qualified', 'negotiation', 'won', 'lost']).withMessage('Invalid stage'),
  body('tags').optional({ checkFalsy: true }).isArray().withMessage('Tags must be an array'),
  validate,
];

// ── Partner validation ───────────────────────────────────────────────────────
export const validatePartner = [
  body('name').trim().notEmpty().withMessage('Partner name is required').isLength({ max: 200 }),
  body('company').optional({ checkFalsy: true }).trim().isLength({ max: 200 }),
  body('phone').optional({ checkFalsy: true }).trim().matches(/^[\d\s\-+()]{7,20}$/).withMessage('Invalid phone number'),
  body('email').optional({ checkFalsy: true }).trim().isEmail().withMessage('Invalid email').normalizeEmail(),
  body('rating').optional({ checkFalsy: true }).isInt({ min: 1, max: 5 }).withMessage('Rating must be 1-5'),
  validate,
];

// ── Project validation ───────────────────────────────────────────────────────
export const validateProject = [
  body('name').trim().notEmpty().withMessage('Project name is required').isLength({ max: 300 }),
  body('loc').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
  body('type').optional({ checkFalsy: true }).toLowerCase().isIn(['residential', 'commercial', 'mixed', 'villa', 'plot']).withMessage('Invalid project type'),
  validate,
];

// ── Call log validation ──────────────────────────────────────────────────────
export const validateCall = [
  body('leadId').notEmpty().withMessage('Lead ID is required'),
  body('duration').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Duration must be a positive number'),
  body('notes').optional({ checkFalsy: true }).trim().isLength({ max: 2000 }),
  validate,
];

// ── Task validation ──────────────────────────────────────────────────────────
export const validateTask = [
  body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 300 }),
  body('dueDate').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format'),
  validate,
];

// ── Site visit validation ────────────────────────────────────────────────────
export const validateSiteVisit = [
  body('leadId').notEmpty().withMessage('Lead ID is required'),
  body('projectId').notEmpty().withMessage('Project ID is required'),
  body('date').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid date format'),
  validate,
];

// ── WhatsApp message validation ──────────────────────────────────────────────
export const validateWhatsAppMessage = [
  body('contactId').notEmpty().withMessage('Contact ID is required'),
  body('text').trim().notEmpty().withMessage('Message text is required').isLength({ max: 4096 }).withMessage('Message too long (max 4096 chars)'),
  validate,
];

// ── Generic ID param validation ──────────────────────────────────────────────
export const validateId = [
  param('id').notEmpty().withMessage('ID is required'),
  validate,
];
