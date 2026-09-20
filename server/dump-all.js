import { initDb, getDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  for (const key of Object.keys(db)) {
    if (Array.isArray(db[key])) {
      console.log(`${key}: ${db[key].length} items`);
    } else {
      console.log(`${key}: Object`);
    }
  }
  process.exit(0);
}
main();
