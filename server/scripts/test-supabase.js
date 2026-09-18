/**
 * test-supabase.js — Validates connection to Supabase and reports table status.
 * Run: npm run supabase:test
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { isSupabaseConfigured } from '../data/supabase.js';

async function test() {
  console.log('\n🔍 Hintonn CRM — Supabase Connectivity Test\n');

  if (!isSupabaseConfigured()) {
    console.log('⚠️  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured in server/.env');
    console.log('Backend will run in Local Persistent Storage mode.\n');
    process.exit(0);
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  console.log(`Connecting to: ${url}`);
  const client = createClient(url, key);

  const tables = ['users', 'contacts', 'projects', 'tasks', 'app_settings'];
  let passed = true;

  for (const table of tables) {
    const { data, error } = await client.from(table).select('*').limit(1);
    if (error) {
      console.log(`  ❌ Table "${table}": ${error.message}`);
      passed = false;
    } else {
      console.log(`  ✅ Table "${table}": OK`);
    }
  }

  if (passed) {
    console.log('\n✨ Supabase connection test PASSED successfully!\n');
  } else {
    console.log('\n⚠️  Some tables were not found. Have you executed server/scripts/supabase-schema.sql in Supabase SQL editor?\n');
  }
}

test().catch(err => {
  console.error('Test failed with exception:', err.message);
  process.exit(1);
});
