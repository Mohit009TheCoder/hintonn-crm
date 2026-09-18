/**
 * Clear script — removes all dummy/demo data from Firestore (emulator or cloud).
 * Keeps system configuration (stages, settings, team reps) and user's test lead (Admin Test).
 */
import 'dotenv/config';
import admin, { cert } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-hintonn-crm';

if (isEmulator) {
  admin.initializeApp({ projectId });
  console.log('🔧 Clear running in EMULATOR mode →', process.env.FIRESTORE_EMULATOR_HOST);
} else {
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(__dirname, '..', 'service-account.json');
  if (existsSync(saPath)) {
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: cert(sa), projectId: sa.project_id });
    console.log('☁️  Clear running in CLOUD mode →', sa.project_id);
  } else {
    console.error('❌ No service account found and FIRESTORE_EMULATOR_HOST not set.');
    process.exit(1);
  }
}

const db = getFirestore();
try { db.settings({ ignoreUndefinedProperties: true }); } catch (e) { /* already set */ }

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  if (snap.empty) {
    console.log(`  ⚪ ${name}: already empty`);
    return;
  }
  let count = 0;
  let batch = db.batch();
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log(`  🗑️  ${name}: deleted ${count} documents`);
}

async function main() {
  console.log('\n🧹 Clearing all records from Firestore (resetting to completely blank database)...\n');

  // Clear data collections completely
  const collectionsToClear = [
    'contacts',
    'projects',
    'calls',
    'partners',
    'tasks',
    'siteVisits',
    'broadcasts',
    'notifications',
    'brochures',
    'leadActivities',
    'slaAlerts',
    'nurtureLog',
    'paymentMilestones'
  ];

  for (const col of collectionsToClear) {
    await clearCollection(col);
  }

  // Reset simulation singleton
  await db.collection('simulation').doc('_default').set({
    simulatedHour: 0,
    logs: []
  });
  console.log('  🔄 simulation: reset to empty state');

  // Reset team leadsCount to 0
  const teamSnap = await db.collection('team').get();
  if (!teamSnap.empty) {
    const teamBatch = db.batch();
    teamSnap.docs.forEach(doc => {
      teamBatch.update(doc.ref, { leadsCount: 0 });
    });
    await teamBatch.commit();
    console.log('  🔄 team: reset lead counts to 0');
  }

  // Reset sequences activeLeads to 0
  const seqSnap = await db.collection('sequences').get();
  if (!seqSnap.empty) {
    const seqBatch = db.batch();
    seqSnap.docs.forEach(doc => {
      seqBatch.update(doc.ref, { activeLeads: 0 });
    });
    await seqBatch.commit();
    console.log('  🔄 sequences: reset active leads to 0');
  }

  // Reset nurtureSequences activeLeads to 0
  const nurtureSnap = await db.collection('nurtureSequences').get();
  if (!nurtureSnap.empty) {
    const nurtureBatch = db.batch();
    nurtureSnap.docs.forEach(doc => {
      nurtureBatch.update(doc.ref, { activeLeads: 0 });
    });
    await nurtureBatch.commit();
    console.log('  🔄 nurtureSequences: reset active leads to 0');
  }

  console.log('\n✨ All dummy data removed successfully.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Error clearing dummy data:', err);
  process.exit(1);
});
