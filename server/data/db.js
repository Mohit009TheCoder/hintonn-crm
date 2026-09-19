/**
 * db.js — Main Database Persistence Engine re-export.
 * Connects to Supabase when credentials are configured, or seamlessly falls back to
 * local persistent JSON storage.
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
} from './supabase.js';
