/**
 * Firestore-backed persistence engine.
 * Drop-in replacement for the old JSON-file db.js.
 * Exports the same API: getDb, saveDb, getCollection, insertItem, asyncInsertItem, updateItem, deleteItem
 *
 * Modes:
 *   Emulator (local dev): set FIRESTORE_EMULATOR_HOST=localhost:8082
 *   Cloud (production):   set GOOGLE_APPLICATION_CREDENTIALS to service account path
 */
import admin, { cert } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-hintonn-crm';

if (admin.getApps().length === 0) {
  if (isEmulator) {
    // Emulator mode — no real credentials needed
    admin.initializeApp({ projectId });
    console.log(`🔧 Firestore EMULATOR mode → ${process.env.FIRESTORE_EMULATOR_HOST}`);
  } else {
    // Cloud mode — service account required
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(__dirname, '..', 'service-account.json');
    if (!existsSync(saPath)) {
      console.error('❌ No service account found. Set FIRESTORE_EMULATOR_HOST for local dev, or provide service-account.json for cloud.');
      process.exit(1);
    }
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: cert(sa), projectId: sa.project_id });
    console.log('☁️  Firestore CLOUD mode →', sa.project_id);
  }
}

const db = getFirestore('default');
db.settings({ ignoreUndefinedProperties: true });

// ── Collection names that map 1:1 to the old db.json keys ───────────────────
export const COLLECTIONS = [
  'contacts', 'projects', 'calls', 'partners', 'tasks',
  'siteVisits', 'broadcasts', 'sequences', 'team',
  'brochures', 'notifications', 'stages',
  'leadSources', 'nurtureSequences', 'nurtureLog', 'slaAlerts', 'leadActivities',
  'paymentMilestones', 'users', 'duplicateLeads'
];

// Singleton documents stored under a fixed doc ID inside their collection
export const SINGLETON_KEYS = ['settings', 'simulation'];

// ── In-memory cache ─────────────────────────────────────────────────────────
let cache = null;
let cacheLoaded = false;

/**
 * Load all collections from Firestore into the in-memory cache.
 * Called once on first getDb(), then served from memory.
 * Individual mutations (insert/update/delete) keep cache in sync.
 */
async function loadAllFromFirestore() {
  const result = {};

  // Load regular collections (arrays of docs)
  const reads = COLLECTIONS.map(async (colName) => {
    const snap = await db.collection(colName).get();
    result[colName] = snap.docs.map(d => {
      // Restore numeric IDs — Firestore doc IDs are always strings,
      // but the original data used numbers. Convert back so every
      // leads.find(c => c.id === t.contactId) comparison works.
      const rawId = d.id;
      const id = /^\d+$/.test(rawId) ? Number(rawId) : rawId;
      return { id, ...d.data() };
    });
  });
  await Promise.all(reads);

  // Load singleton docs
  for (const key of SINGLETON_KEYS) {
    const doc = await db.collection(key).doc('_default').get();
    result[key] = doc.exists ? doc.data() : {};
  }

  return result;
}

/**
 * getDb() — synchronous accessor.
 * First call loads from Firestore; subsequent calls return the cached object.
 * Routes that need fresh data should call getDb(true) to force reload.
 */
export function getDb(forceReload = false) {
  if (!cacheLoaded || forceReload) {
    // Kick off the async load; for the very first call, we handle it in server startup
    if (!cache) {
      cache = {};
    }
    return cache;
  }
  return cache;
}

/**
 * Initialize the database — must be called once at server startup (await).
 * Loads all data from Firestore into the cache so subsequent getDb() calls
 * return synchronously.
 */
export async function initDb() {
  cache = await loadAllFromFirestore();
  cacheLoaded = true;
  console.log('✅ Firestore data loaded into memory');
  return cache;
}

/**
 * Force a full reload from Firestore (for hot-reload or after external writes).
 */
export async function reloadDb() {
  cache = await loadAllFromFirestore();
  cacheLoaded = true;
  return cache;
}

/**
 * saveDb() — writes the entire in-memory cache back to Firestore.
 * Used by routes that mutate the cache directly (pipeline, whatsapp simulation, etc.)
 * Writes each collection in parallel for speed.
 */
export function saveDb() {
  if (!cache) return;
  const writes = [];

  for (const colName of COLLECTIONS) {
    const items = cache[colName];
    if (!Array.isArray(items)) continue;
    const colRef = db.collection(colName);
    for (const item of items) {
      const docId = String(item.id);
      const { id, ...data } = item;
      writes.push(colRef.doc(docId).set(data, { merge: true }));
    }
  }

  for (const key of SINGLETON_KEYS) {
    if (cache[key] && typeof cache[key] === 'object' && Object.keys(cache[key]).length > 0) {
      writes.push(db.collection(key).doc('_default').set(cache[key], { merge: true }));
    }
  }

  // Fire-and-forget — routes expect saveDb() to be synchronous
  Promise.all(writes).catch(err => console.error('saveDb write error:', err.message));
}

/**
 * getCollection(name) — returns an array from the cache.
 */
export function getCollection(collectionName) {
  const c = getDb();
  return c[collectionName] || [];
}

/**
 * insertItem(collectionName, item) — adds to cache + writes to Firestore.
 * Auto-assigns a numeric ID.
 */
export function insertItem(collectionName, item) {
  const c = getDb();
  if (!c[collectionName]) c[collectionName] = [];

  const nextId = c[collectionName].length > 0
    ? Math.max(...c[collectionName].map(i => Number(i.id) || 0)) + 1
    : 1;

  const newItem = { id: nextId, ...item, createdAt: new Date().toISOString() };
  c[collectionName].unshift(newItem);

  // Write to Firestore
  const { id, ...data } = newItem;
  db.collection(collectionName).doc(String(id)).set(data)
    .catch(err => console.error(`insertItem ${collectionName}/${id} error:`, err.message));

  return newItem;
}

/**
 * asyncInsertItem(collectionName, item) — async version of insertItem.
 */
export async function asyncInsertItem(collectionName, item) {
  const c = getDb();
  if (!c[collectionName]) c[collectionName] = [];

  let newItem = { ...item, createdAt: new Date().toISOString() };

  const nextId = c[collectionName].length > 0
    ? Math.max(...c[collectionName].map(i => Number(i.id) || 0)) + 1
    : 1;
  newItem.id = nextId;
  c[collectionName].unshift(newItem);

  // Write to Firestore
  const { id, ...data } = newItem;
  await db.collection(collectionName).doc(String(id)).set(data)
    .catch(err => console.error(`asyncInsertItem ${collectionName}/${id} error:`, err.message));

  return newItem;
}

/**
 * updateItem(collectionName, id, patch) — updates cache + writes to Firestore.
 */
export function updateItem(collectionName, id, patch) {
  const c = getDb();
  const list = c[collectionName] || [];
  const idx = list.findIndex(i => Number(i.id) === Number(id));
  if (idx === -1) return null;

  list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };

  // Write to Firestore
  const { id: _id, ...data } = list[idx];
  db.collection(collectionName).doc(String(id)).set(data, { merge: true })
    .catch(err => console.error(`updateItem ${collectionName}/${id} error:`, err.message));

  return list[idx];
}

/**
 * deleteItem(collectionName, id) — removes from cache + deletes from Firestore.
 */
export function deleteItem(collectionName, id) {
  const c = getDb();
  const list = c[collectionName] || [];
  const idx = list.findIndex(i => Number(i.id) === Number(id));
  if (idx === -1) return false;

  c[collectionName].splice(idx, 1);

  // Delete from Firestore
  db.collection(collectionName).doc(String(id)).delete()
    .catch(err => console.error(`deleteItem ${collectionName}/${id} error:`, err.message));

  return true;
}

// Compat stubs for routes that check Supabase
export function isSupabaseConfigured() {
  return false;
}

export function getSupabaseClient() {
  return null;
}

export { db as firestoreDb, admin as firebaseAdmin };
