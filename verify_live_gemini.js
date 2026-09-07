import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('https://stdytrack.vercel.app/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const res = await page.evaluate(async () => {
  const alive = !!(window.ReiAI && typeof window.ReiAI.speak === 'function');
  if (!alive) return { alive, line: null };
  let line = null, ms = null;
  try {
    const t0 = Date.now();
    line = await window.ReiAI.speak('neutral', {
      user:{name:'LiveTest'}, today:{studyMinutes:30, planPct:50}, streak:{current:2, longest:5},
      stats:{weekMin:200, monthMin:800}, session:{active:false},
      subjects:[{name:'Math', totalMin:100}], neglected:[]
    });
    ms = Date.now() - t0;
  } catch(e) { line = '__THROW__ ' + e.message; }
  return { alive, line, ms };
});
console.log('RESULT ' + JSON.stringify(res));
console.log('errors: ' + errors.join(' | '));
await browser.close();
process.exit(0);