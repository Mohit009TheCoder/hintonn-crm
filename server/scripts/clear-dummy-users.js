import 'dotenv/config';
import { initDb, firestoreDb } from '../data/firestore.js';

async function main() {
  console.log('\n🧹 Removing dummy users and team members...\n');
  
  await initDb();

  const dummyIds = ['1', '2', '3', '4', '5'];
  let deletedUsers = 0;
  
  // Delete dummy users
  for (const id of dummyIds) {
    const docRef = firestoreDb.collection('users').doc(id);
    const doc = await docRef.get();
    if (doc.exists) {
      await docRef.delete();
      deletedUsers++;
    }
  }
  console.log(`  🗑️  users: Deleted ${deletedUsers} dummy documents (kept your registered account).`);

  // Delete all team members
  const teamSnap = await firestoreDb.collection('team').get();
  const teamBatch = firestoreDb.batch();
  teamSnap.docs.forEach(doc => {
    teamBatch.delete(doc.ref);
  });
  await teamBatch.commit();
  console.log(`  🗑️  team: Deleted ${teamSnap.size} dummy documents.`);

  console.log('\n✅ Dummy users and team completely wiped.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
