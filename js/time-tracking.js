// Time tracking
// ---------------- TIME TRACKING ----------------
let runningRef = null; // {subjectId, unitId, lectureId}
let focusRef = null;
let uiTickHandle = null;
let checkpointHandle = null;

function getLecture(subjectId, unitId, lectureId){
  const s = (data.subjects||[]).find(x=>x.id===subjectId); if(!s) return null;
  const u = (Array.isArray(s.units) ? s.units : []).find(x=>x && x.id===unitId); if(!u) return null;
  return (Array.isArray(u.lectures) ? u.lectures : []).find(x=>x && x.id===lectureId) || null;
}

function findRunningLecture(){
  for(const s of (data.subjects||[])){
    if(!s || !Array.isArray(s.units)) continue;
    for(const u of s.units){
      if(!u || !Array.isArray(u.lectures)) continue;
      for(const l of u.lectures){
        if(l && l.timerStart) return {subjectId:s.id, unitId:u.id, lectureId:l.id};
      }
    }
  }
  return null;
}

// ---- App country / timezone (Settings → Country & time) ----
// The whole app keys "today" off this: calendar highlight, streaks,
// planner today/tomorrow, habits, and analytics all follow the selected
// country instead of the device clock.
const COUNTRY_ZONES = [
  { label:'Device default', tz:'' },
  { label:'India', tz:'Asia/Kolkata' },
  { label:'Pakistan', tz:'Asia/Karachi' },
  { label:'Bangladesh', tz:'Asia/Dhaka' },
  { label:'Nepal', tz:'Asia/Kathmandu' },
  { label:'Sri Lanka', tz:'Asia/Colombo' },
  { label:'UAE', tz:'Asia/Dubai' },
  { label:'Saudi Arabia', tz:'Asia/Riyadh' },
  { label:'Singapore / Malaysia', tz:'Asia/Singapore' },
  { label:'Japan', tz:'Asia/Tokyo' },
  { label:'South Korea', tz:'Asia/Seoul' },
  { label:'China', tz:'Asia/Shanghai' },
  { label:'Australia (Sydney)', tz:'Australia/Sydney' },
  { label:'New Zealand', tz:'Pacific/Auckland' },
  { label:'UK', tz:'Europe/London' },
  { label:'Germany / France / Spain', tz:'Europe/Berlin' },
  { label:'US Eastern', tz:'America/New_York' },
  { label:'US Central', tz:'America/Chicago' },
  { label:'US Mountain', tz:'America/Denver' },
  { label:'US Pacific', tz:'America/Los_Angeles' },
  { label:'Canada (Toronto)', tz:'America/Toronto' },
  { label:'Brazil (São Paulo)', tz:'America/Sao_Paulo' },
  { label:'South Africa', tz:'Africa/Johannesburg' },
  { label:'Nigeria', tz:'Africa/Lagos' },
];
function appTimeZone(){
  try{
    const tz = data && data.settings && data.settings.timeZone;
    if(tz && COUNTRY_ZONES.some(c=>c.tz===tz)) return tz;
  }catch(e){}
  return '';
}
// 0 = week starts Sunday (US), 1 = week starts Monday (most other countries).
function appWeekStart(){
  try{
    const w = data && data.settings && data.settings.weekStart;
    return w === 1 ? 1 : 0;
  }catch(e){ return 0; }
}
// Y/M/D (and wall-clock H/M) of an instant in the selected country.
function zonedParts(date){
  const d = date || new Date();
  const tz = appTimeZone();
  if(!tz) return { y:d.getFullYear(), m:d.getMonth()+1, day:d.getDate(), h:d.getHours(), min:d.getMinutes() };
  try{
    const parts = new Intl.DateTimeFormat('en-CA',{ timeZone:tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(d);
    const g = t => { const p = parts.find(x=>x.type===t); return p ? Number(p.value) : 0; };
    let h = g('hour'); if(h === 24) h = 0; // en-CA can emit 24:xx at midnight
    return { y:g('year'), m:g('month'), day:g('day'), h, min:g('minute') };
  }catch(e){
    return { y:d.getFullYear(), m:d.getMonth()+1, day:d.getDate(), h:d.getHours(), min:d.getMinutes() };
  }
}
// "Today" in the selected country, as a device-local Date at noon (noon
// avoids DST-midnight edges when doing setDate() day arithmetic on it).
function zoneTodayDate(){
  const p = zonedParts();
  return new Date(p.y, p.m-1, p.day, 12, 0, 0);
}
// Wall-clock minutes right now in the selected country (for reminders).
function zoneNowMinutes(){
  const p = zonedParts();
  return p.h*60 + p.min;
}
function pad2(n){ return String(n).padStart(2,'0'); }

function todayKey(d){
  if(!d){
    // Bare todayKey() always means "today in the selected country".
    const p = zonedParts();
    return p.y+'-'+pad2(p.m)+'-'+pad2(p.day);
  }
  // Explicit dates stay pure: their Y/M/D are already fixed.
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function addToDailyLog(subjectId, seconds, dateKey){
  const day = dateKey || todayKey();
  if(!data.dailyLog) data.dailyLog = {};
  if(!data.dailyLog[day]) data.dailyLog[day] = {total:0, bySubject:{}};
  const entry = data.dailyLog[day];
  const currentSubjectSec = entry.bySubject[subjectId] || 0;
  // Clamp the delta so this subject's own contribution can't go negative,
  // then apply that *same* clamped delta to the day's total — clamping
  // them independently could wipe out other subjects' legitimately-logged
  // time on the same day when correcting a large runaway timer.
  const clampedDelta = Math.max(seconds, -currentSubjectSec);
  entry.bySubject[subjectId] = currentSubjectSec + clampedDelta;
  entry.total = Math.max(0, entry.total + clampedDelta);
}

function formatHMS(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return [h,m,s].map((v,i)=> i===0 ? String(v) : String(v).padStart(2,'0')).join(':');
}
function formatCompactLive(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  if(h>0) return `${h}h${m}m`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function formatHuman(sec){
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
  if(h>0) return `${h}h ${m}m`;
  if(m>0) return `${m}m`;
  return sec>0 ? `${sec}s` : '0m';
}

function liveLectureSeconds(l){
  if(!l || typeof l !== 'object') return 0;
  return (l.seconds||0) + (l.timerStart ? Math.floor((Date.now()-l.timerStart)/1000) : 0);
}
function unitSeconds(u){
  if(!u || !Array.isArray(u.lectures)) return 0;
  return u.lectures.reduce((sum,l)=> sum + liveLectureSeconds(l), 0);
}
function subjectSeconds(s){
  if(!s || !Array.isArray(s.units)) return 0;
  return s.units.reduce((sum,u)=> sum + unitSeconds(u), 0);
}
