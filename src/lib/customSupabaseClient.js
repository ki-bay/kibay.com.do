import { createClient } from '@supabase/supabase-js';

// Prefer env (Vercel / local .env.local). Fallback keeps existing project working until you rotate keys.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || 'https://znbnqzgomvjjutntrvuk.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpuYm5xemdvbXZqanV0bnRydnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyMjEzODksImV4cCI6MjA4NTc5NzM4OX0.MujVb5UkYXoA6Ff83r6X3FPVBtyoMd9iSBkplqRyRA8';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
