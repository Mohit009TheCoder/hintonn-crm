import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb, saveDb, insertItem } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'hintonn-crm-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

// Password hashing
export async function hashPassword(password) { return bcrypt.hash(password, 10); }
export async function comparePassword(password, hash) { return bcrypt.compare(password, hash); }

// JWT tokens
export function generateToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role, companyId: user.companyId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}
export function verifyToken(token) { return jwt.verify(token, JWT_SECRET); }

// Register new user
export async function registerUser({ name, email, phone, password, role, companyId }) {
  const db = getDb();
  const users = db.users || [];

  // Check duplicate email or phone
  const existingEmail = users.find(u => u.email === email);
  if (existingEmail) throw new Error('Email already registered');
  const existingPhone = users.find(u => u.phone === phone);
  if (existingPhone) throw new Error('Phone number already registered');

  const passwordHash = await hashPassword(password);
  const newUser = {
    name,
    email,
    phone,
    passwordHash,
    role: role || 'agent', // admin, manager, agent, viewer
    companyId: companyId || 'ashray-group',
    isActive: true,
    lastLogin: null,
    avatar: null,
    permissions: getDefaultPermissions(role || 'agent')
  };

  const saved = insertItem('users', newUser);
  const token = generateToken(saved);
  const { passwordHash: _, ...safeUser } = saved;
  return { token, user: safeUser };
}

// Login (email or phone)
export async function loginUser({ identifier, password }) {
  // identifier = email or phone
  const db = getDb();
  const users = db.users || [];

  const user = users.find(u =>
    u.email === identifier || u.phone === identifier
  );
  if (!user) throw new Error('Invalid credentials');
  if (!user.isActive) throw new Error('Account is deactivated');

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw new Error('Invalid credentials');

  user.lastLogin = new Date().toISOString();
  saveDb();

  const token = generateToken(user);
  const { passwordHash: _, ...safeUser } = user;
  return { token, user: safeUser };
}

// Get default permissions by role
export function getDefaultPermissions(role) {
  const perms = {
    admin: {
      leads: { read: true, create: true, update: true, delete: true },
      projects: { read: true, create: true, update: true, delete: true },
      pipeline: { read: true, update: true },
      partners: { read: true, create: true, update: true, delete: true },
      reports: { read: true },
      analytics: { read: true },
      settings: { read: true, update: true },
      users: { read: true, create: true, update: true, delete: true },
      documents: { read: true, create: true, update: true },
      bookings: { read: true, update: true },
      whatsapp: { read: true, send: true },
      calls: { read: true, log: true },
    },
    manager: {
      leads: { read: true, create: true, update: true, delete: false },
      projects: { read: true, create: false, update: true, delete: false },
      pipeline: { read: true, update: true },
      partners: { read: true, create: true, update: true, delete: false },
      reports: { read: true },
      analytics: { read: true },
      settings: { read: true, update: false },
      users: { read: true, create: false, update: false, delete: false },
      documents: { read: true, create: true, update: true },
      bookings: { read: true, update: true },
      whatsapp: { read: true, send: true },
      calls: { read: true, log: true },
    },
    agent: {
      leads: { read: true, create: true, update: true, delete: false },
      projects: { read: true, create: false, update: false, delete: false },
      pipeline: { read: true, update: true },
      partners: { read: true, create: false, update: false, delete: false },
      reports: { read: false },
      analytics: { read: false },
      settings: { read: false, update: false },
      users: { read: false, create: false, update: false, delete: false },
      documents: { read: true, create: true, update: false },
      bookings: { read: false, update: false },
      whatsapp: { read: true, send: true },
      calls: { read: true, log: true },
    },
    viewer: {
      leads: { read: true, create: false, update: false, delete: false },
      projects: { read: true, create: false, update: false, delete: false },
      pipeline: { read: true, update: false },
      partners: { read: true, create: false, update: false, delete: false },
      reports: { read: true },
      analytics: { read: true },
      settings: { read: false, update: false },
      users: { read: false, create: false, update: false, delete: false },
      documents: { read: true, create: false, update: false },
      bookings: { read: true, update: false },
      whatsapp: { read: true, send: false },
      calls: { read: true, log: false },
    }
  };
  return perms[role] || perms.viewer;
}
