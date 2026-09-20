import { initDb, getDb, saveDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  const contact = db.contacts.find(c => Number(c.id) === 919825011234);
  console.log('Contact found before update:', !!contact, contact.stage);
  
  contact.stage = 'qualified';
  saveDb();
  
  // Wait a moment for fire-and-forget saveDb to finish
  await new Promise(r => setTimeout(r, 2000));
  console.log('Done!');
  process.exit(0);
}
main();
