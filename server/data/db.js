/**
 * db.js — Main Database Persistence Engine re-export.
 * Connects to Firebase Firestore when emulator/cloud is configured.
 *
 * All routes import from this file; zero changes required in any route handlers.
 */
export {
  getDb,
  saveDb,
  getCollection,
  insertItem,
  asyncInsertItem,
  updateItem,
  deleteItem,
  initDb,
  reloadDb,
  isSupabaseConfigured,
  getSupabaseClient,
  COLLECTIONS,
  SINGLETON_KEYS,
} from './firestore.js';
