import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { initDb, firestoreDb, COLLECTIONS, SINGLETON_KEYS } from '../data/firestore.js';
import { STAGES, TEAM, RAW_USERS, RAW_LEAD_SOURCES, SETTINGS } from '../data/seedData.js';
import { getDefaultPermissions } from '../data/auth.js';

async function main() {
  console.log('\n🚀 FULL RESET: Wiping Firestore and initializing clean state...\n');
  
  await initDb();

  // 1. Clear ALL collections
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

  for (const col of COLLECTIONS) {
    await clearCollection(col);
  }
  for (const key of SINGLETON_KEYS) {
    await clearCollection(key);
  }

  console.log('\n✅ Firestore completely wiped.\n');

  // 2. Generate initial system data
  console.log('🌱 Seeding fresh configuration (Auth, Stages, Sources, Settings)...');
  
  const defaultPasswordHash = await bcrypt.hash('password123', 10);
  const users = RAW_USERS.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    companyId: 'ashray-group',
    passwordHash: defaultPasswordHash,
    permissions: getDefaultPermissions(u.role),
    createdAt: new Date().toISOString(),
    lastLogin: null,
    avatar: null,
  }));

  const team = TEAM.map(t => ({
    ...t,
    leadsCount: 0
  }));

  // 3. Write fresh data to Firestore
  async function insertMany(colName, items) {
    if (items.length === 0) return;
    const batch = firestoreDb.batch();
    items.forEach(item => {
      const docRef = firestoreDb.collection(colName).doc(String(item.id));
      batch.set(docRef, item);
    });
    await batch.commit();
    console.log(`  ✅ ${colName}: Inserted ${items.length} records.`);
  }

  await insertMany('users', users);
  await insertMany('stages', STAGES);
  await insertMany('leadSources', RAW_LEAD_SOURCES);
  await insertMany('team', team);

  // Singletons
  await firestoreDb.collection('settings').doc('_default').set(SETTINGS);
  console.log('  ✅ settings: Initialized default configuration.');
  
  await firestoreDb.collection('simulation').doc('_default').set({ simulatedHour: 0, logs: [] });
  console.log('  ✅ simulation: Reset simulation state.');

  console.log('\n✨ Database is 100% READY for REAL-TIME data with ZERO dummy records!');
  console.log('All real leads entered via form, webhook, or API will store directly in Firestore.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Reset failed:', err);
  process.exit(1);
});
