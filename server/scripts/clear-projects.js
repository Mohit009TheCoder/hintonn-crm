import 'dotenv/config';
import { initDb, firestoreDb } from '../data/firestore.js';

async function main() {
  console.log('Initializing database connection...');
  await initDb();
  
  async function clearCollection(colName) {
    const snapshot = await firestoreDb.collection(colName).get();
    const batchSize = snapshot.size;
    if (batchSize === 0) {
      console.log(`🗑️  ${colName}: Already empty.`);
      return;
    }
    
    const batch = firestoreDb.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`🗑️  ${colName}: Deleted ${batchSize} documents.`);
  }
  
  console.log('Removing all projects...');
  await clearCollection('projects');
  
  console.log('Successfully removed all projects. Database is fresh.');
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to clear projects:', err);
  process.exit(1);
});
