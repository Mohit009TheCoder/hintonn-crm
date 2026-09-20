import { initDb, getDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  console.log('Available contact IDs:', db.contacts.map(c => c.id));
  const contact = db.contacts.find(c => Number(c.id) === 919558211912);
  console.log('Contact found:', !!contact);
  process.exit(0);
}
main();
