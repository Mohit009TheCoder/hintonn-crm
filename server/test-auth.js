import { initDb, getDb, saveDb } from './data/firestore.js';
import { comparePassword, hashPassword } from './data/auth.js';

async function main() {
  await initDb();
  const db = getDb();
  const user = (db.users || []).find(u => u.email === 'mohithintonn@gmail.com');
  if (user) {
    console.log('User found:', user.email);
    console.log('Has passwordHash?', !!user.passwordHash);
    const newHash = await hashPassword('Password123');
    user.passwordHash = newHash;
    console.log('Password successfully reset to Password123');
    saveDb();
  } else {
    console.log('User not found');
  }
  process.exit(0);
}
main();
