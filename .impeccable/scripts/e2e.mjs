// Polaris end-to-end QA: full user journey against live services.
// Creates a disposable Supabase user, injects its session as @supabase/ssr
// cookies, walks onboarding -> profile -> bearing -> lock -> roadmap -> cv,
// screenshotting every surface at mobile + desktop. Cleans up the user after.
// Usage: node .impeccable/scripts/e2e.mjs [--base http://localhost:3000] [--keep]
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const KEEP = args.includes('--keep');
const BASE = arg('base', 'http://localhost:3000');
const OUT = '.impeccable/screens';
mkdirSync(OUT, { recursive: true });

const env = readFileSync(new URL('../../.env.local', import.meta.url), 'utf8');
const get = (k) => new RegExp(`^${k}=(.+)$`, 'm').exec(env)?.[1]?.trim();
const URL_ = get('NEXT_PUBLIC_SUPABASE_URL');
const PUB = get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const SECRET = get('SUPABASE_SECRET_KEY');
const REF = new URL(URL_).hostname.split('.')[0];

const EMAIL = `polaris.qa.${Date.now()}@qa.polaris.test`;
const PASS = 'Polaris-QA-' + Math.random().toString(36).slice(2, 10);
const DREAM = "I want to design indie games in London that make people feel something - small studio, hands-on, shipping cozy narrative worlds.";

const log = (...a) => console.log('[e2e]', ...a);
const results = [];
const record = (step, ok, note = '') => { results.push({ step, ok, note }); log(ok ? 'PASS' : 'FAIL', step, note); };
const step = async (name, fn) => {
  try { await fn(); } catch (e) { record(name, false, String(e?.message ?? e).slice(0, 160)); }
};

// ---------- 1. create + sign in test user
const admin = createClient(URL_, SECRET, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: created, error: cErr } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
if (cErr) { console.error('createUser failed:', cErr.message); process.exit(1); }
const USER_ID = created.user.id;
log('test user', EMAIL, USER_ID);

const anon = createClient(URL_, PUB, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: signin, error: sErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (sErr) { console.error('signIn failed:', sErr.message); process.exit(1); }
const session = signin.session;

// ---------- 2. session -> @supabase/ssr cookie chunks
const raw = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url');
const CHUNK = 3180;
const cookies = [];
if (raw.length <= CHUNK) {
  cookies.push({ name: `sb-${REF}-auth-token`, value: raw });
} else {
  for (let i = 0; i * CHUNK < raw.length; i++)
    cookies.push({ name: `sb-${REF}-auth-token.${i}`, value: raw.slice(i * CHUNK, (i + 1) * CHUNK) });
}
const host = new URL(BASE);
const pwCookies = cookies.map((c) => ({ ...c, domain: host.hostname, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' }));

// ---------- 3. browser helpers
const browser = await chromium.launch();
const shots = async (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
const newCtx = async (mobile, authed) => {
  const ctx = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
      : { viewport: { width: 1440, height: 900 } },
  );
  if (authed) await ctx.addCookies(pwCookies);
  return ctx;
};
const clickButton = async (page, re, note) => {
  const btn = page.getByRole('button', { name: re }).first();
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ timeout: 15000 });
  if (note) log('clicked', note);
};

try {
  // ---------- landing, logged out, mobile + desktop
  for (const mobile of [true, false]) {
    const label = mobile ? 'mobile' : 'desktop';
    await step(`landing ${label}`, async () => {
      const ctx = await newCtx(mobile, false);
      const page = await ctx.newPage();
      const resp = await page.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 });
      record(`landing ${label} 200`, resp.status() === 200, String(resp.status()));
      record(`landing ${label} headline`, (await page.textContent('body'))?.includes('Every dream job has coordinates'));
      await page.waitForTimeout(1200);
      await shots(page, `01-landing-${label}`);
      await ctx.close();
    });
  }

  // ---------- authed journey (mobile-first)
  const ctx = await newCtx(true, true);
  const page = await ctx.newPage();
  page.setDefaultTimeout(25000);

  await step('onboarding: dream', async () => {
    await page.goto(BASE + '/onboarding', { waitUntil: 'networkidle' });
    record('onboarding reached (no bounce)', page.url().includes('/onboarding'), page.url());
    await shots(page, '02-onboarding-dream');
    await page.locator('textarea').first().fill(DREAM);
    await shots(page, '02b-onboarding-dream-filled');
    await clickButton(page, /continue|next/i, 'dream continue');
    await page.waitForTimeout(7000); // Gemini interpretation
  });

  await step('onboarding: sector', async () => {
    await shots(page, '03-onboarding-sector');
    const design = page.locator('[role=radio]').filter({ hasText: /design/i }).first();
    if (await design.count()) { await design.click(); } else { await page.locator('[role=radio]').first().click(); }
    await clickButton(page, /continue|next/i, 'sector continue');
    await page.waitForTimeout(1500);
  });

  await step('onboarding: company + completion', async () => {
    await shots(page, '04-onboarding-company');
    const suggested = page.locator('[role=radio]').filter({ hasText: /suggested/i }).first();
    if (await suggested.count()) { await suggested.click(); } else { await page.locator('[role=radio]').first().click(); }
    await clickButton(page, /set your course|continue|finish|chart/i, 'company continue');
    await page.waitForTimeout(3000); // completion moment
    await shots(page, '05-onboarding-complete-moment');
  });

  await step('profile: questionnaire', async () => {
    await page.waitForURL('**/profile', { timeout: 15000 }).catch(() => {});
    await page.goto(BASE + '/profile', { waitUntil: 'networkidle' });
    await shots(page, '06-profile-choice');
    const q = page.getByRole('button', { name: /questionnaire|questions|answer/i }).first();
    if (await q.count()) { await q.click(); } else { await page.getByText(/questionnaire|answer a few|no cv/i).first().click(); }
    await page.waitForTimeout(1000);
    await shots(page, '07-profile-questionnaire');
    const tryFill = async (re, val) => {
      try { await page.getByLabel(re).first().fill(val, { timeout: 3000 }); } catch { /* field optional */ }
    };
    await tryFill(/current role|role/i, 'Junior UI designer at a small agency');
    await tryFill(/years/i, '1.5 years');
    await tryFill(/skills/i, 'Figma, prototyping, Unity basics, C#, pixel art');
    await tryFill(/proudest|proud/i, 'Shipped a small itch.io narrative game jam entry that got 2k plays');
    await tryFill(/education/i, 'BSc Computer Science, 2025');
    await tryFill(/location/i, 'London, UK');
    await shots(page, '08-profile-questionnaire-filled');
    await clickButton(page, /save|continue|this is me|done|confirm/i, 'profile save');
    await page.waitForTimeout(4000);
    await shots(page, '09-profile-saved');
  });

  await step('bearing: live search + classify', async () => {
    await page.goto(BASE + '/bearing', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await shots(page, '10-bearing-taking');
    log('waiting for classification (live AI)...');
    await page.waitForTimeout(50000);
    await shots(page, '11-bearing-results');
    const body = (await page.textContent('body')) ?? '';
    record('bearing shows tier language', /already possible|attainable|stretch/i.test(body));
    record('bearing quotes dream verbatim', body.includes('make people feel something'), 'verbatim quote check');
    record('bearing shows requirement counts', /\d+\s+of\s+\d+/i.test(body));
  });

  await step('bearing: lock target', async () => {
    const lockBtns = page.getByRole('button', { name: /lock/i });
    record('lock buttons present', (await lockBtns.count()) > 0, String(await lockBtns.count()));
    const idx = Math.min(1, (await lockBtns.count()) - 1);
    await lockBtns.nth(idx).scrollIntoViewIfNeeded();
    await lockBtns.nth(idx).click();
    await page.waitForTimeout(2000);
    await shots(page, '12-lock-confirmation');
    await page.getByRole('button', { name: /draw my route|roadmap|continue/i }).first().click({ timeout: 8000 }).catch(() => {});
  });

  await step('roadmap: generation moment', async () => {
    await page.waitForTimeout(1500);
    await page.goto(BASE + '/roadmap', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    await shots(page, '13-roadmap-pregen');
    const gen = page.getByRole('button', { name: /draw|generate|route/i }).first();
    if (await gen.count()) {
      await gen.click();
      await page.waitForTimeout(6000);
      await shots(page, '14-roadmap-generating');
      log('waiting for generation stream (live Gemini)...');
      await page.waitForTimeout(55000);
    }
    await shots(page, '15-roadmap');
    const rbody = (await page.textContent('body')) ?? '';
    record('roadmap has waypoint readout', /waypoint/i.test(rbody));
    record(
      'roadmap personal why (verbatim profile/dream quotes)',
      /cozy narrative|make people feel something|unity|game jam|itch\.io/i.test(rbody),
      'verbatim-why check',
    );
  });

  await step('roadmap: toggle first task', async () => {
    // A due check-in dialog may be open (fresh roadmap) — record and dismiss it.
    const dismiss = page.getByRole('button', { name: /not now|dismiss|close/i }).first();
    if (await dismiss.count()) {
      record('check-in dialog appeared + dismissible', true);
      await shots(page, '15b-checkin-dialog');
      await dismiss.click();
      await page.waitForTimeout(800);
    }
    const toggle = page.getByRole('button', { name: /mark|done|complete/i }).first();
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await page.waitForTimeout(2500);
    await shots(page, '16-roadmap-task-done');
  });

  await step('living cv', async () => {
    await page.goto(BASE + '/cv', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await shots(page, '17-cv');
    const cvbody = (await page.textContent('body')) ?? '';
    record('cv shows unearned/task tags', /unlock|task|waypoint/i.test(cvbody));
  });

  await step('pdf export', async () => {
    const pdf = await page.request.get(BASE + '/api/cv/export');
    record('pdf export 200 + pdf', pdf.status() === 200 && (pdf.headers()['content-type'] ?? '').includes('pdf'), `${pdf.status()} ${pdf.headers()['content-type']}`);
  });

  await step('desktop authed sweep', async () => {
    const dctx = await newCtx(false, true);
    const dpage = await dctx.newPage();
    for (const [route, name] of [['/bearing', '18-bearing-desktop'], ['/roadmap', '19-roadmap-desktop'], ['/cv', '20-cv-desktop'], ['/onboarding', '21-onboarding-desktop'], ['/profile', '22-profile-desktop']]) {
      await dpage.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await dpage.waitForTimeout(2500);
      await shots(dpage, name);
    }
    await dctx.close();
  });

  await ctx.close();
} finally {
  await browser.close();
  if (!KEEP) {
    const { error } = await admin.auth.admin.deleteUser(USER_ID);
    log(error ? `cleanup failed: ${error.message}` : 'test user deleted (rows cascade)');
  }
}

console.log('\n=== E2E RESULTS ===');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.step}${r.note ? '  (' + r.note + ')' : ''}`);
const fails = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - fails}/${results.length} passed. Screenshots in ${OUT}/`);
