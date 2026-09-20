import { initDb, getDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  console.log('Projects:', db.projects);
  console.log('Contacts:', db.contacts);
  process.exit(0);
}
main();
