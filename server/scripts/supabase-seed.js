/**
 * supabase-seed.js — Seeds all sample CRM data directly into Supabase.
 * Run once: npm run supabase:seed
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  generateInitialDataset,
  toDbRecord,
  isSupabaseConfigured,
  COLLECTIONS,
  SINGLETON_KEYS
} from '../data/supabase.js';

const TABLE_MAP = {
  contacts: 'contacts',
  projects: 'projects',
  calls: 'calls',
  partners: 'partners',
  tasks: 'tasks',
  siteVisits: 'site_visits',
  broadcasts: 'broadcasts',
  sequences: 'sequences',
  team: 'team',
  brochures: 'brochures',
  notifications: 'notifications',
  stages: 'stages',
  leadSources: 'lead_sources',
  nurtureSequences: 'nurture_sequences',
  nurtureLog: 'nurture_log',
  slaAlerts: 'sla_alerts',
  leadActivities: 'lead_activities',
  paymentMilestones: 'payment_milestones',
  users: 'users',
};

async function seed() {
  console.log('\n🚀 Hintonn CRM — Supabase Database Seeder\n');

  if (!isSupabaseConfigured()) {
    console.error('❌ Error: Supabase credentials not found in server/.env');
    console.error('Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) in server/.env\n');
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  console.log(`📡 Connecting to Supabase project: ${url}`);
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log('📦 Generating CRM seed dataset (with hashed credentials)...');
  const dataset = await generateInitialDataset();

  console.log('\nWriting collections to Supabase tables:');

  for (const colName of COLLECTIONS) {
    const items = dataset[colName];
    if (!Array.isArray(items) || items.length === 0) continue;

    const tableName = TABLE_MAP[colName] || colName;
    const records = items.map(toDbRecord);

    const { error } = await client.from(tableName).upsert(records, { onConflict: 'id' });
    if (error) {
      console.error(`  ❌ ${tableName} failed:`, error.message);
    } else {
      console.log(`  ✅ ${tableName}: ${records.length} records seeded`);
    }
  }

  console.log('\nWriting settings & singletons to app_settings:');
  for (const key of SINGLETON_KEYS) {
    if (dataset[key]) {
      const { error } = await client.from('app_settings').upsert({
        key,
        data: dataset[key],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

      if (error) {
        console.error(`  ❌ app_settings (${key}) failed:`, error.message);
      } else {
        console.log(`  ✅ app_settings: ${key} configured`);
      }
    }
  }

  console.log('\n🎉 Supabase Database successfully seeded!');
  console.log('Demo Login credentials:');
  console.log('  Email:    rohan@ashraygroup.in');
  console.log('  Password: password123');
  console.log('  Role:     admin\n');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
