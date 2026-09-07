import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

await page.goto('https://stdytrack.vercel.app/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const detail = await page.evaluate(async () => {
  const fb = { lines: [] };
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const resp = await origFetch(...args);
    const u = String(args[0]);
    if (u.includes('firebasevertexai') || u.includes('generativelanguage')) {
      try {
        const body = await resp.clone().text();
        fb.lines.push({ url: u.slice(0, 140), status: resp.status, body: body.slice(0, 500) });
      } catch(e) { fb.lines.push({ url: u.slice(0,140), status: resp.status, body: '(read failed)' }); }
    }
    return resp;
  };
  await new Promise(r => setTimeout(r, 300));
  const res = await window.ReiAI.speak('neutral', {
    user:{name:'LiveTest'}, today:{studyMinutes:30, planPct:50}, streak:{current:2, longest:5},
    stats:{weekMin:200, monthMin:800}, session:{active:false},
    subjects:[{name:'Math', totalMin:100}], neglected:[]
  });
  return { returned: res, captured: fb.lines };
});
console.log('DETAIL ' + JSON.stringify(detail, null, 2));
await browser.close();
process.exit(0);