import { initDb, getDb } from './data/firestore.js';
async function main() {
  await initDb();
  const db = getDb();
  console.log(db.contacts.map(c => ({ id: c.id, type: typeof c.id, num: Number(c.id) })));
  process.exit(0);
}
main();
