/**
 * Seed script — writes all demo data into Firestore (emulator or cloud).
 * Run once:  node scripts/seed.js
 * Idempotent: re-running overwrites docs with the same ID.
 */
import 'dotenv/config';
import admin, { cert } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import {
  STAGES, TEAM, RAW_PROJECTS, RAW_CONTACTS, RAW_CALLS, RAW_BROCHURES,
  RAW_PARTNERS, RAW_BROADCASTS, RAW_SITE_VISITS, RAW_TASKS, SEQUENCES,
  SETTINGS, generateInitialProjects, RAW_LEAD_SOURCES, RAW_NURTURE_SEQUENCES,
  RAW_MILESTONE_TEMPLATES, RAW_PAYMENT_MILESTONES, RAW_USERS
} from '../data/seedData.js';
import { hashPassword, getDefaultPermissions } from '../data/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
const projectId = process.env.FIREBASE_PROJECT_ID || 'demo-hintonn-crm';

try {
  if (isEmulator) {
    admin.initializeApp({ projectId });
    console.log('🔧 Seed running in EMULATOR mode →', process.env.FIRESTORE_EMULATOR_HOST);
  } else {
    const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || join(__dirname, '..', 'service-account.json');
    const sa = JSON.parse(readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: cert(sa), projectId: sa.project_id });
    console.log('☁️  Seed running in CLOUD mode →', sa.project_id);
  }
} catch (e) {
  console.log('🔧 Firebase already initialized by imported modules');
}

const db = getFirestore('default');
try { db.settings({ ignoreUndefinedProperties: true }); } catch(e) { /* already configured */ }

async function seedCollection(name, items, idField = 'id') {
  const col = db.collection(name);
  let count = 0;
  let batch = db.batch();

  for (const item of items) {
    const docId = String(item[idField]);
    const { [idField]: _, ...data } = item;
    batch.set(col.doc(docId), data);
    count++;
    if (count % 450 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }

  await batch.commit();
  console.log(`  ✅ ${name}: ${count} documents`);
}

async function seedSingleton(name, data) {
  await db.collection(name).doc('_default').set(data);
  console.log(`  ✅ ${name}: 1 singleton document`);
}

async function main() {
  console.log('\n🔥 Seeding Firestore...\n');

  const projects = generateInitialProjects();

  const contacts = RAW_CONTACTS.map(c => ({
    ...c,
    nextReminderHour: (-c.reminderHoursAgo) + 24,
    lastReminderHour: null,
    reminderCount: 0,
    waLog: [
      { id: 1, text: 'Hi ' + c.name.split(' ')[0] + ', welcome to Ashray Group! We received your inquiry regarding ' + (c.config || 'properties') + '.', time: 'Automated · Initial', dir: 'out' }
    ]
  }));

  console.log('Seeding collections...');
  await seedCollection('stages', STAGES, 'id');
  await seedCollection('team', TEAM, 'id');
  await seedCollection('projects', projects, 'id');

  // Preserve existing contacts (e.g. Admin Test created by user)
  const existingContactsSnap = await db.collection('contacts').get();
  const existingDocs = existingContactsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`  ℹ️ Found ${existingDocs.length} existing contacts in DB (preserving user contacts)`);
  const existingIds = new Set(existingDocs.map(d => String(d.id)));
  const contactsToSeed = contacts.filter(c => !existingIds.has(String(c.id)));
  if (contactsToSeed.length > 0) {
    await seedCollection('contacts', contactsToSeed, 'id');
  } else {
    console.log('  ✅ contacts: preserved existing without overwriting');
  }
  await seedCollection('calls', RAW_CALLS, 'id');
  await seedCollection('brochures', RAW_BROCHURES, 'id');
  await seedCollection('partners', RAW_PARTNERS, 'id');
  await seedCollection('broadcasts', RAW_BROADCASTS, 'id');
  await seedCollection('siteVisits', RAW_SITE_VISITS, 'id');
  await seedCollection('tasks', RAW_TASKS, 'id');
  await seedCollection('sequences', SEQUENCES, 'id');
  await seedCollection('leadSources', RAW_LEAD_SOURCES, 'id');
  await seedCollection('nurtureSequences', RAW_NURTURE_SEQUENCES, 'id');
  await seedCollection('paymentMilestones', RAW_PAYMENT_MILESTONES, 'id');

  // Seed users with hashed passwords
  console.log('\nSeeding users...');
  const defaultPasswordHash = await hashPassword('password123');
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
  await seedCollection('users', users, 'id');

  console.log('\nSeeding singletons...');
  await seedSingleton('settings', SETTINGS);
  await seedSingleton('simulation', {
    simulatedHour: 0,
    logs: [
      { id: 1, contactId: 3, contactName: 'Kavita Shah', text: 'Sent 24h inactivity check-in via WhatsApp', hour: 0, time: 'Initial' }
    ]
  });

  await seedCollection('notifications', [
    { id: 1, title: 'Hot lead inquiry', text: 'Manish Bhatt asked about Horizon Heights 2 BHK', time: '2m ago', read: false },
    { id: 2, title: 'Site visit today', text: 'Foram Vyas at Vista Greens (4:00 PM)', time: '1h ago', read: false },
    { id: 3, title: 'Booking confirmed!', text: 'Sanjay Rathod closed Palm Meadows 4 BHK', time: '2h ago', read: true }
  ], 'id');

  console.log('\n🎉 Seed complete — all data written to Firestore');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
