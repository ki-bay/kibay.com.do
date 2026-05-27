// CF Pages Function — intercepts the POST that CARDNET sends to our
// ReturnUrl after the buyer completes (or declines) payment on the
// hosted page, and converts it into a GET so the SPA can load normally.
//
// Background: CARDNET's Botón de Pago posts to the configured ReturnUrl
// with the transaction outcome. CF Pages' SPA fallback only serves GET
// requests for routes — a POST returns 405 Method Not Allowed. We don't
// actually need anything from the POST body because the SPA looks up the
// order via the order_id (in the URL's query string) and calls
// cardnet-verify-session, which queries CARDNET server-side for the
// authoritative result.
//
// Strategy: catch onRequestPost → respond with 303 See Other to the same
// URL. Browser then issues a GET (303 mandates that) which CF Pages
// serves as the normal SPA route. The order_id + token query params are
// preserved automatically because we redirect to the same URL.
//
// GET requests fall through to the SPA via the absence of an
// onRequestGet handler (CF Pages routes the request to static assets).

export const onRequestPost = ({ request }) => {
	return Response.redirect(request.url, 303);
};
