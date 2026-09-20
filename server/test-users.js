import { initDb, getDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  const users = db.users || [];
  console.log(`Found ${users.length} users:`);
  users.forEach(u => console.log(`- ${u.email} (Role: ${u.role})`));
  process.exit(0);
}
main();
