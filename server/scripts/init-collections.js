import 'dotenv/config';
import { initDb, firestoreDb } from '../data/firestore.js';

const COLLECTIONS_TO_INIT = [
  'contacts',
  'projects',
  'calls',
  'partners',
  'tasks',
  'siteVisits',
  'broadcasts',
  'sequences',
  'team',
  'brochures',
  'notifications',
  'nurtureSequences',
  'paymentMilestones'
];

async function main() {
  console.log('\n🌟 Initializing empty collections to keep them visible...\n');
  
  await initDb();

  for (const col of COLLECTIONS_TO_INIT) {
    // Add a placeholder document so the collection stays visible in the Firebase console
    const docRef = firestoreDb.collection(col).doc('_init');
    await docRef.set({
      _isHidden: true,
      _note: 'This is a system document used to keep the collection visible in the Firebase console while it is empty.'
    });
    console.log(`  ✅ ${col}: Created _init document.`);
  }

  console.log('\n🎉 All collections are now permanently visible in Firebase!\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Init failed:', err);
  process.exit(1);
});
