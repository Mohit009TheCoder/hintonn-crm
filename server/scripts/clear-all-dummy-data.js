import 'dotenv/config';
import { initDb, firestoreDb } from '../data/firestore.js';

const COLLECTIONS_TO_WIPE = [
  'contacts', 'projects', 'calls', 'partners', 'tasks',
  'siteVisits', 'broadcasts', 'sequences', 'brochures',
  'notifications', 'nurtureSequences', 'nurtureLog', 'slaAlerts',
  'leadActivities', 'paymentMilestones', 'duplicateLeads', 'lead_messages'
];

async function main() {
  console.log('🧹 Wiping all transactional/dummy data from Firestore...');
  
  await initDb();

  async function clearCollection(colName) {
    const snapshot = await firestoreDb.collection(colName).get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      console.log(`  - ${colName}: Already empty.`);
      return;
    }
    const batch = firestoreDb.batch();
    snapshot.docs.forEach((doc) => {
      // Don't delete schema definitions if they somehow exist
      if (doc.id !== '_schema') {
        batch.delete(doc.ref);
      }
    });
    await batch.commit();
    console.log(`  - ${colName}: Deleted ${batchSize} documents.`);
  }

  for (const col of COLLECTIONS_TO_WIPE) {
    await clearCollection(col);
  }

  console.log('\n✅ Successfully wiped all dummy data! Core settings and users were kept intact.');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Failed to clear dummy data:', err);
  process.exit(1);
});
