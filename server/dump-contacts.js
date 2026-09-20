import { initDb, getDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  console.log(JSON.stringify(db.contacts, null, 2));
  process.exit(0);
}
main();
