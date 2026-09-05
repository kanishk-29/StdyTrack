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
  const demoSec = document.getElementById('settingsDemoSection');
  if(demoSec) demoSec.style.display = (typeof DEMO_MODE !== 'undefined' && DEMO_MODE) ? '' : 'none';
  openModal('settingsOverlay');
  updateThemeUI();
  settingsPopulateCountry();
}

/* ---------------- COUNTRY & TIME ---------------- */
function settingsEnsure(){
  if(!data.settings || typeof data.settings !== 'object') data.settings = {};
  return data.settings;
}
function settingsPopulateCountry(){
  const sel = document.getElementById('settingsCountrySelect');
  if(!sel || typeof COUNTRY_ZONES === 'undefined') return;
  const cur = (typeof appTimeZone === 'function') ? appTimeZone() : '';
  sel.innerHTML = COUNTRY_ZONES.map(c=>`<option value="${c.tz}"${c.tz===cur?' selected':''}>${escapeHtml(c.label)}</option>`).join('');
  const ws = document.getElementById('settingsWeekStartSelect');
  if(ws) ws.value = String((typeof appWeekStart === 'function') ? appWeekStart() : 0);
  updateCountryNowHint();
}
function updateCountryNowHint(){
  const el = document.getElementById('settingsCountryNow');
  if(!el || typeof zonedParts !== 'function') return;
  const p = zonedParts();
  const label = (typeof COUNTRY_ZONES !== 'undefined')
    ? (COUNTRY_ZONES.find(c=>c.tz===appTimeZone()) || COUNTRY_ZONES[0]).label
    : 'device';
  const wd = new Date(p.y, p.m-1, p.day).toLocaleDateString(undefined, {weekday:'long'});
  el.textContent = `App date & time: ${wd}, ${p.y}-${String(p.m).padStart(2,'0')}-${String(p.day).padStart(2,'0')} ${String(p.h).padStart(2,'0')}:${String(p.min).padStart(2,'0')} (${label})`;
}
function settingsSetTimeZone(tz){
  const s = settingsEnsure();
  s.timeZone = (tz && typeof COUNTRY_ZONES !== 'undefined' && COUNTRY_ZONES.some(c=>c.tz===tz)) ? tz : '';
  if(typeof saveData === 'function') saveData();
  settingsPopulateCountry();
  if(typeof renderAll === 'function') renderAll();
  showToast('Country updated 🌍');
}
function settingsSetWeekStart(v){
  const s = settingsEnsure();
  s.weekStart = String(v) === '1' ? 1 : 0;
  if(typeof saveData === 'function') saveData();
  if(typeof renderAll === 'function') renderAll();
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
  const landing = document.getElementById('subjectsLanding');
  if(landing) landing.classList.toggle('dark-mode', dark);
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
      const parsed = sanitizeBackup(JSON.parse(reader.result));
      askConfirm('Restore this backup? It will replace your current data.', async ()=>{
        if(runningRef){ await stopTimer(); }
        data = parsed;
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

// Imported backups are untrusted input — a hand-crafted file could carry
// markup that later runs as HTML/JS (builder strings are interpolated into
// innerHTML and inline onclick). Coerce every user-string to a plain safe
// value before it is ever merged into data.
function sanitizeId(id){
  return String(id || '').replace(/['"<>&`]/g,'') || uid();
}
function sanitizeBackup(d){
  if(!d || typeof d !== 'object' || !Array.isArray(d.subjects)) throw new Error('Not a valid backup file');

  d.subjects.forEach(s=>{
    if(!s || typeof s !== 'object') return;
    s.id = sanitizeId(s.id);
    s.name = String(s.name || '').slice(0,200);
    s.icon = String(s.icon || '').slice(0,8).replace(/[<>&"'`]/g,'');
    s.color = /^#[0-9a-fA-F]{3,8}$/.test(s.color || '') ? s.color : '';
    if(!Array.isArray(s.units)) s.units = [];
    s.units.forEach(u=>{
      if(!u || typeof u !== 'object') return;
      u.id = sanitizeId(u.id);
      u.name = String(u.name || '').slice(0,200);
      if(!Array.isArray(u.lectures)) u.lectures = [];
      u.lectures.forEach(l=>{
        if(!l || typeof l !== 'object') return;
        l.id = sanitizeId(l.id);
        l.title = String(l.title || '').slice(0,300);
        l.notes = String(l.notes || '').slice(0,5000);
        l.richNotes = String(l.richNotes || '').slice(0,50000);
        if(l.richNotes) l.richNotes = sanitizeNotesHtml(l.richNotes);
        if(Array.isArray(l.notesPages)){
          l.notesPages = l.notesPages
            .filter(p => typeof p === 'string')
            .slice(0, 200)
            .map(p => sanitizeNotesHtml(String(p || '').slice(0,50000)));
          if(!l.notesPages.length) delete l.notesPages;
        }
        l.link = safeHref(l.link);
      });
      if(!Array.isArray(u.tests)) u.tests = [];
      u.tests.forEach(t=>{
        if(!t || typeof t !== 'object') return;
        t.id = sanitizeId(t.id);
        t.name = String(t.name || '').slice(0,200);
        if(typeof t.obtained !== 'number') t.obtained = Number(t.obtained ?? t.score ?? 0) || 0;
        if(typeof t.total !== 'number') t.total = Number(t.total ?? t.outOf ?? 0) || 0;
        t.date = String(t.date || '').slice(0,32);
      });
    });
  });

  if(d.folders && Array.isArray(d.folders)){
    d.folders.forEach(f=>{
      if(!f || typeof f !== 'object') return;
      f.id = sanitizeId(f.id);
      f.name = String(f.name || '').slice(0,100);
      f.icon = String(f.icon || '').slice(0,8).replace(/[<>&"'`]/g,'');
      const img = String(f.image || '');
      f.image = /^(https?:\/\/|data:image\/)/i.test(img) && img.length <= 200000 ? img : '';
    });
  }

  if(!d.settings || typeof d.settings !== 'object') d.settings = {};
  else {
    if(typeof d.settings.timeZone !== 'string') d.settings.timeZone = '';
    d.settings.weekStart = d.settings.weekStart === 1 ? 1 : 0;
  }
  if(!d.dailyLog || typeof d.dailyLog !== 'object') d.dailyLog = {};
  for(const k in d.dailyLog){
    const e = d.dailyLog[k];
    if(!e || typeof e !== 'object'){ d.dailyLog[k] = { total:0, bySubject:{} }; continue; }
    if(typeof e.total !== 'number') e.total = 0;
    if(!e.bySubject || typeof e.bySubject !== 'object') e.bySubject = {};
    for(const sk in e.bySubject){
      if(typeof e.bySubject[sk] !== 'number' || !isFinite(e.bySubject[sk])) e.bySubject[sk] = 0;
    }
  }

  if(!d.habits || typeof d.habits !== 'object') d.habits = { entries: {} };
  if(!d.habits.entries || typeof d.habits.entries !== 'object') d.habits.entries = {};
  for(const k in d.habits.entries){
    const h = d.habits.entries[k];
    if(!h || typeof h !== 'object'){ delete d.habits.entries[k]; continue; }
    if(typeof h.gymNote !== 'string') h.gymNote = '';
    if(typeof h.readingNote !== 'string') h.readingNote = '';
  }

  return d;
}
