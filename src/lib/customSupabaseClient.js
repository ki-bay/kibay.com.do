import { createClient } from '@supabase/supabase-js';

function firstEnv(keys) {
	for (const k of keys) {
		const v = import.meta.env[k];
		if (typeof v === 'string' && v.trim().length) return v.trim();
	}
	return '';
}

const supabaseUrl = firstEnv(['VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
const supabaseKey = firstEnv([
	'VITE_SUPABASE_PUBLISHABLE_KEY',
	'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
	'VITE_SUPABASE_ANON_KEY',
	'NEXT_PUBLIC_SUPABASE_ANON_KEY',
]);

if (!supabaseUrl || !supabaseKey) {
	throw new Error(
		'Missing Supabase env: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY (or legacy VITE_SUPABASE_ANON_KEY). Local: .env.local. Vercel: Environment Variables. See .env.example',
	);
}

const customSupabaseClient = createClient(supabaseUrl, supabaseKey);

export default customSupabaseClient;

export {
	customSupabaseClient,
	customSupabaseClient as supabase,
};
