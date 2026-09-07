// Rei live-AI enhancement via Firebase AI Logic (Gemini Developer API, free tier).
//
// Purely additive: if the console step hasn't been done, the device is
// offline, a call fails, or the user sets localStorage studyReiAI = "0",
// everything falls back to the built-in line banks exactly as before.
// The Firebase proxy holds the Gemini key server-side — nothing secret is
// ever shipped in this file.

import { initializeApp } from 'firebase/app';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';

const REI_AI_MODELS = ['gemini-2.5-flash-lite', 'gemini-3.7-flash'];
const REI_AI_MIN_INTERVAL = 45 * 1000;   // at most one call per 45s
const REI_AI_MAX_PER_HOUR = 30;          // soft free-tier guardrail
const REI_AI_TIMEOUT = 7000;             // give up after 7s, fall back
const REI_AI_MAX_OUTPUT = 200;
const REI_SYSTEM_PROMPT = [
  'You are Rei, the study mascot in Study Tracker.',
  'You are dry, blunt, quietly warm, and you secretly grade the student with a',
  'hidden "respect" score: you respect consistency and honest effort, and you',
  'call out procrastination without cruelty. Never overpraise small wins.',
  'Never invent facts that are not in the context.',
  '',
  'Facts from the tracker (use ONLY these):',
  '__CONTEXT__',
  '',
  'Write exactly ONE line (12-30 words), in Rei\'s voice, reacting to this exact',
  'event. Plain text only: no markdown, no emoji, no quotation marks, no hashtags.',
].join('\n');

let reiReady = false;
let reiFirebase = null;
let reiAi = null;
let reiModel = null;
let reiLastCall = 0;
let reiHourCalls = [];
let reiInitPromise = null;

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

function reiCanCall(){
  if(typeof navigator !== 'undefined' && navigator.onLine === false) return false;
  if(reiKillSwitch()) return false;
  const now = Date.now();
  if(now - reiLastCall < REI_AI_MIN_INTERVAL) return false;
  reiHourCalls = reiHourCalls.filter(t => now - t < 3600000);
  if(reiHourCalls.length >= REI_AI_MAX_PER_HOUR) return false;
  return true;
}

function reiBuildModel(name){
  return getGenerativeModel(reiAi, {
    model: name,
    systemInstruction: REI_SYSTEM_PROMPT,
    generationConfig: { temperature: 0.85, maxOutputTokens: REI_AI_MAX_OUTPUT, topP: 0.95 }
  });
}

function reiInit(){
  if(reiInitPromise) return reiInitPromise;
  reiInitPromise = (async () => {
    const cfg = reiGetConfig();
    if(!cfg){ reiReady = false; return; }
    reiFirebase = initializeApp(cfg, 'rei-ai');
    reiAi = getAI(reiFirebase, { backend: new GoogleAIBackend() });
    reiModel = reiBuildModel(REI_AI_MODELS[0]);
    reiReady = true;
  })().catch(() => { reiReady = false; });
  return reiInitPromise;
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
  const attempts = REI_AI_MODELS.map((name, i) => ({ name, model: i === 0 ? reiModel : null }));
  for(const a of attempts){
    try{
      if(!a.model) a.model = reiBuildModel(a.name);
      const result = await reiTimeout(a.model.generateContent(prompt), REI_AI_TIMEOUT);
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
};