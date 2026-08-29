// Dashboard
// ---------------- DASHBOARD ----------------
let replicaFilter = 'all';
let replicaClockHandle = null;
function setReplicaFilter(filter, btn){
  replicaFilter = filter;
  document.querySelectorAll('.rs-tab').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  renderDashCourses();
}
function toggleReplicaFilterMenu(e){
  if(e) e.stopPropagation();
  // simple sort toggle: tap filter to cycle All -> Progress -> Completed
  const order = ['all','progress','completed'];
  const idx = order.indexOf(replicaFilter);
  const next = order[(idx+1)%order.length];
  const btn = document.querySelector(`.rs-tab[data-filter="${next}"]`);
  setReplicaFilter(next, btn);
  showToast(next==='all' ? 'Showing all subjects' : next==='progress' ? 'In Progress filter' : 'Completed filter');
}

function replicaGreetingText(){
  const h = new Date().getHours();
  if(h < 12) return 'Good morning';
  if(h < 17) return 'Good afternoon';
  return 'Good evening';
}
function renderReplicaGreeting(){
  const el = document.getElementById('replicaGreeting');
  if(!el) return;
  let name = 'Deepansu';
  try{
    const stored = localStorage.getItem('studyUserName');
    if(stored && stored.trim()) name = stored.trim();
    else if(data && data.userName && data.userName.trim()) name = data.userName.trim();
    else if(typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.displayName) name = firebase.auth().currentUser.displayName;
  }catch(e){}
  // keep first name only
  name = name.split(' ')[0];
  el.innerHTML = `${replicaGreetingText()}, ${escapeHtml(name)}! <span class="rg-wave">👋</span>`;
}
function renderReplicaClock(){
  const dayEl = document.getElementById('rcDay');
  const dateEl = document.getElementById('rcDate');
  const segsEl = document.getElementById('rcTimeSegs');
  if(!dayEl || !dateEl || !segsEl) return;
  const now = new Date();
  const dayName = now.toLocaleDateString(undefined,{weekday:'long'});
  const dateStr = now.toLocaleDateString(undefined,{day:'2-digit', month:'short', year:'numeric'});
  dayEl.textContent = dayName;
  dateEl.textContent = dateStr;
  const hh = String(now.getHours()).padStart(2,'0');
  const mm = String(now.getMinutes()).padStart(2,'0');
  const ss = String(now.getSeconds()).padStart(2,'0');
  segsEl.innerHTML = `<span class="rc-seg">${hh}</span><span class="rc-colon">:</span><span class="rc-seg">${mm}</span><span class="rc-colon">:</span><span class="rc-seg">${ss}</span>`;
}
function startReplicaClock(){
  renderReplicaClock();
  renderReplicaGreeting();
  if(replicaClockHandle) clearInterval(replicaClockHandle);
  replicaClockHandle = setInterval(()=>{ renderReplicaClock(); }, 1000);
  // refresh greeting every minute in case hour flips
  setInterval(()=>renderReplicaGreeting(), 60000);
}
function renderReplicaStats(){
  const wrap = document.getElementById('replicaStats');
  if(!wrap) return;
  let total=0, done=0;
  data.subjects.forEach(s=>{ const c = countLectures(s); total+=c.total; done+=c.done; });
  const pct = total ? Math.round((done/total)*100) : 0;
  const totalSec = data.subjects.reduce((a,s)=>a+subjectSeconds(s), 0);
  const streak = typeof computeCurrentStreak === 'function' ? computeCurrentStreak() : 0;

  // ring for overall progress
  const ringSize=64, ringStroke=7, r=(ringSize-ringStroke)/2, C=2*Math.PI*r, off=C - (pct/100)*C;
  const ringHtml = `<div class="rs-ring-wrap"><svg width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}"><circle cx="${ringSize/2}" cy="${ringSize/2}" r="${r}" fill="none" stroke="#eeeaff" stroke-width="${ringStroke}"/><circle cx="${ringSize/2}" cy="${ringSize/2}" r="${r}" fill="none" stroke="#7c5cff" stroke-width="${ringStroke}" stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 ${ringSize/2} ${ringSize/2})" style="transition:stroke-dashoffset .9s ease"/></svg><div class="rs-ring-label">${pct}%</div></div>`;

  // bar chart for topics completed (spark bars)
  const barLevels = [3,7,4,9,5,2,8,6];
  const barsHtml = `<div class="rs-bars">${barLevels.map((h,i)=>`<div class="rs-bar ${i<4?'active':''}" style="height:${6+h*3}px"></div>`).join('')}</div>`;

  // wavy line svg for total studied
  const waveSvg = `<div class="rs-wave"><svg viewBox="0 0 100 18" preserveAspectRatio="none"><path d="M0 12 Q10 4 20 12 T40 9 T60 14 T80 6 T100 12" fill="none" stroke="#9b7fe0" stroke-width="1.8" stroke-linecap="round" opacity="0.9"/></svg></div>`;

  // dots for streak
  const dotsHtml = `<div class="rs-dots">${Array.from({length:7}).map(()=>`<span class="rs-dot"></span>`).join('')}</div>`;

  wrap.innerHTML = `
    <div class="rs-card" onclick="openProgressSlide()" title="View analytics" style="cursor:pointer;">
      <div class="rs-top"><span class="rs-ic">◯</span> Overall Progress</div>
      <div class="rs-main">${ringHtml}<div class="rs-sub">Keep it up! 🚀</div></div>
    </div>
    <div class="rs-card" onclick="openProgressSlide()" title="View analytics" style="cursor:pointer;">
      <div class="rs-top"><span class="rs-ic">🕒</span> Total Studied</div>
      <div class="rs-main"><div class="rs-value">${formatHuman(totalSec)}</div><div class="rs-sub">This semester</div>${waveSvg}</div>
    </div>
    <div class="rs-card" onclick="openProgressSlide()" title="View analytics" style="cursor:pointer;">
      <div class="rs-top"><span class="rs-ic">✓</span> Topics Completed</div>
      <div class="rs-main"><div class="rs-value">${done} <small>/ ${total||0}</small></div><div class="rs-sub">Across all subjects</div>${barsHtml}</div>
    </div>
    <div class="rs-card" onclick="openProgressSlide()" title="View analytics" style="cursor:pointer;">
      <div class="rs-top"><span class="rs-ic">🔥</span> Study Streak</div>
      <div class="rs-main"><div class="rs-value">${streak}</div><div class="rs-sub">Days in a row</div>${dotsHtml}</div>
    </div>
  `;
  // update legacy hidden badge too if exists
  const pctEl = document.getElementById('percentBadge');
  if(pctEl) pctEl.textContent = pct+'%';
}

function renderDashboard(){
  renderRunningBanner();
  renderDashQuickGrid();
  renderDashPriority();
  renderDashCourses();
  renderDashDeadlines();
  renderReplicaStats();
  renderReplicaGreeting();
}

function renderRunningBanner(){
  const el = document.getElementById('runningTimerBanner');
  if(!el) return;
  if(!runningRef){ el.style.display = 'none'; el.innerHTML = ''; return; }
  const l = getLecture(runningRef.subjectId, runningRef.unitId, runningRef.lectureId);
  const s = data.subjects.find(x=>x.id===runningRef.subjectId);
  if(!l || !s){ el.style.display = 'none'; return; }

  const seconds = liveLectureSeconds(l);
  let tier = 'normal', headline = '⏱ Timer running';
  if(seconds >= 4*3600){ tier = 'alert'; headline = '🚨 Still running — did you forget to stop it?'; }
  else if(seconds >= 2*3600){ tier = 'warn'; headline = '⚠️ Still running for a while — check if you forgot to stop it'; }

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
  renderAll();
  if(typeof closeSubjectsDrawer === 'function') closeSubjectsDrawer();
  if(typeof mascotOnSubjectOpen === 'function') mascotOnSubjectOpen(subjectId);
  setTimeout(()=>{
    const el = document.querySelector('#main .sd-header');
    if(el){
      el.scrollIntoView({behavior:'smooth', block:'start'});
      el.classList.add('jump-highlight');
      setTimeout(()=>el.classList.remove('jump-highlight'), 1600);
    }
  }, 80);
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
    el.innerHTML = `<div class="rsc-empty">No subjects yet — tap <b>+ New Subject</b> to create your first course.</div>`;
    return;
  }
  const PALETTE = [
    {bar:'#7c5cff', pillBg:'#ece8ff', pillColor:'#7c5cff', arrowBg:'#f2eeff', arrowColor:'#7c5cff'},
    {bar:'#ff8c2e', pillBg:'#fff1e6', pillColor:'#ff8c2e', arrowBg:'#fff4eb', arrowColor:'#ff8c2e'},
    {bar:'#14b8a6', pillBg:'#e6f6f3', pillColor:'#14b8a6', arrowBg:'#e9f6f4', arrowColor:'#14b8a6'},
    {bar:'#22c55e', pillBg:'#eaf7ec', pillColor:'#22c55e', arrowBg:'#eef8f0', arrowColor:'#22c55e'},
  ];
  let ordered = subjectsByRecency();
  // filter via top tabs
  if(replicaFilter==='completed') ordered = ordered.filter(s=>{ const c=countLectures(s); const pct=c.total?Math.round((c.done/c.total)*100):0; return c.total>0 && pct===100; });
  else if(replicaFilter==='progress') ordered = ordered.filter(s=>{ const c=countLectures(s); const pct=c.total?Math.round((c.done/c.total)*100):0; return pct<100; });
  if(!ordered.length){
    el.innerHTML = `<div class="rsc-empty">No subjects in this filter.</div>`;
    return;
  }
  el.innerHTML = ordered.map((s, i)=>{
    const globalIdx = Math.max(0, data.subjects.findIndex(x=>x.id===s.id));
    const pal = PALETTE[globalIdx % PALETTE.length];
    const c = countLectures(s);
    const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
    const time = formatHuman(subjectSeconds(s));
    let nextTitle = null;
    for(const u of s.units){ const l = u.lectures.find(x=>!x.completed); if(l){ nextTitle = l.title; break; } }
    const nextLabel = nextTitle ? escapeHtml(nextTitle) : (c.total ? 'All done! 🎉' : 'No topics yet');
    const folder = (typeof getFolder==='function' && s.folderId) ? getFolder(s.folderId) : null;
    let pillText = folder ? folder.name : 'SEM III';
    if(pillText.toLowerCase().includes('semester')) pillText = 'SEM III';
    else pillText = pillText.toUpperCase().slice(0,12);
    const thumbStyle = s.image
      ? `background-image:url('${s.image}'); background-size:cover; background-position:center;`
      : `background:linear-gradient(135deg, ${pal.bar} 0%, ${pal.bar}cc 100%);`;
    const thumbInner = s.image ? '' : `<span style="font-size:28px; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.18));">${escapeHtml((s.name||'')[0]||'📘')}</span>`;
    return `<div class="rsc-card" onclick="selectAndScroll('${s.id}')" style="animation-delay:${i*0.05}s">
      <div class="rsc-thumb" style="${thumbStyle}">${thumbInner}
        <input type="file" accept="image/*" id="subjectImgInput-${s.id}" style="display:none" onchange="handleSubjectImage(event,'${s.id}')">
        <div class="dash-course-edit-wrap" style="position:absolute; top:8px; left:8px; z-index:2;">
          <button class="dash-course-edit-btn" title="Edit cover" onclick="event.stopPropagation(); toggleCoverMenu('${s.id}')">✎</button>
          <div class="dash-course-edit-menu" id="coverMenu-${s.id}">
            <button onclick="event.stopPropagation(); closeCoverMenus(); openEditSubject('${s.id}')">✎ Rename subject</button>
            <button onclick="event.stopPropagation(); closeCoverMenus(); document.getElementById('subjectImgInput-${s.id}').click()">🖼️ ${s.image?'Change image':'Add image'}</button>
            ${s.image ? `<button class="danger" onclick="event.stopPropagation(); closeCoverMenus(); removeSubjectImage('${s.id}')">🗑️ Remove image</button>` : ''}
          </div>
        </div>
      </div>
      <div class="rsc-body">
        <div class="rsc-top">
          <span class="rsc-pill" style="background:${pal.pillBg}; color:${pal.pillColor};">${escapeHtml(pillText)}</span>
          <div class="ds-menu-wrap" onclick="event.stopPropagation()" style="margin-left:auto;">
            <button class="rsc-menu" title="Options" onclick="toggleSubjectMenu('${s.id}')">⋮</button>
            <div class="ds-subject-menu" id="subjectMenu-${s.id}">
              <button type="button" onclick="closeSubjectMenus(); openEditSubject('${s.id}')">✎ Rename subject</button>
              <button type="button" class="danger" onclick="closeSubjectMenus(); deleteSubject('${s.id}')">✕ Delete subject</button>
            </div>
          </div>
        </div>
        <div class="rsc-name" title="${escapeAttr(s.name)}">${escapeHtml(s.name)}</div>
        <div class="rsc-stats">
          <span class="rsc-stat"><span>≡</span> ${c.total} Topics</span>
          <span class="rsc-sep">|</span>
          <span class="rsc-stat"><span>✓</span> ${c.done} / ${c.total} Studied</span>
          <span class="rsc-sep">|</span>
          <span class="rsc-stat"><span>◷</span> ${time} Time</span>
        </div>
        <div class="rsc-bar-row">
          <div class="rsc-bar"><div class="rsc-bar-fill" style="width:${pct}%; background:${pal.bar};"></div></div>
          <span class="rsc-pct">${pct}%</span>
        </div>
        <div class="rsc-next">🎓 Next: ${nextLabel}</div>
      </div>
      <button class="rsc-arrow" style="background:${pal.arrowBg}; color:${pal.arrowColor}; border-color:${pal.arrowBg};" onclick="event.stopPropagation(); selectAndScroll('${s.id}')">→</button>
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
  for(const u of s.units){
    const l = u.lectures.find(x=>!x.completed);
    if(l){ openFocusMode(subjectId, u.id, l.id); return; }
  }
  if(s.units.length){
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
// replica live clock — start once DOM is ready
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', ()=>{ try{ startReplicaClock(); }catch(e){} });
else try{ startReplicaClock(); }catch(e){}
