import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Placeholder: wire Resend / SendGrid here with secrets. */
serve(async (req) => {
	if (req.method === 'OPTIONS') {
		return new Response('ok', { headers: corsHeaders });
	}
	return new Response(JSON.stringify({ ok: true, skipped: true }), {
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
});
