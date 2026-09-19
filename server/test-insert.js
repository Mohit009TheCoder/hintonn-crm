import { createClient } from '@supabase/supabase-js';

const url = "https://dygbhbhgiyjbgnzpfxyh.supabase.co";
const key = "sb_secret_kXMgnMZCKV4LOxFVSI3BLw_1dCO2qt-";

const client = createClient(url, key, { auth: { persistSession: false } });

client.from('contacts').insert([{
  name: 'Test Lead',
  phone: '9999999999',
  stage: 'new',
  created_at: new Date().toISOString()
}]).then(res => {
  console.log("Insert result:", res);
}).catch(err => {
  console.error("Insert catch error:", err);
});
