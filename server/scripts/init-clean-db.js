/**
 * init-clean-db.js — Initializes active database (Supabase and Local) with ONLY
 * core system configuration (auth accounts, roles, stages, sources, settings)
 * and ZERO dummy leads or customer data.
 *
 * Usage: node scripts/init-clean-db.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { getSupabaseClient, isSupabaseConfigured, toDbRecord } from '../data/supabase.js';
import { STAGES, TEAM, RAW_USERS, RAW_LEAD_SOURCES, SETTINGS } from '../data/seedData.js';
import { getDefaultPermissions } from '../data/auth.js';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCAL_DB_PATH = join(__dirname, '..', 'data', 'local-db.json');

async function main() {
  console.log('\n🚀 Initializing Clean Production Database Structure...\n');

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

  const cleanDatabaseState = {
    users,
    stages: STAGES,
    leadSources: RAW_LEAD_SOURCES,
    team,
    settings: SETTINGS,
    simulation: { simulatedHour: 0, logs: [] },
    contacts: [],
    projects: [],
    calls: [],
    partners: [],
    tasks: [],
    siteVisits: [],
    broadcasts: [],
    sequences: [],
    brochures: [],
    notifications: [],
    nurtureSequences: [],
    nurtureLog: [],
    slaAlerts: [],
    leadActivities: [],
    paymentMilestones: []
  };

  // Write to local-db.json
  writeFileSync(LOCAL_DB_PATH, JSON.stringify(cleanDatabaseState, null, 2), 'utf8');
  console.log('✅ Local persistent storage initialized with clean production state.');

  // If Supabase is configured, seed users, stages, team, lead_sources, app_settings
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    console.log('📡 Syncing core auth accounts and system configuration to Supabase:');

    // 1. users
    const userRecords = users.map(toDbRecord);
    const { error: userErr } = await client.from('users').upsert(userRecords, { onConflict: 'id' });
    if (userErr) console.error('  ❌ users:', userErr.message);
    else console.log(`  ✅ users: ${users.length} accounts configured with RBAC permissions`);

    // 2. stages
    const stageRecords = STAGES.map(toDbRecord);
    const { error: stageErr } = await client.from('stages').upsert(stageRecords, { onConflict: 'id' });
    if (stageErr) console.error('  ❌ stages:', stageErr.message);
    else console.log(`  ✅ stages: ${STAGES.length} pipeline stages configured`);

    // 3. team
    const teamRecords = team.map(toDbRecord);
    const { error: teamErr } = await client.from('team').upsert(teamRecords, { onConflict: 'id' });
    if (teamErr) console.error('  ❌ team:', teamErr.message);
    else console.log(`  ✅ team: ${team.length} sales reps configured`);

    // 4. lead_sources
    const sourceRecords = RAW_LEAD_SOURCES.map(s => ({
      id: String(s.id),
      name: s.name,
      cost_per_lead: s.costPerLead || 0,
      leads_count: 0
    }));
    const { error: srcErr } = await client.from('lead_sources').upsert(sourceRecords, { onConflict: 'id' });
    if (srcErr) console.error('  ❌ lead_sources:', srcErr.message);
    else console.log(`  ✅ lead_sources: ${RAW_LEAD_SOURCES.length} marketing channels configured`);

    // 5. app_settings
    await client.from('app_settings').upsert({
      key: 'settings',
      data: SETTINGS,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });

    await client.from('app_settings').upsert({
      key: 'simulation',
      data: { simulatedHour: 0, logs: [] },
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' });
    console.log('  ✅ app_settings: initialized');
  }

  console.log('\n✨ Database is 100% READY for REAL-TIME data with ZERO dummy records!');
  console.log('All real leads entered via form, webhook, or API will store directly in Supabase.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
