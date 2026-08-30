// Test scores + exam countdown & pacing
// ---------------- TEST SCORES ----------------
function testPct(t){
  return t.total>0 ? (t.obtained/t.total*100) : 0;
}
function unitTestAvg(u){
  if(!u.tests || !u.tests.length) return null;
  const sum = u.tests.reduce((s,t)=>s+testPct(t),0);
  return sum/u.tests.length;
}
function subjectTestAvg(s){
  const all = [];
  s.units.forEach(u=> (u.tests||[]).forEach(t=>all.push(t)));
  if(!all.length) return null;
  const sum = all.reduce((s2,t)=>s2+testPct(t),0);
  return sum/all.length;
}
function formatPct(p){
  return p===null ? '—' : Math.round(p)+'%';
}

// ---------------- EXAM COUNTDOWN & PACING ----------------
function examPacing(s){
  if(!s.examDate) return null;
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exam = new Date(s.examDate + 'T00:00:00');
  const daysLeft = Math.ceil((exam - today0) / 86400000);
  const c = countLectures(s);
  const remaining = c.total - c.done;
  let perWeek = null;
  if(daysLeft > 0 && remaining > 0){
    const weeksLeft = Math.max(daysLeft/7, 1/7);
    perWeek = remaining/weeksLeft;
  }
  return { daysLeft, remaining, perWeek, examDate: s.examDate };
}

function getTodaySnapshot(){
  const day = todayKey();
  const stored = (data.dailyLog && data.dailyLog[day]) ? data.dailyLog[day] : {total:0, bySubject:{}};
  const snap = { total: stored.total, bySubject: {...stored.bySubject} };
  if(runningRef){
    const l = getLecture(runningRef.subjectId, runningRef.unitId, runningRef.lectureId);
    if(l && l.timerStart){
      const delta = Math.floor((Date.now()-l.timerStart)/1000);
      snap.total += delta;
      snap.bySubject[runningRef.subjectId] = (snap.bySubject[runningRef.subjectId]||0) + delta;
    }
  }
  return snap;
}

function toggleTimer(subjectId, unitId, lectureId){
  if(runningRef && runningRef.lectureId === lectureId){
    stopTimer();
  } else {
    if(runningRef) stopTimer();
    startTimer(subjectId, unitId, lectureId);
  }
}

function startTimer(subjectId, unitId, lectureId){
  const l = getLecture(subjectId, unitId, lectureId);
  if(!l) return;
  l.timerStart = Date.now();
  runningRef = {subjectId, unitId, lectureId};
  renderAll();
  startTicking();
  showToast('Timer started ⏱');
  saveData(); // saves in the background — UI already updated, no waiting on storage
  // Fires after renderAll so her instant reaction is the last word.
  if(typeof mascotOnSessionStart === 'function') mascotOnSessionStart(subjectId, unitId, lectureId);
}

function stopTimer(){
  if(!runningRef) return;
  const {subjectId, unitId, lectureId} = runningRef;
  const l = getLecture(subjectId, unitId, lectureId);
  let elapsed = 0;
  if(l && l.timerStart){
    elapsed = Math.round((Date.now()-l.timerStart)/1000);
    l.seconds = (l.seconds||0) + elapsed;
    addToDailyLog(subjectId, elapsed);
    l.timerStart = null;
  }
  runningRef = null;
  stopTicking();
  renderAll();
  showToast('Timer stopped — logged ✓');
  saveData(); // saves in the background — UI already updated, no waiting on storage
  if(typeof mascotOnSessionEnd === 'function') mascotOnSessionEnd(subjectId, unitId, lectureId, elapsed);
}

async function checkpoint(){
  if(!runningRef) return;
  const {subjectId, unitId, lectureId} = runningRef;
  const l = getLecture(subjectId, unitId, lectureId);
  if(l && l.timerStart){
    const now = Date.now();
    const elapsed = Math.round((now-l.timerStart)/1000);
    if(elapsed > 0){
      l.seconds = (l.seconds||0) + elapsed;
      addToDailyLog(subjectId, elapsed);
      l.timerStart = now;
      // Targeted refresh — only what a time-commit actually changes. A full
      // renderAll() here would rebuild the subject panel, drawer, habits and
      // mascot every 30s while a timer runs.
      renderScorecard();
      renderToday();
      renderCalendar();
      renderDashboard();
      saveData();
    }
  }
}

function startTicking(){
  stopTicking();
  uiTickHandle = setInterval(updateLiveTick, 1000);
  checkpointHandle = setInterval(checkpoint, 30000);
  updateLiveTick();
}
function stopTicking(){
  if(uiTickHandle) clearInterval(uiTickHandle);
  if(checkpointHandle) clearInterval(checkpointHandle);
  uiTickHandle = null; checkpointHandle = null;
}
function updateLiveTick(){
  if(!runningRef) return;
  if(document.hidden) return; // background tab: skip DOM writes, checkpoint still runs
  const l = getLecture(runningRef.subjectId, runningRef.unitId, runningRef.lectureId);
  if(!l || !l.timerStart) return;
  const el = document.getElementById('timer-'+runningRef.lectureId);
  if(el) el.textContent = formatCompactLive(liveLectureSeconds(l));
  const focusEl = document.getElementById('focusTimerDisplay');
  if(focusEl && focusRef && focusRef.lectureId===runningRef.lectureId) focusEl.textContent = formatCompactLive(liveLectureSeconds(l));
  const todayEl = document.getElementById('todayTotal');
  if(todayEl) todayEl.textContent = formatHuman(getTodaySnapshot().total);
  renderRunningBanner();
}
