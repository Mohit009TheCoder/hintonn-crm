import { createClient } from '@supabase/supabase-js';

const url = "https://dygbhbhgiyjbgnzpfxyh.supabase.co";
const key = "sb_secret_kXMgnMZCKV4LOxFVSI3BLw_1dCO2qt-";

const client = createClient(url, key, { auth: { persistSession: false } });

client.from('contacts').select('*').then(res => {
  console.log("Result:", res);
}).catch(err => {
  console.error("Error:", err);
});
