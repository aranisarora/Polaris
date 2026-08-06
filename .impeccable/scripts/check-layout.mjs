// Layout spot-check for the onboarding wizard: does step 1 actually paint,
// and does the fixed bottom nav ever cover the primary CTA or the last card?
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const REPO = 'C:/Users/Aranis/Desktop/Polaris/.claude/worktrees/polaris-build';
const BASE = process.env.BASE ?? 'http://localhost:3001';
const OUT = 'C:/Users/Aranis/.claude/jobs/6dad8544/tmp/shots';
mkdirSync(OUT, { recursive: true });

const env = readFileSync(REPO + '/.env.local', 'utf8');
const get = (k) => new RegExp(`^${k}=(.+)$`, 'm').exec(env)?.[1]?.trim();
const URL_ = get('NEXT_PUBLIC_SUPABASE_URL'), PUB = get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), SECRET = get('SUPABASE_SECRET_KEY');
const REF = new URL(URL_).hostname.split('.')[0];
const EMAIL = `polaris.qa.${Date.now()}@qa.polaris.test`, PASS = 'Polaris-QA-' + Math.random().toString(36).slice(2, 10);

const admin = createClient(URL_, SECRET, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: created } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
const USER_ID = created.user.id;
const anon = createClient(URL_, PUB, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: signin } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASS });
const raw = 'base64-' + Buffer.from(JSON.stringify(signin.session)).toString('base64url');
const CHUNK = 3180, cookies = [];
if (raw.length <= CHUNK) cookies.push({ name: `sb-${REF}-auth-token`, value: raw });
else for (let i = 0; i * CHUNK < raw.length; i++) cookies.push({ name: `sb-${REF}-auth-token.${i}`, value: raw.slice(i * CHUNK, (i + 1) * CHUNK) });
const host = new URL(BASE);
const pw = cookies.map((c) => ({ ...c, domain: host.hostname, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' }));

const results = [];
const record = (s, ok, n = '') => { results.push({ s, ok, n }); console.log(ok ? 'PASS' : 'FAIL', s, n ? `| ${n}` : ''); };

const browser = await chromium.launch();
try {
  for (const [label, viewport] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1440, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport, isMobile: label === 'mobile', hasTouch: label === 'mobile' });
    await ctx.addCookies(pw);
    const page = await ctx.newPage();
    await admin.from('onboarding').delete().eq('user_id', USER_ID);
    await page.goto(BASE + '/onboarding', { waitUntil: 'networkidle' });
    // let the fade-up settle before judging paint
    await page.waitForTimeout(1500);

    const painted = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const cs = h1 && getComputedStyle(h1);
      return { text: h1?.textContent?.trim(), opacity: cs ? parseFloat(cs.opacity) : 0, visible: h1?.checkVisibility?.() ?? false };
    });
    record(`${label}: step 1 heading painted`, painted.opacity > 0.95 && painted.visible, `opacity=${painted.opacity} "${painted.text}"`);
    await page.screenshot({ path: `${OUT}/layout-${label}-step1.png`, fullPage: false });

    // Fixed bottom nav vs the primary CTA, in the real viewport.
    await page.locator('[role=radio]').filter({ hasText: /^Design$/ }).first().click();
    await page.getByRole('button', { name: /continue/i }).first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(400);
    const overlap = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('button')];
      const cta = btns.find((b) => /continue/i.test(b.textContent ?? ''));
      // the mobile tab bar is the FIXED nav; the desktop one is a hidden
      // zero-height node that would make this check vacuously pass
      const nav = [...document.querySelectorAll('nav')].find(
        (n) => getComputedStyle(n).position === 'fixed' && n.getBoundingClientRect().height > 0,
      ) ?? [...document.querySelectorAll('nav')].find((n) => n.getBoundingClientRect().height > 0);
      if (!cta || !nav) return { error: `cta=${!!cta} nav=${!!nav}` };
      const navFixed = getComputedStyle(nav).position === 'fixed';
      const c = cta.getBoundingClientRect(), n = nav.getBoundingClientRect();
      const hit = c.left < n.right && c.right > n.left && c.top < n.bottom && c.bottom > n.top;
      const cards = [...document.querySelectorAll('[role=radio]')];
      const last = cards[cards.length - 1]?.getBoundingClientRect();
      const cardHit = last ? last.left < n.right && last.right > n.left && last.top < n.bottom && last.bottom > n.top : false;
      return { navFixed, hit, cardHit, cta: { top: Math.round(c.top), bottom: Math.round(c.bottom), h: Math.round(c.height) }, nav: { top: Math.round(n.top), bottom: Math.round(n.bottom) } };
    });
    if (overlap.error) record(`${label}: CTA/nav measurable`, false, overlap.error);
    else {
      record(`${label}: primary CTA not under the nav`, !overlap.hit, `cta ${overlap.cta.top}-${overlap.cta.bottom}, nav ${overlap.nav.top}-${overlap.nav.bottom}, navFixed=${overlap.navFixed}`);
      record(`${label}: last card not under the nav`, !overlap.cardHit);
      record(`${label}: CTA >= 44px tall`, overlap.cta.h >= 44, `${overlap.cta.h}px`);
    }
    await page.screenshot({ path: `${OUT}/layout-${label}-cta.png`, fullPage: false });
    await ctx.close();
  }
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(USER_ID).catch(() => {});
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${results.length - bad.length}/${results.length} passed`);
  process.exit(bad.length ? 1 : 0);
}
