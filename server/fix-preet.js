import { initDb, getDb, saveDb } from './data/firestore.js';
import { triggerWelcomeMessage } from './data/automation.js';

async function main() {
  await initDb();
  const db = getDb();
  const preet = db.contacts.find(c => c.name.toLowerCase().includes('preet'));
  if (preet) {
    console.log('Found Preet, triggering welcome message manually...');
    await triggerWelcomeMessage(preet);
    saveDb();
    console.log('Fixed Preet!');
  } else {
    console.log('Preet not found.');
  }
  process.exit(0);
}
main();
