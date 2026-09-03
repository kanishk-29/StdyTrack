// Core render dispatcher
// ---------------- RENDER ----------------
function countLectures(subject){
  let total=0, done=0;
  if(!subject || !Array.isArray(subject.units)) return {total, done};
  subject.units.forEach(u => { if(!u || !Array.isArray(u.lectures)) return; u.lectures.forEach(l => { total++; if(l && l.completed) done++; }); });
  return {total, done};
}

function renderAll(){
  renderScorecard();
  renderToday();
  renderCalendar();
  renderDashboard();
  renderRevisionPanel();
  renderSidebar();
  renderMain();
  renderHabitsPage();
  animateRings();
  renderMascot();
  const po = document.getElementById('progressOverlay');
  if(po && po.classList.contains('show')) renderProgressChart(chartRange);
}

let prevDone = null, prevTotal = null;
function animateCount(el, from, to, duration){
  const start = performance.now();
  function step(now){
    const t = Math.min(1, (now-start)/duration);
    const eased = 1 - Math.pow(1-t, 3);
    el.textContent = Math.round(from + (to-from)*eased);
    if(t<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function renderScorecard(){
  let total=0, done=0;
  data.subjects.forEach(s=>{
    const c = countLectures(s);
    total += c.total; done += c.done;
  });
  const doneEl = document.getElementById('totalCompleted');
  const totalEl = document.getElementById('totalLectures');
  // Only restart the animated counter when the number actually changed;
  // on the first paint (prevXxx === null) or unchanged renders just set
  // textContent directly so we never spin up two 500ms rAF loops for nothing.
  if(doneEl){
    if(prevDone !== null && prevDone !== done) animateCount(doneEl, prevDone, done, 500);
    else doneEl.textContent = done;
  }
  if(totalEl){
    if(prevTotal !== null && prevTotal !== total) animateCount(totalEl, prevTotal, total, 500);
    else totalEl.textContent = total;
  }
  prevDone = done; prevTotal = total;
  const pct = total ? Math.round((done/total)*100) : 0;
  document.getElementById('percentBadge').textContent = pct + '%';
}

function subjectNameById(id){
  const s = data.subjects.find(x=>x.id===id);
  return s ? s.name : 'Unknown';
}

function renderToday(){
  const snap = getTodaySnapshot();
  const wrap = document.getElementById('todaySubjects');
  document.getElementById('todayTotal').textContent = formatHuman(snap.total);
  const entries = Object.entries(snap.bySubject).filter(([,sec])=>sec>0).sort((a,b)=>b[1]-a[1]);
  if(!entries.length){
    wrap.innerHTML = `<span class="today-empty">No study time logged yet today — hit ▶ on a lecture to start.</span>`;
  } else {
    wrap.innerHTML = entries.map(([sid,sec])=>
      `<span class="stat-chip time accent-${(data.subjects.findIndex(s=>s.id===sid)%5)+1}">${escapeHtml(subjectNameById(sid))} · ${formatHuman(sec)}</span>`
    ).join('');
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate()-1);
  const yKey = todayKey(yesterday);
  const ySeconds = (data.dailyLog && data.dailyLog[yKey]) ? data.dailyLog[yKey].total : 0;
  const yEl = document.getElementById('yesterdayLine');
  let trendHtml = '';
  if(ySeconds>0){
    if(snap.total>ySeconds) trendHtml = `<span class="yd-trend up">▲ ahead</span>`;
    else if(snap.total<ySeconds) trendHtml = `<span class="yd-trend down">▼ behind</span>`;
    else trendHtml = `<span class="yd-trend same">= same</span>`;
  }
  yEl.innerHTML = `Yesterday: <span class="yd-value">${formatHuman(ySeconds)}</span> ${trendHtml}`;
}

function getWeakUnits(){
  const results = [];
  data.subjects.forEach(s=>{
    s.units.forEach(u=>{
      const avg = unitTestAvg(u);
      if(avg !== null){
        results.push({subjectId:s.id, subjectName:s.name, unitId:u.id, unitName:u.name, avg, count:u.tests.length});
      }
    });
  });
  results.sort((a,b)=>a.avg-b.avg);
  return results.filter(r=>r.avg<75).slice(0,3);
}
