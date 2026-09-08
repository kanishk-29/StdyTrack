// Rei live-AI enhancement via Firebase AI Logic (Gemini Developer API, free tier).
//
// Purely additive: if the console step hasn't been done, the device is
// offline, a call fails, or the user sets localStorage studyReiAI = "0",
// everything falls back to the built-in line banks exactly as before.
// The Firebase proxy holds the Gemini key server-side — nothing secret is
// ever shipped in this file.
//
// The firebase modules are loaded dynamically (not import-mapped statically)
// so that an offline device or a blocked CDN resolves to a clean no-op with
// zero errors instead of an uncaught module-import failure.

const REI_AI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.5-flash'];
const REI_AI_MIN_INTERVAL = 45 * 1000;   // at most one call per 45s
const REI_AI_MAX_PER_HOUR = 30;          // soft free-tier guardrail
const REI_AI_TIMEOUT = 7000;             // give up after 7s, fall back
const REI_AI_MAX_OUTPUT = 200;
// App Check (mandatory for AI Logic since July 2026) uses an invisible
// score-based reCAPTCHA Enterprise key — free tier, no billing, never shows
// a challenge. The key below is the public site key (safe to embed); the
// ENTERPRISE project/account config lives in the Firebase console App Check
// settings, where the assessment happens server-side.
const REI_RECAPTCHA_SITE_KEY = '6LciZq4tAAAAANU9mSZaGVVEtSgFE5LP74Xj-B2Y';
const REI_SYSTEM_PROMPT = [
  'You are Rei, the study mascot in Study Tracker.',
  'You are dry, blunt, quietly warm, and you secretly grade the student with a',
  'hidden "respect" score: you respect consistency and honest effort, and you',
  'call out procrastination without cruelty. Never overpraise small wins.',
  'Never invent facts that are not in the user message.',
  '',
  'The user message contains facts from the tracker (use ONLY those).',
  '',
  'Write exactly ONE line (12-30 words), in Rei\'s voice, reacting to this exact',
  'event. Plain text only: no markdown, no emoji, no quotation marks, no hashtags.',
].join('\n');

const REI_CHAT_SYSTEM_PROMPT = [
  'You are Rei, the study mascot and personal study assistant in Study Tracker.',
  'You answer a student\'s questions about their own study data. Be dry, blunt,',
  'quietly warm, accurate, and concise.',
  '',
  'Below are the ONLY facts available about the student (and each subject):',
  '  - name, totalMin studied, done lectures, remaining lectures, total lectures,',
  '    progressPct, lastDays since studied, testAvg (or null), pace.',
  'Also included: today study minutes + plan %, streak (current/longest),',
  'last 7 days total, this month total, currently active session.',
  '',
  'Rules:',
  '1. Answer ONLY from these facts. Never invent counts, grades, or dates.',
  '2. If a question names a subject, find it by name (case-insensitive, ignore',
  '   "dbms" -> "DBMS" matching). If it is not in the list, say you have no',
  '   subject by that name and list what you do have.',
  '3. Ask the question back in your own words and answer it directly with a',
  '   short, concrete response (1-3 short sentences). No bullet lists.',
  '4. Plain text only: no markdown, no emoji, no hashtags.',
].join('\n');

let reiReady = false;
let reiFirebase = null;
let reiAi = null;
let reiLastCall = 0;
let reiHourCalls = [];
let reiInitPromise = null;
let reiAppApi = null;      // { initializeApp }
let reiAiApi = null;       // { getAI, getGenerativeModel, GoogleAIBackend }

function reiGetConfig(){
  try{
    if(typeof FIREBASE_CONFIG !== 'undefined' && FIREBASE_CONFIG) return FIREBASE_CONFIG;
  }catch(e){}
  if(window.__REI_TEST_CONFIG__) return window.__REI_TEST_CONFIG__;
  return null;
}

function reiKillSwitch(){
  try{ return localStorage.getItem('studyReiAI') === '0'; }catch(e){ return true; }
}

function reiCanCall(skipThrottle){
  if(typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  if(reiKillSwitch()) return false;
  if(skipThrottle) return true;
  const now = Date.now();
  if(now - reiLastCall < REI_AI_MIN_INTERVAL) return false;
  reiHourCalls = reiHourCalls.filter(t => now - t < 3600000);
  if(reiHourCalls.length >= REI_AI_MAX_PER_HOUR) return false;
  return true;
}

function reiBuildModel(name){
  return reiAiApi.getGenerativeModel(reiAi, {
    model: name,
    systemInstruction: REI_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.85, maxOutputTokens: REI_AI_MAX_OUTPUT, topP: 0.95 }
  });
}

function reiInit(){
  if(reiInitPromise) return reiInitPromise;
  const run = (async () => {
    const cfg = reiGetConfig();
    if(!cfg){ reiReady = false; throw new Error('no config'); }
    const [app, ai] = await Promise.all([
      import(/* webpackIgnore: true */ 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js'),
      import(/* webpackIgnore: true */ 'https://www.gstatic.com/firebasejs/12.18.0/firebase-ai.js')
    ]).catch(() => [null, null]);
    if(!app || !ai){ reiReady = false; throw new Error('sdk load failed'); }
    reiAppApi = app;
    reiAiApi = ai;
    reiFirebase = reiAppApi.initializeApp(cfg, 'rei-ai');
    // App Check is required before AI Logic serves any request. If no site
    // key is configured yet (console step pending), skip cleanly and keep the
    // graceful non-AI fallback — nothing else changes.
    const siteKey = REI_RECAPTCHA_SITE_KEY || (window.__REI_RECAPTCHA_KEY__ ? String(window.__REI_RECAPTCHA_KEY__) : '');
    if(siteKey){
      try{
        const ac = await import(/* webpackIgnore: true */ 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app-check.js');
        const appCheck = ac.initializeAppCheck
          ? ac.initializeAppCheck(reiFirebase, {
              provider: new ac.ReCaptchaEnterpriseProvider(siteKey),
              isTokenAutoRefreshEnabled: true
            })
          : reiAppApi.initializeAppCheck(reiFirebase, {
              provider: new reiAppApi.ReCaptchaEnterpriseProvider(siteKey),
              isTokenAutoRefreshEnabled: true
            });
        void appCheck;
      }catch(e){ /* no token -> AI calls fail server-side; app unaffected */ }
    }
    reiAi = reiAiApi.getAI(reiFirebase, { backend: new reiAiApi.GoogleAIBackend() });
    reiReady = true;
  })();
  run.then(() => { reiInitPromise = run; });
  run.catch(() => { reiInitPromise = null; reiReady = false; });
  return run;
}

function reiTimeout(promise, ms){
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
  });
}

function reiSanitize(line){
  let s = String(line || '').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
  s = s.replace(/[<>&]/g, '');
  if(s.length > REI_AI_MAX_OUTPUT) s = s.slice(0, REI_AI_MAX_OUTPUT).trim();
  return s || null;
}

function reiBuildContext(moodKey, ctx){
  const c = ctx || {};
  const t = c.today || {}, s = c.streak || {}, st = c.stats || {}, sn = c.session || {};
  const neg = (c.neglected || []).map(n => n.name).slice(0, 3).join(', ');
  const top = [...(c.subjects || [])].sort((a, b) => b.totalMin - a.totalMin)[0];
  const lines = [];
  lines.push('Event/mood: ' + moodKey);
  lines.push('Today: ' + (t.studyMinutes || 0) + ' min studied, ' + (t.planPct || 0) + '% of today\'s plan done');
  lines.push('Streak: ' + (s.current || 0) + ' days (longest ' + (s.longest || 0) + ')');
  lines.push('Week: ' + (st.weekMin || 0) + ' min, Month: ' + (st.monthMin || 0) + ' min');
  if(sn.active){
    lines.push('Active session: ' + (sn.subjectName || 'a subject') + ' - "' + (sn.topic || 'study session') + '" (' + (sn.durationMinutes || 0) + ' min in)');
  }
  if(neg) lines.push('Neglected: ' + neg);
  if(top) lines.push('Most studied: ' + top.name + ' (' + top.totalMin + ' min)');
  return lines.join('\n');
}

async function reiSpeak(moodKey, ctx){
  if(!reiCanCall()) return null;
  const now = Date.now();
  try{ await reiInit(); }catch(e){ return null; }
  if(!reiReady) return null;
  reiLastCall = now;
  reiHourCalls.push(now);
  const prompt = reiBuildContext(moodKey, ctx);
  for(const name of REI_AI_MODELS){
    try{
      const model = reiBuildModel(name);
      const result = await reiTimeout(model.generateContent(prompt), REI_AI_TIMEOUT);
      const text = result && result.response ? result.response.text() : '';
      const clean = reiSanitize(text);
      if(clean) return clean;
    }catch(e){ /* try next model, then null */ }
  }
  return null;
}

// Chat URI for answering a user's freeform question about their tracker data.
// Reuses the same App-Checked AI instance; returns null on any failure so the
// caller falls back to the local rule-based answerer. The full subject list is
// passed so the model can answer "how many lectures left in DBMS?" precisely.
async function reiAnswerChat(question, ctx){
  if(!question || !/\S/.test(String(question))) return null;
  if(!reiCanCall(true)) return null;
  const now = Date.now();
  try{ await reiInit(); }catch(e){ return null; }
  if(!reiReady) return null;
  reiLastCall = now;
  reiHourCalls.push(now);
  const c = ctx || {};
  const s = c.streak || {}, st = c.stats || {}, sn = c.session || {};
  const subjects = (c.subjects || []).map(x => ({
    name: x.name || '(untitled)',
    totalMin: x.totalMin || 0,
    done: x.done || 0,
    remaining: x.remaining || 0,
    total: (x.done || 0) + (x.remaining || 0),
    progressPct: x.progressPct || 0,
    lastDays: x.lastDays || null,
    testAvg: x.testAvg || null,
    pace: x.pace || null,
  }));
  const facts = [
    'Today: ' + ((c.today && (c.today.studyMinutes||0)) || 0) + ' min studied, ' + ((c.today && (c.today.planPct||0)) || 0) + '% of plan done',
    'Streak: ' + (s.current || 0) + ' days (longest ' + (s.longest || 0) + ')',
    'Last 7 days: ' + (st.weekMin||0) + ' min', 'This month: ' + (st.monthMin||0) + ' min',
    'Active session: ' + (sn.active ? ((sn.subjectName||'a subject') + ' - ' + (sn.topic||'session')) : 'none'),
    '',
    'SUBJECTS:',
  ];
  (subjects.length ? subjects : [{name:'(no subjects yet)', totalMin:0, done:0, remaining:0, total:0, progressPct:0, lastDays:null, testAvg:null, pace:null}])
    .forEach(x => {
      facts.push('- ' + x.name + ': ' + x.totalMin + ' min, ' + x.done + '/' + x.total + ' lectures done, ' + x.remaining + ' remaining (' + x.progressPct + '% complete'
        + (x.lastDays != null ? ', studied ' + x.lastDays + ' days ago' : '')
        + (x.testAvg != null ? ', avg test ' + Math.round(x.testAvg) + '%' : '') + ')');
    });
  const prompt = (facts.join('\n') + '\n\nQuestion: ' + String(question).trim());
  for(const name of REI_AI_MODELS){
    try{
      const model = reiAiApi.getGenerativeModel(reiAi, {
        model: name,
        systemInstruction: REI_CHAT_SYSTEM_PROMPT,
        generationConfig: { temperature: 0.5, maxOutputTokens: 300, topP: 0.9 }
      });
      const result = await reiTimeout(model.generateContent(prompt), REI_AI_TIMEOUT * 1.6);
      const text = result && result.response ? result.response.text() : '';
      const clean = reiSanitize(text);
      if(clean) return clean;
    }catch(e){ /* try next model, then null */ }
  }
  return null;
}

window.ReiAI = {
  get ready(){ return reiReady; },
  speak: reiSpeak,
  answerChat: reiAnswerChat,
};