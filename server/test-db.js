import fs from 'fs';
import admin from 'firebase-admin';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function main() {
  const snap = await db.collection('contacts').get();
  console.log('Total docs in contacts:', snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));
  process.exit(0);
}
main().catch(console.error);
