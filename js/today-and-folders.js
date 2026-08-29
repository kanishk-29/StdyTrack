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
  renderSidebar();
  openSubjectsDrawer(true);
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
setInterval(()=>{ if(currentView==='priority') renderPriorityPage(); }, 60000);

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
  (data.subjects||[]).forEach(s => s.units.forEach(u => u.lectures.forEach(l => { total++; if(l.completed) done++; })));
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

function uid(){ return Math.random().toString(36).slice(2,10); }

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
