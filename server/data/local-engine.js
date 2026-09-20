/**
 * local-engine.js — Local JSON persistence engine.
 * Exports standard API: getDb, saveDb, getCollection, insertItem, asyncInsertItem, updateItem, deleteItem, initDb, reloadDb.
 */
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import {
  STAGES, TEAM, RAW_PROJECTS, RAW_CONTACTS, RAW_CALLS, RAW_BROCHURES,
  RAW_PARTNERS, RAW_BROADCASTS, RAW_SITE_VISITS, RAW_TASKS, SEQUENCES,
  SETTINGS, generateInitialProjects, RAW_LEAD_SOURCES, RAW_NURTURE_SEQUENCES,
  RAW_PAYMENT_MILESTONES, RAW_USERS
} from './seedData.js';
import { getDefaultPermissions } from './auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCAL_DB_PATH = join(__dirname, 'local-db.json');

// Collection definitions
export const COLLECTIONS = [
  'contacts', 'projects', 'calls', 'partners', 'tasks',
  'siteVisits', 'broadcasts', 'sequences', 'team',
  'brochures', 'notifications', 'stages',
  'leadSources', 'nurtureSequences', 'nurtureLog', 'slaAlerts', 'leadActivities',
  'paymentMilestones', 'users', 'duplicateLeads'
];

export const SINGLETON_KEYS = ['settings', 'simulation'];

// In-memory cache
let cache = null;
let cacheLoaded = false;

// ── Default Seed Data Generator ─────────────────────────────────────────────

export async function generateInitialDataset() {
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  const projects = generateInitialProjects();

  const contacts = RAW_CONTACTS.map(c => ({
    ...c,
    nextReminderHour: (-c.reminderHoursAgo) + 24,
    lastReminderHour: null,
    reminderCount: 0,
    waLog: [
      {
        id: 1,
        text: `Hi ${c.name.split(' ')[0]}, welcome to Ashray Group! We received your inquiry regarding ${c.config || 'properties'}.`,
        time: 'Automated · Initial',
        dir: 'out'
      }
    ]
  }));

  const users = RAW_USERS.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    companyId: 'ashray-group',
    passwordHash: defaultPasswordHash,
    permissions: getDefaultPermissions(u.role),
    createdAt: new Date().toISOString(),
    lastLogin: null,
    avatar: null,
  }));

  const notifications = [
    { id: 1, title: 'Hot lead inquiry', text: 'Manish Bhatt asked about Horizon Heights 2 BHK', time: '2m ago', read: false },
    { id: 2, title: 'Site visit today', text: 'Foram Vyas at Vista Greens (4:00 PM)', time: '1h ago', read: false },
    { id: 3, title: 'Booking confirmed!', text: 'Sanjay Rathod closed Palm Meadows 4 BHK', time: '2h ago', read: true }
  ];

  return {
    contacts,
    projects,
    calls: RAW_CALLS || [],
    partners: RAW_PARTNERS || [],
    tasks: RAW_TASKS || [],
    siteVisits: RAW_SITE_VISITS || [],
    broadcasts: RAW_BROADCASTS || [],
    sequences: SEQUENCES || [],
    team: TEAM || [],
    brochures: RAW_BROCHURES || [],
    notifications,
    stages: STAGES || [],
    leadSources: RAW_LEAD_SOURCES || [],
    nurtureSequences: RAW_NURTURE_SEQUENCES || [],
    nurtureLog: [],
    slaAlerts: [],
    leadActivities: [],
    paymentMilestones: RAW_PAYMENT_MILESTONES || [],
    users,
    settings: SETTINGS || {},
    simulation: {
      simulatedHour: 0,
      logs: [
        { id: 1, contactId: 3, contactName: 'Kavita Shah', text: 'Sent 24h inactivity check-in via WhatsApp', hour: 0, time: 'Initial' }
      ]
    }
  };
}

// ── Local File Persistence ──────────────────────────────────────────────────

function saveLocalDbFile() {
  if (!cache) return;
  try {
    writeFileSync(LOCAL_DB_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local-db.json:', err.message);
  }
}

async function loadFromLocalDb() {
  if (existsSync(LOCAL_DB_PATH)) {
    try {
      const content = readFileSync(LOCAL_DB_PATH, 'utf8');
      const data = JSON.parse(content);
      return data;
    } catch (err) {
      console.warn('⚠️ local-db.json corrupted or unreadable. Generating fresh dataset...', err.message);
    }
  }

  const initial = await generateInitialDataset();
  try {
    writeFileSync(LOCAL_DB_PATH, JSON.stringify(initial, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to save initial local-db.json:', err.message);
  }
  return initial;
}

// ── Database Lifecycle Methods ──────────────────────────────────────────────

export async function initDb() {
  cache = await loadFromLocalDb();
  cacheLoaded = true;
  console.log('✅ Local database initialized');
  return cache;
}

export function getDb(forceReload = false) {
  if (!cacheLoaded || forceReload) {
    if (!cache) cache = {};
    return cache;
  }
  return cache;
}

export async function reloadDb() {
  cache = await loadFromLocalDb();
  cacheLoaded = true;
  return cache;
}

export function getCollection(collectionName) {
  const c = getDb();
  return c[collectionName] || [];
}

export function insertItem(collectionName, item) {
  const c = getDb();
  if (!c[collectionName]) c[collectionName] = [];

  const nextId = c[collectionName].length > 0
    ? Math.max(...c[collectionName].map(i => Number(i.id) || 0)) + 1
    : 1;

  const newItem = { id: nextId, ...item, createdAt: new Date().toISOString() };
  c[collectionName].unshift(newItem);
  
  saveLocalDbFile();
  return newItem;
}

export async function asyncInsertItem(collectionName, item) {
  const c = getDb();
  if (!c[collectionName]) c[collectionName] = [];

  let newItem = { ...item, createdAt: new Date().toISOString() };

  const nextId = c[collectionName].length > 0
    ? Math.max(...c[collectionName].map(i => Number(i.id) || 0)) + 1
    : 1;
  newItem.id = nextId;
  c[collectionName].unshift(newItem);
  saveLocalDbFile();
  return newItem;
}

export function updateItem(collectionName, id, patch) {
  const c = getDb();
  const list = c[collectionName] || [];
  const idx = list.findIndex(i => Number(i.id) === Number(id));
  if (idx === -1) return null;

  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
  saveLocalDbFile();

  return list[idx];
}

export function deleteItem(collectionName, id) {
  const c = getDb();
  const list = c[collectionName] || [];
  const idx = list.findIndex(i => Number(i.id) === Number(id));
  if (idx === -1) return false;

  c[collectionName].splice(idx, 1);
  saveLocalDbFile();

  return true;
}

export async function saveDb() {
  if (!cache) return;
  saveLocalDbFile();
}
