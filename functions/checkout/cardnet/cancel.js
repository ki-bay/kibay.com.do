// CF Pages Function — same pattern as ../cardnet/return.js but for the
// CancelUrl that CARDNET POSTs to when the buyer cancels or the gateway
// rejects the transaction.
//
// CARDNET POSTs here; we 303-redirect to GET so the SPA's
// /checkout/cardnet/cancel route renders normally.

export const onRequestPost = ({ request }) => {
	return Response.redirect(request.url, 303);
};
