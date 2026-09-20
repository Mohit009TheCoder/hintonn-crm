import express from 'express';
import { registerUser, loginUser, hashPassword } from '../data/auth.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getDb, updateItem } from '../data/db.js';
import { sendOtpEmail } from '../services/email.js';

const router = express.Router();

// ── POST /api/auth/register — Register new user ─────────────────────────────

router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role, companyId } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    const result = await registerUser({ name, email, phone, password, role, companyId });
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/login — Login (email or phone + password) ────────────────

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }
    const result = await loginUser({ identifier, password });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
});

// ── POST /api/auth/forgot-password — Request Password Reset OTP ──────────────

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    const db = getDb();
    const user = (db.users || []).find(u => u.email === email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Save OTP to user
    await updateItem('users', user.id, { resetOtp: otp, resetOtpExpires: otpExpires });

    // Send email
    await sendOtpEmail(user.email, otp);

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Forgot Password Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── POST /api/auth/reset-password — Verify OTP and set new password ────────

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
    }

    const db = getDb();
    const user = (db.users || []).find(u => u.email === email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (user.resetOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (Date.now() > user.resetOtpExpires) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Valid OTP, hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update user and clear OTP
    await updateItem('users', user.id, { 
      passwordHash,
      resetOtp: null,
      resetOtpExpires: null 
    });

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// ── All routes below require authentication ──────────────────────────────────

router.use(authenticate);

// ── GET /api/auth/me — Get current user profile ─────────────────────────────

router.get('/me', async (req, res) => {
  const db = getDb();
  let user = (db.users || []).find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  const { passwordHash, ...safeUser } = user;
  res.json({ success: true, data: safeUser });
});

// ── PUT /api/auth/profile — Update own profile ──────────────────────────────

router.put('/profile', async (req, res) => {
  const { name, phone, avatar } = req.body;
  const patch = {};
  if (name) patch.name = name;
  if (phone) patch.phone = phone;
  if (avatar !== undefined) patch.avatar = avatar;

  const updated = updateItem('users', req.user.id, patch);
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  const { passwordHash, ...safeUser } = updated;
  res.json({ success: true, data: safeUser });
});

// ── POST /api/auth/change-password — Change password ─────────────────────────

router.post('/change-password', async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required' });
  }

  const db = getDb();
  const user = (db.users || []).find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  const { comparePassword } = await import('../data/auth.js');
  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

  const passwordHash = await hashPassword(newPassword);
  updateItem('users', req.user.id, { passwordHash });
  res.json({ success: true, message: 'Password changed successfully' });
});

// ── GET /api/auth/users — List all users (admin only) ───────────────────────

router.get('/users', authorize('users', 'read'), (req, res) => {
  const db = getDb();
  const users = (db.users || []).map(u => {
    const { passwordHash, ...safeUser } = u;
    return safeUser;
  });
  res.json({ success: true, data: users, total: users.length });
});

// ── PUT /api/auth/users/:id — Update user role/status (admin only) ──────────

router.put('/users/:id', authorize('users', 'update'), async (req, res) => {
  const { role, isActive, name, phone } = req.body;
  const patch = {};
  if (role) {
    const { getDefaultPermissions } = await import('../data/auth.js');
    patch.role = role;
    patch.permissions = getDefaultPermissions(role);
  }
  if (isActive !== undefined) patch.isActive = isActive;
  if (name) patch.name = name;
  if (phone) patch.phone = phone;

  const updated = updateItem('users', req.params.id, patch);
  if (!updated) return res.status(404).json({ success: false, message: 'User not found' });
  const { passwordHash, ...safeUser } = updated;
  res.json({ success: true, data: safeUser });
});

export default router;
