// Priority/Today page (calendar-driven) + subject folders (departments)
// ---------------- PRIORITY / "TODAY" PAGE (calendar-driven) ----------------
// This used to be a slide-in panel; it's now its own full page/tab so it can
// hold a real month calendar, scheduled times, upcoming events, and a live
// "Next Up" countdown alongside the day's plan — everything still keyed off
// a real calendar date (data.priorityPlanner.byDate['YYYY-MM-DD']) so today
// rolls forward on its own instead of needing a manual reset.
let ppSelectedDate = null;
let ppCalMonthOffset = 0;
let ppQuoteText = null;

function ppEnsure(){
  if(!data.priorityPlanner) data.priorityPlanner = { byDate: {} };
  if(!data.priorityPlanner.byDate) data.priorityPlanner.byDate = {};
  if(!data.events) data.events = [];
  // one-time migration from the old {today:[], tomorrow:[]} shape
  let migrated = false;
  if(data.priorityPlanner.today || data.priorityPlanner.tomorrow){
    const tKey = ppTodayKey();
    const tmrKey = ppTomorrowKey();
    if(data.priorityPlanner.today && data.priorityPlanner.today.length){
      data.priorityPlanner.byDate[tKey] = [...(data.priorityPlanner.byDate[tKey]||[]), ...data.priorityPlanner.today];
    }
    if(data.priorityPlanner.tomorrow && data.priorityPlanner.tomorrow.length){
      data.priorityPlanner.byDate[tmrKey] = [...(data.priorityPlanner.byDate[tmrKey]||[]), ...data.priorityPlanner.tomorrow];
    }
    delete data.priorityPlanner.today;
    delete data.priorityPlanner.tomorrow;
    migrated = true;
  }
  return migrated;
}
function ppTodayKey(){ return todayKey(new Date()); }

// ---------------- SUBJECT FOLDERS (departments) ----------------
// Groups subjects into folders — "Semester 3", "Personal Projects", "Self
// Learning", "Research", or whatever the person names — so the subject list
// doesn't turn into one long undifferentiated wall as it grows. A subject
// with folderId === null just sits in the "Unsorted" bucket; nothing is
// ever force-assigned.
const FOLDER_ICONS = ['🎓','🚀','📖','🔬','💼','🧩','🎨','⚙️','🌱','📌'];
function foldersEnsure(){
  if(!data.folders){
    data.folders = [
      { id: 'fld-college', name: 'Semester', icon: '🎓' },
      { id: 'fld-projects', name: 'Projects', icon: '🚀' },
      { id: 'fld-selflearn', name: 'Self Learning', icon: '📖' },
      { id: 'fld-research', name: 'Research', icon: '🔬' }
    ];
  }
  // One-time rename for anyone who already had the earlier default names.
  const renameIfDefault = (id, oldName, newName)=>{
    const f = data.folders.find(x=>x.id===id);
    if(f && f.name===oldName) f.name = newName;
  };
  renameIfDefault('fld-college', 'College', 'Semester');
  renameIfDefault('fld-projects', 'Personal Projects', 'Projects');
  data.subjects.forEach(s=>{ if(s.folderId === undefined) s.folderId = null; });
}
function getFolder(folderId){
  return data.folders.find(f=>f.id===folderId) || null;
}
function subjectsInFolder(folderId){
  return data.subjects.filter(s => (s.folderId||null) === folderId);
}
function createFolder(name, icon){
  const id = 'fld-' + uid();
  data.folders.push({ id, name, icon: icon || FOLDER_ICONS[data.folders.length % FOLDER_ICONS.length] });
  saveData();
  return id;
}
function promptNewFolder(afterCreateSelectEl){
  const name = prompt('Name this folder (e.g. "Semester 3", "Personal Projects")');
  if(!name || !name.trim()) return;
  foldersEnsure();
  const id = createFolder(name.trim());
  renderSidebar();
  renderFolderCard();
  if(afterCreateSelectEl){
    populateFolderSelect(afterCreateSelectEl);
    afterCreateSelectEl.value = id;
  }
  showToast('Folder created 📁');
}
function populateFolderSelect(sel, selectedId){
  foldersEnsure();
  sel.innerHTML = '<option value="">— Unsorted —</option>' +
    data.folders.map(f=>`<option value="${f.id}">${f.icon} ${escapeHtml(f.name)}</option>`).join('') +
    '<option value="__new__">+ New folder…</option>';
  sel.value = selectedId || '';
}
function reassignSubjectFolder(subjectId, folderId, selectEl){
  if(folderId === '__new__'){
    promptNewFolder(selectEl);
    return;
  }
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  s.folderId = folderId || null;
  saveData();
  renderSidebar();
  renderFolderCard();
}
function renameFolder(folderId){
  const f = getFolder(folderId);
  if(!f) return;
  const name = prompt('Rename this folder', f.name);
  if(!name || !name.trim() || name.trim()===f.name) return;
  f.name = name.trim();
  saveData();
  renderSidebar();
  renderFolderCard();
  const landing = document.getElementById('subjectsLanding');
  if(landing && landing.style.display !== 'none') renderSubjectsLanding();
  showToast('Folder renamed ✎');
}
// "Departments" card on the Today page — a quick jump-off point into
// whichever bucket of subjects (college semester, personal projects, self
// learning, research, ...) you actually want to look at right now, instead
// of scrolling one long undifferentiated subject list.
function folderTileStyle(folder){
  return folder.image ? ` style="background-image:url('${folder.image}'); background-size:cover; background-position:center;"` : '';
}
function folderTileInnerHtml(folder){
  const subs = subjectsInFolder(folder.id);
  const total = subs.reduce((a,s)=>a+countLectures(s).total,0);
  const done = subs.reduce((a,s)=>a+countLectures(s).done,0);
  const pct = total ? Math.round((done/total)*100) : 0;
  return `
    <div class="pp-folder-tile-edit-wrap">
      <input type="file" accept="image/*" id="folderImgInput-${folder.id}" style="display:none" onchange="handleFolderImage(event,'${folder.id}')">
      <button type="button" class="pp-folder-tile-edit" title="${folder.image?'Change image':'Add image'}" onclick="event.stopPropagation(); toggleFolderCoverMenu('${folder.id}')">✎</button>
      <div class="pp-folder-tile-edit-menu" id="folderCoverMenu-${folder.id}">
        <button type="button" onclick="event.stopPropagation(); closeFolderCoverMenus(); renameFolder('${folder.id}')">✎ Rename folder</button>
        <button type="button" onclick="event.stopPropagation(); closeFolderCoverMenus(); document.getElementById('folderImgInput-${folder.id}').click()">🖼️ ${folder.image?'Change image':'Add image'}</button>
        ${folder.image ? `<button type="button" class="danger" onclick="event.stopPropagation(); closeFolderCoverMenus(); removeFolderImage('${folder.id}')">🗑️ Remove image</button>` : ''}
      </div>
    </div>
    <span class="pp-folder-tile-icon">${folder.icon}</span>
    <span class="pp-folder-tile-name">${escapeHtml(folder.name)}</span>
    <span class="pp-folder-tile-sub">${subs.length} subject${subs.length===1?'':'s'}</span>
    ${total ? `<div class="pp-folder-tile-bar"><div class="pp-folder-tile-bar-fill" style="width:${pct}%"></div></div>` : ''}
  `;
}
function ppFolderCardHtml(){
  foldersEnsure();
  const unsortedCount = subjectsInFolder(null).length;
  const tiles = data.folders.map(f=>{
    return `<div class="pp-folder-tile${f.image?' has-image':''}" onclick="openFolderFromCard('${f.id}')"${folderTileStyle(f)}>${folderTileInnerHtml(f)}</div>`;
  });
  if(unsortedCount){
    tiles.push(`<button type="button" class="pp-folder-tile muted" onclick="openFolderFromCard('')">
      <span class="pp-folder-tile-icon">📂</span>
      <span class="pp-folder-tile-name">Unsorted</span>
      <span class="pp-folder-tile-sub">${unsortedCount} subject${unsortedCount===1?'':'s'}</span>
    </button>`);
  }
  tiles.push(`<button type="button" class="pp-folder-tile add" onclick="promptNewFolderFromCard()">
    <span class="pp-folder-tile-icon">➕</span>
    <span class="pp-folder-tile-name">Add Folder</span>
    <span class="pp-folder-tile-sub">New department</span>
  </button>`);
  return `<div class="pp-card" id="ppFolderCard">
    <div class="pp-card-title">🗂️ Departments</div>
    <div class="pp-folder-grid">${tiles.join('')}</div>
  </div>`;
}
function renderFolderCard(){
  const el = document.getElementById('ppFolderCard');
  if(!el) return;
  el.outerHTML = ppFolderCardHtml();
}
function openFolderFromCard(folderId){
  activeFolderFilter = folderId;
  closedFolderIds.clear();
  closePriorityPlanner();
  stopFolderClock();
  if(typeof openFolderDashboard === 'function') openFolderDashboard(); else { renderSidebar(); openSubjectsDrawer(true); }
}
function promptNewFolderFromCard(){
  const name = prompt('Name this folder (e.g. "Semester 3", "Personal Projects")');
  if(!name || !name.trim()) return;
  foldersEnsure();
  createFolder(name.trim());
  renderFolderCard();
  showToast('Folder created 📁');
}

function ppTomorrowKey(){ const d = new Date(); d.setDate(d.getDate()+1); return todayKey(d); }
function ppYesterdayKey(){ const d = new Date(); d.setDate(d.getDate()-1); return todayKey(d); }
function ppList(key){
  ppEnsure();
  if(!data.priorityPlanner.byDate[key]) data.priorityPlanner.byDate[key] = [];
  return data.priorityPlanner.byDate[key];
}
function ppSortedItems(key){
  return ppList(key).map((item,idx)=>({item,idx})).sort((a,b)=>{
    const at = a.item.time || null, bt = b.item.time || null;
    if(at && bt) return at.localeCompare(bt);
    if(at && !bt) return -1;
    if(!at && bt) return 1;
    return a.idx - b.idx;
  }).map(x=>x.item);
}
function ppPlanTitle(key){
  if(key === ppTodayKey()) return "☀️ Today's Plan";
  if(key === ppTomorrowKey()) return "🌙 Tomorrow's Plan";
  const [y,m,d] = key.split('-').map(Number);
  const label = new Date(y,m-1,d).toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'});
  return (key < ppTodayKey() ? '📖 ' + label + ' Recap' : '🗓️ ' + label + ' Plan');
}
function ppStudiedSecondsForDate(key){
  if(key === ppTodayKey()) return getTodaySnapshot().total;
  return (data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0;
}
function ppItemStatus(item){
  if(item.done) return 'done';
  if(item.link){
    const l = getLecture(item.link.subjectId, item.link.unitId, item.link.lectureId);
    if(l && l.timerStart) return 'ongoing';
  }
  return 'upcoming';
}
function formatTimeLabel(t){
  if(!t) return '';
  const [h,m] = t.split(':').map(Number);
  const d = new Date(); d.setHours(h,m,0,0);
  return d.toLocaleTimeString(undefined,{hour:'2-digit', minute:'2-digit'});
}

function openPriorityPlanner(){
  ppEnsure();
  ppSelectedDate = ppTodayKey();
  showView('priority');
}
function closePriorityPlanner(){
  showView('study');
}

function ppSelectDate(key){
  if(!key) return;
  // Past dates are viewable (a read-only recap) — just not editable.
  ppSelectedDate = key;
  renderPriorityPage();
}
function ppShiftMonth(delta){
  ppCalMonthOffset += delta;
  renderPriorityPage();
}

function togglePriorityLinkPicker(){
  const picker = document.getElementById('ppLinkPicker');
  if(!picker) return;
  const willShow = picker.style.display !== 'flex';
  picker.style.display = willShow ? 'flex' : 'none';
  if(willShow){ populatePriorityLinkSubjects(); picker.scrollIntoView({behavior:'smooth', block:'center'}); }
}
function ppAddGoalFromHero(){
  // Viewing a past day's recap has no add form — jump back to today first.
  if(ppSelectedDate < ppTodayKey()){
    ppSelectedDate = ppTodayKey();
    renderPriorityPage();
  }
  requestAnimationFrame(()=> togglePriorityLinkPicker());
}
function priorityLinkedLectureIds(){
  ppEnsure();
  const ids = new Set();
  Object.values(data.priorityPlanner.byDate).forEach(arr=>{
    arr.forEach(i=>{ if(i.link) ids.add(i.link.lectureId); });
  });
  return ids;
}
function populatePriorityLinkSubjects(){
  const sel = document.getElementById('ppLinkSubject');
  if(!sel) return;
  sel.innerHTML = data.subjects.length
    ? data.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
    : '<option value="">No subjects yet</option>';
  populatePriorityLinkLectures();
}
function populatePriorityLinkLectures(){
  const subjectSel = document.getElementById('ppLinkSubject');
  const lecSel = document.getElementById('ppLinkLecture');
  if(!subjectSel || !lecSel) return;
  const s = data.subjects.find(x=>x.id===subjectSel.value);
  if(!s){ lecSel.innerHTML = '<option value="">—</option>'; return; }
  const linkedIds = priorityLinkedLectureIds();
  const options = [];
  (s.units||[]).forEach(u=>{
    (u.lectures||[]).forEach(l=>{
      if(linkedIds.has(l.id)) return; // already planned for some date
      options.push(`<option value="${u.id}::${l.id}">${escapeHtml(u.name)} — ${escapeHtml(l.title)}</option>`);
    });
  });
  lecSel.innerHTML = options.length ? options.join('') : '<option value="">All lectures already planned</option>';
}
function confirmAddLinkedPriorityItem(){
  const subjectSel = document.getElementById('ppLinkSubject');
  const lecSel = document.getElementById('ppLinkLecture');
  const estInput = document.getElementById('ppLinkEst');
  const levelSel = document.getElementById('ppLinkLevel');
  const timeInput = document.getElementById('ppLinkTime');
  const typeSel = document.getElementById('ppLinkType');
  const subjectId = subjectSel && subjectSel.value;
  const val = lecSel && lecSel.value;
  if(!subjectId || !val || !val.includes('::')) return;
  const [unitId, lectureId] = val.split('::');
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s && s.units.find(x=>x.id===unitId);
  const l = u && u.lectures.find(x=>x.id===lectureId);
  if(!l) return;
  const key = ppSelectedDate || ppTodayKey();
  l.priority = true;
  l.plannedDate = key; // keeps the 📅 lecture-row badge + calendar heatmap in sync
  const estMinutes = estInput && estInput.value ? Math.max(0, parseInt(estInput.value, 10)) : null;
  const level = levelSel ? levelSel.value : 'medium';
  const time = timeInput && timeInput.value ? timeInput.value : null;
  const type = typeSel ? typeSel.value : 'Lecture';
  ppList(key).push({
    id: uid(), text: l.title, done: !!l.completed,
    link: { subjectId, unitId, lectureId },
    estMinutes, level, time, type
  });
  const picker = document.getElementById('ppLinkPicker');
  if(picker) picker.style.display = 'none';
  renderPriorityPage();
  renderDashQuickGrid();
  renderMain();
  renderDashPriority();
  renderCalendar();
  saveData();
  showToast(key===ppTodayKey() ? 'Added to today 🔥' : `Planned for ${formatPlanDateShort(key)} 📅`);
}
function deletePriorityItem(key, id){
  const arr = ppList(key);
  const item = arr.find(i=>i.id===id);
  data.priorityPlanner.byDate[key] = arr.filter(i=>i.id!==id);
  // Deleting a lecture-linked item un-flags the lecture too, so the two
  // stay in sync instead of the card staying flagged with nothing linking to it.
  if(item && item.link){
    const s = data.subjects.find(x=>x.id===item.link.subjectId);
    const u = s && s.units.find(x=>x.id===item.link.unitId);
    const l = u && u.lectures.find(x=>x.id===item.link.lectureId);
    if(l){ l.priority = false; if(l.plannedDate === key) delete l.plannedDate; }
    renderMain();
    renderDashPriority();
    renderCalendar();
  }
  renderPriorityPage();
  renderDashQuickGrid();
  saveData();
}
function togglePriorityItemDone(key, id){
  const item = ppList(key).find(i=>i.id===id);
  if(!item) return;
  if(item.link){
    // Linked items reflect the real lecture — toggle the actual lecture so
    // completion status, study time, and everywhere else stays consistent.
    toggleLecture(item.link.subjectId, item.link.unitId, item.link.lectureId);
    return; // toggleLecture already re-renders the page
  }
  item.done = !item.done;
  item.doneAt = item.done ? Date.now() : null;
  renderPriorityPage();
  renderDashQuickGrid();
  saveData();
}
function togglePriorityStar(key, id){
  const item = ppList(key).find(i=>i.id===id);
  if(!item) return;
  item.level = item.level === 'high' ? 'medium' : 'high';
  renderPriorityPage();
  saveData();
}
function openPriorityItemLink(subjectId, unitId, lectureId){
  closePriorityPlanner();
  jumpToLecture(subjectId, unitId, lectureId);
}
function carryOverToToday(){
  ppEnsure();
  const yKey = ppYesterdayKey();
  const tKey = ppTodayKey();
  const yList = data.priorityPlanner.byDate[yKey] || [];
  const unfinished = yList.filter(i => i.link
    ? !(getLecture(i.link.subjectId, i.link.unitId, i.link.lectureId) || {}).completed
    : !i.done);
  if(!unfinished.length){ showToast("Nothing unfinished from yesterday"); return; }
  const todayList = ppList(tKey);
  unfinished.forEach(item=>{
    todayList.push({...item, id: uid(), done:false, doneAt:null});
    if(item.link){
      const l = getLecture(item.link.subjectId, item.link.unitId, item.link.lectureId);
      if(l) l.plannedDate = tKey;
    }
  });
  data.priorityPlanner.byDate[yKey] = yList.filter(i=>!unfinished.includes(i));
  renderPriorityPage();
  renderDashQuickGrid();
  renderCalendar();
  saveData();
  showToast("Yesterday's unfinished items moved to today ✓");
}
function formatPPTimestamp(ms){
  if(!ms) return '';
  return new Date(ms).toLocaleDateString(undefined,{day:'2-digit',month:'short'}) + ', ' +
    new Date(ms).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
}
function ppItemRow(key, item, readOnly){
  const linked = !!item.link;
  const status = ppItemStatus(item);
  const doneAt = linked
    ? (getLecture(item.link.subjectId, item.link.unitId, item.link.lectureId) || {}).completedAt
    : item.doneAt;
  const starred = item.level === 'high';
  const iconHtml = status==='done' ? '✓' : status==='ongoing' ? '▶' : '';
  const timeHtml = item.time ? `<span class="pp-row-time">${formatTimeLabel(item.time)}</span>` : '';
  const doneSubHtml = (item.done && doneAt) ? `<div class="pp-row-donesub">✓ Completed • ${formatPPTimestamp(doneAt)}</div>` : (item.done ? `<div class="pp-row-donesub">✓ Completed</div>` : (readOnly ? `<div class="pp-row-donesub missed">✕ Not completed</div>` : ''));
  const estHtml = (!item.done && item.estMinutes) ? `<span class="pp-row-est">🕐 ${item.estMinutes} min</span>` : '';
  if(readOnly){
    return `<div class="pp-row ${status} readonly">
      <div class="pp-row-icon ${status}" title="${item.done?'Completed':'Not completed'}">${iconHtml}</div>
      <div class="pp-row-mid">
        <div class="pp-row-top" ${linked?`onclick="openPriorityItemLink('${item.link.subjectId}','${item.link.unitId}','${item.link.lectureId}')"`:''}>
          <span class="pp-row-title ${item.done?'strike':''}">${escapeHtml(item.text)}</span>
          <span class="pp-row-tag">${escapeHtml((item.type||'Lecture').toUpperCase())}</span>
        </div>
        ${estHtml ? `<div class="pp-row-meta">${estHtml}</div>` : ''}
        ${doneSubHtml}
      </div>
      ${timeHtml}
      ${starred ? '<span class="pp-row-star active" style="cursor:default;">★</span>' : ''}
    </div>`;
  }
  return `<div class="pp-row ${status}">
    <div class="pp-row-icon ${status}" onclick='togglePriorityItemDone("${key}","${item.id}")' title="${item.done?'Mark not done':'Mark done'}">${iconHtml}</div>
    <div class="pp-row-mid">
      <div class="pp-row-top" ${linked?`onclick="openPriorityItemLink('${item.link.subjectId}','${item.link.unitId}','${item.link.lectureId}')"`:''}>
        <span class="pp-row-title ${item.done?'strike':''}">${escapeHtml(item.text)}</span>
        <span class="pp-row-tag">${escapeHtml((item.type||'Lecture').toUpperCase())}</span>
      </div>
      ${estHtml ? `<div class="pp-row-meta">${estHtml}</div>` : ''}
      ${doneSubHtml}
    </div>
    ${timeHtml}
    <button type="button" class="pp-row-star ${starred?'active':''}" onclick="event.stopPropagation(); togglePriorityStar('${key}','${item.id}')" title="${starred?'Unstar':'Mark high priority'}">${starred?'★':'☆'}</button>
    <button type="button" class="pp-row-del" onclick="event.stopPropagation(); deletePriorityItem('${key}','${item.id}')" title="Delete">✕</button>
  </div>`;
}

function ppTodayPlanHtml(key){
  const isPast = key < ppTodayKey();
  const items = ppSortedItems(key);
  const total = items.length;
  const completed = items.filter(i=>i.done).length;
  const ongoing = items.filter(i=>!i.done && ppItemStatus(i)==='ongoing').length;
  const upcoming = total - completed - ongoing;
  const pct = total ? Math.round((completed/total)*100) : 0;
  const studiedSecs = isPast ? ppStudiedSecondsForDate(key) : 0;

  if(isPast){
    const listHtml = items.length
      ? items.map(item=>ppItemRow(key,item,true)).join('')
      : (studiedSecs > 0
          ? `<div class="pp-empty">No plan was set that day, but you studied <strong>${formatHuman(studiedSecs)}</strong> anyway 👏</div>`
          : `<div class="pp-empty"><span class="pp-empty-icon">📭</span>Nothing recorded for this day.</div>`);
    return `
    <div class="pp-card pp-plan-card">
      <div class="pp-plan-header">
        <div class="pp-plan-title">${ppPlanTitle(key)}</div>
        <div class="pp-plan-completed">${completed} / ${total} Completed</div>
      </div>
      <div class="pp-plan-tiles">
        <div class="pp-plan-tile"><span class="ppt-icon blue">📋</span><span class="ppt-val">${total}</span><span class="ppt-label">Planned</span></div>
        <div class="pp-plan-tile"><span class="ppt-icon green">✓</span><span class="ppt-val">${completed}</span><span class="ppt-label">Completed</span></div>
        <div class="pp-plan-tile"><span class="ppt-icon violet">🕐</span><span class="ppt-val">${formatHuman(studiedSecs)}</span><span class="ppt-label">Studied</span></div>
      </div>
      ${total ? `<div class="pp-plan-bar-track"><div class="pp-plan-bar-fill" style="width:${pct}%"></div></div><div class="pp-plan-bar-label">${pct}% Completed</div>` : ''}
      <div class="pp-readonly-note">📖 This day has already passed — you're viewing a recap, not editing it.</div>
      <div class="pp-list">${listHtml}</div>
    </div>`;
  }

  const listHtml = items.length
    ? items.map(item=>ppItemRow(key,item,false)).join('')
    : `<div class="pp-empty"><span class="pp-empty-icon">🗓️</span>Nothing here yet.<span class="pp-empty-sub">Plan ahead and stay consistent!</span></div>`;
  return `
  <div class="pp-card pp-plan-card">
    <div class="pp-plan-header">
      <div class="pp-plan-title">${ppPlanTitle(key)}</div>
      <div class="pp-plan-completed">${completed} / ${total} Completed</div>
    </div>
    <div class="pp-plan-tiles">
      <div class="pp-plan-tile"><span class="ppt-icon blue">📋</span><span class="ppt-val">${total}</span><span class="ppt-label">Total</span></div>
      <div class="pp-plan-tile"><span class="ppt-icon green">✓</span><span class="ppt-val">${completed}</span><span class="ppt-label">Completed</span></div>
      <div class="pp-plan-tile"><span class="ppt-icon orange">◐</span><span class="ppt-val">${ongoing}</span><span class="ppt-label">Ongoing</span></div>
      <div class="pp-plan-tile"><span class="ppt-icon violet">◔</span><span class="ppt-val">${upcoming}</span><span class="ppt-label">Upcoming</span></div>
    </div>
    <div class="pp-plan-bar-track"><div class="pp-plan-bar-fill" style="width:${pct}%"></div></div>
    <div class="pp-plan-bar-label">${pct}% Completed</div>

    <button type="button" class="pp-link-toggle" onclick="togglePriorityLinkPicker()">+ Add a goal / task / lecture</button>
    <div class="pp-link-picker" id="ppLinkPicker">
      <select id="ppLinkSubject" onchange="populatePriorityLinkLectures()"></select>
      <select id="ppLinkLecture"></select>
      <div class="pp-link-picker-row">
        <input type="time" id="ppLinkTime" title="Scheduled time (optional)">
        <input type="number" id="ppLinkEst" placeholder="Est. min" min="0" step="5">
      </div>
      <div class="pp-link-picker-row">
        <select id="ppLinkType">
          <option value="Lecture">Lecture</option>
          <option value="Practice">Practice</option>
          <option value="Lab">Lab</option>
          <option value="Revision">Revision</option>
        </select>
        <select id="ppLinkLevel">
          <option value="high">🔴 High</option>
          <option value="medium" selected>🟠 Medium</option>
          <option value="low">🟢 Low</option>
        </select>
      </div>
      <button type="button" onclick="confirmAddLinkedPriorityItem()">Add to plan</button>
    </div>

    <div class="pp-list">${listHtml}</div>
  </div>`;
}

function ppProgressCardHtml(){
  const key = ppTodayKey();
  const items = ppList(key);
  const total = items.length;
  const completed = items.filter(i=>i.done).length;
  const ongoing = items.filter(i=>!i.done && ppItemStatus(i)==='ongoing').length;
  const remaining = total - completed - ongoing;
  const pct = total ? Math.round((completed/total)*100) : 0;
  const r = 36, c = 2*Math.PI*r, offset = c - (pct/100)*c;
  const todaySnap = getTodaySnapshot();
  const days = [];
  for(let i=6;i>=0;i--){
    const d = new Date(); d.setDate(d.getDate()-i);
    const k = todayKey(d);
    const secs = k===todayKey() ? todaySnap.total : ((data.dailyLog && data.dailyLog[k]) ? data.dailyLog[k].total : 0);
    days.push({ label: d.toLocaleDateString(undefined,{weekday:'narrow'}), mins: Math.round(secs/60), isToday: k===todayKey() });
  }
  const maxMin = Math.max(1, ...days.map(d=>d.mins));
  const barsHtml = days.map(d=>{
    const h = Math.max(4, Math.round((d.mins/maxMin)*44));
    return `<div class="ppwk-bar-wrap"><div class="ppwk-bar ${d.isToday?'today':''}" style="height:${h}px" title="${d.mins} min"></div><span class="ppwk-day">${d.label}</span></div>`;
  }).join('');
  const msg = total===0 ? 'Nothing planned yet — add your first goal above.'
    : pct>=80 ? "You're crushing it today! 🔥"
    : pct>=40 ? 'Great start! Keep it up 🎉'
    : "Let's get moving — every lecture counts.";
  return `
  <div class="pp-card">
    <div class="pp-card-title">Today's Progress</div>
    <div class="pp-progress-tiles">
      <div class="pp-progress-tile"><span class="ppt-label">Total</span><span class="ppt-val blue">${total}</span></div>
      <div class="pp-progress-tile"><span class="ppt-label">Completed</span><span class="ppt-val green">${completed}</span></div>
      <div class="pp-progress-tile"><span class="ppt-label">Ongoing</span><span class="ppt-val orange">${ongoing}</span></div>
      <div class="pp-progress-tile"><span class="ppt-label">Remaining</span><span class="ppt-val violet">${remaining}</span></div>
    </div>
    <div class="pp-progress-body">
      <div class="pp-ring-wrap lg">
        <svg viewBox="0 0 88 88">
          <circle class="pp-ring-track" cx="44" cy="44" r="${r}"></circle>
          <circle class="pp-ring-fill" cx="44" cy="44" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
        </svg>
        <div class="pp-ring-label lg">${pct}%<span>Completed</span></div>
      </div>
      <div class="ppwk-chart">
        <div class="ppwk-msg">${msg}</div>
        <div class="ppwk-bars">${barsHtml}</div>
      </div>
    </div>
  </div>`;
}

function jumpToCalendar(){
  closePriorityPlanner();
  const cal = document.getElementById('calTerminal');
  if(cal) cal.scrollIntoView({behavior:'smooth', block:'center'});
}
function jumpToEventsCard(){
  requestAnimationFrame(()=>{
    const form = document.getElementById('ppEventForm');
    if(form) form.scrollIntoView({behavior:'smooth', block:'center'});
  });
}

function ppQuickActionsGridHtml(){
  let allLectures = 0, completed = 0;
  data.subjects.forEach(s=>(s.units||[]).forEach(u=>(u.lectures||[]).forEach(l=>{ allLectures++; if(l.completed) completed++; })));
  return `
  <div class="pp-card">
    <div class="pp-card-title">Quick Actions</div>
    <div class="pp-qa-grid">
      <button type="button" class="pp-qa-tile" onclick="closePriorityPlanner()">
        <span class="pp-qa-tile-icon blue">📖</span><span class="pp-qa-tile-label">All Lectures</span><span class="pp-qa-tile-sub">${allLectures} total</span>
      </button>
      <button type="button" class="pp-qa-tile" onclick="jumpToCalendar()">
        <span class="pp-qa-tile-icon violet">📅</span><span class="pp-qa-tile-label">Calendar View</span><span class="pp-qa-tile-sub">Open</span>
      </button>
      <button type="button" class="pp-qa-tile" onclick="startFocusFromPlanner()">
        <span class="pp-qa-tile-icon red">🎯</span><span class="pp-qa-tile-label">Focus Mode</span><span class="pp-qa-tile-sub">Start</span>
      </button>
      <button type="button" class="pp-qa-tile" onclick="toggleAddEventForm(); jumpToEventsCard()">
        <span class="pp-qa-tile-icon green">📌</span><span class="pp-qa-tile-label">Add Event</span><span class="pp-qa-tile-sub">Create</span>
      </button>
    </div>
  </div>`;
}

function startFocusFromPlanner(itemId){
  const items = ppList(ppTodayKey());
  const target = itemId ? items.find(i=>i.id===itemId) : items.find(i=>!i.done && i.link);
  if(!target || !target.link){ showToast("Nothing linked to focus on"); return; }
  closePriorityPlanner();
  openFocusMode(target.link.subjectId, target.link.unitId, target.link.lectureId);
}

function ppNextUpItem(){
  const items = ppSortedItems(ppTodayKey()).filter(i=>!i.done);
  const now = new Date();
  const nowMins = now.getHours()*60 + now.getMinutes();
  const withTime = items.filter(i=>i.time);
  const upcoming = withTime.find(i=>{
    const [h,m] = i.time.split(':').map(Number);
    return (h*60+m) >= nowMins;
  });
  if(upcoming) return upcoming;
  return items.find(i=>i.link) || items[0] || null;
}
function ppNextUpHtml(){
  const item = ppNextUpItem();
  if(!item){
    return `<div class="pp-card pp-nextup-card">
      <div class="pp-card-title">Next Up</div>
      <div class="pp-nextup-empty">Nothing queued right now 🎉</div>
    </div>`;
  }
  let countdown = '';
  if(item.time){
    const now = new Date();
    const [h,m] = item.time.split(':').map(Number);
    const target = new Date(); target.setHours(h,m,0,0);
    const diffMin = Math.round((target-now)/60000);
    if(diffMin <= 0) countdown = 'Now';
    else{
      const hh = Math.floor(diffMin/60), mm = diffMin%60;
      countdown = hh>0 ? `In ${hh}h ${mm}m` : `In ${mm}m`;
    }
  }
  return `<div class="pp-card pp-nextup-card">
    <div class="pp-card-title">Next Up</div>
    ${item.time?`<div class="pp-nextup-time">${formatTimeLabel(item.time)}</div>`:''}
    <div class="pp-nextup-name">${escapeHtml(item.text)} <span class="pp-nextup-tag">${escapeHtml((item.type||'Lecture').toUpperCase())}</span></div>
    <div class="pp-nextup-sub"><span>🕐</span>${countdown||"Whenever you're ready"}</div>
    <button type="button" class="pp-nextup-btn" onclick="startFocusFromPlanner('${item.id}')">▶ Start Focus</button>
  </div>`;
}

function ppEventIcon(cat){
  return cat==='holiday' ? '🇮🇳' : cat==='exam' ? '📘' : cat==='deadline' ? '💼' : '📌';
}
function ppUpcomingEvents(limit){
  ppEnsure();
  const todayK = ppTodayKey();
  return data.events.filter(e=>e.date>=todayK).sort((a,b)=>a.date.localeCompare(b.date)).slice(0, limit||4);
}
function ppImportantEvents(limit){
  ppEnsure();
  const todayK = ppTodayKey();
  const imp = data.events.filter(e=>e.important && e.date>=todayK).sort((a,b)=>a.date.localeCompare(b.date));
  const list = imp.length ? imp : ppUpcomingEvents(999);
  return list.slice(0, limit||4);
}
function ppEventRowHtml(e){
  const [y,m,d] = e.date.split('-').map(Number);
  const label = new Date(y,m-1,d).toLocaleDateString(undefined,{day:'2-digit', month:'short'});
  return `<div class="pp-event-row">
    <span class="pp-event-icon">${ppEventIcon(e.category)}</span>
    <div class="pp-event-info">
      <span class="pp-event-date">${label}</span>
      <span class="pp-event-title">${escapeHtml(e.title)}</span>
    </div>
    <button type="button" class="pp-event-del" onclick="deleteEvent('${e.id}')" title="Remove">✕</button>
  </div>`;
}
function ppEventsCardHtml(kind){
  const isUpcoming = kind === 'upcoming';
  const list = isUpcoming ? ppUpcomingEvents(4) : ppImportantEvents(4);
  const title = isUpcoming ? 'Upcoming Events' : 'Important Dates';
  const rows = list.length ? list.map(ppEventRowHtml).join('') : `<div class="pp-empty-mini">Nothing on the calendar yet.</div>`;
  const formHtml = isUpcoming ? `<div class="pp-event-form" id="ppEventForm">
      <input type="text" id="ppEventTitle" placeholder="e.g. Mid Sem Exam">
      <div class="pp-link-picker-row">
        <input type="date" id="ppEventDate">
        <select id="ppEventCategory">
          <option value="holiday">🇮🇳 Holiday</option>
          <option value="exam">📘 Exam</option>
          <option value="deadline">💼 Deadline</option>
          <option value="other">📌 Other</option>
        </select>
      </div>
      <label class="pp-event-important-check"><input type="checkbox" id="ppEventImportant"> Mark as important</label>
      <button type="button" onclick="confirmAddEvent()">Save event</button>
    </div>` : '';
  return `
  <div class="pp-card">
    <div class="pp-card-title-row">
      <span class="pp-card-title">${title}</span>
      ${isUpcoming ? `<button type="button" class="pp-card-add" onclick="toggleAddEventForm()">+ Add</button>` : ''}
    </div>
    ${formHtml}
    <div class="pp-event-list">${rows}</div>
  </div>`;
}
function toggleAddEventForm(){
  const form = document.getElementById('ppEventForm');
  if(!form) return;
  const willShow = form.style.display !== 'flex';
  form.style.display = willShow ? 'flex' : 'none';
}
function confirmAddEvent(){
  const titleInput = document.getElementById('ppEventTitle');
  const dateInput = document.getElementById('ppEventDate');
  const catSel = document.getElementById('ppEventCategory');
  const impCheck = document.getElementById('ppEventImportant');
  const title = titleInput && titleInput.value.trim();
  const date = dateInput && dateInput.value;
  if(!title || !date){ showToast('Add a title and date first'); return; }
  ppEnsure();
  data.events.push({ id: uid(), title, date, category: catSel?catSel.value:'other', important: !!(impCheck && impCheck.checked) });
  saveData();
  renderPriorityPage();
  showToast('Event added 📌');
}
function deleteEvent(id){
  ppEnsure();
  data.events = data.events.filter(e=>e.id!==id);
  saveData();
  renderPriorityPage();
}

function ppMonthCalHtml(){
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth()+ppCalMonthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const monthLabel = base.toLocaleDateString(undefined,{month:'long', year:'numeric'});
  const firstDow = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const daysInPrevMonth = new Date(year,month,0).getDate();
  const todayK = ppTodayKey();
  let cells = '';
  for(let i=firstDow-1;i>=0;i--){
    cells += `<div class="ppmc-cell other">${daysInPrevMonth-i}</div>`;
  }
  for(let d=1; d<=daysInMonth; d++){
    const key = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = key===todayK;
    const isSelected = key===ppSelectedDate;
    const isPast = key < todayK;
    const hasItems = (data.priorityPlanner.byDate[key]||[]).length > 0;
    const hasEvent = data.events.some(e=>e.date===key);
    const studied = isPast && ppStudiedSecondsForDate(key) > 0;
    const dotClass = hasEvent ? 'evt' : studied ? 'studied' : '';
    cells += `<div class="ppmc-cell ${isToday?'is-today':''} ${isSelected?'selected':''} ${isPast?'past':''}" onclick="ppSelectDate('${key}')" title="${isPast?'View what was planned/studied':''}">${d}${(hasItems||hasEvent||studied)?`<span class="ppmc-dot ${dotClass}"></span>`:''}</div>`;
  }
  return `
  <div class="pp-card pp-cal-card">
    <div class="pp-card-title">Calendar</div>
    <div class="ppmc-nav">
      <button type="button" onclick="ppShiftMonth(-1)">‹</button>
      <span class="ppmc-month">${monthLabel}</span>
      <button type="button" onclick="ppShiftMonth(1)">›</button>
    </div>
    <div class="ppmc-grid ppmc-dow"><div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div></div>
    <div class="ppmc-grid">${cells}</div>
  </div>`;
}

const PP_TIPS = [
  'Break big topics into smaller lectures and track your progress daily.',
  'Plan tomorrow before you close the laptop tonight — future you will thank you.',
  'A 25-minute focused block beats 2 distracted hours. Try Focus Mode.',
  "Use Carry Over each morning so yesterday's leftovers don't just vanish.",
  'Discipline today, success tomorrow.',
  'Tap any date on the calendar to plan specifically for that day.'
];
function ppQuoteHtml(){
  if(!ppQuoteText) ppQuoteText = PP_TIPS[Math.floor(Math.random()*PP_TIPS.length)];
  return `<div class="pp-card pp-quote-card"><span class="pp-quote-mark">"</span><p>${escapeHtml(ppQuoteText)}</p></div>`;
}

function ppGreetingHtml(){
  const h = new Date().getHours();
  const greeting = h<12 ? 'Good Morning' : h<17 ? 'Good Afternoon' : 'Good Evening';
  const wave = h<12 ? '👋' : h<17 ? '☀️' : '🌙';
  const namePart = (typeof MASCOT_NAME !== 'undefined' && MASCOT_NAME && MASCOT_NAME !== 'friend') ? `, ${escapeHtml(MASCOT_NAME)}` : '';
  return `<div class="pp-greeting"><h2>${greeting}${namePart}! ${wave}</h2><p>Let's make today productive and meaningful.</p></div>`;
}
function ppHeroHtml(){
  return `<div class="pp-hero">
    <div class="pp-hero-text">
      <h3>Plan your day<br>with <span class="accent">purpose</span>.</h3>
      <p>Stay focused on what matters and make every day count.</p>
      <button type="button" class="pp-hero-btn" onclick="ppAddGoalFromHero()">+ Add Goal</button>
    </div>
    <div class="pp-hero-art">🎯</div>
  </div>`;
}

function ppDateStripHtml(){
  const todayK = ppTodayKey();
  const cells = [];
  for(let i=0;i<14;i++){
    const d = new Date(); d.setDate(d.getDate()+i);
    const key = todayKey(d);
    const hasItems = (data.priorityPlanner.byDate[key]||[]).length > 0;
    const isSelected = key === ppSelectedDate;
    const isToday = key === todayK;
    const wk = i===0 ? 'Today' : i===1 ? 'Tmrw' : d.toLocaleDateString(undefined,{weekday:'short'});
    cells.push(`<button type="button" class="pp-date-chip ${isSelected?'selected':''} ${isToday?'is-today':''}" onclick="ppSelectDate('${key}')" title="${d.toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'})}">
      <span class="pp-date-chip-wk">${wk.slice(0,3)}</span>
      <span class="pp-date-chip-num">${d.getDate()}</span>
      ${hasItems?'<span class="pp-date-chip-dot"></span>':''}
    </button>`);
  }
  return `<div class="pp-datestrip-wrap">
    <div class="pp-datestrip" id="ppDateStrip">${cells.join('')}</div>
    <input type="date" id="ppJumpDate" class="pp-datestrip-jump" value="${ppSelectedDate}" onchange="ppSelectDate(this.value)" title="Jump to any date, past or future">
  </div>`;
}

function ppCarryBannerHtml(){
  const yList = ppList(ppYesterdayKey());
  const unfinished = yList.filter(i => i.link
    ? !(getLecture(i.link.subjectId, i.link.unitId, i.link.lectureId) || {}).completed
    : !i.done);
  if(!unfinished.length) return '';
  return `<div class="pp-carry-banner">
    <span class="pp-carry-icon">🔄</span>
    <span class="pp-carry-text">You have ${unfinished.length} unfinished task${unfinished.length>1?'s':''} from yesterday</span>
    <button type="button" class="pp-carry-btn" onclick="carryOverToToday()">Review Tasks</button>
  </div>`;
}

function renderPriorityPage(){
  ppEnsure();
  if(!ppSelectedDate || ppSelectedDate < ppTodayKey()) ppSelectedDate = ppTodayKey();
  const view = document.getElementById('priorityView');
  if(!view) return;
  const key = ppSelectedDate;
  view.innerHTML = `
    <div class="pp-page">
      ${ppGreetingHtml()}
      <div class="pp-page-grid">
        <div class="pp-page-main">
          ${ppHeroHtml()}
          ${ppDateStripHtml()}
          ${ppTodayPlanHtml(key)}
          ${ppProgressCardHtml()}
          ${ppQuickActionsGridHtml()}
        </div>
        <div class="pp-page-side">
          ${ppFolderCardHtml()}
          ${ppMonthCalHtml()}
          ${ppEventsCardHtml('upcoming')}
          ${ppNextUpHtml()}
          ${ppEventsCardHtml('important')}
          ${ppQuoteHtml()}
        </div>
      </div>
      ${ppCarryBannerHtml()}
    </div>
  `;
  requestAnimationFrame(()=>{
    const strip = document.getElementById('ppDateStrip');
    const sel = strip && strip.querySelector('.pp-date-chip.selected');
    if(sel) sel.scrollIntoView({inline:'center', block:'nearest'});
  });
}

// Live-refresh the Next Up countdown / ongoing status once a minute while
// this tab is open, without needing the person to touch anything.
setInterval(()=>{ if(currentView==='priority' && !document.hidden) renderPriorityPage(); }, 60000);

function setChartRange(days, btn){
  chartRange = days;
  document.querySelectorAll('#progressOverlay .range-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderProgressChart(days);
}

// Total seconds studied on a given day.
function getDayTotalSeconds(dateObj){
  const key = todayKey(dateObj);
  const now = new Date();
  return (key===todayKey(now)) ? getTodaySnapshot().total : ((data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0);
}

function renderProgressChart(days){
  const wrap = document.getElementById('chartWrap');
  const legend = document.getElementById('chartLegend');
  if(!wrap) return;
  const now = new Date();
  const points = [];
  for(let i=days-1;i>=0;i--){
    const d = new Date(now);
    d.setDate(d.getDate()-i);
    const key = todayKey(d);
    const seconds = getDayTotalSeconds(d);
    points.push({date:d, key, seconds});
  }

  const totalSeconds = points.reduce((s,p)=>s+p.seconds,0);
  const activeDays = points.filter(p=>p.seconds>0).length;
  const avgSeconds = activeDays ? totalSeconds/activeDays : 0;
  const bestPoint = points.reduce((best,p)=> (!best||p.seconds>best.seconds)?p:best, null);

  // Everything below the main trend line also depends on the selected range,
  // so refresh the whole Analytics Centre together.
  renderKPIStats();
  const rows = getSubjectSeries(days);
  renderSubjectDonut(rows);
  renderSubjectBars(rows);
  renderMultiLineComparison(rows, days);
  renderCompletionRing();
  renderQuickStats(rows, days);
  renderSubjectGraphsFromRows(rows);

  if(totalSeconds===0){
    const rangeLabel = days===1 ? 'today' : `the last ${days} days`;
    wrap.innerHTML = `<div class="chart-empty">No study time logged ${rangeLabel} yet.<br>Start a lecture timer to see your graph grow 📈</div>`;
    legend.innerHTML = '';
    return;
  }

  const maxSeconds = Math.max(...points.map(p=>p.seconds), 3600);
  const maxHoursRounded = Math.ceil((maxSeconds/3600)*1.15) || 1;
  const maxScaled = maxHoursRounded*3600;

  const W = 520, H = 230;
  const padL = 34, padR = 12, padT = 14, padB = 26;
  const plotW = W-padL-padR, plotH = H-padT-padB;
  const stepX = points.length>1 ? plotW/(points.length-1) : 0;

  const coords = points.map((p,i)=>{
    const x = padL + stepX*i;
    const y = padT + plotH - (p.seconds/maxScaled)*plotH;
    return {x, y, ...p};
  });

  const linePath = smoothPath(coords);
  const baseY = (padT+plotH).toFixed(1);
  const areaPath = linePath + ` L${coords[coords.length-1].x.toFixed(1)},${baseY} L${coords[0].x.toFixed(1)},${baseY} Z`;

  let gridHtml = '';
  const gridLevels = 4;
  for(let g=0; g<=gridLevels; g++){
    const y = padT + plotH - (g/gridLevels)*plotH;
    const hoursLabel = Math.round((g/gridLevels)*maxHoursRounded*10)/10;
    gridHtml += `<line class="chart-gridline" x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}"/>`;
    gridHtml += `<text class="chart-axis-label" x="${padL-6}" y="${(y+3).toFixed(1)}" text-anchor="end">${hoursLabel}h</text>`;
  }

  const labelEvery = days<=14 ? 1 : (days<=21 ? 2 : 3);
  const dayLabelsHtml = coords.map((c,i)=>{
    if(i%labelEvery!==0 && i!==coords.length-1) return '';
    const lbl = c.date.toLocaleDateString(undefined,{day:'numeric', month:'short'});
    return `<text class="chart-day-label" x="${c.x.toFixed(1)}" y="${H-6}">${lbl}</text>`;
  }).join('');

  const dotsHtml = coords.map(c=>{
    const isToday = c.key===todayKey(now);
    const label = c.date.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'});
    const timeLabel = c.seconds>0 ? formatHuman(c.seconds) : 'No study logged';
    return `<circle class="chart-dot ${isToday?'is-today':''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4"><title>${label} — ${timeLabel}</title></circle>`;
  }).join('');

  wrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chartLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#4f8dfd"/>
          <stop offset="100%" stop-color="#39d353"/>
        </linearGradient>
        <linearGradient id="chartAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#4f8dfd" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#4f8dfd" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${gridHtml}
      <path class="chart-area" d="${areaPath}"/>
      <path class="chart-line" id="chartLinePath" d="${linePath}"/>
      ${dotsHtml}
      ${dayLabelsHtml}
    </svg>
  `;

  legend.innerHTML = `
    <span class="stat-chip time">Total ${formatHuman(totalSeconds)}</span>
    <span class="stat-chip done">Daily avg ${formatHuman(avgSeconds)}</span>
    <span class="stat-chip test">Best day ${formatHuman(bestPoint.seconds)}</span>
  `;

  requestAnimationFrame(()=>{
    const path = document.getElementById('chartLinePath');
    if(path){
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)';
      requestAnimationFrame(()=>{ path.style.strokeDashoffset = 0; });
    }
  });
}

function smoothPath(coords){
  if(!coords.length) return '';
  if(coords.length===1) return `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  let d = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)}`;
  for(let i=0;i<coords.length-1;i++){
    const c0=coords[i], c1=coords[i+1];
    const mx=((c0.x+c1.x)/2).toFixed(1), my=((c0.y+c1.y)/2).toFixed(1);
    d += ` Q${c0.x.toFixed(1)},${c0.y.toFixed(1)} ${mx},${my}`;
  }
  const last=coords[coords.length-1];
  d += ` L${last.x.toFixed(1)},${last.y.toFixed(1)}`;
  return d;
}

function getSubjectSeries(days){
  const now = new Date();
  const todayK = todayKey(now);
  const todaySnap = getTodaySnapshot();
  return (data.subjects||[]).map((s,i)=>{
    const color = SUBJECT_GRAPH_COLORS[i % SUBJECT_GRAPH_COLORS.length];
    const points = [];
    for(let d=days-1; d>=0; d--){
      const day = new Date(now);
      day.setDate(day.getDate()-d);
      const key = todayKey(day);
      const seconds = (key===todayK) ? (todaySnap.bySubject[s.id]||0) : ((data.dailyLog && data.dailyLog[key] && data.dailyLog[key].bySubject) ? (data.dailyLog[key].bySubject[s.id]||0) : 0);
      points.push({seconds, key, date: day});
    }
    const total = points.reduce((a,p)=>a+p.seconds,0);
    return {s, color, points, total};
  });
}

function rangeTotal(days){
  let sum = 0;
  const now = new Date();
  for(let d=0; d<days; d++){
    const day = new Date(now);
    day.setDate(day.getDate()-d);
    sum += getDayTotalSeconds(day);
  }
  return sum;
}

function renderKPIStats(){
  const el = document.getElementById('acKpiRow');
  if(!el) return;
  const today = getDayTotalSeconds(new Date());
  const week = rangeTotal(7);
  const month = rangeTotal(30);
  el.innerHTML = `
    <div class="ac-kpi-card kpi-today">
      <div class="ac-kpi-label">Today</div>
      <div class="ac-kpi-value">${formatHuman(today)}</div>
    </div>
    <div class="ac-kpi-card kpi-week">
      <div class="ac-kpi-label">This week</div>
      <div class="ac-kpi-value">${formatHuman(week)}</div>
    </div>
    <div class="ac-kpi-card kpi-month">
      <div class="ac-kpi-label">This month</div>
      <div class="ac-kpi-value">${formatHuman(month)}</div>
    </div>
  `;
}

function renderSubjectDonut(rows){
  const el = document.getElementById('acDonutWrap');
  if(!el) return;
  const active = rows.filter(r=>r.total>0);
  const grandTotal = active.reduce((a,r)=>a+r.total,0);
  if(!active.length || grandTotal===0){
    el.innerHTML = `<div class="ac-donut-empty">No study time in this range yet.</div>`;
    return;
  }
  const size=130, stroke=16, r=(size-stroke)/2, cx=size/2, cy=size/2, C=2*Math.PI*r;
  let offset = 0;
  const segs = active.map(row=>{
    const frac = row.total/grandTotal;
    const len = frac*C;
    const seg = `<circle class="ac-donut-seg" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${row.color}" stroke-width="${stroke}"
      stroke-dasharray="${len.toFixed(2)} ${(C-len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" stroke-linecap="butt"
      transform="rotate(-90 ${cx} ${cy})" style="filter:drop-shadow(0 0 4px ${row.color}90)"><title>${escapeHtml(row.s.name)} — ${formatPct(frac*100)}</title></circle>`;
    offset += len;
    return seg;
  }).join('');
  // A soft specular glint near the top of the ring, like light catching polished glass.
  const glassHighlight = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="${(stroke*0.32).toFixed(1)}"
    stroke-dasharray="${(C*0.12).toFixed(2)} ${(C*0.88).toFixed(2)}" stroke-dashoffset="${(C*0.06).toFixed(2)}"
    stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" style="filter:blur(1.2px)"/>`;
  const legendHtml = active
    .slice().sort((a,b)=>b.total-a.total)
    .map(row=>`<div class="ac-donut-legend-row">
      <span class="ac-donut-legend-dot" style="${shinyDotStyle(row.color)}"></span>
      <span class="ac-donut-legend-name">${escapeHtml(row.s.name)}</span>
      <span class="ac-donut-legend-pct">${Math.round((row.total/grandTotal)*100)}%</span>
    </div>`).join('');

  el.innerHTML = `
    <div class="ac-donut-row">
      <svg class="ac-donut-svg" viewBox="0 0 ${size} ${size}">
        ${segs}
        <text class="ac-donut-center-num" x="${cx}" y="${cy-3}" text-anchor="middle" font-size="17" fill="#e6edf3">${formatHuman(grandTotal)}</text>
        <text x="${cx}" y="${cy+14}" text-anchor="middle" font-size="8.5" fill="#7d8590" font-family="'JetBrains Mono',monospace">TOTAL</text>
      </svg>
      <div class="ac-donut-legend">${legendHtml}</div>
    </div>
  `;
}

function renderSubjectBars(rows){
  const el = document.getElementById('acBarsWrap');
  if(!el) return;
  const active = rows.filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
  if(!active.length){
    el.innerHTML = `<div class="ac-bars-empty">No study time in this range yet.</div>`;
    return;
  }
  const maxTotal = Math.max(...active.map(r=>r.total), 1);
  el.innerHTML = `<div class="ac-bars">${active.map(row=>`
    <div class="ac-bar-row">
      <div class="ac-bar-label-row">
        <span class="ac-bar-name">${escapeHtml(row.s.name)}</span>
        <span class="ac-bar-value">${formatHuman(row.total)}</span>
      </div>
      <div class="ac-bar-track"><div class="ac-bar-fill" data-w="${(row.total/maxTotal*100).toFixed(1)}" style="background:linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0) 45%), linear-gradient(90deg, ${row.color}, ${row.color}cc); box-shadow:0 0 8px ${row.color}55;"></div></div>
    </div>
  `).join('')}</div>`;
  requestAnimationFrame(()=>{
    el.querySelectorAll('.ac-bar-fill').forEach(bar=>{ bar.style.width = bar.dataset.w + '%'; });
  });
}

function renderMultiLineComparison(rows, days){
  const el = document.getElementById('acMultiLineWrap');
  if(!el) return;
  const active = rows.filter(r=>r.total>0);
  if(!active.length){
    el.innerHTML = `<div class="ac-donut-empty">No study time in this range yet — start a timer to see subjects compared here.</div>`;
    return;
  }
  const W=680, H=200, padL=30, padR=12, padT=12, padB=22;
  const plotW=W-padL-padR, plotH=H-padT-padB;
  const n = active[0].points.length;
  const stepX = n>1 ? plotW/(n-1) : 0;
  const maxSeconds = Math.max(...active.flatMap(r=>r.points.map(p=>p.seconds)), 60);

  let gridHtml = '';
  for(let g=0; g<=3; g++){
    const y = padT + plotH - (g/3)*plotH;
    gridHtml += `<line class="ac-ml-gridline" x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}"/>`;
  }
  const labelEvery = days<=14 ? 2 : (days<=21 ? 3 : 5);
  const dayLabels = active[0].points.map((p,i)=>{
    if(i%labelEvery!==0 && i!==n-1) return '';
    const x = padL + stepX*i;
    return `<text class="ac-ml-axis-label" x="${x.toFixed(1)}" y="${H-6}" text-anchor="middle">${p.date.toLocaleDateString(undefined,{day:'numeric', month:'short'})}</text>`;
  }).join('');

  const linesHtml = active.map(row=>{
    const coords = row.points.map((p,i)=>({
      x: padL + stepX*i,
      y: padT + plotH - (p.seconds/maxSeconds)*plotH,
      ...p
    }));
    const path = smoothPath(coords);
    const dots = coords.map(c=>{
      const label = c.date.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'});
      const timeLabel = c.seconds>0 ? formatHuman(c.seconds) : 'No study logged';
      return `<circle class="ac-ml-dot" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3" fill="${row.color}"><title>${escapeHtml(row.s.name)}: ${label} — ${timeLabel}</title></circle>`;
    }).join('');
    return `<path class="ac-ml-line" d="${path}" stroke="${row.color}" style="filter:drop-shadow(0 0 4px ${row.color}88)"/>${dots}`;
  }).join('');

  const legendHtml = active.map(row=>`<div class="ac-ml-legend-item"><span class="ac-ml-legend-dot" style="${shinyDotStyle(row.color)}"></span>${escapeHtml(row.s.name)}</div>`).join('');

  el.innerHTML = `
    <svg class="ac-multiline-svg" viewBox="0 0 ${W} ${H}">
      ${gridHtml}
      ${linesHtml}
      ${dayLabels}
    </svg>
    <div class="ac-ml-legend">${legendHtml}</div>
  `;
}

function renderCompletionRing(){
  const el = document.getElementById('acRingWrap');
  if(!el) return;

  let total=0, done=0;
  (data.subjects||[]).forEach(s => (s.units||[]).forEach(u => (u && (u.lectures||[])).forEach(l => { total++; if(l && l.completed) done++; })));
  const pct = total ? Math.round((done/total)*100) : 0;

  const size=120, stroke=14, r=(size-stroke)/2, cx=size/2, cy=size/2, C=2*Math.PI*r;
  const dash = (pct/100)*C;

  let bestSubject = null, bestVal=-1;
  (data.subjects||[]).forEach(s=>{
    const sec = subjectSeconds(s);
    if(sec>bestVal){ bestVal=sec; bestSubject=s; }
  });

  el.innerHTML = `
    <div class="ac-ring-wrap-inner">
      <svg class="ac-ring-svg" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="${stroke}"/>
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#39d353" stroke-width="${stroke}" stroke-linecap="round"
          stroke-dasharray="${dash.toFixed(2)} ${C.toFixed(2)}" stroke-dashoffset="0" transform="rotate(-90 ${cx} ${cy})"
          style="filter:drop-shadow(0 0 6px rgba(57,211,83,0.6)); transition:stroke-dasharray 1s cubic-bezier(.4,0,.2,1);"/>
        <text class="ac-ring-center-value" x="${cx}" y="${cy+2}" text-anchor="middle">${pct}%</text>
        <text class="ac-ring-center-label" x="${cx}" y="${cy+16}" text-anchor="middle">DONE</text>
      </svg>
      <div class="ac-ring-stats">
        <div class="ac-ring-stat-line"><span>Lectures done</span><b>${done} / ${total}</b></div>
        <div class="ac-ring-stat-line"><span>Subjects tracked</span><b>${(data.subjects||[]).length}</b></div>
        <div class="ac-ring-stat-line"><span>Most studied</span><b>${bestSubject ? escapeHtml(bestSubject.name) : '—'}</b></div>
      </div>
    </div>
  `;
}

function renderQuickStats(rows, days){
  const el = document.getElementById('acQuickStats');
  if(!el) return;

  // Current streak: consecutive days (walking back from today) with any study logged.
  const now = new Date();
  let streak = 0;
  for(let d=0; d<365; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const seconds = getDayTotalSeconds(day);
    if(seconds>0) streak++;
    else break;
  }

  // Most active weekday across the selected range.
  const weekdayTotals = [0,0,0,0,0,0,0];
  rows.forEach(row=> row.points.forEach(p=>{ weekdayTotals[p.date.getDay()] += p.seconds; }));
  const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let bestDayIdx = 0;
  weekdayTotals.forEach((v,i)=>{ if(v>weekdayTotals[bestDayIdx]) bestDayIdx = i; });
  const hasWeekdayData = weekdayTotals.some(v=>v>0);

  const active = rows.filter(r=>r.total>0).sort((a,b)=>b.total-a.total);
  const leader = active[0];

  el.innerHTML = `
    <div class="ac-quick-list">
      <div class="ac-quick-item">
        <div class="ac-quick-icon" style="background:rgba(255,159,107,0.15); color:#ff9f6b;">🔥</div>
        <div class="ac-quick-text">
          <span class="ac-quick-label">Current streak</span>
          <span class="ac-quick-value">${streak} day${streak===1?'':'s'}</span>
        </div>
      </div>
      <div class="ac-quick-item">
        <div class="ac-quick-icon" style="background:rgba(79,141,253,0.15); color:#4f8dfd;">📅</div>
        <div class="ac-quick-text">
          <span class="ac-quick-label">Most active day</span>
          <span class="ac-quick-value">${hasWeekdayData ? weekdayNames[bestDayIdx] : '—'}</span>
        </div>
      </div>
      <div class="ac-quick-item">
        <div class="ac-quick-icon" style="background:rgba(200,147,253,0.15); color:#c893fd;">🏆</div>
        <div class="ac-quick-text">
          <span class="ac-quick-label">Leading subject (${days}d)</span>
          <span class="ac-quick-value">${leader ? escapeHtml(leader.s.name) : '—'}</span>
        </div>
      </div>
    </div>
  `;
}

const SUBJECT_GRAPH_COLORS = ['#ff3b3b','#ffd60a','#3654e0','#22c55e','#22d3ee','#ff4fa3'];

// Gives any color dot/swatch a glassy, crystal-like highlight instead of a flat fill.
function shinyDotStyle(color){
  return `background:radial-gradient(circle at 32% 26%, rgba(255,255,255,0.95), ${color} 55%, ${color} 100%); box-shadow:inset 0 0 3px rgba(255,255,255,0.55), 0 0 6px ${color}80;`;
}

function renderSubjectGraphsFromRows(rows){
  const container = document.getElementById('subjectGraphs');
  if(!container) return;
  if(!data.subjects || !data.subjects.length){ container.innerHTML = ''; return; }

  const todayK = todayKey(new Date());
  const grandTotal = rows.reduce((a,r)=>a+r.total,0);

  container.innerHTML = rows.map(({s, color, points, total}, i)=>{
    const lecCount = countLectures(s);
    const completionPill = `<span class="sg-pill">${lecCount.done}/${lecCount.total} done</span>`;

    if(total===0){
      return `<div class="sub-graph-card" style="animation-delay:${i*0.04}s">
        <div class="sub-graph-head">
          <span class="sub-graph-name"><span class="sub-graph-dot" style="${shinyDotStyle(color)}"></span>${escapeHtml(s.name)}</span>
        </div>
        <div class="sg-sub-row">${completionPill}</div>
        <div class="sub-graph-empty">No time logged yet</div>
      </div>`;
    }

    const activeDays = points.filter(p=>p.seconds>0).length;
    const avgSeconds = activeDays ? total/activeDays : 0;
    const bestPoint = points.reduce((best,p)=> (!best||p.seconds>best.seconds)?p:best, null);
    const sharePct = grandTotal>0 ? Math.round((total/grandTotal)*100) : 0;

    // Trend: compare the average of the second half of the range to the first half.
    const mid = Math.floor(points.length/2) || 1;
    const half1 = points.slice(0, mid), half2 = points.slice(mid);
    const avg1 = half1.reduce((a,p)=>a+p.seconds,0)/(half1.length||1);
    const avg2 = half2.reduce((a,p)=>a+p.seconds,0)/(half2.length||1);
    let trendHtml = '<span class="sg-trend flat">– steady</span>';
    if(avg1>0 && avg2 > avg1*1.1) trendHtml = '<span class="sg-trend up">▲ rising</span>';
    else if(avg2 < avg1*0.9 && avg1>0) trendHtml = '<span class="sg-trend down">▼ dipping</span>';
    else if(avg1===0 && avg2>0) trendHtml = '<span class="sg-trend up">▲ new</span>';

    const W=140, H=48, pad=5;
    const maxV = Math.max(...points.map(p=>p.seconds), 1);
    const stepX = points.length>1 ? (W-pad*2)/(points.length-1) : 0;
    const coords = points.map((p,idx)=>({
      x: pad + stepX*idx,
      y: pad + (H-pad*2) - (p.seconds/maxV)*(H-pad*2),
      ...p
    }));
    const linePath = coords.map((c,idx)=> (idx===0?'M':'L')+c.x.toFixed(1)+','+c.y.toFixed(1)).join(' ');
    const baseY = (H-pad).toFixed(1);
    const areaPath = linePath + ` L${coords[coords.length-1].x.toFixed(1)},${baseY} L${coords[0].x.toFixed(1)},${baseY} Z`;
    const gid = 'subGraphGrad-' + s.id;
    const lineId = 'subGraphLine-' + s.id;

    const gridHtml = [0.33, 0.66].map(f=>{
      const y = (pad + (H-pad*2)*f).toFixed(1);
      return `<line class="sg-gridline" x1="${pad}" y1="${y}" x2="${W-pad}" y2="${y}"/>`;
    }).join('');

    const dotsHtml = coords.map(c=>{
      const isToday = c.key===todayK;
      const label = c.date.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'});
      const timeLabel = c.seconds>0 ? formatHuman(c.seconds) : 'No study logged';
      return `<circle class="sg-dot ${isToday?'is-today':''}" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${isToday?2.6:1.8}" style="fill:${color}"><title>${label} — ${timeLabel}</title></circle>`;
    }).join('');

    return `<div class="sub-graph-card" style="animation-delay:${i*0.04}s">
      <div class="sub-graph-head">
        <span class="sub-graph-name"><span class="sub-graph-dot" style="${shinyDotStyle(color)}"></span>${escapeHtml(s.name)}</span>
        <span class="sub-graph-total">${formatHuman(total)}</span>
      </div>
      <div class="sg-sub-row">${completionPill}${trendHtml}</div>
      <svg class="sub-graph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <defs>
          <linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${color}" stop-opacity="0.4"/>
            <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${gridHtml}
        <path d="${areaPath}" fill="url(#${gid})" stroke="none"/>
        <path class="sg-line" id="${lineId}" d="${linePath}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${dotsHtml}
      </svg>
      <div class="sg-stats-row">
        <span title="Average on active days">Avg ${formatHuman(avgSeconds)}</span>
        <span title="${bestPoint.date.toLocaleDateString(undefined,{month:'short', day:'numeric'})}">Best ${formatHuman(bestPoint.seconds)}</span>
        <span title="Share of total study time in this period">${sharePct}%</span>
      </div>
    </div>`;
  }).join('');

  requestAnimationFrame(()=>{
    rows.forEach(({s, total})=>{
      if(total===0) return;
      const path = document.getElementById('subGraphLine-'+s.id);
      if(!path) return;
      const len = path.getTotalLength();
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = 'stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)';
      requestAnimationFrame(()=>{ path.style.strokeDashoffset = 0; });
    });
  });
}

function getYouTubeId(url){
  if(!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}
function youTubeThumb(url){
  const id = getYouTubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null;
}

let uidCounter = 0;
function uid(){ return (uidCounter++) + '-' + Math.random().toString(36).slice(2,10); }

let ringIdCounter = 0;
function ringSVG(pct, size, strokeW){
  const r = (size - strokeW)/2;
  const cx = size/2, cy = size/2;
  const c = 2*Math.PI*r;
  const gid = 'ringGrad' + (ringIdCounter++);
  let stops;
  if(pct>=100) stops = `<stop offset="0%" stop-color="var(--green)"/><stop offset="100%" stop-color="var(--teal)"/>`;
  else if(pct>0) stops = `<stop offset="0%" stop-color="var(--amber)"/><stop offset="100%" stop-color="var(--pencil)"/>`;
  else stops = `<stop offset="0%" stop-color="var(--ink-faint)"/><stop offset="100%" stop-color="var(--ink-faint)"/>`;
  return `
    <svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs><linearGradient id="${gid}" x1="0%" y1="0%" x2="100%" y2="100%">${stops}</linearGradient></defs>
      <circle class="ring-track" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${strokeW}" fill="none"/>
      <circle class="ring-fill" data-pct="${pct}" stroke="url(#${gid})" cx="${cx}" cy="${cy}" r="${r}" stroke-width="${strokeW}" fill="none" stroke-dasharray="${c}" stroke-dashoffset="${c}" transform="rotate(-90 ${cx} ${cy})"/>
      <text class="ring-text" x="${cx}" y="${cy}" font-size="${size*0.28}">${Math.round(pct)}%</text>
    </svg>`;
}

function animateRings(){
  requestAnimationFrame(()=>{
    requestAnimationFrame(()=>{
      document.querySelectorAll('.ring-fill').forEach(el=>{
        const pct = parseFloat(el.dataset.pct);
        const c = parseFloat(el.getAttribute('stroke-dasharray'));
        el.style.strokeDashoffset = c - (c*pct/100);
      });
    });
  });
}

function defaultData(){
  const subjectNames = [
    'Mathematics Unit 5',
    'Database Management System',
    'Object Oriented Programming',
    'Software Engineering',
    'Design and Analysis of Algorithm'
  ];
  return {
    subjects: subjectNames.map(name => ({
      id: uid(),
      name,
      units: [1,2,3,4,5].map(n => ({
        id: uid(),
        name: 'Unit ' + n,
        open: false,
        lectures: [],
        tests: []
      }))
    })),
    dailyLog: {},
    habits: { entries: {} },
    priorityPlanner: { byDate: {} },
    events: [],
    updatedAt: Date.now()
  };
}

/* ============================================================
   MY SUBJECTS — full-page landing
   Faithful port of the standalone "Study Space / My Subjects"
   design, rendered from real app data. Shown at full width as
   its own page; the slide-in drawer remains the in-folder view.
   ============================================================ */
const MSL_FOLDER_ICONS = [
  '<path class="fill" d="M4 5.5a2 2 0 0 1 2-2h13v14H6a2 2 0 0 0-2 2z"/><path d="M6 4h13v14H6a2 2 0 0 0-2 2V6a2 2 0 0 1 2-2Z"/><path d="M8 7h8M8 10h6"/>',
  '<path class="fill" d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5V5.5A2.5 2.5 0 0 1 6.5 3Z"/><path d="M8 7h8M8 10h6"/>',
  '<path class="fill" d="m3 9 9-5 9 5-9 5z"/><path d="m3 9 9-5 9 5-9 5zM6 11v5c2.5 2.2 9.5 2.2 12 0v-5M21 9v6"/>',
  '<path class="fill" d="M9 3h6v3l-2 2v4.2l5.5 7.3H5.5l5.5-7.3V8L9 6z"/><path d="M9 3h6M10 6h4M11 8v4.2L5.5 19.5h13L13 12.2V8M8 16h8"/>',
  '<path class="fill" d="M5 4h13v15H7a2 2 0 0 1-2-2z"/><path d="M5 4h13v15H7a2 2 0 0 1-2-2V4ZM5 7h10M8 10h7"/>',
  '<path class="fill" d="M14.5 4.5c2.5-2.5 5.4-2.5 5.4-2.5s0 2.9-2.5 5.4l-3.2 3.2-1.1-3z"/><path d="M14.5 4.5c2.5-2.5 5.4-2.5 5.4-2.5s0 2.9-2.5 5.4l-7.1 7.1-3.3-1.2 1.2-3.3zM9.7 14.3l-1.8 4.1-2.3 1.1 1.1-2.3zM13 11l3 3M17.2 7.8h.01"/>'
];
const MSL_PALETTE = [
  { accent:'#7657f4', bg:'linear-gradient(145deg,#9078ff,#6849e3)', orb:'rgba(118,87,244,.14)' },
  { accent:'#e68b47', bg:'linear-gradient(145deg,#ffb36b,#e9843d)', orb:'rgba(230,139,71,.13)' },
  { accent:'#13a99d', bg:'linear-gradient(145deg,#49cabe,#17a69a)', orb:'rgba(19,169,157,.13)' },
  { accent:'#5f83df', bg:'linear-gradient(145deg,#7aaaff,#5b79db)', orb:'rgba(95,131,223,.12)' }
];
function mslFolderIconHtml(idx){
  return `<svg viewBox="0 0 24 24" aria-hidden="true">${MSL_FOLDER_ICONS[idx % MSL_FOLDER_ICONS.length]}</svg>`;
}
function mslFolderDesc(folder){
  const desc = (folder && folder.desc) ? folder.desc : '';
  if(desc) return escapeHtml(desc);
  return 'Subjects, notes and topics<br/>kept in this folder.';
}
function mslFolderCardHtml(folder, idx){
  const subs = subjectsInFolder(folder.id);
  const topicCount = subs.reduce((a,s)=>a+countLectures(s).total,0);
  const pal = MSL_PALETTE[idx % MSL_PALETTE.length];
  const subCount = subs.length;
  const countLabel = subCount ? String(subCount)+' SUBJECTS' : 'NEW';
  const accent = folder.accent || pal.accent;
  const fbg = folder.folderBg || pal.bg;
  const orb = folder.orb || pal.orb;
  return `<article class="folder" data-name="${escapeHtml(folder.name||'Untitled')}" role="button" tabindex="0"
    style="--accent:${accent};--folder-bg:${fbg};--orb:${orb};--i:${idx}"
    onclick="openFolderFromLanding('${folder.id}')">
    <div class="folder-top"><div class="folder-icon">${mslFolderIconHtml(idx)}</div><span class="count">${countLabel}</span></div>
    <h4>${escapeHtml(folder.name||'Untitled')}</h4>
    <p>${mslFolderDesc(folder)}</p>
    <div class="folder-meta"><span>${subCount} subject${subCount===1?'':'s'}</span><i>·</i><span>${topicCount} topic${topicCount===1?'':'s'}</span></div>
    <button class="open" aria-label="Open ${escapeHtml(folder.name||'folder')}" onclick="event.stopPropagation(); openFolderFromLanding('${folder.id}')">→</button>
  </article>`;
}
function mslFoldersHtml(){
  foldersEnsure();
  let html = '';
  data.folders.forEach((f,i)=>{ html += mslFolderCardHtml(f, i); });
  const unsorted = subjectsInFolder(null);
  if(unsorted.length){
    const pal = MSL_PALETTE[data.folders.length % MSL_PALETTE.length];
    html += `<article class="folder" data-name="Unsorted" role="button" tabindex="0"
      style="--accent:${pal.accent};--folder-bg:${pal.bg};--orb:${pal.orb};--i:${data.folders.length}"
      onclick="openFolderFromLanding('')">
      <div class="folder-top"><div class="folder-icon">${mslFolderIconHtml(data.folders.length)}</div><span class="count">${unsorted.length} SUBJECTS</span></div>
      <h4>Unsorted</h4>
      <p>Subjects not assigned to a folder,<br/>kept together here.</p>
      <div class="folder-meta"><span>${unsorted.length} subject${unsorted.length===1?'':'s'}</span><i>·</i><span>${unsorted.reduce((a,s)=>a+countLectures(s).total,0)} topics</span></div>
      <button class="open" aria-label="Open Unsorted" onclick="event.stopPropagation(); openFolderFromLanding('')">→</button>
    </article>`;
  }
  return html || `<div class="folder" style="grid-column:1/-1;min-height:140px;display:grid;place-items:center;;align-content:center;gap:8px;">
      <div><span style="font-size:30px">🗂️</span></div><h4 style="margin:0">No folders yet</h4>
      <p>Create your first folder to organize subjects.</p>
    </div>`;
}
function mslRecentFolders(){
  let list = [];
  try{ list = JSON.parse(localStorage.getItem('mslRecent') || '[]'); }catch(e){}
  return Array.isArray(list) ? list : [];
}
function mslRecordRecent(folderId){
  const name = folderId === '' ? 'Unsorted' : (getFolder(folderId) ? getFolder(folderId).name : folderId);
  let list = mslRecentFolders().filter(x => x.id !== folderId);
  list.unshift({ id: folderId, name, time: Date.now() });
  try{ localStorage.setItem('mslRecent', JSON.stringify(list.slice(0,5))); }catch(e){}
}
function mslRecentHtml(){
  const list = mslRecentFolders();
  if(!list.length) return `<div class="recent-item"><div class="recent-icon" style="font-size:13px">◨</div><div><strong>Nothing yet</strong><small>Open a folder to see it here</small></div></div>`;
  let html = '';
  list.forEach((r,i)=>{
    const f = r.id === '' ? null : getFolder(r.id);
    const nm = (f ? f.name : r.name) || r.name || 'Unsorted';
    const cnt = (r.id === '' ? subjectsInFolder(null) : (f ? subjectsInFolder(f.id) : [])).length;
    html += `<div class="recent-item" style="cursor:pointer" onclick="openFolderFromLanding('${r.id}')"><div class="recent-icon">${mslFolderIconHtml(i)}</div><div><strong>${escapeHtml(nm)}</strong><small>${cnt} subjects</small></div></div>`;
  });
  return html;
}
function renderSubjectsLanding(){
  foldersEnsure();
  const el = document.getElementById('subjectsLanding');
  if(!el) return;
  const totalFolders = data.folders.length;
  const totalSubjects = data.subjects.length;
  const totalLectures = data.subjects.reduce((a,s)=>a+countLectures(s).total,0);
  const doneLectures = data.subjects.reduce((a,s)=>a+countLectures(s).done,0);
  const overallPct = totalLectures ? Math.round((doneLectures/totalLectures)*100) : 0;
  const streak = typeof computeCurrentStreak === 'function' ? computeCurrentStreak() : 0;
  const activeAreas = data.folders.filter(f => subjectsInFolder(f.id).length).length;
  const user = (typeof MASCOT_NAME !== 'undefined' && MASCOT_NAME) ? MASCOT_NAME : '';
  el.innerHTML = `
    <button class="msl-close" onclick="closeMySubjectsLanding()" title="Back to dashboard">✕</button>
    <div class="shell">
      <header class="topbar">
        <div class="brand">
          <div class="logo">S</div>
          <div class="brand-text"><h2>Study Space</h2><small>YOUR PERSONAL LEARNING HUB</small></div>
        </div>
        <nav aria-label="Primary" class="nav">
          <button class="active">My Subjects</button>
          <button onclick="closeMySubjectsLanding()">Planner</button>
          <button onclick="closeMySubjectsLanding()">Insights</button>
        </nav>
        <button class="dark-toggle-landing" onclick="toggleTheme()" type="button" title="Dark mode" aria-label="Switch theme">◐</button>
        <button class="profile" onclick="closeMySubjectsLanding(); if(typeof openSettings==='function') openSettings()" title="Profile">◯</button>
      </header>
      <section class="hero">
        <div class="hero-copy">
          <div class="crumb"><b>Home</b><span>›</span><span>My Subjects</span></div>
          <span class="eyebrow">YOUR LEARNING SPACE</span>
          <h1>My Subjects</h1>
          <p>One place for every semester, project, idea, and skill you're building. Choose a folder and continue from where you left off.</p>
          <div class="quick-stats" style="display:flex;gap:7px;flex-wrap:wrap;margin-top:17px">
            <span style="padding:6px 10px;border-radius:999px;font-size:9px"><b style="font-weight:800">${totalFolders}</b> folders</span>
            <span style="padding:6px 10px;border-radius:999px;font-size:9px"><b style="font-weight:800">${totalSubjects}</b> subjects</span>
            <span style="padding:6px 10px;border-radius:999px;font-size:9px"><b style="font-weight:800">${totalLectures}</b> topics tracked</span>
            <span style="padding:6px 10px;border-radius:999px;font-size:9px"><b style="font-weight:800">${activeAreas}</b> active areas</span>
          </div>
        </div>
        <div class="hero-side">
          <div class="streak"><div class="streak-top"><span>STUDY STREAK</span><span>✦</span></div><strong>${streak} <span>day${streak===1?'':'s'}</span></strong><div class="mini-progress"><i style="width:${Math.min(100, Math.round(overallPct*0.9))}%"></i></div></div>
          <button class="primary" onclick="openFolderCreateLanding()">＋ New Folder</button>
        </div>
      </section>
      <div class="toolbar">
        <div class="heading"><h3>Your Folders</h3><p>Open a folder to enter its study dashboard.</p></div>
        <div class="tools">
          <input class="search" id="mslSearch" placeholder="⌕  Search your folders..." type="search" oninput="mslApplySearch(this.value)">
          <button class="tool sort-btn" id="mslSortBtn" onclick="mslToggleSort()">A–Z ↕</button>
          <button class="tool sort-btn manage-btn" id="mslManageBtn" onclick="mslOpenManage()">⚙ Manage</button>
        </div>
      </div>
      <div class="manage-panel" id="mslManagePanel" style="display:none"></div>
      <section class="layout">
        <div class="folders" id="mslFolders">${mslFoldersHtml()}</div>
        <aside class="side">
          <div class="side-head"><strong>Recently Opened</strong><span>THIS WEEK</span></div>
          <div class="recent">${mslRecentHtml()}</div>
          <div class="side-card"><h4>Overall Progress</h4><p>You're ${overallPct}% through your tracked topics.</p><div class="goal"><i style="width:${overallPct}%"></i></div></div>
          <button class="add" onclick="openFolderCreateLanding()"><div class="add-plus">+</div><div><strong>Create New Folder</strong><span>Organize learning your way</span></div></button>
        </aside>
      </section>
      <div class="footer">Study Space · Organize less. Learn more.</div>
    </div>`;
  el.classList.toggle('dark-mode', typeof currentTheme === 'function' ? currentTheme() === 'dark' : false);
  el.style.display = '';
}
function openMySubjectsLanding(){
  const drawer = document.getElementById('subjectsDrawerOverlay');
  if(drawer) drawer.classList.remove('show');
  stopFolderClock();
  activeFolderFilter = null;
  renderSubjectsLanding();
  rememberOpener('subjectsLanding');
}
function closeMySubjectsLanding(){
  const el = document.getElementById('subjectsLanding');
  if(el) el.style.display = 'none';
  stopFolderClock();
  restoreOpener('subjectsLanding');
}
function openFolderFromLanding(folderId){
  activeFolderFilter = folderId || '';
  if(typeof closedFolderIds !== 'undefined' && closedFolderIds && closedFolderIds.clear) closedFolderIds.clear();
  mslRecordRecent(folderId || '');
  closeMySubjectsLanding();
  stopFolderClock();
  if(typeof openFolderDashboard === 'function') openFolderDashboard(); else { renderSidebar(); openSubjectsDrawer(true); }
}
function openFolderCreateLanding(){
  const name = prompt('Name this folder (e.g. "Semester 3", "Personal Projects")');
  if(!name || !name.trim()) return;
  foldersEnsure();
  createFolder(name.trim());
  renderSubjectsLanding();
  showToast('Folder created 📁');
}
function mslOpenManage(){
  const panel = document.getElementById('mslManagePanel');
  if(!panel) return;
  mslRenderManage();
  panel.style.display = '';
}
function mslCloseManage(){
  const panel = document.getElementById('mslManagePanel');
  if(panel) panel.style.display = 'none';
}
function mslManageRename(folderId){
  renameFolder(folderId);
  const panel = document.getElementById('mslManagePanel');
  if(panel){ mslRenderManage(); panel.style.display = ''; }
}
function mslRenderManage(){
  const panel = document.getElementById('mslManagePanel');
  if(!panel) return;
  foldersEnsure();
  const folders = data.folders.map((f,i)=>({ f, i }));
  const unsorted = subjectsInFolder(null);
  let rows = '';
  if(unsorted.length){
    rows += mslManageRowHtml('', 'Unsorted', '', unsorted.length, true);
  }
  folders.forEach(({f,i})=>{
    rows += mslManageRowHtml(f.id, f.name||'Untitled', mslFolderIconHtml(i), subjectsInFolder(f.id).length);
  });
  panel.innerHTML = `
    <div class="manage-card">
      <div class="manage-head">
        <div class="manage-title"><strong>Manage Folders</strong><span>Rename any folder from here.</span></div>
        <button class="manage-close" type="button" onclick="mslCloseManage()" aria-label="Close manage panel">✕</button>
      </div>
      <div class="manage-list">${rows || `<div class="manage-empty">No folders yet. Create one to get started.</div>`}</div>
      <div class="manage-foot"><button class="tool sort-btn" onclick="mslCloseManage()">Done</button></div>
    </div>`;
}
function mslManageRowHtml(id, name, iconHtml, cnt, isUnsorted){
  return `<div class="manage-row">
    <div class="manage-row-icon">${isUnsorted ? '<span style="font-size:18px;">📂</span>' : iconHtml}</div>
    <div class="manage-row-name"><strong>${escapeHtml(name)}</strong><small>${cnt} subject${cnt===1?'':'s'}</small></div>
    <button class="manage-rename" type="button" title="Rename ${escapeAttr(name)}" onclick="mslManageRename('${escapeAttr(id)}')">✎ <span>Rename</span></button>
  </div>`;
}
function mslApplySearch(q){
  const grid = document.getElementById('mslFolders');
  if(!grid) return;
  const qq = (q||'').trim().toLowerCase();
  let visible = 0;
  grid.querySelectorAll('.folder').forEach(c=>{
    const match = !qq || (c.dataset.name + ' ' + c.textContent).toLowerCase().includes(qq);
    c.style.display = match ? '' : 'none';
    if(match) visible++;
  });
  let empty = document.getElementById('mslSearchEmpty');
  if(!visible && qq){
    if(!empty){
      empty = document.createElement('div'); empty.id='mslSearchEmpty'; empty.className='search-empty';
      grid.appendChild(empty);
    }
    empty.innerHTML = `<div class="empty-icon">⌕</div><strong>No folders found</strong><span>No folder matches “${String(qq).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}”.</span><button type="button" onclick="mslClearSearch()">Create a folder</button>`;
    const btn = empty.querySelector('button');
    if(btn) btn.onclick = openFolderCreateLanding;
  } else if(empty){ empty.remove(); }
}
function mslClearSearch(){
  const s = document.getElementById('mslSearch');
  if(s) s.value = '';
  const e = document.getElementById('mslSearchEmpty');
  if(e) e.remove();
  mslApplySearch('');
}
/* — folder card keyboard activation (Enter/Space) — */
document.addEventListener('keydown', (e)=>{
  const t = e.target;
  const landing = document.getElementById('subjectsLanding');
  if(!landing || landing.style.display === 'none') return;
  if(!t || !t.classList || !t.classList.contains('folder')) return;
  if(!(e.key === 'Enter' || e.key === ' ')) return;
  if(e.target !== t) return;
  e.preventDefault();
  if(typeof t.click === 'function') t.click();
});
let mslSortAsc = false;
function mslToggleSort(){
  mslSortAsc = !mslSortAsc;
  const grid = document.getElementById('mslFolders');
  const btn = document.getElementById('mslSortBtn');
  if(!grid) return;
  const cards = [...grid.querySelectorAll('.folder')];
  const getName = c => (c.dataset.name || '').toLowerCase();
  cards.sort((a,b)=> mslSortAsc ? getName(a).localeCompare(getName(b)) : getName(b).localeCompare(getName(a)));
  cards.forEach(c=>grid.appendChild(c));
  if(btn) btn.textContent = mslSortAsc ? 'Z–A ↕' : 'A–Z ↕';
}

/* ============================================================
   FOLDER DASHBOARD — full-page port of
   study-dashboard_mobile_optimized_v26_final_audited.html
   Shown as a full-page overlay when a folder is opened
   (replaces the old in-drawer "Your Subjects" view).
   Visual/layout faithfully reproduced; data + routing wired to
   the live app (activeFolderFilter, data.subjects, seconds, etc).
   ============================================================ */

/* ---- design palette (matches the design's SUBJECTS accents) ---- */
const FD_ACCENTS = [
  { color:'#7c5cff', grad:'linear-gradient(135deg,#1c2350,#3a2d7a)', rgb:'124,92,255' },
  { color:'#ff9a52', grad:'linear-gradient(135deg,#2b2b2b,#4a4a4a)', rgb:'255,154,82' },
  { color:'#22b8c9', grad:'linear-gradient(135deg,#062038,#0c3a52)', rgb:'34,184,201' },
  { color:'#34c78f', grad:'linear-gradient(135deg,#123326,#1e5c43)', rgb:'52,199,143' }
];

function fdHexToRgb(hex){
  const h = String(hex || '').replace('#','');
  if(h.length === 3) return `${parseInt(h[0]+h[0],16)},${parseInt(h[1]+h[1],16)},${parseInt(h[2]+h[2],16)}`;
  if(h.length === 6) return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`;
  return '115,86,255';
}

function fdCurrentFolderName(){
  foldersEnsure();
  if(activeFolderFilter === '' || activeFolderFilter === null) return 'Unsorted';
  const f = getFolder(activeFolderFilter);
  return f ? f.name : 'Your Subjects';
}

/* ---- live clock for the dashboard header ---- */
let fdClockTimer = null;
function fdStartClock(){
  fdStopClock();
  if(typeof fdTickClock !== 'function') return;
  fdTickClock();
  fdClockTimer = setInterval(fdTickClock, 1000);
}
function fdStopClock(){
  if(fdClockTimer){ clearInterval(fdClockTimer); fdClockTimer = null; }
}
function fdTickClock(){
  const el = document.getElementById('folderDashboard');
  if(!el || el.style.display === 'none'){ fdStopClock(); return; }
  const now = new Date();
  const hh = document.getElementById('hh'), mm = document.getElementById('mm'), ss = document.getElementById('ss');
  const dl = document.getElementById('dateLabel'), dy = document.getElementById('dayLabel');
  if(hh) hh.textContent = String(now.getHours()).padStart(2,'0');
  if(mm) mm.textContent = String(now.getMinutes()).padStart(2,'0');
  if(ss){ ss.textContent = String(now.getSeconds()).padStart(2,'0');
    /* flip effect: only force the reflow when the user wants motion */
    let reduce = false;
    try{ reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }catch(e){}
    if(!reduce){ ss.classList.remove('tick'); void ss.offsetWidth; ss.classList.add('tick'); }
  }
  if(dl) dl.textContent = now.toLocaleDateString(undefined, {day:'2-digit', month:'short', year:'numeric'});
  if(dy) dy.textContent = now.toLocaleDateString(undefined, {weekday:'long'});
}

const FD_WAVE = `<span class="wave">👋</span>`;

function fdStatsHtml(folderName, subjects){
  let total=0, done=0, seconds=0;
  subjects.forEach(s=>{ const c = countLectures(s); total += c.total; done += c.done; seconds += subjectSeconds(s); });
  const pct = total ? Math.round((done/total)*100) : 0;
  const streak = (typeof computeGroupStreak === 'function')
    ? computeGroupStreak(subjects.map(s=>s.id))
    : (typeof computeCurrentStreak === 'function' ? computeCurrentStreak() : 0);
  const C = 2*Math.PI*42;
  const offset = C - (pct/100)*C;
  const bars = [35,58,42,78,67,86,52,72,47,64,38,55].map((h,i)=>`<i style="height:${h}%; animation-delay:${i*0.05}s;"></i>`).join('');
  const dots = Array.from({length: Math.min(streak,8)}).map((_,i)=>`<span style="animation-delay:${0.5+i*0.08}s;"></span>`).join('');
  return `
    <div class="stat-card glass tilt" style="--glass-accent:115,86,255;">
      <div class="stat-label">Overall Progress</div>
      <div class="ring-wrap">
        <svg width="96" height="96" viewBox="0 0 96 96">
          <defs><linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#7c5cff"/><stop offset="100%" stop-color="#a78bfa"/>
          </linearGradient></defs>
          <circle class="ring-bg" cx="48" cy="48" r="42"/>
          <circle class="ring-fg" cx="48" cy="48" r="42" style="--offset:${offset}; stroke-dasharray:${C}"/>
        </svg>
        <div class="ring-pct" id="ringPctLabel">${pct}%</div>
      </div>
      <div class="stat-sub">Folder (${folderName === 'Unsorted' ? 'unsorted' : folderName})</div>
    </div>
    <div class="stat-card glass tilt" style="--glass-accent:110,177,255;">
      <div class="stat-label"><span class="stat-icon" style="background:#e9e4ff;">⏱️</span>Total Studied</div>
      <div class="big-num">${formatHuman(seconds)}</div>
      <div class="stat-sub">In this folder</div>
      <svg class="sparkline" viewBox="0 0 120 34"><path d="M2,24 Q15,6 28,20 T54,16 T80,22 T118,10"/></svg>
    </div>
    <div class="stat-card glass tilt" style="--glass-accent:47,199,146;">
      <div class="stat-label"><span class="stat-icon" style="background:#dcf7ea;">✅</span>Topics Completed</div>
      <div class="big-num"><span id="topicsDoneNum">${done}</span> <span style="color:var(--soft); font-size:1rem;">/ ${total}</span></div>
      <div class="stat-sub">In this folder</div>
      <div class="bars">${bars}</div>
    </div>
    <div class="stat-card glass tilt" style="--glass-accent:255,137,95;">
      <div class="stat-label"><span class="stat-icon flame" style="background:#ffe6d6;">🔥</span>Study Streak</div>
      <div class="big-num"><span id="streakNum">${streak}</span></div>
      <div class="stat-sub">Days in a row</div>
      <div class="streak-dots">${dots}</div>
    </div>`;
}

function fdNextFor(s){
  try{
    if(Array.isArray(s.units)){
      for(const u of s.units){
        if(u && Array.isArray(u.lectures)){
          const l = u.lectures.find(x=>!x.completed);
          if(l && l.title) return escapeHtml(l.title);
        }
      }
    }
    const c = countLectures(s);
    return c.total ? 'All done!' : 'Get started';
  }catch(e){ return 'Get started'; }
}

function fdSubjectCardHtml(s, i){
  const gi = (typeof data !== 'undefined' && Array.isArray(data.subjects)) ? data.subjects.findIndex(x=>x && x.id===s.id) : i;
  const globalIdx = gi >= 0 ? gi : i;
  const c = countLectures(s);
  const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
  const time = formatHuman(subjectSeconds(s));
  const acc = FD_ACCENTS[globalIdx % FD_ACCENTS.length];
  const rgb = acc.rgb;
  const style = `--accent:${acc.color}; --accent-rgb:${rgb}; --glass-accent:${rgb}; --accent-soft:rgba(${rgb},.10); --accent-glow:rgba(${rgb},.20); --accent-tint:rgba(${rgb},.055); --accent-border:rgba(${rgb},.22); --accent-gradient:linear-gradient(135deg,${acc.color},${acc.color}99); animation-delay:${i*0.08}s;`;
  const tagStyle = `background:${acc.color}22; color:${acc.color};`;
  return `
    <div class="subject-card glass tilt" style="${style}" data-id="${escapeAttr(s.id)}" onclick="fdOpenSubject('${escapeAttr(s.id)}')" role="button" tabindex="0" aria-label="Open ${escapeAttr(s.name)}">
      <div class="subject-thumb" style="background:${acc.grad};"></div>
      <div class="subject-body">
        <span class="subject-tag" style="${tagStyle}">${escapeHtml(fdBadgeFor(s))}</span>
        <h4 class="subject-name" title="${escapeAttr(s.name)}">${escapeHtml(s.name)}</h4>
        <div class="subject-meta">
          <span>📘 ${c.total} ${c.total===1?'Topic':'Topics'}</span>
          <span>✔️ ${c.done}/${c.total} Studied</span>
          <span>🕒 ${time}</span>
        </div>
        <div class="progress-row">
          <div style="flex:1;">
            <div class="progress-track"><div class="progress-fill" data-target="${pct}" style="background:${acc.color};"></div></div>
          </div>
          <div class="progress-pct" style="color:${acc.color};">${pct}%</div>
        </div>
        <div class="subject-next">🎯 Next: ${fdNextFor(s)}</div>
      </div>
      <div class="subject-go ripple-host" style="color:${acc.color};"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
    </div>`;
}

function fdBadgeFor(s){
  const folder = (s.folderId && typeof getFolder==='function') ? getFolder(s.folderId) : null;
  if(folder && folder.name){ const n = folder.name; return n.toLowerCase().includes('semester') ? 'SEM III' : n.toUpperCase().slice(0,12); }
  return activeFolderFilter === '' || activeFolderFilter === null ? 'UNSORTED' : 'SUBJECT';
}

/* filter tabs: design uses all/progress/done; app uses all/progress/completed */
const FD_FILTER_MAP = { all:'all', progress:'progress', done:'completed' };
let fdFilter = 'all';

function fdGetSubjects(folderId){
  foldersEnsure();
  const fId = (folderId === '' || folderId === null) ? null : folderId;
  return subjectsInFolder(fId);
}

function fdRenderSubjects(filter){
  const el = document.getElementById('subjectList');
  if(!el) return;
  fdFilter = filter || 'all';
  const subjects = fdGetSubjects(activeFolderFilter);
  const appFilter = FD_FILTER_MAP[fdFilter] || 'all';
  const filtered = subjects.filter(s=>{
    if(appFilter === 'all') return true;
    const c = countLectures(s);
    const pct = c.total ? Math.round((c.done/c.total)*100) : 0;
    if(appFilter === 'completed') return c.total>0 && pct===100;
    return pct<100;
  });
  const cards = filtered.map((s,i)=>fdSubjectCardHtml(s, i)).join('');
  let empty = '';
  if(!filtered.length){
    empty = (subjects.length ? 'No subjects match this filter.' : 'No subjects in this folder yet. Open the drawer to add one.') ;
    el.innerHTML = `<div class="fd-empty" style="text-align:center;padding:26px;color:var(--muted);">${empty}</div>`;
  } else {
    el.innerHTML = cards;
  }
}

function fdWireInteractions(){
  const root = document.getElementById('folderDashboard');
  if(!root) return;
  /* progress bars animate to width on next frame */
  try{
    requestAnimationFrame(()=>{
      root.querySelectorAll('.progress-fill').forEach(p=>{ try{ p.style.width = p.dataset.target + '%'; }catch(e){} });
    });
  }catch(e){}
  /* filter indicator position */
  try{ fdMoveIndicator(root.querySelector('#filterBar button.active') || root.querySelector('#filterBar button[data-filter="all"]')); }catch(e){}
}

function fdMoveIndicator(btn){
  const indicator = document.getElementById('filterIndicator');
  const bar = document.getElementById('filterBar');
  if(!indicator || !btn || !bar) return;
  const barRect = bar.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  indicator.style.left = Math.max(0, btnRect.left - barRect.left) + 'px';
  indicator.style.top = (btnRect.top - barRect.top) + 'px';
  indicator.style.height = btnRect.height + 'px';
  indicator.style.bottom = 'auto';
  indicator.style.width = btnRect.width + 'px';
  indicator.style.transform = 'none';
}

function fdSetFilter(f){
  if(f === fdFilter) return; // no-op: already showing this filter
  fdRenderSubjects(f);
  const root = document.getElementById('folderDashboard');
  if(root){
    root.querySelectorAll('#filterBar button[data-filter]').forEach(b=>b.classList.toggle('active', b.dataset.filter === f));
  }
  fdWireInteractions();
}

function fdGreeting(){
  const h = new Date().getHours();
  if(h < 12) return 'Good morning';
  if(h < 17) return 'Good afternoon';
  return 'Good evening';
}

function renderFolderDashboard(){
  const el = document.getElementById('folderDashboard');
  if(!el) return;
  const folderName = fdCurrentFolderName();
  const subjects = fdGetSubjects(activeFolderFilter);
  const namePart = (typeof MASCOT_NAME !== 'undefined' && MASCOT_NAME && MASCOT_NAME !== 'friend') ? ', ' + escapeHtml(MASCOT_NAME) : '';
  el.innerHTML = `
    <button class="fd-back" onclick="fdBack()" title="Back to My Subjects">←</button>
    <div class="blobs">
      <div class="cursor-halo"></div>
      <div class="blob blob-1"></div><div class="blob blob-2"></div><div class="blob blob-3"></div><div class="blob blob-4"></div>
    </div>
    <div class="app">
      <header class="header glass tilt" style="--glass-accent:126,102,255;">
        <div>
          <h1><span id="greeting">${fdGreeting()}${namePart}</span> ${FD_WAVE}</h1>
          <p>Keep learning, keep growing.</p>
        </div>
        <div class="clock glass" style="--glass-accent:145,128,255;">
          <div class="date-box"><b id="dateLabel">—</b><span id="dayLabel">—</span></div>
          <div class="timer" id="liveClock">
            <div class="seg"><div class="num" id="hh">00</div><div class="lbl">Hrs</div></div>
            <div class="seg"><div class="num" id="mm">00</div><div class="lbl">Min</div></div>
            <div class="seg"><div class="num" id="ss">00</div><div class="lbl">Sec</div></div>
          </div>
        </div>
      </header>
      <section class="stats" id="statsGrid">${fdStatsHtml(folderName, subjects)}</section>
      <div class="section-head">
        <div class="section-title"><span class="section-icon">▦</span><span>Your Subjects · ${escapeHtml(folderName)}</span></div>
        <div class="filters glass" id="filterBar">
          <div class="filter-indicator" id="filterIndicator"></div>
          <button class="active ripple-host" data-filter="all" onclick="fdSetFilter('all')">All</button>
          <button class="ripple-host" data-filter="progress" onclick="fdSetFilter('progress')">In Progress</button>
          <button class="ripple-host" data-filter="done" onclick="fdSetFilter('done')">Completed</button>
        </div>
      </div>
      <div class="subject-list" id="subjectList"></div>
      <div class="add-card glass ripple-host" id="addSubjectCard" role="button" tabindex="0" aria-label="Add a subject" onclick="fdAddSubject()" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();fdAddSubject();}">
        <span class="add-plus">+</span> Add a subject
      </div>
      <div class="banner glass tilt" style="--glass-accent:126,102,255;">
        <div class="banner-left">
          <div class="trophy">🏆</div>
          <div><h3>Consistency is the key to success!</h3><p>You're doing great. Keep pushing forward 🚀</p></div>
        </div>
        <div class="view-stats ripple-host" onclick="fdViewStats()">View Study Stats 📊</div>
      </div>
      <p class="quote">"Small progress is still progress." — Keep going 💜</p>
    </div>`;
  fdRenderSubjects('all');
  fdWireInteractions();
  el.style.display = 'block';
  fdStartClock();
}

function openFolderDashboard(){
  const drawer = document.getElementById('subjectsDrawerOverlay');
  if(drawer) drawer.classList.remove('show');
  stopFolderClock();
  renderFolderDashboard();
  rememberOpener('folderDashboard');
  saveFolderOpenContext();
}
function closeFolderDashboard(){
  const el = document.getElementById('folderDashboard');
  if(el) el.style.display = 'none';
  fdStopClock();
  restoreOpener('folderDashboard');
  clearFolderOpenContext();
}
function fdBack(){
  closeFolderDashboard();
  if(typeof openMySubjectsLanding === 'function') openMySubjectsLanding(); else renderAll();
  closeSubjectsDrawer();
}
function fdOpenSubject(id){
  closeFolderDashboard();
  if(typeof jumpToSubject === 'function') jumpToSubject(id); else if(typeof switchToMain==='function') switchToMain();
}
function fdAddSubject(){ if(typeof openAddSubject === 'function') openAddSubject(); else if(typeof addSubject==='function') addSubject(); }
function fdViewStats(){
  closeFolderDashboard();
  try{
    if(typeof closeMySubjectsLanding === 'function') closeMySubjectsLanding();
  }catch(e){}
  try{
    if(typeof showView === 'function') showView('study');
  }catch(e){}
  if(typeof renderAll === 'function') renderAll();
}

/* remember open context so Escape/exit can return to the folder dashboard */
let folderOpenCtx = null;
function saveFolderOpenContext(){ folderOpenCtx = { filter: activeFolderFilter }; }
function clearFolderOpenContext(){ folderOpenCtx = null; }

/* keyboard Enter activates a focused subject card (click already bound) */
document.addEventListener('keydown', (e)=>{
  const t = e.target;
  const root = document.getElementById('folderDashboard');
  if(!root || root.style.display === 'none') return;
  if(!t || !t.classList || !t.classList.contains('subject-card')) return;
  if(!(e.key === 'Enter' || e.key === ' ')) return;
  e.preventDefault();
  if(typeof t.click === 'function') t.click();
});
