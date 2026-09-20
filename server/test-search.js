import { initDb, getDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  
  const q = 'a';
  
  try {
    const leads = (db.contacts || []).filter(c =>
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.config && c.config.toLowerCase().includes(q))
    ).slice(0, 5);
    console.log('Leads:', leads.length);
  } catch (err) {
    console.error('Error in leads:', err);
  }
  
  process.exit(0);
}
main();
