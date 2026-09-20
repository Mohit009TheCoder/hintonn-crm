import { initDb, getDb } from './data/firestore.js';

async function main() {
  await initDb();
  const db = getDb();
  const preet = db.contacts.find(c => c.name.toLowerCase().includes('preet'));
  if (preet) {
    console.log('Lead found:', preet.name, preet.phone);
    console.log(preet);
  } else {
    console.log('Lead Preet not found in contacts');
  }
  process.exit(0);
}
main();
