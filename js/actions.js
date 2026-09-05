// Core actions
// ---------------- ACTIONS ----------------
// Transient per-unit UI preferences (sort order / list-vs-grid) — intentionally
// not persisted to `data`, so they reset to sensible defaults on reload
// instead of bloating the saved file with view-state.
let unitSortMode = {};
let unitViewMode = {};

function sortedLectures(u){
  const lectures = (u && Array.isArray(u.lectures)) ? u.lectures : [];
  const mode = unitSortMode[u ? u.id : ''];
  if(mode === 'az'){
    return [...lectures].sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  }
  return lectures; // 'order' — as authored
}
function closeUnitMenus(){
  document.querySelectorAll('.unit-kebab-menu.show').forEach(m=>m.classList.remove('show'));
  document.querySelectorAll('.unit.menu-active').forEach(u=>u.classList.remove('menu-active'));
}
function closeUnitSortMenus(){
  document.querySelectorAll('.unit-sort-menu.show').forEach(m=>m.classList.remove('show'));
  document.querySelectorAll('.unit.menu-active').forEach(u=>u.classList.remove('menu-active'));
}
function toggleUnitMenu(unitId){
  const menu = document.getElementById('unitMenu-'+unitId);
  const unitEl = document.querySelector(`.unit[data-unit="${unitId}"]`);
  if(!menu) return;
  const wasOpen = menu.classList.contains('show');
  closeUnitMenus();
  closeUnitSortMenus();
  if(!wasOpen){
    menu.classList.add('show');
    if(unitEl) unitEl.classList.add('menu-active');
  }
}
function toggleUnitSortMenu(unitId){
  const menu = document.getElementById('unitSortMenu-'+unitId);
  const unitEl = document.querySelector(`.unit[data-unit="${unitId}"]`);
  if(!menu) return;
  const wasOpen = menu.classList.contains('show');
  closeUnitMenus();
  closeUnitSortMenus();
  if(!wasOpen){
    menu.classList.add('show');
    if(unitEl) unitEl.classList.add('menu-active');
  }
}
function setUnitSort(unitId, mode){
  unitSortMode[unitId] = mode;
  closeUnitSortMenus();
  renderMain();
}
function setUnitView(unitId, mode){
  unitViewMode[unitId] = mode;
  renderMain();
}
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.unit-kebab-wrap')) closeUnitMenus();
  if(!e.target.closest('.unit-sort-wrap')) closeUnitSortMenus();
  if(!e.target.closest('.lecture-kebab-wrap')) closeLectureMenus();
});

function toggleUnit(subjectId, unitId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===unitId);
  if(!u) return;
  const opening = !u.open;
  u.open = !u.open;
  renderMain();
  animateRings();
  if(opening && typeof mascotOnSubjectOpen === 'function') mascotOnSubjectOpen(subjectId);
}

async function toggleLecture(subjectId, unitId, lectureId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===unitId);
  if(!u) return;
  const l = (u.lectures||[]).find(x=>x.id===lectureId);
  if(!l) return;
  l.completed = !l.completed;
  if(l.completed){
    l.completedAt = Date.now();
    showToast('Marked complete ✓');
    burstConfetti(document.getElementById('omr-'+lectureId));
    impactFlash(document.getElementById('omr-'+lectureId));
    // A finished lecture has nothing left to plan for.
    if(l.plannedDate) delete l.plannedDate;
  } else {
    delete l.completedAt;
  }
  // Keep any linked priority entry's checkbox in sync with reality,
  // instead of it silently drifting out of date.
  if(data.priorityPlanner && data.priorityPlanner.byDate){
    Object.values(data.priorityPlanner.byDate).forEach(arr=>{
      arr.forEach(item=>{
        if(item.link && item.link.lectureId === lectureId) item.done = l.completed;
      });
    });
    if(currentView==='priority') renderPriorityPage();
  }
  renderAll();
  saveData();
  // Fires *after* renderAll (which calls renderMascot internally) so her
  // instant "happy" reaction is the last word, not immediately overwritten
  // by the ambient mood recompute.
  if(l.completed) mascotOnTaskCompleted(subjectId, unitId, lectureId);
}

function burstConfetti(originEl){
  if(!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  const colors = ['#d9a441','#3f7d5c','#7c5cbf','#2f8f8a','#c1502e'];
  for(let i=0;i<14;i++){
    const p = document.createElement('div');
    p.className = 'confetti-piece';
    const angle = Math.random()*Math.PI*2;
    const dist = 40 + Math.random()*50;
    p.style.left = cx+'px';
    p.style.top = cy+'px';
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--dx', Math.cos(angle)*dist + 'px');
    p.style.setProperty('--dy', Math.sin(angle)*dist + 'px');
    p.style.setProperty('--rot', (Math.random()*360)+'deg');
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 750);
  }
}

function sparkAt(el, colorVar){
  if(!el) return;
  const rect = el.getBoundingClientRect();
  const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  const ring = document.createElement('div');
  ring.className = 'spark-ring';
  ring.style.left = cx+'px';
  ring.style.top = cy+'px';
  if(colorVar) ring.style.setProperty('--spark-color', colorVar);
  document.body.appendChild(ring);
  setTimeout(()=>ring.remove(), 600);
}

function impactFlash(originEl){
  if(!originEl) return;
  const rect = originEl.getBoundingClientRect();
  const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
  const flash = document.createElement('div');
  flash.className = 'impact-flash';
  flash.style.left = cx+'px';
  flash.style.top = cy+'px';
  document.body.appendChild(flash);
  setTimeout(()=>flash.remove(), 450);
  for(let i=0;i<8;i++){
    const line = document.createElement('div');
    line.className = 'speed-line';
    line.style.left = cx+'px';
    line.style.top = cy+'px';
    line.style.setProperty('--ang', (i*45)+'deg');
    document.body.appendChild(line);
    setTimeout(()=>line.remove(), 520);
  }
}

function toggleSubjectMenu(subjectId){
  document.querySelectorAll('.ds-subject-menu.show').forEach(m=>{ if(m.id!=='subjectMenu-'+subjectId) m.classList.remove('show'); });
  const m = document.getElementById('subjectMenu-'+subjectId);
  if(m) m.classList.toggle('show');
}
function closeSubjectMenus(){
  document.querySelectorAll('.ds-subject-menu.show').forEach(m=>m.classList.remove('show'));
}
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.ds-menu-wrap')) closeSubjectMenus();
});

function cleanupPlannerLinks(matchFn){
  if(!data || !data.priorityPlanner || !data.priorityPlanner.byDate) return;
  for(const k in data.priorityPlanner.byDate){
    if(Array.isArray(data.priorityPlanner.byDate[k])){
      data.priorityPlanner.byDate[k] = data.priorityPlanner.byDate[k].filter(i=>!i.link || !matchFn(i.link));
    }
  }
}

function deleteSubject(subjectId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  askConfirm(`Delete "${s.name}" and everything in it?`, async ()=>{
    data.subjects = data.subjects.filter(x=>x.id!==subjectId);
    cleanupPlannerLinks(l => l.subjectId === subjectId);
    if(activeSubjectId===subjectId) activeSubjectId = data.subjects.length ? data.subjects[0].id : null;
    if(runningRef && runningRef.subjectId===subjectId){
      runningRef = null;
      stopTicking();
    }
    renderAll();
    saveData();
  });
}

function deleteUnit(subjectId, unitId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===unitId);
  if(!u) return;
  askConfirm(`Delete "${u.name}" and its lectures?`, async ()=>{
    s.units = s.units.filter(x=>x.id!==unitId);
    cleanupPlannerLinks(l => l.unitId === unitId);
    if(runningRef && runningRef.unitId===unitId){
      runningRef = null;
      stopTicking();
    }
    renderAll();
    saveData();
  });
}

function deleteLecture(subjectId, unitId, lectureId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===unitId);
  if(!u) return;
  const l = (u.lectures||[]).find(x=>x.id===lectureId);
  askConfirm(`Delete "${l ? l.title : 'this lecture'}"? Its logged time will be lost.`, ()=>{
    u.lectures = u.lectures.filter(x=>x.id!==lectureId);
    cleanupPlannerLinks(l => l.lectureId === lectureId);
    if(runningRef && runningRef.lectureId===lectureId){
      runningRef = null;
      stopTicking();
    }
    renderAll();
    saveData();
  });
}
