// Exam date
// ---------------- EXAM DATE ----------------
let examEditSubjectId = null;

function openSetExamDate(subjectId){
  examEditSubjectId = subjectId;
  const s = data.subjects.find(x=>x.id===subjectId);
  document.getElementById('examDateInput').value = s.examDate || '';
  openModal('examOverlay');
}

async function saveExamDate(){
  const val = document.getElementById('examDateInput').value;
  const s = data.subjects.find(x=>x.id===examEditSubjectId);
  if(!s) return;
  s.examDate = val || null;
  closeModal('examOverlay');
  renderAll();
  saveData();
  showToast(val ? 'Exam date saved 📅' : 'Exam date cleared');
}

async function clearExamDate(){
  const s = data.subjects.find(x=>x.id===examEditSubjectId);
  if(s) s.examDate = null;
  closeModal('examOverlay');
  renderAll();
  saveData();
  showToast('Exam date cleared');
}

function openAddLecture(subjectId, unitId){
  editState = {subjectId, unitId, lectureId:null, mode:'add'};
  document.getElementById('lectureModalTitle').textContent = 'New Lecture';
  document.getElementById('lectureTitleInput').value = '';
  document.getElementById('lectureLinkInput').value = '';
  document.getElementById('lectureNotesInput').value = '';
  document.getElementById('lectureTimeField').style.display = 'none';
  updateLinkPreview();
  openModal('lectureOverlay');
  setTimeout(()=>document.getElementById('lectureTitleInput').focus(), 50);
}

function openEditLecture(subjectId, unitId, lectureId){
  const s = data.subjects.find(x=>x.id===subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===unitId);
  if(!u) return;
  const l = (u.lectures||[]).find(x=>x.id===lectureId);
  if(!l) return;
  editState = {subjectId, unitId, lectureId, mode:'edit'};
  document.getElementById('lectureModalTitle').textContent = 'Edit Lecture';
  document.getElementById('lectureTitleInput').value = l.title;
  document.getElementById('lectureLinkInput').value = l.link || '';
  document.getElementById('lectureNotesInput').value = l.notes || '';

  const liveSec = liveLectureSeconds(l);
  document.getElementById('lectureHoursInput').value = Math.floor(liveSec/3600);
  document.getElementById('lectureMinutesInput').value = Math.floor((liveSec%3600)/60);
  document.getElementById('lectureTimeField').style.display = '';
  document.getElementById('lectureTimeHint').textContent = l.timerStart
    ? '⏱ Timer is currently running — saving will stop it and lock in the time you set here.'
    : '';

  updateLinkPreview();
  openModal('lectureOverlay');
}

async function saveLecture(){
  const title = document.getElementById('lectureTitleInput').value.trim();
  if(!title) return;
  const link = document.getElementById('lectureLinkInput').value.trim();
  const notes = document.getElementById('lectureNotesInput').value.trim();
  const s = data.subjects.find(x=>x.id===editState.subjectId);
  if(!s) return;
  const u = (s.units||[]).find(x=>x.id===editState.unitId);
  if(!u) return;

  if(editState.mode==='edit'){
    const l = (u.lectures||[]).find(x=>x.id===editState.lectureId);
    if(!l) return;
    l.title = title; l.link = safeHref(link); l.notes = notes;

    // Time-logged correction — lets you fix a runaway/forgotten timer
    // (e.g. left running overnight) instead of being stuck with it.
    const hrs = Math.max(0, parseInt(document.getElementById('lectureHoursInput').value, 10) || 0);
    const mins = Math.max(0, Math.min(59, parseInt(document.getElementById('lectureMinutesInput').value, 10) || 0));
    const newSeconds = hrs*3600 + mins*60;
    const oldLiveSeconds = liveLectureSeconds(l);

    if(newSeconds !== oldLiveSeconds){
      const wasRunning = !!l.timerStart;
      if(wasRunning && runningRef && runningRef.lectureId === l.id){
        // Stop the live session ourselves (not via stopTimer) so we don't
        // flush the erroneous elapsed time before overwriting it below.
        runningRef = null;
        stopTicking();
      }
      // Reconcile today's log by the difference, clamped so it can't go
      // negative and swallow other subjects' legitimately-logged time.
      addToDailyLog(editState.subjectId, newSeconds - oldLiveSeconds, todayKey());
      l.seconds = newSeconds;
      l.timerStart = null;
      if(wasRunning) showToast('Timer stopped and time corrected ✓');
    }
  } else {
    u.lectures.push({id:uid(), title, link, notes, completed:false, seconds:0, timerStart:null});
  }
  closeModal('lectureOverlay');
  renderAll();
  saveData();
}

let searchMatches = [];

function handleSearch(){
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const resultsEl = document.getElementById('searchResults');
  if(!q){ resultsEl.classList.remove('show'); resultsEl.innerHTML=''; return; }
  const matches = [];
  (data.subjects||[]).forEach(s=>{
    (s.units||[]).forEach(u=>{
      (u.lectures||[]).forEach(l=>{
        if(l.title.toLowerCase().includes(q)){
          matches.push({type:'lecture', subjectId:s.id, unitId:u.id, lectureId:l.id, title:l.title, sub:`${s.name} · ${u.name}`});
        }
      });
      (u.tests||[]).forEach(t=>{
        if((t.name||'').toLowerCase().includes(q)){
          matches.push({type:'test', subjectId:s.id, unitId:u.id, testId:t.id, title:t.name||'Test', sub:`${s.name} · ${u.name} · Test score`});
        }
      });
      if(u.name.toLowerCase().includes(q)){
        matches.push({type:'unit', subjectId:s.id, unitId:u.id, title:u.name, sub:`${s.name} · Unit`});
      }
    });
  });
  searchMatches = matches.slice(0,10);
  if(!searchMatches.length){
    resultsEl.innerHTML = `<div class="search-result-item search-empty">No matches for "${escapeHtml(q)}"</div>`;
  } else {
    resultsEl.innerHTML = searchMatches.map((m,i)=>`
      <div class="search-result-item" onclick="goToSearchResult(${i})">
        <div class="search-result-title">${escapeHtml(m.title)}</div>
        <div class="search-result-sub">${escapeHtml(m.sub)}</div>
      </div>`).join('');
  }
  resultsEl.classList.add('show');
}

function goToSearchResult(i){
  const m = searchMatches[i];
  if(!m) return;
  document.getElementById('searchResults').classList.remove('show');
  document.getElementById('searchInput').value = '';
  jumpToUnit(m.subjectId, m.unitId);
  if(m.type==='lecture'){
    setTimeout(()=>{
      const el = document.getElementById('lecture-'+m.lectureId);
      if(el){
        el.scrollIntoView({behavior:'smooth', block:'center'});
        el.classList.add('jump-highlight');
        setTimeout(()=>el.classList.remove('jump-highlight'), 1600);
      }
    }, 150);
  } else if(m.type==='test'){
    expandedTests.add(m.testId);
    setTimeout(()=>{ renderMain(); animateRings(); }, 150);
  }
}

document.addEventListener('click', (e)=>{
  const wrap = document.querySelector('.search-wrap');
  if(wrap && !wrap.contains(e.target)){
    document.getElementById('searchResults').classList.remove('show');
  }
});
document.querySelectorAll('.overlay').forEach(ov=>{
  ov.addEventListener('click', e=>{ if(e.target===ov) ov.classList.remove('show'); });
});
