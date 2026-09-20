import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.join(__dirname, '..', 'data', 'seedData.js');

let content = fs.readFileSync(seedPath, 'utf8');

const arraysToEmpty = [
  'RAW_PROJECTS',
  'RAW_CONTACTS',
  'RAW_CALLS',
  'RAW_BROCHURES',
  'RAW_PARTNERS',
  'RAW_BROADCASTS',
  'RAW_SITE_VISITS',
  'RAW_TASKS',
  'SEQUENCES',
  'RAW_NURTURE_SEQUENCES',
  'RAW_PAYMENT_MILESTONES'
];

arraysToEmpty.forEach(name => {
  // Regex to match "export const NAME = [ ... ];" across multiple lines
  const regex = new RegExp(`export const ${name}\\s*=\\s*\\[[\\s\\S]*?\\];`, 'g');
  content = content.replace(regex, `export const ${name} = [];`);
});

fs.writeFileSync(seedPath, content);
console.log('✅ Wiped dummy arrays from seedData.js');
