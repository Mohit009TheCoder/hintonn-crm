import 'dotenv/config';
import { initDb, firestoreDb } from '../data/firestore.js';

const CONTENT_COLLECTIONS = [
  'contacts',
  'projects',
  'calls',
  'partners',
  'tasks',
  'siteVisits',
  'broadcasts',
  'sequences',
  'brochures',
  'notifications',
  'nurtureSequences',
  'paymentMilestones'
];

async function main() {
  console.log('\n🧹 Removing all dummy content collections...\n');
  
  await initDb();

  async function clearCollection(colName) {
    const snapshot = await firestoreDb.collection(colName).get();
    const batchSize = snapshot.size;
    if (batchSize === 0) return;
    
    const batch = firestoreDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`  🗑️  ${colName}: Deleted ${batchSize} documents.`);
  }

  for (const col of CONTENT_COLLECTIONS) {
    await clearCollection(col);
  }

  console.log('\n✅ Content collections completely wiped. Users & Settings preserved.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
