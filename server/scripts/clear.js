/**
 * clear.js — Removes all dummy/demo data from the active database (Supabase or Local).
 * Resets the CRM to a completely clean slate ready for real-time customer data.
 *
 * Preserves:
 *   - Authentication users & roles (Admin, Manager, Agent, Viewer)
 *   - Pipeline stages (New, Contacted, Qualified, Negotiation, Won, Lost)
 *   - Lead sources & system settings
 *
 * Usage: npm run clear
 */
import 'dotenv/config';
import { initDb, getDb, saveDb, isSupabaseConfigured, getSupabaseClient } from '../data/db.js';
import { COLLECTIONS, SINGLETON_KEYS } from '../data/supabase.js';

const COLLECTIONS_TO_CLEAR = [
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

async function main() {
  console.log('\n🧹 Hintonn CRM — Database Cleanup (Reset to Real-Time Data Mode)\n');

  // Initialize active database
  const db = await initDb();

  // If Supabase is connected and tables exist, clear Supabase tables directly
  if (isSupabaseConfigured()) {
    const client = getSupabaseClient();
    console.log('📡 Clearing dummy records from Supabase tables:');
    for (const colName of COLLECTIONS_TO_CLEAR) {
      const tableName = TABLE_MAP[colName] || colName;
      try {
        const { error } = await client.from(tableName).delete().neq('id', -999999);
        if (error) {
          console.log(`  ⚪ ${tableName}: ${error.message}`);
        } else {
          console.log(`  🗑️  ${tableName}: cleaned`);
        }
      } catch (e) {
        console.log(`  ⚪ ${tableName}: ${e.message}`);
      }
    }
  }

  // Clear in-memory cache and local-db.json
  console.log('\n🧹 Clearing in-memory & local persistent storage...');
  for (const col of COLLECTIONS_TO_CLEAR) {
    db[col] = [];
    console.log(`  🗑️  ${col}: 0 records`);
  }

  // Reset simulation singleton
  db.simulation = {
    simulatedHour: 0,
    logs: []
  };
  console.log('  🔄 simulation: reset to empty state');

  // Reset team leadsCount to 0
  if (Array.isArray(db.team)) {
    db.team.forEach(m => { m.leadsCount = 0; });
    console.log('  🔄 team: lead counts reset to 0');
  }

  // Reset sequences active leads to 0
  if (Array.isArray(db.sequences)) {
    db.sequences.forEach(s => { s.activeLeads = 0; });
    console.log('  🔄 sequences: active leads reset to 0');
  }

  // Reset nurture sequences active leads to 0
  if (Array.isArray(db.nurtureSequences)) {
    db.nurtureSequences.forEach(s => { s.activeLeads = 0; });
    console.log('  🔄 nurtureSequences: active leads reset to 0');
  }

  // Save the cleaned database state
  saveDb();

  console.log('\n✨ Database is now completely clean!');
  console.log('Ready to receive and store REAL-TIME leads, calls, tasks, and site visits.');
  console.log('\nPreserved for login & access:');
  console.log('  • Admin:    rohan@ashraygroup.in / password123');
  console.log('  • Manager:  ananya@ashraygroup.in / password123');
  console.log('  • Agent:    karan@ashraygroup.in / password123');
  console.log('  • Viewer:   devika@ashraygroup.in / password123\n');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Clear failed:', err);
  process.exit(1);
});
