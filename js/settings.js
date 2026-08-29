// Backup/restore + settings
// ---------------- BACKUP / RESTORE ----------------
// ---------------- SETTINGS ----------------
function openSettings(){
  const nameInput = document.getElementById('settingsNameInput');
  if(nameInput) nameInput.value = MASCOT_NAME;
  const saved = document.getElementById('settingsNameSaved');
  if(saved) saved.style.display = 'none';

  const sel = document.getElementById('settingsSubjectSelect');
  sel.innerHTML = data.subjects.length
    ? data.subjects.map(s=>`<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
    : '<option value="">No subjects yet</option>';
  settingsPopulateUnits();
  if(typeof updateAccountInfo === 'function') updateAccountInfo();
  openModal('settingsOverlay');
  updateThemeUI();
}

/* ---------------- THEME (DARK MODE) ---------------- */
function currentTheme(){
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}
function getThemePreference(){
  try{ return localStorage.getItem('studyTheme'); }catch(e){ return null; }
}
function applyTheme(theme){
  const dark = theme === 'dark';
  if(dark) document.documentElement.setAttribute('data-theme','dark');
  else document.documentElement.removeAttribute('data-theme');
  try{ localStorage.setItem('studyTheme', dark ? 'dark' : 'light'); }catch(e){}
  updateMetaThemeColor(dark);
  updateThemeUI();
  return dark;
}
function toggleTheme(){
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  showToast(currentTheme() === 'dark' ? 'Dark mode on 🌙' : 'Light mode on ☀️');
}
function updateThemeUI(){
  const label = document.getElementById('themeStateLabel');
  const btn = document.getElementById('themeToggleBtn');
  if(label){
    label.textContent = currentTheme() === 'dark' ? 'On' : 'Off';
    label.style.display = '';
  }
  if(btn) btn.textContent = currentTheme() === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
}
function updateMetaThemeColor(dark){
  const meta = document.querySelector('meta[name="theme-color"]');
  if(meta) meta.setAttribute('content', dark ? '#131722' : '#d9a441');
}

function settingsSaveName(){  const input = document.getElementById('settingsNameInput');
  const name = input.value.trim();
  if(!name){ input.focus(); return; }
  MASCOT_NAME = name;
  try{ localStorage.setItem('studyUserName', name); }catch(e){}
  const saved = document.getElementById('settingsNameSaved');
  if(saved){
    saved.style.display = '';
    clearTimeout(settingsSaveName._t);
    settingsSaveName._t = setTimeout(()=>{ saved.style.display = 'none'; }, 1800);
  }
  renderUsernameDisplay();
  // Persist so the new name also reaches the account's cloud document.
  if(typeof saveData === 'function') saveData();
  // Refresh her current line immediately so the new name shows right away
  // instead of waiting for her mood to change on its own.
  mascotState.mood = null;
  renderMascot();
}

function settingsPopulateUnits(){
  const subjectId = document.getElementById('settingsSubjectSelect').value;
  const s = data.subjects.find(x=>x.id===subjectId);
  const sel = document.getElementById('settingsUnitSelect');
  sel.innerHTML = (s && s.units.length)
    ? s.units.map(u=>`<option value="${u.id}">${escapeHtml(u.name)}</option>`).join('')
    : '<option value="">No units</option>';
  settingsPopulateLectures();
}

function settingsPopulateLectures(){
  const subjectId = document.getElementById('settingsSubjectSelect').value;
  const unitId = document.getElementById('settingsUnitSelect').value;
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s ? s.units.find(x=>x.id===unitId) : null;
  const sel = document.getElementById('settingsLectureSelect');
  sel.innerHTML = (u && u.lectures.length)
    ? u.lectures.map(l=>`<option value="${l.id}">${escapeHtml(l.title)}</option>`).join('')
    : '<option value="">No lectures</option>';
  settingsSelectLecture();
}

function settingsSelectLecture(){
  const subjectId = document.getElementById('settingsSubjectSelect').value;
  const unitId = document.getElementById('settingsUnitSelect').value;
  const lectureId = document.getElementById('settingsLectureSelect').value;
  const timeArea = document.getElementById('settingsTimeArea');
  const emptyEl = document.getElementById('settingsTimeEmpty');
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s ? s.units.find(x=>x.id===unitId) : null;
  const l = u ? u.lectures.find(x=>x.id===lectureId) : null;
  if(!l){ timeArea.style.display='none'; emptyEl.style.display='block'; return; }
  emptyEl.style.display = 'none';
  timeArea.style.display = 'block';

  const editorEl = document.getElementById('settingsTimeEditor');
  const runningNoticeEl = document.getElementById('settingsTimeRunningNotice');
  const stopBtnEl = document.getElementById('settingsStopBtn');
  const warnEl = document.getElementById('settingsTimeWarning');
  if(l.timerStart){
    editorEl.style.display = 'none';
    runningNoticeEl.style.display = 'flex';
    stopBtnEl.style.display = 'block';
  } else {
    editorEl.style.display = 'block';
    runningNoticeEl.style.display = 'none';
    stopBtnEl.style.display = 'none';
    const seconds = l.seconds || 0;
    document.getElementById('settingsTimeHoursInput').value = Math.floor(seconds/3600);
    document.getElementById('settingsTimeMinutesInput').value = Math.floor((seconds%3600)/60);
    if(seconds >= 6*3600){
      warnEl.style.display = 'block';
      warnEl.textContent = `⚠️ Currently logged as ${formatHuman(seconds)} — looks like a timer may have been left running.`;
    } else {
      warnEl.style.display = 'none';
    }
  }
}

function settingsStopTimer(){
  stopTimer();
  settingsSelectLecture(); // refresh with the now-final, stopped seconds
}

function settingsSaveTimeCorrection(){
  const subjectId = document.getElementById('settingsSubjectSelect').value;
  const unitId = document.getElementById('settingsUnitSelect').value;
  const lectureId = document.getElementById('settingsLectureSelect').value;
  const s = data.subjects.find(x=>x.id===subjectId);
  const u = s ? s.units.find(x=>x.id===unitId) : null;
  const l = u ? u.lectures.find(x=>x.id===lectureId) : null;
  if(!l) return;

  const hrs = parseInt(document.getElementById('settingsTimeHoursInput').value, 10) || 0;
  const mins = parseInt(document.getElementById('settingsTimeMinutesInput').value, 10) || 0;
  const newSeconds = Math.max(0, hrs*3600 + mins*60);
  const oldSeconds = l.seconds || 0;
  if(newSeconds === oldSeconds){ showToast('No change'); return; }

  askConfirm(`Set "${l.title}" to ${formatHuman(newSeconds)}? This also adjusts today's logged study totals to match.`, async ()=>{
    const delta = newSeconds - oldSeconds;
    l.seconds = newSeconds;
    addToDailyLog(subjectId, delta); // keeps today's log/streak/analytics consistent with the correction
    renderAll();
    showToast('Lecture time corrected ✓');
    saveData();
  }, 'Save correction');
}

function exportData(){
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = todayKey();
  a.href = url;
  a.download = `study-tracker-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('Backup downloaded ⬇');
}

function importData(event){
  const file = event.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const parsed = JSON.parse(reader.result);
      if(!parsed.subjects || !Array.isArray(parsed.subjects)) throw new Error('Not a valid backup file');
      askConfirm('Restore this backup? It will replace your current data.', async ()=>{
        if(runningRef){ await stopTimer(); }
        data = parsed;
        if(!data.dailyLog) data.dailyLog = {};
        data.subjects.forEach(s=>{
          s.units.forEach(u=>{
            if(!u.tests) u.tests = [];
            if(!u.lectures) u.lectures = [];
          });
        });
        activeSubjectId = data.subjects.length ? data.subjects[0].id : null;
        prevDone = null; prevTotal = null;
        renderAll();
        saveData();
        showToast('Backup restored ✓');
      });
    }catch(e){
      showToast('That file could not be read as a backup');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}
