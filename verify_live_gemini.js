import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto('https://stdytrack.vercel.app/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const res = await page.evaluate(async () => {
  const alive = !!(window.ReiAI && typeof window.ReiAI.speak === 'function');
  if (!alive) return { alive };
  let line = null, ms = null;
  try {
    const t0 = Date.now();
    line = await window.ReiAI.speak('proud', {
      user:{name:'LiveTest'}, today:{studyMinutes:120, planPct:100}, streak:{current:5, longest:10},
      stats:{weekMin:500, monthMin:2000}, session:{active:false},
      subjects:[{name:'Mathematics', totalMin:300},{name:'Physics', totalMin:180}], neglected:[]
    });
    ms = Date.now() - t0;
  } catch(e) { line = '__THROW__ ' + e.message; }
  return { alive, line, ms };
});
console.log('RESULT ' + JSON.stringify(res));
if (res.line && !String(res.line).startsWith('__THROW__') && res.line !== null) {
  console.log('>>> GEMINI LINE: ' + res.line);
}
console.log('errors: ' + errors.join(' | '));
await browser.close();
process.exit(0);