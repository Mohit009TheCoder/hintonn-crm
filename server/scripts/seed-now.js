/**
 * Seed Supabase — strips columns that don't match the table schema.
 * Run: node scripts/seed-now.js
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { generateInitialDataset, toDbRecord, COLLECTIONS } from '../data/supabase.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TABLE_MAP = {
  contacts: 'contacts',
  projects: 'projects',
  calls: 'calls',
  partners: 'partners',
  tasks: 'tasks',
  siteVisits: 'site_visits',
  broadcasts: 'broadcasts',
  team: 'team',
  notifications: 'notifications',
  stages: 'stages',
  users: 'users',
};

async function tryUpsert(tableName, records) {
  // First try direct insert
  let { error } = await supabase.from(tableName).upsert(records, { onConflict: 'id' });
  if (!error) return { success: true, count: records.length };

  // If column error, strip problematic columns one by one
  const match = error.message.match(/Could not find the '(\w+)' column/);
  if (match) {
    // Get existing columns by inserting a minimal record and seeing what works
    const sampleRecord = records[0];
    const validKeys = [];

    for (const key of Object.keys(sampleRecord)) {
      const testRecord = { [key]: sampleRecord[key] };
      // Just collect all keys for now, we'll strip on error
      validKeys.push(key);
    }

    // Try stripping columns that commonly don't exist
    const COMMON_MISSING = [
      'site_visit', 'automation_paused', 'automation_log', 'duplicate_of',
      'talk_time', 'commission_rate', 'status', 'attended_by',
      'delivered_count', 'messages', 'brochure_name',
      'automation_active', 'automation_sequence', 'automation_step',
    ];

    const cleanRecords = records.map(r => {
      const clean = { ...r };
      for (const col of COMMON_MISSING) delete clean[col];
      return clean;
    });

    ({ error } = await supabase.from(tableName).upsert(cleanRecords, { onConflict: 'id' }));
    if (!error) return { success: true, count: records.length, stripped: true };
  }

  return { success: false, error: error.message };
}

async function seed() {
  console.log('🚀 Seeding Supabase...\n');

  const dataset = await generateInitialDataset();

  for (const colName of COLLECTIONS) {
    const items = dataset[colName];
    if (!Array.isArray(items) || items.length === 0) continue;

    const tableName = TABLE_MAP[colName];
    if (!tableName) {
      console.log(`  ⏭️  ${colName}: skipped (no table mapping)`);
      continue;
    }

    const records = items.map(toDbRecord);
    const result = await tryUpsert(tableName, records);

    if (result.success) {
      console.log(`  ✅ ${tableName}: ${result.count} records${result.stripped ? ' (stripped extra cols)' : ''}`);
    } else {
      console.log(`  ❌ ${tableName}: ${result.error.substring(0, 80)}`);
    }
  }

  // Seed settings
  console.log('\nSettings:');
  for (const key of ['settings', 'simulation']) {
    if (dataset[key]) {
      const { error } = await supabase.from('app_settings').upsert({
        key, data: dataset[key], updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
      console.log(error ? `  ❌ ${key}: ${error.message}` : `  ✅ ${key}`);
    }
  }

  // Verify
  console.log('\n📊 Final counts:');
  for (const [, table] of Object.entries(TABLE_MAP)) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`  ${table}: ${count}`);
  }

  console.log('\n🎉 Done!');
}

seed().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
