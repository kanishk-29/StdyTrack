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

function todayKey(d){
  d = d || new Date();
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
