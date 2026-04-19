import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.103.3';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function randomKey() {
	const bytes = new Uint8Array(24);
	crypto.getRandomValues(bytes);
	return `kibay_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}

	const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
	const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
	if (!serviceKey) {
		return new Response(JSON.stringify({ error: 'Set SUPABASE_SERVICE_ROLE_KEY for this function' }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}

	const admin = createClient(supabaseUrl, serviceKey);
	const body = await req.json().catch(() => ({}));
	const action = body?.action;

	try {
		if (action === 'generate') {
			const name = body?.name as string;
			const permissions = (body?.permissions as string[]) || [];
			if (!name) {
				return new Response(JSON.stringify({ error: 'Name required' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			const apiKey = randomKey();
			const key_prefix = apiKey.slice(0, 12);
			const { data, error } = await admin
				.from('api_keys')
				.insert({
					name,
					key_prefix,
					key_hash: apiKey,
					permissions,
					is_active: true,
				})
				.select('id')
				.single();
			if (error) throw error;
			return new Response(JSON.stringify({ api_key: apiKey, id: data.id }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		if (action === 'revoke') {
			const id = body?.id;
			if (!id) {
				return new Response(JSON.stringify({ error: 'id required' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}
			const { error } = await admin.from('api_keys').update({ is_active: false }).eq('id', id);
			if (error) throw error;
			return new Response(JSON.stringify({ ok: true }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
		return new Response(JSON.stringify({ error: 'Unknown action' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (e) {
		return new Response(JSON.stringify({ error: e.message ?? 'Error' }), {
			status: 400,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
});
