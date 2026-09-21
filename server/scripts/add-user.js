import 'dotenv/config';
import { initDb } from '../data/db.js';
import { registerUser } from '../data/auth.js';

async function main() {
  console.log('Connecting to database...');
  await initDb();
  
  try {
    const res = await registerUser({
      name: 'Mohit',
      email: 'mohithintonn@gmail.com',
      phone: '9999999999', // Dummy phone
      password: 'Mohit@2004',
      role: 'admin',
      companyId: 'ashray-group'
    });
    console.log('✅ Admin user created successfully:', res.user.email);
  } catch (err) {
    if (err.message.includes('Email already registered')) {
        console.log('User already exists, updating password is not handled in this basic script, but account is there.');
    } else {
        console.error('❌ Failed to create user:', err.message);
    }
  }
  process.exit(0);
}

main();
