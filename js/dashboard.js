// Dashboard
// ---------------- DASHBOARD ----------------
function renderDashboard(){
  renderRunningBanner();
  renderDashQuickGrid();
  renderDashPriority();
  renderDashCourses();
  renderDashDeadlines();
}

let lastBannerKey = null;
function renderRunningBanner(force){
  const el = document.getElementById('runningTimerBanner');
  if(!el) return;
  if(!runningRef){ el.style.display = 'none'; el.innerHTML = ''; lastBannerKey = null; return; }
  const l = getLecture(runningRef.subjectId, runningRef.unitId, runningRef.lectureId);
  const s = data.subjects.find(x=>x.id===runningRef.subjectId);
  if(!l || !s){ el.style.display = 'none'; lastBannerKey = null; return; }

  const seconds = liveLectureSeconds(l);
  let tier = 'normal', headline = '⏱ Timer running';
  if(seconds >= 4*3600){ tier = 'alert'; headline = '🚨 Still running — did you forget to stop it?'; }
  else if(seconds >= 2*3600){ tier = 'warn'; headline = '⚠️ Still running for a while — check if you forgot to stop it'; }

  // The 1s live tick calls this every second; rebuilding the banner's DOM each
  // tick is wasteful, so if the target/tier didn't change, just refresh the
  // timer text node in place instead of reparsing innerHTML.
  const key = runningRef.subjectId + '|' + runningRef.unitId + '|' + runningRef.lectureId + '|' + tier;
  if(!force && lastBannerKey === key){
    const t = document.getElementById('rtbTime');
    if(t) t.textContent = formatCompactLive(seconds);
    return;
  }
  lastBannerKey = key;
  el.style.display = 'flex';
  el.className = 'running-timer-banner tier-' + tier;
  el.innerHTML = `
    <div class="rtb-left">
      <span class="rtb-pulse"></span>
      <div class="rtb-text">
        <div class="rtb-headline">${headline}</div>
        <div class="rtb-sub">${escapeHtml(s.name)} · ${escapeHtml(l.title)} · <span id="rtbTime">${formatCompactLive(seconds)}</span></div>
      </div>
    </div>
    <div class="rtb-actions">
      <button class="rtb-view-btn" onclick="openFocusMode('${runningRef.subjectId}','${runningRef.unitId}','${runningRef.lectureId}')">View</button>
      <button class="rtb-stop-btn" onclick="stopTimer()">⏸ Stop</button>
    </div>
  `;
}

function computeCurrentStreak(){
  const now = new Date();
  let streak = 0;
  for(let d=0; d<365; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    const seconds = (key===todayKey(now)) ? getTodaySnapshot().total : ((data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0);
    if(seconds>0) streak++;
    else break;
  }
  return streak;
}

function computeSubjectStreak(subjectId){
  const now = new Date();
  const todayK = todayKey(now);
  const todaySnap = getTodaySnapshot();
  let streak = 0;
  for(let d=0; d<365; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    const seconds = (key===todayK)
      ? (todaySnap.bySubject[subjectId] || 0)
      : ((data.dailyLog && data.dailyLog[key] && data.dailyLog[key].bySubject) ? (data.dailyLog[key].bySubject[subjectId] || 0) : 0);
    if(seconds>0) streak++;
    else break;
  }
  return streak;
}

function scrollToLayout(){
  const el = document.querySelector('.layout');
  if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
}

function selectAndScroll(subjectId){
  jumpToSubject(subjectId);
}

function jumpToSubject(subjectId){
  activeSubjectId = subjectId;
  subjectPageOpen = true;
  renderAll();
  if(typeof closeSubjectsDrawer === 'function') closeSubjectsDrawer();
  if(typeof mascotOnSubjectOpen === 'function') mascotOnSubjectOpen(subjectId);
  document.body.classList.add('subject-page-active');
  // scroll the full-page shell into view on mobile after it is laid out
  setTimeout(()=>{
    const el = document.querySelector('#main .sd-header');
    if(el){
      el.classList.add('jump-highlight');
      setTimeout(()=>el.classList.remove('jump-highlight'), 1600);
    }
  }, 120);
}

// Returns from the full-screen subject page to the dashboard/main app.
function exitSubjectPage(){
  subjectPageOpen = false;
  document.body.classList.remove('subject-page-active');
  activeSubjectId = null;
  renderAll();
  window.scrollTo({top:0, behavior:'auto'});
  if(typeof closeSubjectsDrawer === 'function') closeSubjectsDrawer();
}

function renderDashQuickGrid(){
  const el = document.getElementById('dashQuickGrid');
  if(!el) return;
  const subjectCount = data.subjects.length;
  const testCount = data.subjects.reduce((a,s)=> a + s.units.reduce((b,u)=> b + (u.tests?u.tests.length:0), 0), 0);
  const streak = computeCurrentStreak();
  const planTodayCount = ppList(ppTodayKey()).filter(i=>!i.done).length;
  const planTomorrowCount = ppList(ppTomorrowKey()).filter(i=>!i.done).length;
  el.innerHTML = `
    <div class="dash-quick-tile" onclick="openSubjectsDrawer()">
      <div class="dash-quick-icon" style="background:var(--violet-soft);">📚</div>
      <div class="dash-quick-title">My Subjects</div>
      <div class="dash-quick-sub">${subjectCount} tracked</div>
    </div>
    <div class="dash-quick-tile" onclick="openSubjectsDrawer()">
      <div class="dash-quick-icon" style="background:var(--rose-soft);">📝</div>
      <div class="dash-quick-title">Tests Logged</div>
      <div class="dash-quick-sub">${testCount} total</div>
    </div>
    <div class="dash-quick-tile" onclick="openProgressSlide()">
      <div class="dash-quick-icon" style="background:#dff3ef;">📊</div>
      <div class="dash-quick-title">Analytics</div>
      <div class="dash-quick-sub">View progress</div>
    </div>
    <div class="dash-quick-tile" onclick="openProgressSlide()">
      <div class="dash-quick-icon" style="background:#fbf1de;">🔥</div>
      <div class="dash-quick-title">Streak</div>
      <div class="dash-quick-sub">${streak} day${streak===1?'':'s'}</div>
    </div>
    <div class="dash-quick-tile" onclick="openPriorityPlanner()">
      <div class="dash-quick-icon" style="background:#fde4e1;">🎯</div>
      <div class="dash-quick-title">Priorities</div>
      <div class="dash-quick-sub">${planTodayCount} today · ${planTomorrowCount} tmrw</div>
    </div>
  `;
}

function subjectRecencyScore(s){
  let dateKey = '';
  if(data.dailyLog){
    for(const key in data.dailyLog){
      const entry = data.dailyLog[key];
      if(entry && entry.bySubject && entry.bySubject[s.id] > 0 && key > dateKey) dateKey = key;
    }
  }
  let maxCompletedAt = 0;
  (s.units||[]).forEach(u=>(u.lectures||[]).forEach(l=>{
    if(l.completedAt && l.completedAt > maxCompletedAt) maxCompletedAt = l.completedAt;
  }));
  return { dateKey, maxCompletedAt };
}
function subjectsByRecency(){
  return data.subjects.slice().sort((a,b)=>{
    const ra = subjectRecencyScore(a), rb = subjectRecencyScore(b);
    if(ra.dateKey > rb.dateKey) return -1;
    if(ra.dateKey < rb.dateKey) return 1;
    return rb.maxCompletedAt - ra.maxCompletedAt;
  });
}
function renderDashCourses(){
  const el = document.getElementById('dashCourses');
  if(!el) return;
  if(!data.subjects.length){
    el.innerHTML = `<div class="dash-courses-empty">Add a subject to see it here.</div>`;
    return;
  }
  // Most recently studied subject first, so "Ongoing Subjects" tracks what
  // you're actually working through right now instead of creation order.
  const ordered = subjectsByRecency();
  el.innerHTML = ordered.map((s)=>{
    const globalIdx = Math.max(0, data.subjects.findIndex(x=>x.id===s.id));
    const color = SUBJECT_GRAPH_COLORS[globalIdx % SUBJECT_GRAPH_COLORS.length];
    const c = countLectures(s);
    const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
    let nextLecture = null;
    for(const u of (Array.isArray(s.units) ? s.units : [])){
      const l = (u && Array.isArray(u.lectures) ? u.lectures : []).find(x=>x && !x.completed);
      if(l){ nextLecture = l; break; }
    }
    const nextLabel = nextLecture ? `Next: ${escapeHtml(nextLecture.title)}` : (c.total ? 'All done! 🎉' : 'No lectures yet');
    const thumbStyle = s.image
      ? `background-image:url('${s.image}'); background-size:cover; background-position:center;`
      : `background:linear-gradient(135deg, ${color}, ${color}99);`;
    return `<div class="dash-course-card" onclick="selectAndScroll('${s.id}')">
      <div class="dash-course-thumb" style="${thumbStyle}">
        <div class="dash-course-thumb-overlay"></div>
        <input type="file" accept="image/*" id="subjectImgInput-${s.id}" style="display:none" onchange="handleSubjectImage(event,'${s.id}')">
        <div class="dash-course-edit-wrap">
          <button class="dash-course-edit-btn" title="Edit cover image" onclick="event.stopPropagation(); toggleCoverMenu('${s.id}')">✎</button>
          <div class="dash-course-edit-menu" id="coverMenu-${s.id}">
            <button onclick="event.stopPropagation(); closeCoverMenus(); document.getElementById('subjectImgInput-${s.id}').click()">🖼️ ${s.image?'Change image':'Add image'}</button>
            ${s.image ? `<button class="danger" onclick="event.stopPropagation(); closeCoverMenus(); removeSubjectImage('${s.id}')">🗑️ Remove image</button>` : ''}
          </div>
        </div>
        <span class="dash-course-pct">${pct}% Complete</span>
        <span class="dash-course-thumb-label">${escapeHtml(s.name)}</span>
      </div>
      <div class="dash-course-body">
        <div class="dash-course-name">${escapeHtml(s.name)}</div>
        <div class="dash-course-meta">${c.done}/${c.total} lectures · ${formatHuman(subjectSeconds(s))}</div>
        <div class="dash-course-progress-track"><div class="dash-course-progress-fill" style="width:${pct}%; background:${color};"></div></div>
        <div class="dash-course-footer">
          <span class="dash-course-next">🕒 ${nextLabel}</span>
          <button class="dash-resume-btn" onclick="event.stopPropagation(); resumeSubject('${s.id}')">▶ Resume</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function toggleCoverMenu(subjectId){
  const menu = document.getElementById('coverMenu-'+subjectId);
  if(!menu) return;
  const wrap = menu.closest('.dash-course-edit-wrap');
  const isOpen = wrap.classList.contains('menu-open');
  closeCoverMenus();
  if(!isOpen) wrap.classList.add('menu-open');
}

function closeCoverMenus(){
  document.querySelectorAll('.dash-course-edit-wrap.menu-open').forEach(w=>w.classList.remove('menu-open'));
}

document.addEventListener('click', (e)=>{
  if(!e.target.closest('.dash-course-edit-wrap')) closeCoverMenus();
});

function handleSubjectImage(event, subjectId){
  const file = event.target.files[0];
  event.target.value = ''; // allow picking the same file again later
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Please pick an image file'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = async () => {
      // Auto-resize + center-crop to a fixed 16:9 thumbnail so any photo fits cleanly.
      const targetW = 400, targetH = 225;
      const canvas = document.createElement('canvas');
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(targetW/img.width, targetH/img.height);
      const w = img.width*scale, h = img.height*scale;
      const x = (targetW-w)/2, y = (targetH-h)/2;
      ctx.drawImage(img, x, y, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const s = data.subjects.find(x=>x.id===subjectId);
      if(!s) return;
      s.image = dataUrl;
      renderAll();
      saveData();
      showToast('Cover image added 🖼️');
    };
    img.onerror = () => showToast('Could not read that image');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function removeSubjectImage(subjectId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  s.image = null;
  renderAll();
  saveData();
}

function handleFolderImage(event, folderId){
  const file = event.target.files[0];
  event.target.value = '';
  if(!file) return;
  if(!file.type.startsWith('image/')){ showToast('Please pick an image file'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      // Same auto-resize + center-crop treatment as subject covers, just a
      // slightly shorter aspect ratio since folder tiles are more compact.
      const targetW = 320, targetH = 160;
      const canvas = document.createElement('canvas');
      canvas.width = targetW; canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(targetW/img.width, targetH/img.height);
      const w = img.width*scale, h = img.height*scale;
      const x = (targetW-w)/2, y = (targetH-h)/2;
      ctx.drawImage(img, x, y, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      const f = getFolder(folderId);
      if(!f) return;
      f.image = dataUrl;
      renderSidebar();
      renderFolderCard();
      saveData();
      showToast('Folder image added 🖼️');
    };
    img.onerror = () => showToast('Could not read that image');
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function removeFolderImage(folderId){
  const f = getFolder(folderId);
  if(!f) return;
  f.image = null;
  renderSidebar();
  renderFolderCard();
  saveData();
}
function toggleFolderCoverMenu(folderId){
  const menu = document.getElementById('folderCoverMenu-'+folderId);
  if(!menu) return;
  const isOpen = menu.classList.contains('show');
  closeFolderCoverMenus();
  if(!isOpen) menu.classList.add('show');
}
function closeFolderCoverMenus(){
  document.querySelectorAll('.pp-folder-tile-edit-menu.show').forEach(m=>m.classList.remove('show'));
}
document.addEventListener('click', (e)=>{
  if(!e.target.closest('.pp-folder-tile-edit-wrap')) closeFolderCoverMenus();
});

function resumeSubject(subjectId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const units = Array.isArray(s.units) ? s.units : [];
  for(const u of units){
    const l = (u && Array.isArray(u.lectures) ? u.lectures : []).find(x=>x && !x.completed);
    if(l){ openFocusMode(subjectId, u.id, l.id); return; }
  }
  if(units.length){
    jumpToUnit(subjectId, s.units[s.units.length-1].id);
    showToast(`${s.name} is fully complete! 🎉`);
  } else {
    selectAndScroll(subjectId);
  }
}

function renderDashPriority(){
  const block = document.getElementById('dashPriorityBlock');
  const el = document.getElementById('dashPriority');
  if(!block || !el) return;

  const todayItems = ppList(ppTodayKey());
  const items = [];
  todayItems.forEach(item=>{
    if(!item.link) return;
    const s = data.subjects.find(x=>x.id===item.link.subjectId);
    const u = s && s.units.find(x=>x.id===item.link.unitId);
    const l = u && u.lectures.find(x=>x.id===item.link.lectureId);
    if(l) items.push({ s, u, l });
  });

  if(!items.length){
    block.style.display = 'none';
    return;
  }
  block.style.display = '';

  // Keeps the exact order set in the planner (that's the whole point of the
  // up/down arrows there) rather than re-sorting by completion here.
  el.innerHTML = items.map(({s,u,l})=>{
    const icon = l.completed ? mythicalCheckGlyph(l.id+'-dash') : lectureIconChar(l);
    return `<div class="dash-priority-row ${l.completed?'is-done':''}" onclick="jumpToLecture('${s.id}','${u.id}','${l.id}')">
      <span class="dash-priority-icon">${icon}</span>
      <div class="dash-priority-info">
        <div class="dash-priority-name">${escapeHtml(l.title)}</div>
        <div class="dash-priority-sub">${escapeHtml(s.name)} · ${escapeHtml(u.name)}</div>
      </div>
      <span class="dash-priority-pill">${l.completed ? 'Done' : 'Pending'}</span>
    </div>`;
  }).join('');
}

function renderDashDeadlines(){
  const el = document.getElementById('dashDeadlines');
  if(!el) return;
  const rows = data.subjects
    .map((s,i)=>({s, color: SUBJECT_GRAPH_COLORS[i % SUBJECT_GRAPH_COLORS.length], pacing: examPacing(s)}))
    .filter(r=>r.pacing);
  if(!rows.length){
    el.innerHTML = `<div class="dash-deadlines-empty">No exam dates set yet — open a subject and tap "📅 Set exam date" to see it here.</div>`;
    return;
  }
  rows.sort((a,b)=>a.pacing.daysLeft-b.pacing.daysLeft);
  el.innerHTML = rows.map(({s,color,pacing})=>{
    let urgency='ok', label='';
    if(pacing.daysLeft<0){ urgency='past'; label='Past'; }
    else if(pacing.daysLeft===0){ urgency='critical'; label='Today'; }
    else if(pacing.daysLeft<=3){ urgency='critical'; label=`${pacing.daysLeft}d left`; }
    else if(pacing.daysLeft<=7){ urgency='warn'; label=`${pacing.daysLeft}d left`; }
    else { label=`${pacing.daysLeft}d left`; }
    const dateLabel = new Date(pacing.examDate+'T00:00:00').toLocaleDateString(undefined,{month:'short', day:'numeric', year:'numeric'});
    return `<div class="dash-deadline-row" onclick="selectAndScroll('${s.id}')">
      <span class="dash-deadline-dot" style="${shinyDotStyle(color)}"></span>
      <div class="dash-deadline-info">
        <div class="dash-deadline-name">${escapeHtml(s.name)}</div>
        <div class="dash-deadline-sub">Exam · ${dateLabel} · ${pacing.remaining} lecture${pacing.remaining===1?'':'s'} left</div>
      </div>
      <span class="dash-deadline-pill ${urgency}">${label}</span>
    </div>`;
  }).join('');
}

function renderRevisionPanel(){
  const panel = document.getElementById('revisionPanel');
  const weak = getWeakUnits();
  if(!weak.length){
    panel.innerHTML = '';
    return;
  }
  panel.innerHTML = `
    <div class="revision-card">
      <div class="revision-title">📌 Needs revision</div>
      <div class="revision-list">
        ${weak.map(w=>{
          const cls = w.avg<50 ? 'critical' : 'warn';
          return `<div class="revision-item" onclick="jumpToUnit('${w.subjectId}','${w.unitId}')">
            <div>
              <div class="revision-item-name">${escapeHtml(w.unitName)}</div>
              <div class="revision-item-sub">${escapeHtml(w.subjectName)} · ${w.count} test${w.count>1?'s':''}</div>
            </div>
            <span class="revision-score ${cls}">${Math.round(w.avg)}% avg</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function jumpToLecture(subjectId, unitId, lectureId){
  activeSubjectId = subjectId;
  subjectPageOpen = true;
  document.body.classList.add('subject-page-active');
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s.units.find(x=>x.id===unitId);
  if(u) u.open = true;
  renderAll();
  if(typeof mascotOnTopicOpen === 'function') mascotOnTopicOpen(subjectId, unitId, lectureId);
  setTimeout(()=>{
    const el = document.getElementById('lecture-'+lectureId);
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('jump-highlight');
      setTimeout(()=>el.classList.remove('jump-highlight'), 1600);
    }
  }, 80);
}

function jumpToUnit(subjectId, unitId){
  activeSubjectId = subjectId;
  subjectPageOpen = true;
  document.body.classList.add('subject-page-active');
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s.units.find(x=>x.id===unitId);
  if(u) u.open = true;
  renderAll();
  if(typeof mascotOnSubjectOpen === 'function') mascotOnSubjectOpen(subjectId);
  setTimeout(()=>{
    const el = document.querySelector(`.unit[data-unit="${unitId}"]`);
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('jump-highlight');
      setTimeout(()=>el.classList.remove('jump-highlight'), 1600);
    }
  }, 80);
}

function dayLevel(seconds){
  const hours = seconds/3600;
  if(seconds<=0) return 0;
  if(hours<1) return 1;
  if(hours<3) return 2;
  if(hours<5) return 3;
  return 4;
}

const CAL_SUBJECT_COLORS = SUBJECT_GRAPH_COLORS;

function renderCalendar(){
  const grid = document.getElementById('calendarGrid');
  const now = new Date();
  const todayK = todayKey(now);

  // Find this week's Monday, then step back 4 more full weeks so
  // columns line up as real calendar weeks (Mon → Sun).
  const dow = now.getDay(); // 0=Sun..6=Sat
  const mondayOffset = (dow === 0) ? -6 : 1 - dow;
  const thisMonday = new Date(now);
  thisMonday.setDate(thisMonday.getDate() + mondayOffset);
  const gridStart = new Date(thisMonday);
  gridStart.setDate(gridStart.getDate() - 28);

  const todaySnap = getTodaySnapshot();
  let cellIndex = 0;
  let html = '';
  let weekLabelsHtml = '';
  for(let w=0; w<5; w++){
    const weekMon = new Date(gridStart);
    weekMon.setDate(weekMon.getDate() + w*7);
    const isCurrentWeek = (w === 4);
    const label = isCurrentWeek ? 'This week' : weekMon.toLocaleDateString(undefined, {month:'short', day:'numeric'});
    weekLabelsHtml += `<span class="${isCurrentWeek ? 'is-current' : ''}" title="Week of ${weekMon.toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}">${label}</span>`;
    for(let d=0; d<7; d++){
      const day = new Date(gridStart);
      day.setDate(day.getDate() + w*7 + d);
      const key = todayKey(day);
      const isFuture = day > now && key !== todayK;
      if(isFuture){
        const plannedCount = getPlannedLecturesForDate(key).length;
        const planClass = plannedCount ? ' has-plan' : '';
        const countHtml = plannedCount ? `<span class="cpp-count">${plannedCount}</span>` : '';
        html += `<div class="cal-cell is-future${planClass}" data-date="${key}" onclick="showCalPlanPopover(event,'${key}')" title="Plan lectures for this day">${countHtml}</div>`;
        continue;
      }
      const seconds = (key === todayK) ? todaySnap.total : ((data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0);
      const level = dayLevel(seconds);
      const todayClass = (key===todayK) ? ' is-today' : '';
      const runningClass = (key===todayK && runningRef) ? ' is-running' : '';
      const delay = (cellIndex * 12).toFixed(0);
      cellIndex++;
      html += `<div class="cal-cell level-${level}${todayClass}${runningClass}" style="animation-delay:${delay}ms" data-date="${key}" onmouseenter="showCalTooltip(event,'${key}')" onmouseleave="hideCalTooltip()" onclick="showCalTooltip(event,'${key}',true)"></div>`;
    }
  }
  grid.innerHTML = html;
  document.getElementById('calWeekLabels').innerHTML = weekLabelsHtml;
}

let calTooltipPinned = false;
function showCalTooltip(evt, key, pin){
  if(pin){ calTooltipPinned = !calTooltipPinned; if(!calTooltipPinned){ hideCalTooltip(); return; } }
  else if(calTooltipPinned){ return; }

  const tip = document.getElementById('calTooltip');
  const now = new Date();
  const [y,m,d] = key.split('-').map(Number);
  const dateObj = new Date(y, m-1, d);
  const label = dateObj.toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  const isToday = key === todayKey(now);
  const entry = isToday ? getTodaySnapshot() : ((data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key] : {total:0, bySubject:{}});
  const total = entry.total || 0;

  let rowsHtml = '';
  if(total > 0){
    const bySubject = entry.bySubject || {};
    const rows = data.subjects
      .map((s,i)=>({name:s.name, seconds: bySubject[s.id]||0, color: CAL_SUBJECT_COLORS[i % CAL_SUBJECT_COLORS.length]}))
      .filter(r=>r.seconds>0)
      .sort((a,b)=>b.seconds-a.seconds)
      .slice(0,5);
    rowsHtml = rows.map(r=>`<div class="ct-row"><span class="ct-dot" style="${shinyDotStyle(r.color)}"></span><span class="ct-name">${escapeHtml(r.name)}</span><span class="ct-time">${formatHuman(r.seconds)}</span></div>`).join('');
  } else {
    rowsHtml = `<div class="ct-empty">No study logged</div>`;
  }

  tip.innerHTML = `<div class="ct-date">${label}${isToday ? ' · Today' : ''}</div><div class="ct-total">${total>0 ? formatHuman(total)+' total' : '—'}</div>${rowsHtml}`;
  tip.classList.add('show');

  const cellRect = evt.currentTarget.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = cellRect.left + cellRect.width/2 - tipRect.width/2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  let top = cellRect.top - tipRect.height - 10;
  if(top < 8) top = cellRect.bottom + 10;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}

function hideCalTooltip(){
  if(calTooltipPinned) return;
  const tip = document.getElementById('calTooltip');
  tip.classList.remove('show');
}

document.addEventListener('click', (e)=>{
  if(calTooltipPinned && !e.target.closest('.cal-cell') && !e.target.closest('.cal-tooltip')){
    calTooltipPinned = false;
    hideCalTooltip();
  }
});
