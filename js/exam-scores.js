// Test scores + exam countdown & pacing
// ---------------- TEST SCORES ----------------
function testPct(t){
  if(!t || typeof t !== 'object') return 0;
  // Both operands are coerced because a score can still arrive non-numeric on
  // a path that skipped sanitizing: any of them being NaN makes the whole
  // percentage NaN, and "NaN%" is what the user then reads on the card.
  const got = Number(t.obtained), tot = Number(t.total);
  if(!isFinite(got) || !isFinite(tot) || tot <= 0) return 0;
  return got/tot*100;
}
function unitTestAvg(u){
  if(!u || !Array.isArray(u.tests) || !u.tests.length) return null;
  // A null entry left in tests[] by an older/hand-edited data file must not be
  // counted as a zero-scoring test — it would drag the average down forever.
  const tests = u.tests.filter(t => t && typeof t === 'object');
  if(!tests.length) return null;
  const sum = tests.reduce((s,t)=>s+testPct(t),0);
  return sum/tests.length;
}
function subjectTestAvg(s){
  if(!s || !Array.isArray(s.units)) return null;
  const all = [];
  // `u && (u.tests||[])` short-circuits to null when u is null, and then the
  // .forEach below dereferences that null. Both normalizeLoadedData() and
  // sanitizeBackup() skip a falsy entry instead of removing it, so a null unit
  // really does reach here from cloud restore or a hand-edited backup.
  s.units.forEach(u=> ((u && u.tests) || []).forEach(t=>{ if(t && typeof t === 'object') all.push(t); }));
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
  const now = zoneTodayDate();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const exam = new Date(s.examDate + 'T00:00:00');
  // Round, not ceil. Both operands are local midnights, so when a DST change
  // falls between them the real gap is 23h (clocks forward) or 25h (clocks
  // back) instead of 24h. Ceil turns a 25h gap into "2 days", which left the
  // countdown reading 1 day on exam day itself and only reaching 0 the day
  // after. Round is exact for N days +/- the 1h that a transition can shift.
  const daysLeft = Math.round((exam - today0) / 86400000);
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
  const focusAdd = focusContributionSec();
  if(focusAdd > 0){
    snap.total += focusAdd;
    snap.bySubject[focusRef.subjectId] = (snap.bySubject[focusRef.subjectId]||0) + focusAdd;
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
      renderDashboard();
      // renderCalendar() is deliberately NOT called here. It rebuilds all 12
      // month panels (~371 cells, ~700 toLocaleDateString calls, a full data
      // scan per future cell) and the only thing a 30s commit changes on it is
      // the day heat level, whose thresholds are 30/60/120 minutes apart
      // (monthCalLevel). renderAll() and the global-study tick already repaint
      // it on a 30s floor, so skipping it here removes a ~10-30ms freeze that
      // used to land every 30 seconds for as long as a timer ran.
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
  const focusLive = !!(focusRef && focusSession.mode === 'running' && !focusSession.committed && !focusSession.paused);
  if(!runningRef && !focusLive) return;
  if(document.hidden) return; // background tab: skip DOM writes, checkpoint still runs
  if(runningRef){
    const l = getLecture(runningRef.subjectId, runningRef.unitId, runningRef.lectureId);
    if(l && l.timerStart){
      const el = document.getElementById('timer-'+runningRef.lectureId);
      if(el) el.textContent = formatCompactLive(liveLectureSeconds(l));
      const focusEl = document.getElementById('focusTimerDisplay');
      if(focusEl && focusRef && focusRef.lectureId===runningRef.lectureId) focusEl.textContent = formatCompactLive(liveLectureSeconds(l));
    }
  }
  if(focusLive){
    const fl = getLecture(focusRef.subjectId, focusRef.unitId, focusRef.lectureId);
    if(fl && !fl.timerStart){
      const el = document.getElementById('timer-'+focusRef.lectureId);
      if(el) el.textContent = formatCompactLive(liveLectureSeconds(fl));
      const focusEl = document.getElementById('focusTimerDisplay');
      if(focusEl) focusEl.textContent = formatCompactLive(liveLectureSeconds(fl));
    }
  }
  const todayEl = document.getElementById('todayTotal');
  if(todayEl) todayEl.textContent = formatHuman(getTodaySnapshot().total);
  renderRunningBanner();
}
