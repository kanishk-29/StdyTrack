// Calendar "plan a day"
// ---------------- CALENDAR "PLAN A DAY" ----------------
// Lets you assign a specific future lecture to a specific upcoming day by
// clicking that day's (empty, dashed) cell in the commit-graph calendar.
// A lecture only ever holds one planned date at a time (l.plannedDate),
// which also drives the badge shown on the lecture row itself.
let calPlanKey = null;

function getPlannedLecturesForDate(key){
  if(!data || !data.subjects) return [];
  const out = [];
  data.subjects.forEach(s=>{
    (s.units||[]).forEach(u=>{
      (u.lectures||[]).forEach(l=>{
        if(l.plannedDate === key){
          out.push({ subjectId:s.id, unitId:u.id, lectureId:l.id, subjectName:s.name, title:l.title, completed:!!l.completed });
        }
      });
    });
  });
  return out;
}

function formatPlanDateShort(key){
  const [y,m,d] = key.split('-').map(Number);
  return new Date(y, m-1, d).toLocaleDateString(undefined, {month:'short', day:'numeric'});
}

function showCalPlanPopover(evt, key){
  if(calPlanKey === key){ hideCalPlanPopover(); return; }
  calPlanKey = key;
  renderCalPlanPopover();
  const pop = document.getElementById('calPlanPopover');
  pop.classList.add('show');
  positionCalPlanPopover(evt.currentTarget);
}

function positionCalPlanPopover(cellEl){
  const pop = document.getElementById('calPlanPopover');
  const cellRect = cellEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let left = cellRect.left + cellRect.width/2 - popRect.width/2;
  left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
  let top = cellRect.top - popRect.height - 10;
  if(top < 8) top = cellRect.bottom + 10;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function hideCalPlanPopover(){
  calPlanKey = null;
  document.getElementById('calPlanPopover').classList.remove('show');
}

function renderCalPlanPopover(){
  const key = calPlanKey;
  if(!key) return;
  const pop = document.getElementById('calPlanPopover');
  const [y,m,d] = key.split('-').map(Number);
  const label = new Date(y, m-1, d).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'});
  const items = getPlannedLecturesForDate(key);
  const listHtml = items.length
    ? items.map(it=>`
      <div class="cpp-item ${it.completed?'done':''}">
        <span class="cpp-item-text" title="${escapeAttr(it.subjectName+' — '+it.title)}">${escapeHtml(it.subjectName)} · ${escapeHtml(it.title)}</span>
        <button type="button" class="cpp-item-remove" onclick="unplanLecture('${it.subjectId}','${it.unitId}','${it.lectureId}')" title="Remove from plan">✕</button>
      </div>`).join('')
    : `<div class="cpp-empty">Nothing planned yet</div>`;
  pop.innerHTML = `
    <div class="cpp-date">${escapeHtml(label)}</div>
    <div class="cpp-list">${listHtml}</div>
    <button type="button" class="cpp-add-toggle" onclick="toggleCppPicker()">+ Plan a lecture</button>
    <div class="cpp-picker" id="cppPicker">
      <select id="cppSubject" onchange="populateCppLectures()"></select>
      <select id="cppLecture"></select>
      <button type="button" onclick="confirmAddPlan()">Add to plan</button>
    </div>
  `;
}

function toggleCppPicker(){
  const picker = document.getElementById('cppPicker');
  const willShow = picker.style.display !== 'flex';
  picker.style.display = willShow ? 'flex' : 'none';
  if(willShow) populateCppSubjects();
  const cell = document.querySelector(`.cal-cell[data-date="${calPlanKey}"]`);
  if(cell) positionCalPlanPopover(cell);
}

function populateCppSubjects(){
  const sel = document.getElementById('cppSubject');
  if(!sel) return;
  sel.innerHTML = data.subjects.length
    ? data.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
    : '<option value="">No subjects yet</option>';
  populateCppLectures();
}

function populateCppLectures(){
  const subjectSel = document.getElementById('cppSubject');
  const lecSel = document.getElementById('cppLecture');
  if(!subjectSel || !lecSel) return;
  const s = data.subjects.find(x=>x.id===subjectSel.value);
  if(!s){ lecSel.innerHTML = '<option value="">—</option>'; return; }
  const options = [];
  (s.units||[]).forEach(u=>{
    (u.lectures||[]).forEach(l=>{
      if(l.completed) return; // no point pre-planning a finished lecture
      const tag = l.plannedDate ? (l.plannedDate===calPlanKey ? ' (already here)' : ` (planned ${formatPlanDateShort(l.plannedDate)})`) : '';
      options.push(`<option value="${u.id}::${l.id}">${escapeHtml(u.name)} — ${escapeHtml(l.title)}${tag}</option>`);
    });
  });
  lecSel.innerHTML = options.length ? options.join('') : '<option value="">All lectures completed</option>';
}

function confirmAddPlan(){
  const subjectSel = document.getElementById('cppSubject');
  const lecSel = document.getElementById('cppLecture');
  const subjectId = subjectSel && subjectSel.value;
  const val = lecSel && lecSel.value;
  if(!subjectId || !val || !val.includes('::')) return;
  const [unitId, lectureId] = val.split('::');
  planLectureForDate(subjectId, unitId, lectureId, calPlanKey);
  document.getElementById('cppPicker').style.display = 'none';
  renderCalPlanPopover();
  const cell = document.querySelector(`.cal-cell[data-date="${calPlanKey}"]`);
  if(cell) positionCalPlanPopover(cell);
}

function planLectureForDate(subjectId, unitId, lectureId, key){
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s && s.units.find(x=>x.id===unitId);
  const l = u && u.lectures.find(x=>x.id===lectureId);
  if(!l) return;
  l.plannedDate = key;
  l.priority = true;
  // Keep this fully in sync with the Priority Planner's date-strip list —
  // planning a lecture from the calendar should show up there too.
  const already = ppList(key).some(i=>i.link && i.link.lectureId===lectureId);
  if(!already){
    ppList(key).push({ id: uid(), text: l.title, done: !!l.completed, link:{subjectId,unitId,lectureId}, estMinutes:null, level:'medium' });
  }
  saveData();
  renderCalendar();
  renderMain();
  if(currentView==='priority') renderPriorityPage();
  showToast('Planned for '+formatPlanDateShort(key)+' 📅');
}

function unplanLecture(subjectId, unitId, lectureId){
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s && s.units.find(x=>x.id===unitId);
  const l = u && u.lectures.find(x=>x.id===lectureId);
  if(!l) return;
  const key = l.plannedDate;
  delete l.plannedDate;
  l.priority = false;
  if(key && data.priorityPlanner && data.priorityPlanner.byDate[key]){
    data.priorityPlanner.byDate[key] = data.priorityPlanner.byDate[key].filter(i=>!(i.link && i.link.lectureId===lectureId));
  }
  saveData();
  renderCalendar();
  renderMain();
  renderCalPlanPopover();
  if(currentView==='priority') renderPriorityPage();
  showToast('Removed from plan');
}

document.addEventListener('click', (e)=>{
  if(calPlanKey && !e.target.closest('.cal-cell') && !e.target.closest('.cal-plan-popover')){
    hideCalPlanPopover();
  }
});

function subjectCardHtml(s, i){
  // Same square image-tile as the dashboard's "Ongoing Subjects" cards
  // (cover photo, edit/upload menu, progress bar, Resume button) — just
  // stacked in the drawer instead of scrolled horizontally, plus a folder
  // dropdown and delete control since this is also where subjects get filed.
  const globalIdx = Math.max(0, data.subjects.findIndex(x=>x.id===s.id));
  const color = SUBJECT_GRAPH_COLORS[globalIdx % SUBJECT_GRAPH_COLORS.length];
  const c = countLectures(s);
  const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
  let nextLecture = null;
  for(const u of s.units){
    const l = u.lectures.find(x=>!x.completed);
    if(l){ nextLecture = l; break; }
  }
  const nextLabel = nextLecture ? `Next: ${escapeHtml(nextLecture.title)}` : (c.total ? 'All done! 🎉' : 'No lectures yet');
  const thumbStyle = s.image
    ? `background-image:url('${s.image}'); background-size:cover; background-position:center;`
    : `background:linear-gradient(135deg, ${color}, ${color}99);`;
  return `<div class="dash-course-card subject-tile-card${s.id===activeSubjectId?' active':''}" style="animation-delay:${i*0.05}s" onclick="jumpToSubject('${s.id}')">
    <div class="dash-course-thumb" style="${thumbStyle}">
      <div class="dash-course-thumb-overlay"></div>
      <input type="file" accept="image/*" id="subjectImgInput-${s.id}" style="display:none" onchange="handleSubjectImage(event,'${s.id}')">
      <div class="dash-course-edit-wrap">
        <button class="dash-course-edit-btn" title="Edit cover image" onclick="event.stopPropagation(); toggleCoverMenu('${s.id}')">✎</button>
        <div class="dash-course-edit-menu" id="coverMenu-${s.id}">
          <button onclick="event.stopPropagation(); closeCoverMenus(); openEditSubject('${s.id}')">✎ Rename subject</button>
          <button onclick="event.stopPropagation(); closeCoverMenus(); document.getElementById('subjectImgInput-${s.id}').click()">🖼️ ${s.image?'Change image':'Add image'}</button>
          ${s.image ? `<button class="danger" onclick="event.stopPropagation(); closeCoverMenus(); removeSubjectImage('${s.id}')">🗑️ Remove image</button>` : ''}
        </div>
      </div>
      <button class="subject-del subject-del-tile" title="Delete subject" onclick="event.stopPropagation(); deleteSubject('${s.id}')">✕</button>
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
      <select class="subject-folder-select" onclick="event.stopPropagation()" onchange="reassignSubjectFolder('${s.id}', this.value, this)"></select>
    </div>
  </div>`;
}
function promptNewFolderFromDrawer(){
  const name = prompt('Name this folder (e.g. "Semester 3", "Personal Projects")');
  if(!name || !name.trim()) return;
  foldersEnsure();
  createFolder(name.trim());
  renderSidebar();
  renderFolderCard();
  showToast('Folder created 📁');
}
function drawerFolderTileHtml(folder, idx){
  const subs = subjectsInFolder(folder.id);
  const total = subs.reduce((a,s)=>a+countLectures(s).total,0);
  const done = subs.reduce((a,s)=>a+countLectures(s).done,0);
  const pct = total ? Math.round((done/total)*100) : 0;
  const totalSec = subs.reduce((a,s)=>a+subjectSeconds(s),0);
  const timeStr = totalSec ? formatHuman(totalSec) : '0m';
  const FOLDER_PALETTE = [
    {bar:'#7c5cff', pillBg:'#ece8ff', pillColor:'#7c5cff', arrowBg:'#f2eeff', arrowColor:'#7c5cff'},
    {bar:'#ff8c2e', pillBg:'#fff1e6', pillColor:'#ff8c2e', arrowBg:'#fff4eb', arrowColor:'#ff8c2e'},
    {bar:'#14b8a6', pillBg:'#e6f6f3', pillColor:'#14b8a6', arrowBg:'#e9f6f4', arrowColor:'#14b8a6'},
    {bar:'#22c55e', pillBg:'#eaf7ec', pillColor:'#22c55e', arrowBg:'#eef8f0', arrowColor:'#22c55e'},
  ];
  const pal = FOLDER_PALETTE[idx % FOLDER_PALETTE.length];
  const thumbStyle = folder.image
    ? `background-image:url('${folder.image}'); background-size:cover; background-position:center;`
    : `background:linear-gradient(135deg, ${pal.bar} 0%, ${pal.bar}cc 100%);`;
  const thumbInner = folder.image ? '' : `<span style="font-size:32px; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.15));">${folder.icon || '📁'}</span>`;
  const badgeText = subs.length ? `${subs.length} subject${subs.length===1?'':'s'}` : 'Empty';
  const statsHtml = total
    ? `<div class="drawer-folder-stats">
        <span class="drawer-folder-stat"><span class="drawer-folder-stat-ic">≡</span> ${total} Topics</span>
        <span class="drawer-folder-sep">|</span>
        <span class="drawer-folder-stat"><span class="drawer-folder-stat-ic">✓</span> ${done} / ${total} Studied</span>
        <span class="drawer-folder-sep">|</span>
        <span class="drawer-folder-stat"><span class="drawer-folder-stat-ic">◷</span> ${timeStr} Time</span>
      </div>`
    : `<div class="drawer-folder-no-topic">📁 No topics added yet</div>`;
  return `<div class="drawer-folder-tile${folder.image?' has-image':''}" onclick="activeFolderFilter='${folder.id}'; renderSidebar();">
    <div class="drawer-folder-img" style="${thumbStyle}">${thumbInner}
      <div class="pp-folder-tile-edit-wrap drawer-folder-edit-wrap">
        <input type="file" accept="image/*" id="folderImgInput-${folder.id}" style="display:none" onchange="handleFolderImage(event,'${folder.id}')">
        <button type="button" class="pp-folder-tile-edit" title="${folder.image?'Change image':'Add image'}" onclick="event.stopPropagation(); toggleFolderCoverMenu('${folder.id}')">🖼️</button>
        <div class="pp-folder-tile-edit-menu" id="folderCoverMenu-${folder.id}">
          <button type="button" onclick="event.stopPropagation(); closeFolderCoverMenus(); renameFolder('${folder.id}')">✎ Rename folder</button>
          <button type="button" onclick="event.stopPropagation(); closeFolderCoverMenus(); document.getElementById('folderImgInput-${folder.id}').click()">🖼️ ${folder.image?'Change image':'Add image'}</button>
          ${folder.image ? `<button type="button" class="danger" onclick="event.stopPropagation(); closeFolderCoverMenus(); removeFolderImage('${folder.id}')">🗑️ Remove image</button>` : ''}
        </div>
      </div>
    </div>
    <div class="drawer-folder-content">
      <div class="drawer-folder-head">
        <div class="drawer-folder-name">${escapeHtml(folder.name)}</div>
        <span class="drawer-folder-badge" style="background:${pal.pillBg}; color:${pal.pillColor};">${escapeHtml(badgeText)}</span>
      </div>
      <div class="drawer-folder-bar-row">
        <div class="drawer-folder-bar"><div class="drawer-folder-bar-fill" style="width:${pct}%; background:${pal.bar};"></div></div>
        <span class="drawer-folder-pct">${pct}%</span>
      </div>
      ${statsHtml}
    </div>
    <div class="drawer-folder-arrow"><span style="background:${pal.arrowBg}; color:${pal.arrowColor};">→</span></div>
  </div>`;
}
function drawerSubjectCardHtml(s, i){
  const globalIdx = Math.max(0, data.subjects.findIndex(x=>x.id===s.id));
  const units = Array.isArray(s.units) ? s.units : [];
  const c = countLectures(s);
  const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
  const time = formatHuman(subjectSeconds(s));
  const nextTitle = (() => {
    for(const u of units){
      const l = (Array.isArray(u.lectures) ? u.lectures : []).find(x=>!x.completed);
      if(l) return l.title;
    }
    return null;
  })();
  const nextLabel = nextTitle ? `Next: ${escapeHtml(nextTitle)}` : (c.total ? 'All done! 🎉' : 'No lectures yet');
  // Palette exactly matches reference: purple, orange, teal, green
  const PALETTE = [
    {bar:'#7c5cff', pillBg:'#ece8ff', pillColor:'#7c5cff', arrowBg:'#f2eeff', arrowColor:'#7c5cff'},
    {bar:'#ff8c2e', pillBg:'#fff1e6', pillColor:'#ff8c2e', arrowBg:'#fff4eb', arrowColor:'#ff8c2e'},
    {bar:'#14b8a6', pillBg:'#e6f6f3', pillColor:'#14b8a6', arrowBg:'#e9f6f4', arrowColor:'#14b8a6'},
    {bar:'#22c55e', pillBg:'#eaf7ec', pillColor:'#22c55e', arrowBg:'#eef8f0', arrowColor:'#22c55e'},
  ];
  const pal = PALETTE[globalIdx % PALETTE.length];
  const folder = (typeof getFolder==='function' && s.folderId) ? getFolder(s.folderId) : null;
  let pillText = folder ? folder.name : 'GENERAL';
  if(pillText.toLowerCase().includes('semester')) pillText = 'SEM III';
  else pillText = pillText.toUpperCase().slice(0,12);
  const iconLetter = (s.icon || s.name.charAt(0) || '📘');
  const thumbStyle = s.image
    ? `background-image:url('${s.image}'); background-size:cover; background-position:center;`
    : `background:linear-gradient(135deg, ${pal.bar} 0%, ${pal.bar}cc 100%);`;
  const thumbInner = s.image ? '' : `<span style="font-size:30px; filter:drop-shadow(0 2px 6px rgba(0,0,0,0.18));">${iconLetter}</span>`;
  // hidden folder select kept for JS but not visible — reference has no visible select
  return `<div class="ds-card${s.id===activeSubjectId?' active':''}" style="animation-delay:${i*0.05}s" onclick="jumpToSubject('${s.id}')">
    <div class="ds-thumb" style="${thumbStyle}">${thumbInner}
      <button class="ds-del subject-del" title="Delete subject" onclick="event.stopPropagation(); deleteSubject('${s.id}')">✕</button>
    </div>
    <div class="ds-body">
      <div class="ds-top">
        <span class="ds-pill" style="background:${pal.pillBg}; color:${pal.pillColor};">${escapeHtml(pillText)}</span>
        <div class="ds-menu-wrap" onclick="event.stopPropagation()">
          <button class="ds-menu" title="Options" onclick="toggleSubjectMenu('${s.id}')">⋮</button>
          <div class="ds-subject-menu" id="subjectMenu-${s.id}">
            <button type="button" onclick="closeSubjectMenus(); openEditSubject('${s.id}')">✎ Rename subject</button>
            <button type="button" class="danger" onclick="closeSubjectMenus(); deleteSubject('${s.id}')">✕ Delete subject</button>
          </div>
        </div>
      </div>
      <div class="ds-name" title="${escapeAttr(s.name)}">${escapeHtml(s.name)}</div>
      <div class="ds-stats">
        <span class="ds-stat"><span class="ds-stat-ic">≡</span> ${c.total} Topics</span>
        <span class="ds-sep">|</span>
        <span class="ds-stat"><span class="ds-stat-ic">✓</span> ${c.done} / ${c.total} Studied</span>
        <span class="ds-sep">|</span>
        <span class="ds-stat"><span class="ds-stat-ic">◷</span> ${time} Time</span>
      </div>
      <div class="ds-bar-row">
        <div class="ds-bar"><div class="ds-bar-fill" style="width:${pct}%; background:${pal.bar}; color:${pal.bar};"></div></div>
        <span class="ds-pct-inline">${pct}%</span>
      </div>
      <div class="ds-next">🎓 ${nextLabel}</div>
      <select class="subject-folder-select" style="display:none" onclick="event.stopPropagation()" onchange="reassignSubjectFolder('${s.id}', this.value, this)"></select>
    </div>
    <button class="ds-resume" title="Open" style="background:${pal.arrowBg}; color:${pal.arrowColor}; border-color:${pal.arrowBg};" onclick="event.stopPropagation(); jumpToSubject('${s.id}')">→</button>
  </div>`;
}
function renderSidebar(){
  foldersEnsure();
  const sb = document.getElementById('sidebarList');
  const drawer = document.getElementById('sidebar');
  if(activeFolderFilter === null) stopFolderClock();

  if(activeFolderFilter === null){
    /* ---- Landing view — hero + search + stat blobs + folder cards ---- */
    if(drawer) drawer.classList.remove('wide');
    const totalFolders = data.folders.length;
    const unsortedCount = subjectsInFolder(null).length;
    const totalSubjects = data.subjects.length;
    const totalLectures = data.subjects.reduce((a,s)=>a+countLectures(s).total,0);
    const doneLectures = data.subjects.reduce((a,s)=>a+countLectures(s).done,0);
    const overallPct = totalLectures ? Math.round((doneLectures/totalLectures)*100) : 0;
    const todos = totalLectures - doneLectures;

    // hero (title + New Subject + bust)
    const heroHtml = `<div class="ms-hero">
      <div class="ms-hero-bust"><div class="ms-hero-bust-inner"></div></div>
      <div class="ms-hero-top">
        <div class="ms-title-block">
          <h2>My Subjects</h2>
          <p>Your knowledge. Your journey. Your legacy.</p>
          <div class="ms-divider"><span></span><i>⚜</i><span></span></div>
        </div>
        <div class="ms-hero-actions">
          <button class="ms-new-btn" onclick="openAddSubject()">＋ New Subject</button>
          <button class="ms-bell" title="Notifications" onclick="showToast('No new notifications 🔔')">🔔</button>
        </div>
      </div>
      <div class="ms-search-row">
        <div class="ms-search-wrap">
          <input type="text" class="ms-search-input" placeholder="Search subjects, topics..." id="drawerSearchInput" oninput="filterDrawerFolders(this.value)">
        </div>
        <div class="ms-search-col">
          <button class="ms-pill-btn" id="drawerFilterBtn" onclick="toggleDrawerFilter()">▽ Filter</button>
          <button class="ms-pill-btn" id="drawerSortBtn" onclick="sortDrawerFolders()">↕ Sort A–Z</button>
        </div>
      </div>
    </div>`;

    const wave = (color)=> `<div class="ms-stat-wave"><svg viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0 12 Q10 4 20 12 T40 10 T60 14 T80 8 T100 12" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/></svg></div>`;
    const statsHtml = `<div class="ms-stats">
      <div class="ms-stat"><div class="ms-stat-top"><span class="ms-stat-icon">🏛️</span><span><div class="ms-stat-num">${totalSubjects}</div><div class="ms-stat-lbl">Subjects</div></span></div>${wave('#c9984a')}</div>
      <div class="ms-stat"><div class="ms-stat-top"><span class="ms-stat-icon">🏅</span><span><div class="ms-stat-num">${totalLectures}</div><div class="ms-stat-lbl">Topics</div></span></div>${wave('#6b8f71')}</div>
      <div class="ms-stat"><div class="ms-stat-top"><span class="ms-stat-icon">🧭</span><span><div class="ms-stat-num">${overallPct}%</div><div class="ms-stat-lbl">Progress</div></span></div>${wave('#5a7fbf')}</div>
      <div class="ms-stat"><div class="ms-stat-top"><span class="ms-stat-icon">📜</span><span><div class="ms-stat-num">${todos}</div><div class="ms-stat-lbl">To-Do</div></span></div>${wave('#8a6fbf')}</div>
    </div>`;

    let tilesHtml = '<div class="drawer-folder-list" id="drawerFolderList">';
    data.folders.forEach((f,i)=>{ tilesHtml += drawerFolderTileHtml(f, i); });
    if(unsortedCount){
      const upal = [{bar:'#8a8fa3', pillBg:'#f0f0f5', pillColor:'#8a8fa3', arrowBg:'#f2f2f5', arrowColor:'#8a8fa3'}][0];
      tilesHtml += `<div class="drawer-folder-tile unsorted" onclick="activeFolderFilter=''; renderSidebar();">
        <div class="drawer-folder-img" style="background:linear-gradient(135deg, ${upal.bar} 0%, ${upal.bar}cc 100%);"><span style="font-size:32px;">📂</span></div>
        <div class="drawer-folder-content">
          <div class="drawer-folder-head"><div class="drawer-folder-name">Unsorted</div><span class="drawer-folder-badge" style="background:${upal.pillBg}; color:${upal.pillColor};">${unsortedCount} subject${unsortedCount===1?'':'s'}</span></div>
          <div class="drawer-folder-no-topic">📁 Unsorted subjects</div>
        </div>
        <div class="drawer-folder-arrow"><span style="background:${upal.arrowBg}; color:${upal.arrowColor};">→</span></div>
      </div>`;
    }
    tilesHtml += '</div>';

    const actionsHtml = `<div class="drawer-actions">
      <button class="drawer-action-card add-folder" onclick="promptNewFolderFromDrawer()">
        <span class="drawer-action-illus">🪴</span>
        <span class="drawer-action-text"><span class="drawer-action-label">Add Folder</span><span class="drawer-action-sub">Organize subjects<br>the way you like</span></span>
        <span class="drawer-action-plus">＋</span>
      </button>
      <button class="drawer-action-card new-subject" onclick="openAddSubject()">
        <span class="drawer-action-illus">🪶</span>
        <span class="drawer-action-text"><span class="drawer-action-label">New Subject</span><span class="drawer-action-sub">Add a new subject<br>and start learning</span></span>
        <span class="drawer-action-plus">＋</span>
      </button>
    </div>`;

    sb.innerHTML = heroHtml + statsHtml + tilesHtml + actionsHtml;
  } else {
    /* ---- Inside one folder — "Your Subjects" dashboard page ---- */
    if(drawer) drawer.classList.add('wide');
    let subjects, name, icon;
    if(activeFolderFilter === ''){
      subjects = subjectsInFolder(null); name = 'Unsorted'; icon = '📂';
    } else {
      const f = getFolder(activeFolderFilter);
      subjects = f ? subjectsInFolder(f.id) : [];
      name = f ? f.name : ''; icon = f ? f.icon : '📁';
    }

    // Tab filter (All / In Progress / Completed)
    let filtered = subjects.filter(s=>{
      if(folderSubjectFilter==='all') return true;
      const c = countLectures(s);
      const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
      if(folderSubjectFilter==='completed') return c.total>0 && pct===100;
      if(folderSubjectFilter==='progress') return pct<100;
      return true;
    });
    // Optional A→Z / Z→A sort, toggled by the funnel button
    if(folderSubjectSortMode==='asc') filtered = filtered.slice().sort((a,b)=>a.name.localeCompare(b.name));
    else if(folderSubjectSortMode==='desc') filtered = filtered.slice().sort((a,b)=>b.name.localeCompare(a.name));

    const cardsHtml = filtered.length
      ? filtered.map((s,i)=>{
          try{ return drawerSubjectCardHtml(s,i); }
          catch(e){ console.error('drawerSubjectCardHtml', e); return `<div class="folder-section-empty">Could not load "${escapeHtml(s && s.name)}".</div>`; }
        }).join('')
      : (subjects.length
          ? `<div class="folder-section-empty">No subjects match this filter.</div>`
          : `<div class="folder-section-empty">No subjects here yet — use "+ New Subject" below.</div>`);

    sb.innerHTML = `
      <button type="button" class="folder-back-btn" onclick="closeSubjectsDrawer(); openMySubjectsLanding();">← All folders</button>
      ${folderStatsHeaderHtml(subjects)}
      ${folderSubjectsHeadHtml(name, icon)}
      <div class="ds-list">${cardsHtml}</div>
    `;
    sb.querySelectorAll('.subject-folder-select').forEach(sel=>{
      try{
        const card = sel.closest('.ds-card');
        const delBtn = card && card.querySelector('.subject-del');
        const match = delBtn && delBtn.getAttribute('onclick') && delBtn.getAttribute('onclick').match(/deleteSubject\('([^']+)'\)/);
        const subjectId = match ? match[1] : null;
        const s = data.subjects.find(x=>x.id===subjectId);
        if(s) populateFolderSelect(sel, s.folderId || '');
      }catch(e){ console.error('populateFolderSelect', e); }
    });

    const addBtn = document.createElement('button');
    addBtn.className = 'add-subject-btn';
    addBtn.textContent = '+ New Subject';
    addBtn.onclick = () => openAddSubject();
    sb.appendChild(addBtn);

    startFolderClock();
  }
}

// ---- "Your Subjects" folder-page header: greeting + live clock + 4 stat cards ----
function computeGroupStreak(subjectIds){
  const now = new Date();
  const todaySnap = getTodaySnapshot();
  let streak = 0;
  for(let d=0; d<365; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    const isToday = key===todayKey(now);
    const bySubject = isToday ? (todaySnap.bySubject||{}) : ((data.dailyLog && data.dailyLog[key] && data.dailyLog[key].bySubject) ? data.dailyLog[key].bySubject : {});
    const seconds = subjectIds.reduce((a,id)=>a+(bySubject[id]||0), 0);
    if(seconds>0) streak++; else break;
  }
  return streak;
}

function folderStatsHeaderHtml(subjects){
  const now = new Date();
  const h = now.getHours();
  const greeting = h<12 ? 'Good Morning' : h<17 ? 'Good Afternoon' : 'Good Evening';
  const wave = h<12 ? '👋' : h<17 ? '☀️' : '🌙';
  const namePart = (typeof MASCOT_NAME !== 'undefined' && MASCOT_NAME && MASCOT_NAME !== 'friend') ? `, ${escapeHtml(MASCOT_NAME)}` : '';
  const dateLabel = now.toLocaleDateString(undefined, {weekday:'long', day:'numeric', month:'long', year:'numeric'});

  let total=0, done=0, seconds=0;
  subjects.forEach(s=>{
    const c = countLectures(s);
    total += c.total; done += c.done;
    seconds += subjectSeconds(s);
  });
  const pct = total ? Math.round((done/total)*100) : 0;
  const streak = computeGroupStreak(subjects.map(s=>s.id));
  const ring = ringSVG(pct, 84, 9);

  // Streak dots (up to 8)
  const streakDots = Array.from({length: Math.min(streak,8)}).map((_,i)=>
    `<span style="animation-delay:${0.5+i*0.08}s;"></span>`
  ).join('');

  // Sparkline for "Total Studied"
  const sparklineHtml = `<svg class="sd-sparkline" viewBox="0 0 120 34"><path d="M2,24 Q15,6 28,20 T54,16 T80,22 T118,10"/></svg>`;

  // Mini bar chart for "Topics Done"
  const barsHtml = `<div class="sd-bars">${Array.from({length:12}).map((_,i)=>
    `<i style="height:${20+Math.random()*80}%; animation-delay:${i*0.05}s;"></i>`
  ).join('')}</div>`;

  return `
    <div class="fsh-wrap">
      <div class="fsh-greeting-row">
        <div class="fsh-greeting-text">
          <h3>${greeting}${namePart}! ${wave}</h3>
          <p>Keep learning, keep growing.</p>
        </div>
        <div class="fsh-clock">
          <span class="fsh-clock-ic">📅</span>
          <div class="fsh-clock-info">
            <div class="fsh-clock-date">${escapeHtml(dateLabel)}</div>
            <div class="fsh-clock-segs">
              <div class="fsh-clock-seg"><span id="folderClockH">--</span><small>HRS</small></div>
              <span class="fsh-clock-colon">:</span>
              <div class="fsh-clock-seg"><span id="folderClockM">--</span><small>MIN</small></div>
              <span class="fsh-clock-colon">:</span>
              <div class="fsh-clock-seg"><span id="folderClockS">--</span><small>SEC</small></div>
            </div>
          </div>
        </div>
      </div>
      <div class="fsh-stat-grid">
        <div class="fsh-stat-card fsh-ring-card">
          <div class="fsh-stat-label">Overall Progress</div>
          <div class="fsh-stat-ring">${ring}</div>
          <div class="fsh-stat-note">Keep it up! 🚀</div>
        </div>
        <div class="fsh-stat-card">
          <div class="fsh-stat-icon" style="background:#ece8ff; color:#7c5cff;">⏱️</div>
          <div class="fsh-stat-label">Total Studied</div>
          <div class="fsh-stat-value">${formatHuman(seconds)}</div>
          <div class="fsh-stat-note">This folder</div>
          ${sparklineHtml}
        </div>
        <div class="fsh-stat-card">
          <div class="fsh-stat-icon" style="background:#dcf7ea; color:#34c78f;">✅</div>
          <div class="fsh-stat-label">Topics Completed</div>
          <div class="fsh-stat-value">${done}<span class="fsh-stat-of"> / ${total}</span></div>
          <div class="fsh-stat-note">Across this folder</div>
          ${barsHtml}
        </div>
        <div class="fsh-stat-card">
          <div class="fsh-stat-icon" style="background:#ffe6d6; color:#ff9a52;">🔥</div>
          <div class="fsh-stat-label">Study Streak</div>
          <div class="fsh-stat-value">${streak}</div>
          <div class="fsh-stat-note">Day${streak===1?'':'s'} in a row</div>
          <div class="sd-streak-dots">${streakDots}</div>
        </div>
      </div>
    </div>`;
}

function folderSubjectsHeadHtml(folderName, folderIcon){
  const tabs = [['all','All'],['progress','In Progress'],['completed','Completed']];
  const sortGlyph = folderSubjectSortMode==='asc' ? '▲' : folderSubjectSortMode==='desc' ? '▼' : '▽';
  const sortTitle = folderSubjectSortMode==='asc' ? 'Sorted A→Z — click to reverse' : folderSubjectSortMode==='desc' ? 'Sorted Z→A — click to clear' : 'Sort subjects A→Z';
  return `
    <div class="fs-head-row">
      <div class="fs-head-title"><span class="fs-head-ic">${folderIcon||'📖'}</span>Your Subjects <span class="fs-head-folder-name">— ${escapeHtml(folderName||'')}</span></div>
      <div class="fs-head-controls">
        <div class="fs-tabs">
          ${tabs.map(([val,label])=>`<button type="button" class="fs-tab${folderSubjectFilter===val?' active':''}" onclick="setFolderSubjectFilter('${val}')">${label}</button>`).join('')}
        </div>
        <button type="button" class="fs-filter-btn" title="${sortTitle}" onclick="sortFolderSubjectsList()">${sortGlyph}</button>
      </div>
    </div>`;
}

function setFolderSubjectFilter(f){
  folderSubjectFilter = f;
  renderSidebar();
}
function sortFolderSubjectsList(){
  folderSubjectSortMode = folderSubjectSortMode==='none' ? 'asc' : folderSubjectSortMode==='asc' ? 'desc' : 'none';
  renderSidebar();
}

let folderClockTimer = null;
function startFolderClock(){
  stopFolderClock();
  const tick = () => {
    if(document.hidden) return;
    const hEl = document.getElementById('folderClockH');
    if(!hEl){ stopFolderClock(); return; }
    const now = new Date();
    document.getElementById('folderClockH').textContent = String(now.getHours()).padStart(2,'0');
    document.getElementById('folderClockM').textContent = String(now.getMinutes()).padStart(2,'0');
    document.getElementById('folderClockS').textContent = String(now.getSeconds()).padStart(2,'0');
  };
  tick();
  folderClockTimer = setInterval(tick, 1000);
}
function stopFolderClock(){
  if(folderClockTimer){ clearInterval(folderClockTimer); folderClockTimer = null; }
}
let drawerHideEmpty = false;
function toggleDrawerFilter(){
  drawerHideEmpty = !drawerHideEmpty;
  const btn = document.getElementById('drawerFilterBtn');
  if(btn) btn.classList.toggle('active', drawerHideEmpty);
  applyDrawerFilters();
}
function applyDrawerFilters(){
  const list = document.getElementById('drawerFolderList');
  const input = document.getElementById('drawerSearchInput');
  if(!list) return;
  const q = input ? input.value.toLowerCase().trim() : '';
  list.querySelectorAll('.drawer-folder-tile').forEach(tile=>{
    const name = tile.querySelector('.drawer-folder-name');
    const badge = tile.querySelector('.drawer-folder-badge');
    let show = true;
    if(q && name && !name.textContent.toLowerCase().includes(q)) show = false;
    if(show && drawerHideEmpty && badge && badge.textContent.trim().toLowerCase() === 'empty') show = false;
    tile.style.display = show ? '' : 'none';
  });
}
function filterDrawerFolders(query){
  applyDrawerFilters();
}
function sortDrawerFolders(){
  const list = document.getElementById('drawerFolderList');
  if(!list) return;
  const btn = document.getElementById('drawerSortBtn');
  const desc = btn && btn.dataset.desc === '1';
  const tiles = Array.from(list.querySelectorAll('.drawer-folder-tile:not(.unsorted)'));
  tiles.sort((a,b)=>{
    const na = a.querySelector('.drawer-folder-name').textContent.toLowerCase();
    const nb = b.querySelector('.drawer-folder-name').textContent.toLowerCase();
    return desc ? nb.localeCompare(na) : na.localeCompare(nb);
  });
  if(btn){
    btn.dataset.desc = desc ? '' : '1';
    btn.textContent = desc ? '↕ Sort A–Z' : '↕ Sort Z–A';
  }
  tiles.forEach(t=>list.appendChild(t));
}

function openSubjectsDrawer(keepFolderFilter){
  if(!keepFolderFilter){
    // top-level "My Subjects" → dedicated full-page landing view
    if(typeof openMySubjectsLanding === 'function'){ openMySubjectsLanding(); return; }
  }
  rememberOpener('subjectsDrawerOverlay');
  if(!keepFolderFilter){ activeFolderFilter = null; renderSidebar(); }
  document.getElementById('subjectsDrawerOverlay').classList.add('show');
}
function closeSubjectsDrawer(){
  document.getElementById('subjectsDrawerOverlay').classList.remove('show');
  stopFolderClock();
  restoreOpener('subjectsDrawerOverlay');
}

const MOTIVATION_QUOTES = [
  {bold:'Discipline', text:"is doing what needs to be done, even when you don't feel like doing it."},
  {bold:'Consistency', text:'beats intensity — small daily effort compounds into mastery.'},
  {bold:'Progress', text:'is progress, no matter how small the step forward is.'},
  {bold:'Focus', text:'on being 1% better today than you were yesterday.'},
];
function pickMotivationQuote(seedStr){
  let h = 0;
  for(let i=0;i<seedStr.length;i++) h = (h*31 + seedStr.charCodeAt(i)) >>> 0;
  return MOTIVATION_QUOTES[h % MOTIVATION_QUOTES.length];
}

function renderMain(){
  const main = document.getElementById('main');
  const idx = data.subjects.findIndex(s=>s.id===activeSubjectId);
  main.className = 'main' + (idx>=0 ? ' accent-'+((idx%5)+1) : '');
  const subject = data.subjects.find(s=>s.id===activeSubjectId);
  if(!subject){
    // Full-page mode never runs with no subject selected (exitSubjectPage clears
    // it), so this branch just restores the inline placeholder on the dashboard.
    document.body.classList.remove('subject-page-active');
    main.innerHTML = `<div class="empty-state"><div class="glyph">📘</div>Pick a subject on the left — or add a new one — to see its units and lectures.</div>`;
    return;
  }
  const {total, done} = countLectures(subject);
  const left = total - done;
  const overallPct = total ? (done/total)*100 : 0;
  const pacing = examPacing(subject);
  const streak = computeSubjectStreak(subject.id);

  // ---- Exam pacing card ----
  let examIconCls = '', examTitle, examSub;
  if(pacing){
    let urgency = 'ok';
    if(pacing.daysLeft < 0) urgency = 'past';
    else if(pacing.daysLeft <= 3) urgency = 'critical';
    else if(pacing.daysLeft <= 7) urgency = 'warn';
    examIconCls = urgency==='ok' ? '' : urgency;
    const examDateLabel = new Date(pacing.examDate+'T00:00:00').toLocaleDateString(undefined,{month:'short', day:'numeric', year:'numeric'});
    if(pacing.daysLeft < 0){
      examTitle = `Exam date passed`;
      examSub = examDateLabel;
    } else if(pacing.remaining<=0){
      examTitle = `${pacing.daysLeft} day${pacing.daysLeft===1?'':'s'} left`;
      examSub = `All lectures cleared 🎉`;
    } else if(pacing.perWeek!==null){
      examTitle = `${pacing.daysLeft} day${pacing.daysLeft===1?'':'s'} left`;
      examSub = `${pacing.remaining} lecture${pacing.remaining===1?'':'s'} remaining · need ~${Math.ceil(pacing.perWeek)}/week`;
    } else {
      examTitle = `${pacing.daysLeft} day${pacing.daysLeft===1?'':'s'} left`;
      examSub = examDateLabel;
    }
  } else {
    examTitle = 'Set exam date for pacing';
    examSub = 'Plan your study schedule';
  }
  const examHtml = `
    <div class="sd-exam-card" onclick="openSetExamDate('${subject.id}')">
      <div class="sd-exam-icon ${examIconCls}">📅</div>
      <div class="sd-exam-text">
        <div class="sd-exam-title">${escapeHtml(examTitle)}</div>
        <div class="sd-exam-sub">${escapeHtml(examSub)}</div>
      </div>
      <div class="sd-exam-chevron">›</div>
    </div>`;

  // ---- Header ring (custom, matches the reference — big purple ring) ----
  const ringSize=104, ringStroke=11, ringR=(ringSize-ringStroke)/2, ringCx=ringSize/2, ringCy=ringSize/2, ringC=2*Math.PI*ringR;
  const ringDash = (overallPct/100)*ringC;
  // SVG ring with gradient + animated fill
  const ringHtml = `
    <div class="sd-ring-wrap">
      <svg width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}">
        <defs>
          <linearGradient id="sdRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7c5cff"/>
            <stop offset="100%" stop-color="#a78bfa"/>
          </linearGradient>
        </defs>
        <circle cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="rgba(140,120,220,0.15)" stroke-width="${ringStroke}"/>
        <circle class="ring-fill" data-pct="${overallPct}" cx="${ringCx}" cy="${ringCy}" r="${ringR}" fill="none" stroke="url(#sdRingGrad)" stroke-width="${ringStroke}" stroke-linecap="round"
          stroke-dasharray="${ringC}" stroke-dashoffset="${ringC}" transform="rotate(-90 ${ringCx} ${ringCy})"/>
        <text x="${ringCx}" y="${ringCy-2}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="700" font-size="20" fill="#7c5cff">${Math.round(overallPct)}%</text>
      </svg>
      <div class="sd-ring-caption">Overall Progress</div>
    </div>`;

  // ---- Streak dots (up to 8) ----
  const streakDots = Array.from({length: Math.min(streak,8)}).map((_,i)=>
    `<span style="animation-delay:${0.5+i*0.08}s;"></span>`
  ).join('');

  // ---- Sparkline SVG for "Total Studied" card ----
  const sparklineHtml = `
    <svg class="sd-sparkline" viewBox="0 0 120 34">
      <path d="M2,24 Q15,6 28,20 T54,16 T80,22 T118,10"/>
    </svg>`;

  // ---- Mini bar chart for "Topics Done" card ----
  const barsHtml = `<div class="sd-bars">${Array.from({length:12}).map((_,i)=>
    `<i style="height:${20+Math.random()*80}%; animation-delay:${i*0.05}s;"></i>`
  ).join('')}</div>`;

  let html = `
    <div class="sd-header">
      ${subjectPageOpen ? `
      <div class="sd-back-row">
        <button type="button" class="sd-back-btn" title="Back to dashboard" onclick="exitSubjectPage()">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>
          <span>All Subjects</span>
        </button>
      </div>` : ''}
      <div class="sd-title-block">
        <div class="sd-title-row">
          <h2 class="sd-title">${escapeHtml(subject.name)} <span class="sd-sparkle">✨</span></h2>
          <button type="button" class="sd-rename-btn" title="Rename subject" onclick="openEditSubject('${subject.id}')">✎</button>
        </div>
        <div class="sd-subtitle">Master concepts. Ace every exam.</div>
      </div>
      <div class="sd-streak-badge">
        <span class="sd-streak-flame">🔥</span>
        <div>
          <span class="sd-streak-label">Study Streak</span>
          <span class="sd-streak-value">${streak} day${streak===1?'':'s'}</span>
        </div>
      </div>
      ${ringHtml}
    </div>
    <div class="sd-stat-grid">
      <div class="sd-stat-card">
        <div class="sd-stat-label"><span class="sd-stat-icon" style="background:#ece8ff;">⏱️</span>Total Studied</div>
        <div class="sd-stat-value">${formatHuman(subjectSeconds(subject))}</div>
        <div class="sd-stat-sub">This semester</div>
        ${sparklineHtml}
      </div>
      <div class="sd-stat-card">
        <div class="sd-stat-label"><span class="sd-stat-icon" style="background:#dcf7ea;">✅</span>Topics Done</div>
        <div class="sd-stat-value">${done} <span style="color:#8b8fa3; font-size:1rem;">/ ${total}</span></div>
        <div class="sd-stat-sub">Across all units</div>
        ${barsHtml}
      </div>
      <div class="sd-stat-card">
        <div class="sd-stat-label"><span class="sd-stat-icon" style="background:#ffe6d6;">🔥</span>Study Streak</div>
        <div class="sd-stat-value">${streak}</div>
        <div class="sd-stat-sub">Day${streak===1?'':'s'} in a row</div>
        <div class="sd-streak-dots">${streakDots}</div>
      </div>
      <div class="sd-stat-card">
        <div class="sd-stat-label"><span class="sd-stat-icon" style="background:#e9f1ff;">📋</span>Test Average</div>
        <div class="sd-stat-value">${formatPct(subjectTestAvg(subject))}</div>
        <div class="sd-stat-sub">Across all tests</div>
      </div>
    </div>
    ${examHtml}
  `;
  const UNIT_ACCENTS = ['var(--sd-purple)','var(--sd-blue)','var(--sd-green)','var(--sd-orange)','var(--sd-pink)','var(--teal)'];
  const UNIT_ICONS = ['📘','💾','🧮','📗','🧠','📙'];
  subject.units.forEach((u, i)=>{
    const t = u.lectures.length, d = u.lectures.filter(l=>l.completed).length;
    const left = t - d;
    const pct = t ? (d/t)*100 : 0;
    const accent = UNIT_ACCENTS[i % UNIT_ACCENTS.length];
    const icon = UNIT_ICONS[i % UNIT_ICONS.length];
    const encourage = t===0 ? `Add your first lecture to kick off this week.`
      : pct>=100 ? `Amazing! You've completed all the lectures in this week. 🎉`
      : pct===0 ? `Let's get started on this week's lectures.`
      : `Keep going — you're ${Math.round(pct)}% through this week's lectures.`;
    html += `<div class="unit ${u.open?'open':''}" data-unit="${u.id}" style="--unit-accent:${accent}; animation-delay:${i*0.05}s">
      <div class="unit-head" onclick="toggleUnit('${subject.id}','${u.id}')">
        ${unitPetalsHtml(i)}
        <div class="unit-head-top">
          <div class="unit-head-left">
            <span class="unit-icon-sq">${icon}</span>
            <div class="unit-titles">
              <span class="unit-eyebrow">Week ${i+1}</span>
              <span class="unit-name">${escapeHtml(u.name)}</span>
            </div>
          </div>
          <div class="unit-head-right">
            <div class="unit-pct-badge">
              <span class="unit-pct-num">${Math.round(pct)}<small>%</small></span>
              <span class="unit-pct-label">Complete</span>
            </div>
            <div class="unit-kebab-wrap" onclick="event.stopPropagation()">
              <button type="button" class="unit-kebab-btn" title="Week options" onclick="toggleUnitMenu('${u.id}')">⋮</button>
              <div class="unit-kebab-menu" id="unitMenu-${u.id}">
                <button type="button" onclick="closeUnitMenus(); openEditUnit('${subject.id}','${u.id}')">✎ Rename week</button>
                <button type="button" class="danger" onclick="closeUnitMenus(); deleteUnit('${subject.id}','${u.id}')">✕ Delete week</button>
              </div>
            </div>
            <span class="unit-toggle">▾</span>
          </div>
        </div>
        <div class="unit-meta">
          <span class="unit-pill done">✓ ${d} Completed</span>
          <span class="unit-pill left">⏳ ${left} Remaining</span>
          <span class="unit-pill time">🕐 ${formatHuman(unitSeconds(u))} Logged</span>
          ${unitTestAvg(u)!==null ? `<span class="unit-pill test">🚀 ${formatPct(unitTestAvg(u))}</span>` : ''}
        </div>
        <div class="unit-progress-row">
          <div class="unit-progress-bar"><div class="unit-progress-fill" style="width:${pct}%"></div></div>
        </div>
        <div class="unit-encourage">${encourage}</div>
      </div>
      <div class="unit-body">
        <div class="unit-curriculum-header">
          <div class="unit-curriculum-label">Course Curriculum</div>
          <div class="unit-curriculum-controls" onclick="event.stopPropagation()">
            <div class="unit-sort-wrap">
              <button type="button" class="unit-sort-btn" onclick="toggleUnitSortMenu('${u.id}')">Sort by ${unitSortMode[u.id]==='az' ? 'Name' : 'Order'} <span>⌄</span></button>
              <div class="unit-sort-menu" id="unitSortMenu-${u.id}">
                <button type="button" onclick="setUnitSort('${u.id}','order')">Sort by Order</button>
                <button type="button" onclick="setUnitSort('${u.id}','az')">Sort by Name (A–Z)</button>
              </div>
            </div>
            <div class="unit-view-toggle">
              <button type="button" class="${unitViewMode[u.id]!=='grid'?'active':''}" title="List view" onclick="setUnitView('${u.id}','list')">☰</button>
              <button type="button" class="${unitViewMode[u.id]==='grid'?'active':''}" title="Grid view" onclick="setUnitView('${u.id}','grid')">▦</button>
            </div>
          </div>
        </div>
        <div class="unit-lecture-list ${unitViewMode[u.id]==='grid'?'grid-mode':''}">
          ${sortedLectures(u).map((l,li) => lectureRow(subject.id, u.id, l, li)).join('')}
        </div>
        <div class="lecture-add-row">
          <button class="add-lecture-btn" onclick="openAddLecture('${subject.id}','${u.id}')">+ Add lecture</button>
        </div>
        <div class="bulk-add-row">
          <button class="add-lecture-btn bulk" onclick="openBulkAdd('${subject.id}','${u.id}')">≡ Bulk Add</button>
        </div>
        <div class="tests-section">
          <div class="tests-row-header">
            <span class="tests-icon-sq">📄</span>
            <div class="tests-titles">
              <span class="tests-title">TESTS</span>
              <span class="tests-subtitle">${(u.tests && u.tests.length) ? `${u.tests.length} test${u.tests.length===1?'':'s'} logged` : 'No test scores logged yet.'}</span>
            </div>
            <span class="tests-avg-badge">Avg ${formatPct(unitTestAvg(u))} <span>⌄</span></span>
          </div>
          ${(u.tests && u.tests.length) ? u.tests.map((t,ti)=>testRow(subject.id,u.id,t,ti)).join('') : ''}
          <button class="add-test-btn" onclick="openAddTest('${subject.id}','${u.id}')">+ Add test score</button>
        </div>
      </div>
    </div>`;
  });
  html += `<button class="add-unit-btn" onclick="openAddUnit('${subject.id}')">+ Add unit</button>`;


  const quote = pickMotivationQuote(subject.id);
  html += `
    <div class="sd-footer-quote">
      <div class="sd-footer-icon">🎯</div>
      <div class="sd-footer-text"><b>${escapeHtml(quote.bold)}</b> ${escapeHtml(quote.text)}</div>
      <button class="sd-footer-cta" onclick="sparkAt(this,'var(--sd-purple)')">Keep Going! 🎉</button>
    </div>`;

  // Full-screen glass subject page: wrap everything in a centred page shell
  // with the floating colour blobs behind the frosted surfaces.
  if(subjectPageOpen){
    html = `
      <div class="subject-page-blobs" aria-hidden="true">
        <span class="sp-blob sp-blob1"></span>
        <span class="sp-blob sp-blob2"></span>
        <span class="sp-blob sp-blob3"></span>
        <span class="sp-blob sp-blob4"></span>
      </div>
      <div class="subject-page-scroll">
        <div class="subject-page-inner">${html}</div>
      </div>`;
    document.body.classList.add('subject-page-active');
  }

  main.innerHTML = html;

  // Wire up glass interactions (tilt, ripple, count-up) after DOM update
  if(subjectPageOpen){
    requestAnimationFrame(()=>{
      sdWireInteractions();
      animateRings();
    });
  }
}

function unitPetalsHtml(seedIdx){
  // Deterministic little PRNG so each unit's petals look the same across
  // re-renders instead of reshuffling every time renderAll() runs.
  let seed = (seedIdx + 1) * 9301 + 49297;
  const rand = ()=>{ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const COUNT = 13;
  let spans = '';
  for(let i=0;i<COUNT;i++){
    const size = 11 + rand()*15;
    const left = rand()*94;
    const top = 6 + rand()*84;
    const dur = 11 + rand()*9;
    const delay = -rand()*dur;
    const dx = (rand()*70-35).toFixed(0);
    const dy = -(45 + rand()*60).toFixed(0);
    const rot = (120 + rand()*160).toFixed(0);
    spans += `<span style="width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s;--pdx:${dx}px;--pdy:${dy}px;--prot:${rot}deg;"></span>`;
  }
  return `<div class="unit-petals">${spans}</div>`;
}

function lectureIconChar(l){
  const t = ((l.title||'') + ' ' + (l.notes||'')).toLowerCase();
  if(t.includes('overview') || t.includes('intro to') || t.includes('introduction to') && t.includes('course')) return '📄';
  if(t.includes('model') || t.includes('schema') || t.includes('relational') || t.includes('diagram')) return '🧩';
  if(t.includes('database') || t.includes('dbms') || t.includes('sql') || t.includes('query')) return '🗄️';
  return '📘';
}
// A small "ancient seal" checkmark used in place of the plain book icon once
// a lecture is completed — a double ring, rune-like tick marks, and an
// engraved check, rendered inline so it stays crisp at 22px inside the omr
// circle. gidSeed just keeps each instance's gradient id unique on the page.
function mythicalCheckGlyph(gidSeed){
  const gid = 'mythGrad' + String(gidSeed || Math.random()).replace(/[^a-zA-Z0-9]/g,'');
  return `<svg width="22" height="22" viewBox="0 0 32 32" class="myth-check" aria-hidden="true">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f6d98a"/>
        <stop offset="55%" stop-color="#d8a545"/>
        <stop offset="100%" stop-color="#8a5a1e"/>
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="13.4" fill="none" stroke="url(#${gid})" stroke-width="1.3"/>
    <circle cx="16" cy="16" r="10.4" fill="none" stroke="url(#${gid})" stroke-width="0.6" stroke-dasharray="1.3 2.1"/>
    <g stroke="url(#${gid})" stroke-width="1" stroke-linecap="round">
      <line x1="16" y1="2.3" x2="16" y2="5"/>
      <line x1="16" y1="27" x2="16" y2="29.7"/>
      <line x1="2.3" y1="16" x2="5" y2="16"/>
      <line x1="27" y1="16" x2="29.7" y2="16"/>
      <line x1="6.6" y1="6.6" x2="8.4" y2="8.4"/>
      <line x1="23.6" y1="23.6" x2="25.4" y2="25.4"/>
      <line x1="6.6" y1="25.4" x2="8.4" y2="23.6"/>
      <line x1="23.6" y1="8.4" x2="25.4" y2="6.6"/>
    </g>
    <path d="M9.8 16.8 L13.8 20.6 L22.4 11.2" fill="none" stroke="url(#${gid})" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/* ======================================================================
   GLASS INTERACTIONS — 3D tilt, click ripple, count-up animations
   ====================================================================== */

// 3D tilt on pointer move (for glass cards)
function sdAttachTilt(el){
  const strength = 10;
  function onMove(e){
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const rotY = (px - 0.5) * strength;
    const rotX = (0.5 - py) * strength;
    el.style.transform = `translateY(-4px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(8px)`;
  }
  function onLeave(){ el.style.transform = ''; }
  el.addEventListener('mousemove', onMove);
  el.addEventListener('mouseleave', onLeave);
}

// Click ripple (for .sd-ripple-host)
function sdAttachRipple(el){
  el.addEventListener('click', e=>{
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.4;
    const span = document.createElement('span');
    span.className = 'sd-ripple';
    span.style.width = span.style.height = size + 'px';
    span.style.left = (e.clientX - r.left - size/2) + 'px';
    span.style.top = (e.clientY - r.top - size/2) + 'px';
    el.appendChild(span);
    span.addEventListener('animationend', ()=> span.remove());
  });
}

// Count-up animation for stat values
function sdCountUp(el, target, opts={}){
  const dur = opts.duration || 900;
  const suffix = opts.suffix || '';
  const start = performance.now();
  function step(now){
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(eased * target) + suffix;
    if(p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// Wire up all glass interactions after renderMain()
function sdWireInteractions(){
  if(!document.body.classList.contains('subject-page-active')) return;
  // Tilt on glass stat cards and header
  document.querySelectorAll('.sd-stat-card, .fsh-stat-card, .sd-exam-card, .unit').forEach(el=>{
    if(!el.dataset.sdTiltBound){ sdAttachTilt(el); el.dataset.sdTiltBound = '1'; }
  });
  // Ripple on CTA buttons
  document.querySelectorAll('.sd-ripple-host, .sd-footer-cta, .sd-back-btn').forEach(el=>{
    if(!el.dataset.sdRippleBound){ sdAttachRipple(el); el.dataset.sdRippleBound = '1'; }
  });
  // Count-up on stat values
  document.querySelectorAll('.sd-stat-value[data-count]').forEach(el=>{
    const target = parseInt(el.dataset.count, 10);
    if(!isNaN(target) && !el.dataset.sdCounted){
      el.dataset.sdCounted = '1';
      sdCountUp(el, target, {suffix: el.dataset.suffix || ''});
    }
  });
}

// Hook into renderMain — after the DOM is updated, wire interactions
// (Already handled by requestAnimationFrame(sdWireInteractions) inside renderMain)
