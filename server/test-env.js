import 'dotenv/config';

console.log("URL length:", process.env.SUPABASE_URL?.length);
console.log("URL value:", process.env.SUPABASE_URL);

console.log("ROLE_KEY length:", process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
console.log("ROLE_KEY value:", process.env.SUPABASE_SERVICE_ROLE_KEY);

const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
console.log("Chosen key:", key);
console.log("Chosen key length:", key?.length);
