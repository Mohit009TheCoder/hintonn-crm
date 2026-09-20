import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('/Users/mohitjain/Desktop/hintonn-crm-firebase-adminsdk-fbsvc-c3e58db5cc.json', 'utf8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function main() {
  const snap = await db.collection('contacts').get();
  console.log('Total docs:', snap.size);
  snap.forEach(doc => console.log(doc.id, doc.data()));
}
main().catch(console.error);
