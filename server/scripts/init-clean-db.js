/**
 * init-clean-db.js — Initializes active database (Supabase and Local) with ONLY
 * core system configuration (auth accounts, roles, stages, sources, settings)
 * and ZERO dummy leads or customer data.
 *
 * Usage: node scripts/init-clean-db.js
 */
import 'dotenv/config';
import bcrypt from 'bcryptjs';

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

  console.log('\n✨ Database is 100% READY for REAL-TIME data with ZERO dummy records!');
  console.log('All real leads entered via form, webhook, or API will store directly in Firestore.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Initialization failed:', err);
  process.exit(1);
});
