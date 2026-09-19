import { createClient } from '@supabase/supabase-js';

const url = "https://dygbhbhgiyjbgnzpfxyh.supabase.co";
const key = "sb_secret_kXMgnMZCKV4LOxFVSI3BLw_1dCO2qt-";

const client = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { data: currentData } = await client.from('contacts').select('id');
  const maxId = currentData.length > 0 ? Math.max(...currentData.map(i => i.id)) : 0;
  const nextId = maxId + 1;

  console.log("Attempting to insert ID:", nextId);

  const res = await client.from('contacts').insert([{
    id: nextId,
    name: 'Test Lead via insertItem logic',
    phone: '9999999999',
    stage: 'new',
    created_at: new Date().toISOString()
  }]);

  console.log("Insert result:", res);
}

run();
