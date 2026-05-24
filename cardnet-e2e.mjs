// Playwright-driven sandbox test for the CARDNET 3DS direct-integration flow.
// Drives: home → add to cart → checkout → shipping form → DOP card form →
// (frictionless OR 3DS challenge OTP) → /checkout-success.
//
// Captures a screenshot + page text at each step so failures are
// diagnosable without re-runs.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = '/tmp/cardnet-e2e';
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const TEST_CARD = '5555555555555557';
const TEST_EXP = '12/27';
const TEST_CVV = '123';
const TEST_OTP = '123456';

let stepIdx = 0;
async function snap(page, label) {
	stepIdx += 1;
	const safe = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
	const file = path.join(OUT_DIR, `${String(stepIdx).padStart(2, '0')}-${safe}.png`);
	await page.screenshot({ path: file, fullPage: true });
	const url = page.url();
	console.log(`[${stepIdx}] ${label} → ${url}`);
	return file;
}

async function run() {
	const browser = await chromium.launch({ headless: true });
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await ctx.newPage();

	// Mirror browser console to our stdout — easiest way to see SPA errors.
	page.on('console', (msg) => {
		const t = msg.type();
		if (t === 'error' || t === 'warning') {
			console.log(`[browser ${t}] ${msg.text()}`);
		}
	});
	page.on('pageerror', (err) => console.log('[browser pageerror]', err.message));
	page.on('requestfailed', (req) => {
		const url = req.url();
		if (url.includes('supabase') || url.includes('cardnet')) {
			console.log(`[network failed] ${req.method()} ${url} — ${req.failure()?.errorText}`);
		}
	});
	page.on('response', async (res) => {
		const url = res.url();
		if (url.includes('functions/v1/cardnet')) {
			let body = '';
			try {
				body = (await res.text()).slice(0, 600);
			} catch {}
			console.log(`[edge ${res.status()}] ${url}\n  ${body}`);
		}
	});

	try {
		await page.goto('http://localhost:3000/shop', { waitUntil: 'networkidle', timeout: 30000 });
		await snap(page, 'shop-loaded');

		// Click first "Add to cart" we can find. Try a few selectors.
		const addBtn = page
			.locator('button:has-text("Añadir"), button:has-text("Agregar"), button:has-text("Add to cart"), button:has-text("Add")')
			.first();
		if (await addBtn.count()) {
			await addBtn.click();
		} else {
			// Some PDPs need to be opened first. Click first product card.
			await page.locator('a[href*="/product/"]').first().click();
			await page.waitForLoadState('networkidle');
			await snap(page, 'pdp-loaded');
			const pdpAdd = page
				.locator('button:has-text("Añadir"), button:has-text("Agregar"), button:has-text("Add to cart"), button:has-text("Add")')
				.first();
			await pdpAdd.click();
		}
		await snap(page, 'added-to-cart');

		// Navigate to /checkout directly — safer than navigating via flyout.
		await page.goto('http://localhost:3000/checkout', { waitUntil: 'networkidle' });
		await snap(page, 'checkout-shipping');

		// Fill shipping form. Field labels are bilingual; we target by attribute.
		const fill = async (selector, value) => {
			const el = page.locator(selector).first();
			if (await el.count()) await el.fill(value);
		};
		await fill('input[name="firstName"], input[autocomplete="given-name"]', 'Sandbox');
		await fill('input[name="lastName"], input[autocomplete="family-name"]', 'Tester');
		await fill('input[name="email"], input[type="email"]', 'sandbox+e2e@kibay.com.do');
		await fill('input[name="phone"], input[autocomplete="tel"]', '8095551234');
		await fill('input[name="address"], input[autocomplete="street-address"]', 'Calle Test 123');
		await fill('input[name="city"], input[autocomplete="address-level2"]', 'Santo Domingo');
		await fill('input[name="zipCode"], input[autocomplete="postal-code"]', '10111');
		await snap(page, 'shipping-filled');

		// Continue to payment. The button text varies (ES/EN).
		const continueBtn = page
			.locator('button:has-text("Continuar"), button:has-text("Continue"), button:has-text("Pagar"), button:has-text("Pay")')
			.first();
		await continueBtn.click();

		// Wait for the CARDNET card form. The new component has an input with
		// autocomplete="cc-number".
		await page.waitForSelector('input[autocomplete="cc-number"]', { timeout: 20000 });
		await snap(page, 'cardnet-form-visible');

		await page.locator('input[autocomplete="cc-number"]').fill(TEST_CARD);
		await page.locator('input[autocomplete="cc-exp"]').fill('1227');
		await page.locator('input[autocomplete="cc-csc"]').fill(TEST_CVV);
		await page.locator('input[autocomplete="cc-name"]').fill('Sandbox Tester');
		await snap(page, 'card-filled');

		const payBtn = page
			.locator('button:has-text("Pagar con CARDNET"), button:has-text("Pay with CARDNET")')
			.first();
		await payBtn.click();
		await snap(page, 'pay-clicked');

		// Two possible paths:
		//   (a) Frictionless: SPA navigates to /checkout-success right away.
		//   (b) Challenge:    A modal iframe opens for the 3DS challenge.
		const successPromise = page
			.waitForURL(/\/checkout-success/, { timeout: 90000 })
			.then(() => 'success')
			.catch(() => null);
		const iframePromise = page
			.waitForSelector('iframe[name="cardnet-3ds-iframe"]', { timeout: 90000 })
			.then(() => 'iframe')
			.catch(() => null);
		const winner = await Promise.race([successPromise, iframePromise]);
		console.log(`[race winner] ${winner}`);

		if (winner === 'iframe') {
			// We got the iframe — do the OTP dance.
			await snap(page, 'challenge-iframe');
			// The challenge UI lives inside the iframe. Try to find OTP input.
			const frame = page.frame({ name: 'cardnet-3ds-iframe' });
			if (frame) {
				// Wait for the OTP field to appear.
				const otpInput = frame
					.locator('input[type="text"], input[type="tel"], input[type="password"]')
					.first();
				await otpInput.waitFor({ timeout: 30000 }).catch(() => null);
				await otpInput.fill(TEST_OTP).catch(() => null);
				await snap(page, 'otp-filled');
				const submit = frame
					.locator('button[type="submit"], input[type="submit"], button:has-text("Submit"), button:has-text("Continuar"), button:has-text("Enviar")')
					.first();
				await submit.click().catch(() => null);
				await snap(page, 'otp-submitted');
			}
			// After OTP, parent should navigate to /checkout-success.
			await page.waitForURL(/\/checkout-success/, { timeout: 60000 });
		}

		if (!/checkout-success/.test(page.url())) {
			throw new Error(`Did not land on /checkout-success — final URL was ${page.url()}`);
		}
		await snap(page, 'final-success');
		console.log('\n✅ E2E reached /checkout-success — order should be paid.');
	} catch (e) {
		await snap(page, 'failure-state');
		console.error('\n❌ E2E failed:', e.message);
		const html = await page.content();
		fs.writeFileSync(path.join(OUT_DIR, 'failure.html'), html);
		console.error(`(HTML snapshot saved to ${OUT_DIR}/failure.html)`);
		process.exitCode = 1;
	} finally {
		await browser.close();
	}
}

run();
