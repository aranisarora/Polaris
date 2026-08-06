// Focused verification of the card-driven onboarding wizard.
// Creates a disposable Supabase user, walks all three steps at a mobile
// viewport, asserts the composed dream landed in the DB, then checks resume
// and the "Something else" escape hatches. Makes no Gemini calls by design.
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';
import { readFileSync, mkdirSync } from 'node:fs';

const REPO = 'C:/Users/Aranis/Desktop/Polaris/.claude/worktrees/polaris-build';
const BASE = process.env.BASE ?? 'http://localhost:3000';
const OUT = process.env.OUT ?? 'C:/Users/Aranis/.claude/jobs/6dad8544/tmp/shots';
mkdirSync(OUT, { recursive: true });

const env = readFileSync(REPO + '/.env.local', 'utf8');
const get = (k) => new RegExp(`^${k}=(.+)$`, 'm').exec(env)?.[1]?.trim();
const URL_ = get('NEXT_PUBLIC_SUPABASE_URL');
const PUB = get('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
const SECRET = get('SUPABASE_SECRET_KEY');
const REF = new URL(URL_).hostname.split('.')[0];

const EMAIL = `polaris.qa.${Date.now()}@qa.polaris.test`;
const PASS = 'Polaris-QA-' + Math.random().toString(36).slice(2, 10);

const results = [];
const log = (...a) => console.log('[verify]', ...a);
const record = (step, ok, note = '') => {
  results.push({ step, ok, note });
  log(ok ? 'PASS' : 'FAIL', step, note ? `| ${note}` : '');
};

const admin = createClient(URL_, SECRET, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: created, error: cErr } = await admin.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true });
if (cErr) { console.error('createUser failed:', cErr.message); process.exit(1); }
const USER_ID = created.user.id;
log('test user', EMAIL, USER_ID);

const anon = createClient(URL_, PUB, { auth: { autoRefreshToken: false, persistSession: false } });
const { data: signin, error: sErr } = await anon.auth.signInWithPassword({ email: EMAIL, password: PASS });
if (sErr) { console.error('signIn failed:', sErr.message); process.exit(1); }

const raw = 'base64-' + Buffer.from(JSON.stringify(signin.session)).toString('base64url');
const CHUNK = 3180;
const cookies = [];
if (raw.length <= CHUNK) cookies.push({ name: `sb-${REF}-auth-token`, value: raw });
else for (let i = 0; i * CHUNK < raw.length; i++)
  cookies.push({ name: `sb-${REF}-auth-token.${i}`, value: raw.slice(i * CHUNK, (i + 1) * CHUNK) });
const host = new URL(BASE);
const pwCookies = cookies.map((c) => ({ ...c, domain: host.hostname, path: '/', httpOnly: false, secure: false, sameSite: 'Lax' }));

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
await ctx.addCookies(pwCookies);
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true });

const dbRow = async () => {
  const { data } = await admin.from('onboarding')
    .select('dream_text, dream_interpretation, sector, sector_other, company_type, current_step, completed_at')
    .eq('user_id', USER_ID).maybeSingle();
  return data;
};
const card = (re) => page.locator('[role=radio]').filter({ hasText: re }).first();
const cont = async (re = /continue/i) => {
  const b = page.getByRole('button', { name: re }).first();
  await b.scrollIntoViewIfNeeded();
  await b.click();
};

try {
  // ---------------------------------------------------------- step 1
  await page.goto(BASE + '/onboarding', { waitUntil: 'networkidle' });
  record('onboarding reachable', page.url().includes('/onboarding'), page.url());

  const h1a = (await page.textContent('h1')) ?? '';
  record('step 1 asks for the field of work', /what kind of work do you dream of/i.test(h1a), h1a);
  record('NO free-text box on step 1', (await page.locator('textarea').count()) === 0);
  record('step 1 shows 8 sector cards', (await page.locator('[role=radio]').count()) === 8, `${await page.locator('[role=radio]').count()}`);
  record('step 1 uses radiogroup semantics', (await page.locator('[role=radiogroup]').count()) === 1);

  // The locked tabs used to explain themselves only through a title tooltip,
  // which never fires on touch. Assert the explanation is actually readable.
  const bodyText = (await page.textContent('body')) ?? '';
  record('locked tabs explain themselves on touch',
    /open once your profile is saved/i.test(bodyText), 'visible locked note');
  // both navs are in the DOM (the desktop one is display:none at this
  // viewport, so it is out of the accessibility tree) — judge the visible bar
  const lockedNames = await page.locator('[aria-disabled="true"]').evaluateAll(
    (els) => els.filter((e) => e.checkVisibility()).map((e) => e.getAttribute('aria-label')),
  );
  record('locked tabs carry an explanatory accessible name',
    lockedNames.length === 3 && lockedNames.every((n) => n && /opens once your profile is saved/i.test(n)),
    JSON.stringify(lockedNames));

  // Fitts's Law: every card must clear 44px on touch.
  const smallCards = await page.locator('[role=radio]').evaluateAll(
    (els) => els.filter((e) => e.getBoundingClientRect().height < 44).length,
  );
  record('all sector cards >= 44px tall', smallCards === 0, `${smallCards} under 44px`);

  await shot('01-step1-sector');
  await card(/^Design$/).click();
  record('sector card reflects selection', (await card(/^Design$/).getAttribute('aria-checked')) === 'true');
  await shot('02-step1-picked');
  await cont();
  await page.waitForTimeout(2500);

  // ---------------------------------------------------------- step 2
  const h1b = (await page.textContent('h1')) ?? '';
  record('step 2 names the chosen field back', /where do you dream of going in design\?/i.test(h1b), h1b);
  record('step 2 shows the design ladder (8 cards)', (await page.locator('[role=radio]').count()) === 8, `${await page.locator('[role=radio]').count()}`);
  record('step 2 has no free-text box until "Something else"', (await page.locator('input#role-other').count()) === 0);
  const ladder = await page.locator('[role=radio]').allTextContents();
  record('ladder is design-specific', ladder.some((t) => /Product Designer/.test(t)) && ladder.some((t) => /UX Researcher/.test(t)), ladder.join(' | ').slice(0, 160));
  await shot('03-step2-role');

  // "Something else" reveals its input, then switch back to a real card.
  await card(/Something else/).click();
  await page.waitForTimeout(400);
  record('"Something else" reveals the inline input', (await page.locator('input#role-other').count()) === 1);
  await shot('04-step2-other');

  await card(/^Senior Product Designer$/).click();
  await page.waitForTimeout(300);
  record('picking a ladder card hides the inline input', (await page.locator('input#role-other').count()) === 0);
  await shot('05-step2-picked');
  await cont();
  await page.waitForTimeout(2500);

  const afterRole = await dbRow();
  record('dream_text composed from the picks',
    afterRole?.dream_text === 'I want to be a Senior Product Designer in design.', afterRole?.dream_text);
  const interp = afterRole?.dream_interpretation;
  record('interpretation roleTitle stored', interp?.roleTitle === 'Senior Product Designer', interp?.roleTitle);
  record('interpretation seniority derived', interp?.seniority === 'senior', String(interp?.seniority));
  // Case is irrelevant downstream — lib/jobs/search.ts lowercases the query
  // before it becomes a cache key, and both providers match case-insensitively.
  record('interpretation searchKeywords usable',
    interp?.searchKeywords?.toLowerCase() === 'senior product designer', interp?.searchKeywords);
  record('quotedPhrases are verbatim substrings of dream_text',
    Array.isArray(interp?.quotedPhrases) && interp.quotedPhrases.length > 0 &&
    interp.quotedPhrases.every((p) => afterRole.dream_text.includes(p)),
    JSON.stringify(interp?.quotedPhrases));
  record('current_step advanced to 3', afterRole?.current_step === 3, String(afterRole?.current_step));

  // ---------------------------------------------------------- resume
  await page.goto(BASE + '/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const h1r = (await page.textContent('h1')) ?? '';
  record('resume lands on step 3', /what kind of company/i.test(h1r), h1r);
  await page.getByRole('button', { name: /^Back$/ }).first().click();
  await page.waitForTimeout(800);
  const restored = await card(/^Senior Product Designer$/).getAttribute('aria-checked');
  record('back to step 2 restores the chosen role', restored === 'true', `aria-checked=${restored}`);
  await shot('06-resume-step2');
  await cont();
  await page.waitForTimeout(2000);

  // ---------------------------------------------------------- step 3
  const h1c = (await page.textContent('h1')) ?? '';
  record('step 3 asks for company type', /what kind of company/i.test(h1c), h1c);
  record('step 3 shows 7 company cards', (await page.locator('[role=radio]').count()) === 7, `${await page.locator('[role=radio]').count()}`);
  await shot('07-step3-company');
  await card(/Scale-up/).click();
  await cont(/set your course|continue/i);
  await page.waitForTimeout(3500);
  await shot('08-completion');

  await page.waitForURL('**/profile', { timeout: 15000 }).catch(() => {});
  record('completing onboarding lands on /profile', page.url().includes('/profile'), page.url());

  const done = await dbRow();
  record('company_type stored', done?.company_type === 'scaleup', String(done?.company_type));
  record('completed_at set', Boolean(done?.completed_at), String(done?.completed_at));
  record('sector stored', done?.sector === 'design', String(done?.sector));

  // ------------------------------------------- "Something else" sector path
  await admin.from('onboarding').delete().eq('user_id', USER_ID);
  await page.goto(BASE + '/onboarding', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await card(/Something else/).click();
  await page.waitForTimeout(400);
  record('sector "Something else" reveals its input', (await page.locator('input#sector-other').count()) === 1);
  await page.locator('input#sector-other').fill('renewable energy');
  await cont();
  await page.waitForTimeout(2500);
  const h1o = (await page.textContent('h1')) ?? '';
  record('step 2 question uses the typed field', /where do you dream of going in renewable energy\?/i.test(h1o), h1o);
  await shot('09-other-sector-step2');
  // A card's text node is title+description concatenated, so anchor the
  // start only — "Founder" must not also match "Founding Engineer".
  await card(/^Founder(?!ing)/).click();
  await cont();
  await page.waitForTimeout(2500);
  const other = await dbRow();
  record('typed sector composes a clean dream sentence',
    other?.dream_text === 'I want to be a Founder in renewable energy.', other?.dream_text);
  record('Founder suggests a startup on step 3',
    (await page.locator('[role=radio]').filter({ hasText: /Suggested/i }).first().textContent())?.includes('Startup'),
    'smart default check');
  await shot('10-other-sector-step3');

  // ------------------------------------------------------- reduced motion
  await ctx.close();
  const rmCtx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  await rmCtx.addCookies(pwCookies);
  const rm = await rmCtx.newPage();
  await admin.from('onboarding').delete().eq('user_id', USER_ID);
  await rm.goto(BASE + '/onboarding', { waitUntil: 'networkidle' });
  await rm.locator('[role=radio]').filter({ hasText: /^Engineering$/ }).first().click();
  await rm.getByRole('button', { name: /continue/i }).first().click();
  await rm.waitForTimeout(2200);
  await rm.locator('[role=radio]').filter({ hasText: /^Founding Engineer/ }).first().click();
  await rm.getByRole('button', { name: /continue/i }).first().click();
  await rm.waitForTimeout(2200);
  const sug = await rm.locator('[role=radio]').filter({ hasText: /Suggested/i }).first().textContent();
  record('Founding Engineer suggests a startup', (sug ?? '').includes('Startup'), (sug ?? '').replace(/\s+/g, ' ').trim());
  await rm.getByRole('button', { name: /set your course|continue/i }).first().click();
  await rm.waitForURL('**/profile', { timeout: 15000 }).catch(() => {});
  record('reduced motion skips straight to /profile', rm.url().includes('/profile'), rm.url());
  await rmCtx.close();
} catch (e) {
  record('run completed without throwing', false, String(e?.message ?? e).slice(0, 300));
} finally {
  await browser.close();
  await admin.auth.admin.deleteUser(USER_ID).catch(() => {});
  const failed = results.filter((r) => !r.ok);
  console.log('\n================ SUMMARY ================');
  console.log(`${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log('\nFAILURES:');
    for (const f of failed) console.log(` - ${f.step}${f.note ? ` | ${f.note}` : ''}`);
  }
  process.exit(failed.length ? 1 : 0);
}
