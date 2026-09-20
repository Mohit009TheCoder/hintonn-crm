import 'dotenv/config';
import { initDb, getDb, saveDb, firestoreDb } from '../data/firestore.js';

async function main() {
  console.log('🧹 Deleting all leads from Firestore...');
  
  await initDb();

  async function clearCollection(colName) {
    const snapshot = await firestoreDb.collection(colName).get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      console.log(`  - ${colName}: 0 documents found.`);
      return;
    }
    const batch = firestoreDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`  - ${colName}: Deleted ${batchSize} documents.`);
  }

  await clearCollection('contacts');
  await clearCollection('duplicateLeads');
  await clearCollection('tasks');
  await clearCollection('calls');
  await clearCollection('siteVisits');
  
  console.log('\n✅ Successfully wiped all leads and related data!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed to clear leads:', err);
  process.exit(1);
});
