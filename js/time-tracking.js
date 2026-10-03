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

// Adopt a timer left running when the tab closed, and restart its clock.
//
// findRunningLecture() on its own is not enough. The persisted stamp predates
// the close, and everything downstream measures against it: liveLectureSeconds()
// adds (now - stamp) to the lecture, and the first checkpoint() after resume
// banks that same gap into BOTH l.seconds and today's data.dailyLog. So a
// laptop closed overnight would credit ~8h of "study" to the lecture the user
// fell asleep on — shown live in every total, then made permanent 30s later.
// Hitting Stop does the same thing deliberately, turning a display glitch into
// baked-in corruption that no later reload can undo.
//
// Time with the app closed was never study time. checkpoint() already banked
// everything up to the moment of the close, and the close instant is not
// recorded, so the uncommitted remainder and the away time are inseparable.
// Dropping the whole gap is the only honest reading: at most one <30s
// checkpoint interval is lost, and no phantom hours are ever invented.
function adoptRunningLecture(){
  const ref = findRunningLecture();
  if(!ref) return null;
  const l = getLecture(ref.subjectId, ref.unitId, ref.lectureId);
  if(l) l.timerStart = Date.now();
  return ref;
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
// The formatter is memoised per time zone: constructing an Intl.DateTimeFormat
// is expensive (~50-100x a formatToParts call) and zonedParts() runs inside
// 365-iteration streak loops and once per calendar cell, so rebuilding it every
// call was the single hottest allocation in the dashboard render path.
const _zonedFmtCache = new Map();
function zonedFormatter(tz){
  let f = _zonedFmtCache.get(tz);
  if(f === undefined){
    try{
      f = new Intl.DateTimeFormat('en-CA',{ timeZone:tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });
    }catch(e){
      f = null; // unsupported zone - never retried, callers fall back to local time
    }
    _zonedFmtCache.set(tz, f);
  }
  return f;
}
function zonedParts(date){
  const d = date || new Date();
  const tz = appTimeZone();
  if(!tz) return { y:d.getFullYear(), m:d.getMonth()+1, day:d.getDate(), h:d.getHours(), min:d.getMinutes() };
  const fmt = zonedFormatter(tz);
  if(!fmt) return { y:d.getFullYear(), m:d.getMonth()+1, day:d.getDate(), h:d.getHours(), min:d.getMinutes() };
  try{
    const parts = fmt.formatToParts(d);
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
  if(!data.dailyLog || typeof data.dailyLog !== 'object' || Array.isArray(data.dailyLog)) data.dailyLog = {};
  // The guard below used to be `if(!data.dailyLog[day])`, which only catches a
  // FALSY day entry -- a truthy string or number sailed through and then threw at
  // `entry.bySubject[subjectId]`. This is called by the 30s checkpoint, so the
  // throw silently stopped study time being banked AND aborted the rest of the
  // checkpoint body. Check the shape, not just truthiness.
  if(!data.dailyLog[day] || typeof data.dailyLog[day] !== 'object' || Array.isArray(data.dailyLog[day])){
    data.dailyLog[day] = { total:0, bySubject:{} };
  }
  const entry = data.dailyLog[day];
  if(!entry.bySubject || typeof entry.bySubject !== 'object' || Array.isArray(entry.bySubject)) entry.bySubject = {};
  // Coerce the STORED value, not just the incoming delta. Both boundaries now
  // sanitise dailyLog, but this is the choke point that guarantees it: with a
  // stored "600" here, `currentSubjectSec + clampedDelta` concatenates to "60030"
  // and `Math.max(0, "600" + 30)` then coerces that string into the NUMBER 60030,
  // which is saved and survives every reboot. A 100x inflation of the whole day,
  // compounding with each later session.
  const currentSubjectSec = toSeconds(entry.bySubject[subjectId]);
  entry.total = toSeconds(entry.total);
  // Clamp the delta so this subject's own contribution can't go negative,
  // then apply that *same* clamped delta to the day's total — clamping
  // them independently could wipe out other subjects' legitimately-logged
  // time on the same day when correcting a large runaway timer.
  const clampedDelta = Math.max(seconds, -currentSubjectSec);
  entry.bySubject[subjectId] = currentSubjectSec + clampedDelta;
  entry.total = Math.max(0, entry.total + clampedDelta);
}

function formatHMS(sec){
  // Math.max(0, NaN) is NaN, so a non-finite input used to print "NaN:NaN:NaN"
  // straight into the header. formatHuman() degrades to "0m" on the same input;
  // a clock should degrade to zero, not to NaN.
  const v = parseFloat(sec);
  sec = (isFinite(v) && v > 0) ? Math.floor(v) : 0;
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

// Live focus-seconds that should show as if already banked: only while a focus
// session is actively counting down on this lecture and no manual timer is
// running on it (a manual timer covers the same wall-clock and banks it on
// stop). 0 otherwise, so the display never double-counts.
function focusContributionSec(){
  const s = focusSession;
  if(!focusRef || !s || s.mode !== 'running' || s.committed) return 0;
  const l = getLecture(focusRef.subjectId, focusRef.unitId, focusRef.lectureId);
  if(!l || l.timerStart) return 0;
  return Math.max(0, (s.totalSec||0) - (s.remainingSec||0));
}

// Which subject is accruing study time right now, or null. Covers BOTH timers:
// a manual start/stop timer (runningRef) and a focus-mode session (focusRef).
// updateSubjectHeaderLive() used to gate on runningRef alone, so the subject
// header's total and curve sat frozen for the entire time the user was in focus
// mode -- the one timer where studying is the whole point of the screen. The
// focus guards mirror focusContributionSec() exactly so the two can't drift.
function liveAccumulatingSubjectId(){
  if(runningRef && runningRef.subjectId) return runningRef.subjectId;
  const s = focusSession;
  if(!focusRef || !s || s.mode !== 'running' || s.paused || s.committed) return null;
  return focusRef.subjectId || null;
}

function liveLectureSeconds(l){
  if(!l || typeof l !== 'object') return 0;
  // Coerce defensively rather than relying on the load/import boundaries to have
  // done it. This is the single choke point every aggregate reads through, so a
  // non-numeric seconds from any source concatenates here ("5" + 0 -> "50") and
  // then poisons every sum that walks unitSeconds/subjectSeconds.
  const raw = typeof l.seconds === 'number' ? l.seconds : parseFloat(l.seconds);
  let sec = (isFinite(raw) && raw > 0 ? raw : 0) + (l.timerStart ? Math.floor((Date.now()-l.timerStart)/1000) : 0);
  if(!l.timerStart && focusRef && focusRef.lectureId === l.id) sec += focusContributionSec();
  return sec;
}
function unitSeconds(u){
  if(!u || !Array.isArray(u.lectures)) return 0;
  return u.lectures.reduce((sum,l)=> sum + liveLectureSeconds(l), 0);
}
function subjectSeconds(s){
  if(!s || !Array.isArray(s.units)) return 0;
  return s.units.reduce((sum,u)=> sum + unitSeconds(u), 0);
}

// ---------------- subject/folder header graphs ----------------
// The subject-detail header's "Total Studied" curve and its topics-covered
// graph used to be decoration, not data: a hardcoded SVG path
// (`M2,24 Q15,6 28,20 ...`) and twelve bars at `20+Math.random()*80%`. They
// looked like measurements while showing nothing real -- the curve could never
// move and the bars reshuffled on every render. Everything below builds both
// from stored study time instead, and is cheap enough to repaint while a timer
// runs.

// Window shown by the curve. 30 days reads well at 120px wide; a whole
// semester of daily points flattens into a single meaningless line.
const SD_CURVE_DAYS = 30;
const SD_CURVE_W = 120;
const SD_CURVE_H = 34;
// Floor for the curve's vertical axis, so an all-zero (or brand-new) history
// still has a scale to grow into instead of dividing by zero.
const SD_CURVE_MIN_CEIL = 900;   // 15 minutes

// Seconds studied per day for the last `days` days, oldest first.
// Pass one subject id, or an array to total a folder.
// The final entry adds the currently-running timer, because addToDailyLog only
// commits every 30s -- without this the newest point sits flat until the next
// checkpoint and the curve looks frozen while the user is studying.
function sdDailySeries(subjectIds, days, opts){
  days = Math.max(2, Math.min(120, days || SD_CURVE_DAYS));
  const withLive = !(opts && opts.live === false);
  const ids = Array.isArray(subjectIds) ? subjectIds : (subjectIds ? [subjectIds] : []);
  const now = zoneTodayDate();
  const keys = [];
  for(let i=0; i<days; i++){
    const day = new Date(now);
    day.setDate(day.getDate() - (days-1-i));
    keys.push(todayKey(day));
  }
  const out = new Array(days).fill(0);
  for(const id of ids){
    if(!id) continue;
    const pending = withLive ? sdPendingSec(id) : 0;
    for(let i=0; i<days; i++){
      const entry = data.dailyLog && data.dailyLog[keys[i]];
      let sec = (entry && entry.bySubject) ? (entry.bySubject[id] || 0) : 0;
      if(i === days-1) sec += pending;
      out[i] += Math.max(0, Math.floor(sec) || 0);
    }
  }
  return out;
}

// Running-timer seconds for a subject that are not in dailyLog yet.
function sdPendingSec(subjectId){
  if(runningRef && runningRef.subjectId === subjectId){
    const l = getLecture(runningRef.subjectId, runningRef.unitId, runningRef.lectureId);
    if(l && l.timerStart) return Math.max(0, Math.floor((Date.now()-l.timerStart)/1000));
  }
  // Focus mode only banks when the session ends, so its uncommitted seconds are
  // the countdown already elapsed. focusContributionSec() already returns 0 when
  // no session is live, when it is paused, or when a manual timer is covering
  // the same lecture -- so this cannot double-count the manual branch above.
  if(focusRef && focusRef.subjectId === subjectId) return focusContributionSec();
  return 0;
}

// Smooth curve through a series, scaled to the box. Returns both the stroke
// path and a closed area path so the fill tracks the line exactly.
function sdCurveCeiling(committed){
  const arr = Array.isArray(committed) ? committed : [];
  let m = 0;
  for(let i=0; i<arr.length; i++){
    const v = parseFloat(arr[i]);
    if(isFinite(v) && v > m) m = v;
  }
  return Math.max(SD_CURVE_MIN_CEIL, m);
}
function sdCurvePaths(series, w, h, ceiling){
  const pts = (Array.isArray(series) ? series : []).map(v => {
    const n = parseFloat(v);
    return (isFinite(n) && n > 0) ? n : 0;
  });
  const n = pts.length;
  if(!n) return { line:'', area:'', max:0, base:'0', lastX:'0', lastY:'0' };
  // `ceiling` is the axis top, and it is measured from COMMITTED time only --
  // see sdCurveCeiling. Deriving it from the series instead would make the
  // chart scale-invariant, and today is the sample that grows while a timer
  // runs, so the axis would grow with it and the line would never move.
  const max = (isFinite(ceiling) && ceiling > 0) ? ceiling : Math.max(SD_CURVE_MIN_CEIL, Math.max.apply(null, pts));
  const pad = 3;
  const innerW = Math.max(1, w - pad*2), innerH = Math.max(1, h - pad*2);
  const X = (i) => (n === 1) ? pad + innerW/2 : pad + (i/(n-1))*innerW;
  // Clamped: a day that beats every committed day saturates at the top instead
  // of pushing the rest of the curve off the box.
  const Y = (v) => pad + innerH - Math.max(0, Math.min(1, v/max))*innerH;
  // Quadratic through segment midpoints: smooth, passes through every sample,
  // and lands exactly on the last one (which is the point the live timer grows).
  let d = 'M' + X(0).toFixed(1) + ',' + Y(pts[0]).toFixed(1);
  for(let i=1; i<n; i++){
    const mx = ((X(i-1) + X(i)) / 2).toFixed(1);
    const my = ((Y(pts[i-1]) + Y(pts[i])) / 2).toFixed(1);
    d += ' Q' + X(i-1).toFixed(1) + ',' + Y(pts[i-1]).toFixed(1) + ' ' + mx + ',' + my;
  }
  const base = (pad + innerH).toFixed(1);
  // The stroke stops on the last sample; only the area closes down to the
  // baseline, otherwise the line ends in a visible vertical spike.
  const line = d + ' L' + X(n-1).toFixed(1) + ',' + Y(pts[n-1]).toFixed(1);
  const area = line + ' L' + X(n-1).toFixed(1) + ',' + base +
               ' L' + X(0).toFixed(1) + ',' + base + ' Z';
  return { line, area, max, base,
           lastX: X(n-1).toFixed(1), lastY: Y(pts[n-1]).toFixed(1) };
}

// Topics covered across a set of units, one segment per unit. Each segment's
// WIDTH is proportional to how many topics that unit holds, and its HEIGHT to
// how many of them are done -- so a 12-lecture week reads as roughly four times
// the weight of a 3-lecture one, which the old fixed-width random bars never
// could. Returns the markup plus the totals for the accessible label.
function sdTopicsGraph(units){
  const rows = (Array.isArray(units) ? units : []).map(u=>{
    const lectures = (u && Array.isArray(u.lectures)) ? u.lectures.filter(l => l) : [];
    return { name: (u && u.name) ? String(u.name) : '', total: lectures.length,
             done: lectures.filter(l => l.completed).length };
  }).filter(r => r.total > 0);
  const total = rows.reduce((a,r)=> a + r.total, 0);
  const done = rows.reduce((a,r)=> a + r.done, 0);
  if(!rows.length){
    return { html: '<div class="sd-bars sd-bars--empty"><span>No topics yet</span></div>', done, total };
  }
  const bars = rows.map((r, i) => {
    const pct = (r.total > 0) ? Math.round((r.done/r.total)*100) : 0;
    // flex-grow carries the topic count; flex-basis 0 keeps the bar from adding
    // its own content width. Height is this unit's own completion ratio, so a
    // unit that is fully read but small still shows as a short, full bar.
    const grow = Math.max(1, r.total);
    const h = r.done > 0 ? Math.max(14, pct) : 0;
    const label = escapeHtml(r.name) + ': ' + r.done + ' of ' + r.total + ' topics' + (pct ? ' (' + pct + '%)' : '');
    return '<i class="' + (r.done >= r.total ? 'full' : '') + '" style="flex-grow:' + grow +
           '; height:' + h + '%; animation-delay:' + (i*0.05) + 's;" title="' + label +
           '" aria-label="' + label + '"></i>';
  }).join('');
  return { html: '<div class="sd-bars sd-bars--prop" role="img" aria-label="Topics covered: ' +
           done + ' of ' + total + ' across ' + rows.length + ' unit' + (rows.length===1?'':'s') +
           ', bar width scaled by topics per unit">' + bars + '</div>', done, total };
}
