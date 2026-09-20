import 'dotenv/config';
import { initDb, firestoreDb, COLLECTIONS } from './data/firestore.js';

async function main() {
  await initDb();
  for (const col of COLLECTIONS) {
    const snap = await firestoreDb.collection(col).get();
    if (snap.size > 0) {
      console.log(`Collection ${col} has ${snap.size} documents.`);
    }
  }
  process.exit(0);
}
main();
