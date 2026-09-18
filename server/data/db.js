/**
 * db.js — Re-exports from Firestore persistence engine.
 * All routes import from this file; they need zero changes.
 */
export { getDb, saveDb, getCollection, insertItem, updateItem, deleteItem, initDb, reloadDb } from './firestore.js';
