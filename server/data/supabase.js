/**
 * supabase.js — Supabase persistence engine with seamless local fallback.
 * Exports standard API: getDb, saveDb, getCollection, insertItem, updateItem, deleteItem, initDb, reloadDb.
 */
import { createClient } from '@supabase/supabase-js';
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

// Table name mappings
const TABLE_MAP = {
  contacts: 'contacts',
  projects: 'projects',
  calls: 'calls',
  partners: 'partners',
  tasks: 'tasks',
  siteVisits: 'site_visits',
  broadcasts: 'broadcasts',
  sequences: 'sequences',
  team: 'team',
  brochures: 'brochures',
  notifications: 'notifications',
  stages: 'stages',
  leadSources: 'lead_sources',
  nurtureSequences: 'nurture_sequences',
  nurtureLog: 'nurture_log',
  slaAlerts: 'sla_alerts',
  leadActivities: 'lead_activities',
  paymentMilestones: 'payment_milestones',
  users: 'users',
  duplicateLeads: 'duplicate_leads',
};

// In-memory cache
let cache = null;
let cacheLoaded = false;
let supabaseClient = null;
let useLocalMode = false;

export function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(url && key && !url.includes('your-project') && !key.includes('your-supabase'));
}

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!isSupabaseConfigured()) return null;

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return supabaseClient;
}

// ── Case Transformation Helpers (Top-Level Keys) ───────────────────────────

export function camelToSnake(str) {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Fields that must never be sent to the database (ephemeral / computed)
const IGNORED_DB_KEYS = new Set([
  'automationLog', 'automation_log',
  'matchedLeadCount', 'matched_lead_count',
  'leadCount', 'lead_count',
  'brochureStats', 'brochure_stats',
]);

// Hardcoded column whitelists per table (matches supabase-schema.sql)
// Fields not in this list will be silently dropped before writing to Supabase.
const KNOWN_COLUMNS = {
  contacts: new Set([
    'id','name','phone','email','source','project_id','config','value','stage',
    'created_minutes_ago','reminder_hours_ago','rep','score','duplicate_of',
    'tags','notes','timeline','deal_prob','expected_close','loss_reason',
    'preferences','documents','commission','wa_log',
    'next_reminder_hour','last_reminder_hour','reminder_count','days_since',
    'stage_entered_at','nurture_paused','nurture_sequence_id','nurture_step',
    'sla_status','sla_alerted_at','lead_temp','last_activity_at',
    'platform_lead_id','form_id','utm_source','utm_campaign','utm_medium',
    'assigned_at','follow_up_at','is_nri','referral_by','company',
    'created_at','updated_at',
  ]),
  projects: new Set([
    'id','name','type','loc','configs','price_min','price_max','total_units','available',
    'possession','units','status','rera_number','amenities','highlights','brochure_url',
    'images','matched_lead_count','created_at','updated_at',
  ]),
  calls: new Set([
    'id','contact_id','lead_id','duration','duration_secs','notes','rep','outcome','time',
    'contact_name','direction','recording_url','sentiment','created_at',
  ]),
  partners: new Set([
    'id','name','company','phone','email','type','rating','deals_closed','total_rev',
    'commission_earned','city','specialization','notes','active_listings','is_active',
    'created_at','updated_at',
  ]),
  tasks: new Set([
    'id','title','due','priority','assignee','contact_id','lead_id','done','description',
    'category','completed_at','reminder_at','created_at','updated_at',
  ]),
  site_visits: new Set([
    'id','contact_id','lead_id','project_id','date','time','status','rep','notes',
    'feedback','outcome','visit_type','rating','follow_up_date','auto_scheduled',
    'created_at','updated_at',
  ]),
  users: new Set([
    'id','name','email','phone','role','company_id','password_hash','is_active',
    'permissions','avatar','last_login','leads_assigned','deals_closed',
    'created_at','updated_at',
  ]),
  broadcasts: new Set([
    'id','title','audience','sent_at','delivered','opened','responded','status','created_at',
  ]),
  sequences: new Set([
    'id','name','trigger_event','active_leads','steps','is_active','created_at',
  ]),
  brochures: new Set([
    'id','title','project_id','file_url','downloads','created_at',
  ]),
  notifications: new Set([
    'id','title','text','time','read','type','link','created_at',
  ]),
  lead_sources: new Set([
    'id','name','cost_per_lead','roi','leads_count',
  ]),
  nurture_sequences: new Set([
    'id','name','trigger_stage','active_leads','steps','is_active','description','created_at',
  ]),
  nurture_log: new Set([
    'id','contact_id','sequence_id','step','sent_at','status',
  ]),
  sla_alerts: new Set([
    'id','lead_id','lead_name','message','alerted_at','resolved',
  ]),
  lead_activities: new Set([
    'id','lead_id','type','title','description','created_at',
  ]),
  payment_milestones: new Set([
    'id','contact_id','project_id','milestone_name','amount','due_date','status','paid_at',
  ]),
  stages: new Set(['id','name','order_idx']),
  team: new Set(['id','name','role','email','phone','leads_count']),
  duplicate_leads: new Set([
    'id','name','phone','email','source','config','budget','message',
    'duplicate_of','match_type','status','capture_data','created_at','updated_at'
  ]),
};

// Strip record keys that don't exist in the known schema for this table
function stripToKnownColumns(client, tableName, record) {
  const cols = KNOWN_COLUMNS[tableName];
  if (!cols) return Promise.resolve(record); // Unknown table – pass through
  const stripped = {};
  for (const [k, v] of Object.entries(record)) {
    if (cols.has(k)) stripped[k] = v;
  }
  return Promise.resolve(stripped);
}

export function toDbRecord(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  const out = {};
  for (const [key, val] of Object.entries(item)) {
    if (IGNORED_DB_KEYS.has(key)) continue;
    out[camelToSnake(key)] = val;
  }
  return out;
}

export function fromDbRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return record;
  const out = {};
  for (const [key, val] of Object.entries(record)) {
    const camelKey = snakeToCamel(key);
    // Convert numeric strings to numbers if field is id or foreign id
    if ((camelKey === 'id' || camelKey.endsWith('Id')) && typeof val === 'string' && /^\d+$/.test(val)) {
      out[camelKey] = Number(val);
    } else {
      out[camelKey] = val;
    }
  }
  return out;
}

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

// ── Supabase Cloud Loader ───────────────────────────────────────────────────

async function loadAllFromSupabase(client) {
  const result = {};

  for (const colName of COLLECTIONS) {
    const tableName = TABLE_MAP[colName] || camelToSnake(colName);
    const { data, error } = await client.from(tableName).select('*');
    if (error) {
      throw new Error(`Failed to load ${tableName}: ${error.message}`);
    }
    result[colName] = (data || []).map(fromDbRecord);
  }

  // Load singletons from app_settings
  const { data: settingsData, error: settingsError } = await client.from('app_settings').select('*');
  if (settingsError) {
    throw new Error(`Failed to load app_settings: ${settingsError.message}`);
  }

  for (const key of SINGLETON_KEYS) {
    const row = (settingsData || []).find(r => r.key === key);
    result[key] = row?.data || {};
  }

  return result;
}

// ── Database Lifecycle Methods ──────────────────────────────────────────────

export async function initDb() {
  if (isSupabaseConfigured()) {
    console.log('⚡ Connecting to Supabase at:', process.env.SUPABASE_URL);
    const client = getSupabaseClient();
    try {
      cache = await loadAllFromSupabase(client);
      cacheLoaded = true;
      useLocalMode = false;
      console.log('✅ Supabase connected & data loaded into memory');
      return cache;
    } catch (err) {
      console.warn('⚠️  Supabase load failed:', err.message);
      // Don't fall back to local mode — start empty so seed data doesn't get written back
      cache = {};
      for (const col of COLLECTIONS) cache[col] = [];
      for (const key of SINGLETON_KEYS) cache[key] = {};
      cacheLoaded = true;
      useLocalMode = false;
      console.log('ℹ️  Starting with empty cache (Supabase tables may need seeding)');
      return cache;
    }
  } else {
    console.log('ℹ️  No SUPABASE_URL configured in .env. Running in local persistence mode.');
  }

  // Local fallback only when Supabase is NOT configured
  useLocalMode = true;
  cache = await loadFromLocalDb();
  cacheLoaded = true;
  console.log('✅ Local database initialized with demo dataset');
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
  if (!useLocalMode && isSupabaseConfigured()) {
    try {
      const client = getSupabaseClient();
      cache = await loadAllFromSupabase(client);
      cacheLoaded = true;
      return cache;
    } catch (err) {
      console.error('Supabase reload error:', err.message);
    }
  }
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

  // Sync with Supabase if online
  if (!useLocalMode && isSupabaseConfigured()) {
    const client = getSupabaseClient();
    const tableName = TABLE_MAP[collectionName] || camelToSnake(collectionName);
    const rawRecord = toDbRecord(newItem);

    stripToKnownColumns(client, tableName, rawRecord)
      .then(record => client.from(tableName).insert([record]))
      .then(({ error }) => {
        if (error) console.error(`Supabase insertItem ${tableName}/${nextId} error:`, error.message);
      })
      .catch(err => console.error(`Supabase insertItem error:`, err.message));
  } else {
    saveLocalDbFile();
  }

  return newItem;
}

export async function asyncInsertItem(collectionName, item) {
  const c = getDb();
  if (!c[collectionName]) c[collectionName] = [];

  let newItem = { ...item, createdAt: new Date().toISOString() };

  if (!useLocalMode && isSupabaseConfigured()) {
    const client = getSupabaseClient();
    const tableName = TABLE_MAP[collectionName] || camelToSnake(collectionName);
    const rawRecord = toDbRecord(newItem);
    
    // Remove ID so Supabase sequence generates it
    delete rawRecord.id;

    const record = await stripToKnownColumns(client, tableName, rawRecord);
    const { data, error } = await client.from(tableName).insert([record]).select();

    if (error) {
      console.error(`Supabase asyncInsertItem ${tableName} error:`, error.message);
      throw new Error(error.message);
    }

    newItem = fromDbRecord(data[0]);
    c[collectionName].unshift(newItem);
    return newItem;
  } else {
    const nextId = c[collectionName].length > 0
      ? Math.max(...c[collectionName].map(i => Number(i.id) || 0)) + 1
      : 1;
    newItem.id = nextId;
    c[collectionName].unshift(newItem);
    saveLocalDbFile();
    return newItem;
  }
}

export function updateItem(collectionName, id, patch) {
  const c = getDb();
  const list = c[collectionName] || [];
  const idx = list.findIndex(i => Number(i.id) === Number(id));
  if (idx === -1) return null;

  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };

  // Sync with Supabase if online
  if (!useLocalMode && isSupabaseConfigured()) {
    const client = getSupabaseClient();
    const tableName = TABLE_MAP[collectionName] || camelToSnake(collectionName);
    const rawRecord = toDbRecord(list[idx]);

    stripToKnownColumns(client, tableName, rawRecord)
      .then(record => client.from(tableName).update(record).eq('id', id))
      .then(({ error }) => {
        if (error) console.error(`Supabase updateItem ${tableName}/${id} error:`, error.message);
      })
      .catch(err => console.error(`Supabase updateItem error:`, err.message));
  } else {
    saveLocalDbFile();
  }

  return list[idx];
}

export function deleteItem(collectionName, id) {
  const c = getDb();
  const list = c[collectionName] || [];
  const idx = list.findIndex(i => Number(i.id) === Number(id));
  if (idx === -1) return false;

  c[collectionName].splice(idx, 1);

  // Sync with Supabase if online
  if (!useLocalMode && isSupabaseConfigured()) {
    const client = getSupabaseClient();
    const tableName = TABLE_MAP[collectionName] || camelToSnake(collectionName);

    client.from(tableName).delete().eq('id', id)
      .then(({ error }) => {
        if (error) console.error(`Supabase deleteItem ${tableName}/${id} error:`, error.message);
      })
      .catch(err => console.error(`Supabase deleteItem error:`, err.message));
  } else {
    saveLocalDbFile();
  }

  return true;
}

export async function saveDb() {
  if (!cache) return;

  // Only save to local file — Supabase sync happens per-record in insertItem/updateItem/deleteItem
  if (useLocalMode || !isSupabaseConfigured()) {
    saveLocalDbFile();
    return;
  }

  // Supabase mode: no bulk sync needed (individual ops already persist)
  // This prevents stale cache from overwriting deleted data
}
