// Storage abstraction (load/save/migrate)
// ---------------- STORAGE ABSTRACTION ----------------
// Uses Claude's window.storage when available (inside claude.ai artifacts).
// Falls back to IndexedDB when running as a standalone deployed app (e.g. GitHub Pages),
// so the app keeps working fully offline outside the Claude environment.
function hasClaudeStorage(){
  return typeof window.storage !== 'undefined' && window.storage && typeof window.storage.get === 'function';
}

function idbOpen(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open('study-tracker-db', 1);
    req.onupgradeneeded = () => { req.result.createObjectStore('kv'); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key){
  const db = await idbOpen();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('kv','readonly');
    const req = tx.objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value){
  const db = await idbOpen();
  return new Promise((resolve,reject)=>{
    const tx = db.transaction('kv','readwrite');
    const req = tx.objectStore('kv').put(value, key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function storageGet(key){
  if(hasClaudeStorage()){
    try{
      const res = await window.storage.get(key, false);
      return res ? res.value : null;
    }catch(e){ return null; }
  }
  try{
    const v = await idbGet(key);
    if(v !== undefined && v !== null) return v;
  }catch(e){ /* IndexedDB unavailable (e.g. some mobile browsers on file://) — try localStorage next */ }
  try{
    const v = localStorage.getItem(key);
    return v !== null ? v : null;
  }catch(e){ return null; }
}

async function storageSet(key, value){
  if(hasClaudeStorage()){
    try{
      await window.storage.set(key, value, false);
      return true;
    }catch(e){ return false; }
  }
  // Write to both IndexedDB and localStorage when standalone — belt-and-suspenders,
  // since some mobile browsers restrict one but not the other (especially over file://).
  let idbOk = false;
  try{ await idbSet(key, value); idbOk = true; }catch(e){ /* fall through */ }
  let lsOk = false;
  try{ localStorage.setItem(key, value); lsOk = true; }catch(e){ /* fall through */ }
  return idbOk || lsOk;
}

function normalizeLoadedData(parsed){
  data = parsed;
  if(!data.dailyLog) data.dailyLog = {};
  if(!data.habits) data.habits = { entries: {} };
  if(!data.habits.entries) data.habits.entries = {};
  if(!data.priorityPlanner) data.priorityPlanner = { byDate: {} };
  if(!data.updatedAt) data.updatedAt = 0;
  const ppMigrated = ppEnsure();
  foldersEnsure();
  data.subjects.forEach(s=>{
    s.units.forEach(u=>{
      if(!u.tests) u.tests = [];
      if(!u.lectures) u.lectures = [];
    });
  });
  // Persist the one-time planner migration so the legacy {today,tomorrow} keys
  // are actually removed — otherwise they'd be re-appended on every page load.
  if(ppMigrated){
    storageSet(studyDataCacheKey(), JSON.stringify(data)).catch(()=>{});
  }
}

async function loadData(){
  let localData = null;
  try{
    const timeout = new Promise((_, reject)=> setTimeout(()=>reject(new Error('storage timeout')), 5000));
    const raw = await Promise.race([storageGet(studyDataCacheKey()), timeout]);
    if(raw) localData = JSON.parse(raw);
  }catch(e){ /* key not found, storage unavailable, or timed out */ }

  // Cross-device sync: also check the cloud copy (if configured and signed in)
  // and use whichever of local/cloud was saved most recently. This is what
  // lets you switch browsers or devices without losing progress. cloudPull()
  // returns { json, userName } for the signed-in user's own document.
  let cloudData = null;
  let cloudUserName = null;
  if(cloudIsConfigured()){
    try{
      const res = await cloudPull();
      if(res && res.json){
        cloudData = JSON.parse(res.json);
        cloudUserName = res.userName || null;
      }
    }catch(e){ /* offline or cloud unreachable — use local */ }
  }

  const localTime = localData && localData.updatedAt ? localData.updatedAt : -1;
  const cloudTime = cloudData && cloudData.updatedAt ? cloudData.updatedAt : -1;

  if(cloudData && cloudTime >= localTime){
    normalizeLoadedData(cloudData);
    if(cloudUserName && typeof applyUserName === 'function') applyUserName(cloudUserName);
    // Bring the device's local cache up to date so the next load is instant/offline-safe.
    try{ await storageSet(studyDataCacheKey(), JSON.stringify(data)); }catch(e){}
    return;
  }
  if(localData){
    normalizeLoadedData(localData);
    return;
  }

  data = defaultData();
  foldersEnsure();
  saveData();
}

let lastCloudPushAt = 0;
async function saveData(){
  data.updatedAt = Date.now();
  const payload = JSON.stringify(data);
  const ok = await storageSet(studyDataCacheKey(), payload);
  const stampEl = document.getElementById('lastSaved');
  if(ok){
    if(stampEl) stampEl.textContent = 'Saved ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  } else {
    console.error('Storage save failed');
    showToast('Could not save — changes may not persist');
    if(stampEl) stampEl.textContent = 'Save failed ⚠';
  }
  // Fire-and-forget cloud push — never blocks the UI, and local storage above
  // already guaranteed the save even if the network/cloud is unavailable.
  // Throttled: a running timer commits every 30s, and pushes only need to keep
  // up with saves, not beat them — the payload always contains the full dataset.
  if(cloudIsConfigured() && Date.now() - lastCloudPushAt > 5000){
    lastCloudPushAt = Date.now();
    cloudPush(payload).then(cloudOk => {
      if(stampEl && cloudOk) stampEl.title = 'Synced to cloud ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    });
  }
}

function showView(view){
  currentView = view;
  const studyView = document.getElementById('studyView');
  const habitsView = document.getElementById('habitsView');
  const priorityView = document.getElementById('priorityView');
  const studyBtn = document.getElementById('viewStudyBtn');
  const habitsBtn = document.getElementById('viewHabitsBtn');
  const priorityBtn = document.getElementById('viewPriorityBtn');
  if(studyView && habitsView && priorityView){
    studyView.classList.toggle('hidden', view !== 'study');
    habitsView.classList.toggle('hidden', view !== 'habits');
    priorityView.classList.toggle('hidden', view !== 'priority');
  }
  if(studyBtn && habitsBtn && priorityBtn){
    studyBtn.classList.toggle('active', view === 'study');
    habitsBtn.classList.toggle('active', view === 'habits');
    priorityBtn.classList.toggle('active', view === 'priority');
  }
  if(view === 'priority'){ ppQuoteText = null; renderPriorityPage(); }
}

function habitKey(d){
  d = d || new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

function getHabitEntry(dateKey){
  if(!data.habits) data.habits = { entries: {} };
  if(!data.habits.entries) data.habits.entries = {};
  return data.habits.entries[dateKey] || null;
}
function setHabitEntry(dateKey){
  if(!data.habits) data.habits = { entries: {} };
  if(!data.habits.entries) data.habits.entries = {};
  return data.habits.entries[dateKey] = data.habits.entries[dateKey] || { gym:false, reading:false };
}

async function toggleHabit(dateKey, type, checked){
  const today = habitKey(new Date());
  if(dateKey !== today){
    renderHabitsPage();
    showToast('You can only update today\'s goal');
    return;
  }
  const entry = setHabitEntry(dateKey);
  entry[type] = Boolean(checked);
  renderHabitsPage();
  saveData();
  showToast(type === 'gym' ? 'Gym updated ✓' : 'Reading updated ✓');
}

async function saveHabitNote(dateKey, type, value){
  const today = habitKey(new Date());
  if(dateKey !== today){
    renderHabitsPage();
    return;
  }
  const entry = setHabitEntry(dateKey);
  if(type === 'gym') entry.gymNote = value;
  else entry.readingNote = value;
  saveData();
}

function getHabitSeries(days){
  const points = [];
  const now = new Date();
  for(let i=days-1;i>=0;i--){
    const d = new Date(now);
    d.setDate(d.getDate()-i);
    const key = habitKey(d);
    const entry = getHabitEntry(key);
    const value = (((entry && entry.gym) ? 1 : 0) + ((entry && entry.reading) ? 1 : 0)) * 50;
    points.push({ date:d, key, value });
  }
  return points;
}

function renderHabitsPage(){
  const grid = document.getElementById('habitCalendarGrid');
  const chartWrap = document.getElementById('habitChartWrap');
  const gymStreakEl = document.getElementById('gymStreak');
  const readingStreakEl = document.getElementById('readingStreak');
  const consistencyEl = document.getElementById('habitConsistency');
  if(!grid || !chartWrap) return;

  const now = new Date();
  const days = [];
  for(let i=0;i<7;i++){
    const d = new Date(now);
    d.setDate(d.getDate()+i);
    days.push(d);
  }

  const todayKeyValue = habitKey(now);
  const clockEl = document.getElementById('habitClock');
  if(clockEl){
    clockEl.textContent = now.toLocaleString(undefined, {weekday:'long', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit'});
  }
  let gymStreak = 0;
  let readingStreak = 0;
  let gymDone = 0;
  let readingDone = 0;
  let totalDays = 0;

  for(let i=0;i<days.length;i++){
    const d = days[i];
    const key = habitKey(d);
    const entry = getHabitEntry(key);
    if(entry && entry.gym) gymDone++;
    if(entry && entry.reading) readingDone++;
    totalDays++;
  }

  for(let i=0;i<30;i++){
    const d = new Date(now);
    d.setDate(d.getDate()-i);
    const key = habitKey(d);
    const entry = getHabitEntry(key);
    if(entry && entry.gym){
      gymStreak++;
    } else {
      break;
    }
  }

  for(let i=0;i<30;i++){
    const d = new Date(now);
    d.setDate(d.getDate()-i);
    const key = habitKey(d);
    const entry = getHabitEntry(key);
    if(entry && entry.reading){
      readingStreak++;
    } else {
      break;
    }
  }

  const consistency = totalDays ? Math.round(((gymDone + readingDone) / (totalDays * 2)) * 100) : 0;
  if(gymStreakEl) gymStreakEl.textContent = gymStreak;
  if(readingStreakEl) readingStreakEl.textContent = readingStreak;
  if(consistencyEl) consistencyEl.textContent = consistency + '%';

  grid.innerHTML = days.map(d=>{
    const key = habitKey(d);
    const entry = getHabitEntry(key) || { gym:false, reading:false };
    const isToday = key === todayKeyValue;
    const gymDoneClass = entry.gym ? ' done' : '';
    const readingDoneClass = entry.reading ? ' done' : '';
    const disabledAttr = isToday ? '' : 'disabled';
    const disabledClass = isToday ? '' : ' disabled';
    return `
      <div class="habit-day-card ${isToday ? 'is-today' : ''}">
        <div class="habit-day-top"><span>${d.toLocaleDateString(undefined,{weekday:'short'})}</span><strong>${d.getDate()}</strong></div>
        <div class="habit-check-row">
          <label class="habit-check${gymDoneClass}${disabledClass}">
            <input type="checkbox" onchange="toggleHabit('${key}','gym', this.checked)" ${entry.gym ? 'checked' : ''} ${disabledAttr}>
            <span>Gym</span>
          </label>
          <textarea class="habit-note" placeholder="Gym note" ${disabledAttr ? 'disabled' : ''} oninput="saveHabitNote('${key}','gym', this.value)">${escapeHtml(entry.gymNote || '')}</textarea>
          <label class="habit-check reading${readingDoneClass}${disabledClass}">
            <input type="checkbox" onchange="toggleHabit('${key}','reading', this.checked)" ${entry.reading ? 'checked' : ''} ${disabledAttr}>
            <span>Reading</span>
          </label>
          <textarea class="habit-note" placeholder="Reading note" ${disabledAttr ? 'disabled' : ''} oninput="saveHabitNote('${key}','reading', this.value)">${escapeHtml(entry.readingNote || '')}</textarea>
        </div>
      </div>`;
  }).join('');

  const points = getHabitSeries(30);
  const W = 560, H = 220;
  const padL = 24, padR = 10, padT = 16, padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const stepX = points.length > 1 ? plotW / (points.length - 1) : 0;
  const coords = points.map((p, i)=>({
    x: padL + stepX * i,
    y: padT + plotH - (p.value / 100) * plotH,
    ...p
  }));
  const linePath = coords.map((c, i)=>(i===0?'M':'L')+c.x.toFixed(1)+','+c.y.toFixed(1)).join(' ');
  const baselineY = (padT + plotH).toFixed(1);
  const areaPath = linePath + ` L${coords[coords.length-1].x.toFixed(1)},${baselineY} L${coords[0].x.toFixed(1)},${baselineY} Z`;

  const labels = [0,50,100];
  const gridHtml = labels.map(v=>{
    const y = padT + plotH - (v/100) * plotH;
    return `<line class="habit-chart-gridline" x1="${padL}" y1="${y.toFixed(1)}" x2="${W-padR}" y2="${y.toFixed(1)}"/><text class="habit-chart-label" x="${padL-6}" y="${(y+3).toFixed(1)}" text-anchor="end">${v}%</text>`;
  }).join('');
  const dayLabels = coords.filter((_, i)=> i === 0 || i === Math.floor(coords.length/2) || i === coords.length-1).map(c=>`<text class="habit-chart-label" x="${c.x.toFixed(1)}" y="${H-6}">${c.date.toLocaleDateString(undefined,{month:'short', day:'numeric'})}</text>`).join('');
  const dots = coords.map(c=>`<circle class="habit-chart-dot" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="4"></circle>`).join('');

  chartWrap.innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
      ${gridHtml}
      <path d="${areaPath}" fill="rgba(47,143,138,0.15)"/>
      <path class="habit-chart-line" d="${linePath}"/>
      ${dots}
      ${dayLabels}
    </svg>
  `;
}

function showToast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 1800);
}
