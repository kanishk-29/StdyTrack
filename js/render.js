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
  prevDone = done; prevTotal = total;
  const pct = total ? Math.round((done/total)*100) : 0;
  const active = (data.subjects||[]).length;
  const statL = document.getElementById('statLectures');
  const statP = document.getElementById('statPct');
  const statS = document.getElementById('statSubjects');
  if(statL) statL.textContent = `${done} / ${total} lectures cleared`;
  if(statP) statP.textContent = `${pct}% complete`;
  if(statS) statS.textContent = `${active} active subject${active===1?'':'s'}`;
}

function subjectNameById(id){
  const s = data.subjects.find(x=>x.id===id);
  return s ? s.name : 'Unknown';
}

function renderToday(){
  const snap = getTodaySnapshot();
  const totalEl = document.getElementById('todayTotal');
  const summaryEl = document.getElementById('todaySummary');
  const wrap = document.getElementById('todaySubjects');
  const yEl = document.getElementById('yesterdayLine');
  if(totalEl) totalEl.textContent = formatHuman(snap.total);

  const entries = Object.entries(snap.bySubject).filter(([,sec])=>sec>0).sort((a,b)=>b[1]-a[1]);
  if(summaryEl){
    if(!entries.length){
      summaryEl.textContent = 'No study time logged yet today — hit ▶ on a lecture to start.';
    } else {
      const names = entries.map(([sid])=>subjectNameById(sid));
      summaryEl.textContent = names.length>1
        ? `Focused across ${names.slice(0,-1).join(', ')} and ${names[names.length-1]}.`
        : `Focused on ${names[0]}.`;
    }
  }
  if(wrap){
    wrap.innerHTML = entries.map(([sid,sec])=>
      `<span class="topic">${escapeHtml(subjectNameById(sid))} · ${formatHuman(sec)}</span>`
    ).join('');
  }

  const yesterday = zoneTodayDate();
  yesterday.setDate(yesterday.getDate()-1);
  const yKey = todayKey(yesterday);
  const ySeconds = (data.dailyLog && data.dailyLog[yKey]) ? data.dailyLog[yKey].total : 0;
  if(yEl){
    let trendHtml = '';
    if(ySeconds>0){
      if(snap.total>ySeconds) trendHtml = `<span class="yd-trend up">▲ ahead</span>`;
      else if(snap.total<ySeconds) trendHtml = `<span class="yd-trend down">▼ behind</span>`;
      else trendHtml = `<span class="yd-trend same">= same</span>`;
    }
    yEl.innerHTML = `Yesterday: <span class="yd-value">${formatHuman(ySeconds)}</span> ${trendHtml}`;
  }
}

function getWeakUnits(){
  const results = [];
  (data.subjects||[]).forEach(s=>{
    (s.units||[]).forEach(u=>{
      if(!u) return;
      const avg = unitTestAvg(u);
      if(avg !== null){
        results.push({subjectId:s.id, subjectName:s.name, unitId:u.id, unitName:u.name, avg, count:(u.tests?u.tests.length:0)});
      }
    });
  });
  results.sort((a,b)=>a.avg-b.avg);
  return results.filter(r=>r.avg<75).slice(0,3);
}
