// "Studied on" reveal tooltip
// ---------------- "Studied on" reveal tooltip ----------------
// Completion date is tracked silently (l.completedAt, already set in
// toggleLecture) — on desktop, just resting the cursor on a completed
// lecture's checkmark for a few seconds reveals it; on touch, a press-and-hold
// does the same, since there's no hover to rest on.
let lectureHoldTimer = null;
let lectureHoldTriggered = false;
let lectureHoverTimer = null;

// Desktop: hover only, no click/hold needed — 4s dwell time.
function lectureHoverStart(e, subjectId, unitId, lectureId, completed){
  clearTimeout(lectureHoverTimer);
  if(!completed) return;
  const target = e.currentTarget;
  lectureHoverTimer = setTimeout(()=>{
    showLectureDateTip(target, subjectId, unitId, lectureId);
  }, 4000);
}
function lectureHoverEnd(){
  clearTimeout(lectureHoverTimer);
  hideLectureDateTip();
}
// Touch: press-and-hold, since touch devices have no hover state.
function lectureHoldStart(e, subjectId, unitId, lectureId, completed){
  lectureHoldTriggered = false;
  clearTimeout(lectureHoldTimer);
  if(!completed) return; // nothing to reveal on a lecture that isn't done yet
  const target = e.currentTarget;
  lectureHoldTimer = setTimeout(()=>{
    lectureHoldTriggered = true;
    showLectureDateTip(target, subjectId, unitId, lectureId);
  }, 420);
}
function lectureHoldEnd(){
  clearTimeout(lectureHoldTimer);
  hideLectureDateTip();
}
function showLectureDateTip(el, subjectId, unitId, lectureId){
  const l = getLecture(subjectId, unitId, lectureId);
  const tip = document.getElementById('lectureDateTip');
  if(!l || !tip) return;
  tip.innerHTML = l.completedAt
    ? `<span class="ldt-icon">📅</span>Studied on ${formatPPTimestamp(l.completedAt)}`
    : `<span class="ldt-icon">📅</span>No study date recorded`;
  tip.classList.add('show');
  const rect = el.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  let left = rect.left + rect.width/2 - tipRect.width/2;
  left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
  let top = rect.top - tipRect.height - 10;
  if(top < 8) top = rect.bottom + 10;
  tip.style.left = left + 'px';
  tip.style.top = top + 'px';
}
function hideLectureDateTip(){
  const tip = document.getElementById('lectureDateTip');
  if(tip) tip.classList.remove('show');
}
// The click that toggles completion shares the same element as the hold
// gesture — this guard swallows the click that follows a completed hold so
// releasing after checking the date doesn't also flip completion off.
function handleOmrClick(e, subjectId, unitId, lectureId, sparkColor){
  if(lectureHoldTriggered){ lectureHoldTriggered = false; return; }
  sparkAt(e.currentTarget, sparkColor);
  toggleLecture(subjectId, unitId, lectureId);
}

function lecturePetalsHtml(seedIdx){
  let seed = (seedIdx + 1) * 7919 + 104729;
  const rand = ()=>{ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const COUNT = 4;
  let spans = '';
  for(let i=0;i<COUNT;i++){
    const size = 5 + rand()*5;
    const left = rand()*90;
    const top = 10 + rand()*75;
    const dur = 12 + rand()*8;
    const delay = -rand()*dur;
    const dx = (rand()*40-20).toFixed(0);
    const dy = -(25 + rand()*30).toFixed(0);
    const rot = (100 + rand()*160).toFixed(0);
    spans += `<span style="width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s;--pdx:${dx}px;--pdy:${dy}px;--prot:${rot}deg;"></span>`;
  }
  return `<div class="unit-petals lecture-petals">${spans}</div>`;
}

function lectureRow(subjectId, unitId, l, idx){
  const linkHtml = l.link ? `<a class="lecture-link" href="${escapeAttr(l.link)}" target="_blank" rel="noopener">watch / open ↗</a>` : '';
  const notesHtml = l.notes ? `<div class="lecture-notes">${escapeHtml(l.notes)}</div>` : '';
  const thumbUrl = youTubeThumb(l.link);
  const thumbHtml = thumbUrl ? `
    <a class="lecture-thumb-wrap" href="${escapeAttr(l.link)}" target="_blank" rel="noopener" title="Watch on YouTube">
      <img src="${thumbUrl}" alt="" loading="lazy" onerror="this.style.display='none'">
      <span class="thumb-label">YouTube</span>
      <span class="thumb-play"></span>
    </a>` : '';
  const isRunning = !!l.timerStart;
  const liveSec = liveLectureSeconds(l);
  const timerHtml = `
    <div class="timer-pill ${isRunning?'running':(liveSec>0?'has-time':'')}">
      <button class="timer-btn" onclick="sparkAt(this,'${isRunning?'var(--sd-pink)':'var(--sd-blue)'}'); toggleTimer('${subjectId}','${unitId}','${l.id}')" title="${isRunning?'Stop timer':'Start timer'}">${isRunning?'⏸':'▶'}</button>
      <span class="timer-time" id="timer-${l.id}">${isRunning ? formatCompactLive(liveSec) : formatHuman(liveSec)}</span>
      ${isRunning ? ekgLine(l.id) : ''}
    </div>`;
  return `
    <div class="lecture ${l.completed?'done':''} ${l.priority?'priority':''}" id="lecture-${l.id}" style="--i:${idx||0}">
      ${l.completed ? lecturePetalsHtml(idx||0) : ''}
      <div class="omr ${l.completed?'done':''}" id="omr-${l.id}"
           onclick="handleOmrClick(event,'${subjectId}','${unitId}','${l.id}','${l.completed?'var(--sd-ink-soft)':'var(--sd-blue)'}')"
           onmouseenter="lectureHoverStart(event,'${subjectId}','${unitId}','${l.id}',${l.completed?'true':'false'})"
           onmouseleave="lectureHoverEnd()"
           ontouchstart="lectureHoldStart(event,'${subjectId}','${unitId}','${l.id}',${l.completed?'true':'false'})"
           ontouchend="lectureHoldEnd()" ontouchcancel="lectureHoldEnd()"
           title="${l.completed?'Hover a few seconds to see study date · click to mark incomplete':'Mark complete'}">${l.completed ? mythicalCheckGlyph(l.id) : lectureIconChar(l)}</div>
      ${thumbHtml}
      <div class="lecture-main">
        <div class="lecture-title-row">
          ${l.priority ? '<span class="lecture-priority-flag" title="Priority">🔥</span>' : ''}
          ${(l.plannedDate && !l.completed) ? `<span class="lecture-planned-flag" title="Planned for ${escapeAttr(formatPlanDateShort(l.plannedDate))}">📅</span>` : ''}
          <span class="lecture-title">${escapeHtml(l.title)}</span>
          ${linkHtml}
          ${(l.richNotes && l.richNotes.replace(/<[^>]*>/g,'').trim()) ? `<span class="lecture-notes-flag" title="Open notes" onclick="event.stopPropagation(); openNotesEditor('${subjectId}','${unitId}','${l.id}')">📝</span>` : ''}
        </div>
        ${notesHtml}
      </div>
      <div class="lecture-right">
        <div class="lecture-row-actions">
          ${l.priority ? '<span class="lecture-priority-badge">🔥 Priority</span>' : ''}
          ${(l.plannedDate && !l.completed) ? `<span class="lecture-planned-badge">📅 ${escapeHtml(formatPlanDateShort(l.plannedDate))}</span>` : ''}
          ${l.completed ? '<span class="lecture-completed-badge">✓ Completed</span>' : '<span class="lecture-notstarted-badge">○ Not Started</span>'}
        </div>
        ${timerHtml}
        <div class="lecture-kebab-wrap" onclick="event.stopPropagation()">
          <button type="button" class="lecture-kebab-btn" title="Lecture options" onclick="toggleLectureMenu('${l.id}')">⋮</button>
          <div class="lecture-kebab-menu" id="lectureMenu-${l.id}">
            <button type="button" onclick="closeLectureMenus(); toggleLecturePriority('${subjectId}','${unitId}','${l.id}')">${l.priority ? '🔥 Remove priority' : '🚩 Mark priority'}</button>
            ${l.plannedDate ? `<button type="button" onclick="closeLectureMenus(); unplanLecture('${subjectId}','${unitId}','${l.id}')">📅 Remove from plan (${escapeHtml(formatPlanDateShort(l.plannedDate))})</button>` : ''}
            <button type="button" onclick="closeLectureMenus(); openNotesEditor('${subjectId}','${unitId}','${l.id}')">📝 ${l.richNotes && l.richNotes.replace(/<[^>]*>/g,'').trim() ? 'Open notes' : 'Add notes'}</button>
            <button type="button" onclick="closeLectureMenus(); openFocusMode('${subjectId}','${unitId}','${l.id}')">⛶ Focus mode</button>
            <button type="button" onclick="closeLectureMenus(); openEditLecture('${subjectId}','${unitId}','${l.id}')">✎ Edit</button>
            <button type="button" class="danger" onclick="closeLectureMenus(); deleteLecture('${subjectId}','${unitId}','${l.id}')">✕ Delete</button>
          </div>
        </div>
      </div>
    </div>
  `;
}
function toggleLecturePriority(subjectId, unitId, lectureId){
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s.units.find(x=>x.id===unitId);
  const l = u.lectures.find(x=>x.id===lectureId);
  l.priority = !l.priority;
  ppEnsure();
  if(l.priority){
    // Quick-flagging from the lecture itself always goes to Today — use the
    // planner's date strip if you want to plan it for a different day instead.
    const alreadyLinked = priorityLinkedLectureIds().has(lectureId);
    if(!alreadyLinked){
      const tKey = ppTodayKey();
      l.plannedDate = tKey;
      ppList(tKey).push({
        id: uid(), text: l.title, done: !!l.completed,
        link: { subjectId, unitId, lectureId },
        estMinutes: null, level: 'medium'
      });
    }
  } else {
    Object.keys(data.priorityPlanner.byDate).forEach(key=>{
      data.priorityPlanner.byDate[key] = data.priorityPlanner.byDate[key].filter(i => !(i.link && i.link.lectureId === lectureId));
    });
    if(l.plannedDate) delete l.plannedDate;
  }
  showToast(l.priority ? 'Marked as priority 🔥' : 'Priority removed');
  renderAll();
  if(currentView==='priority') renderPriorityPage();
  renderCalendar();
  saveData();
}