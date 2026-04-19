import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** No-op placeholder: client-side sitemap route still works; extend with Storage upload if needed. */
serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}
	return new Response(JSON.stringify({ ok: true }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
});
