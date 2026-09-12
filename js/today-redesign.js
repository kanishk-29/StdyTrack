// =============================================================
// TODAY PAGE — AURA REDESIGN (replaces the old pp-* page render)
// -------------------------------------------------------------
// Renders inside #priorityView with nw-* markup (css/today-aura.css).
// Data stays canonical:
//   * study / goal items    -> data.priorityPlanner.byDate[key]
//   * exam / meet / note    -> data.events[]
// Both streams are merged through nwAllItems() so the new page shows
// everything the old page did, and every write go through saveData().
// The shared global renderPriorityPage() is overridden here so the
// existing Study/Habits views and the action layer keep working.
// =============================================================

let nwState = { active: null, weekAnchor: null, month: null, filter: 'all' };
let nwEditMode = null; // { key, id } when the item modal is editing an existing item
let nwSeconds = 1500, nwRunning = false, nwInterval = null;

function nwEl(id){ return document.getElementById(id); }
function nwPad(n){ return String(n).padStart(2, '0'); }
function nwKeyOf(d){ return d.getFullYear() + '-' + nwPad(d.getMonth()+1) + '-' + nwPad(d.getDate()); }
function nwDateObj(s){ const p = String(s).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function nwTodayDate(){ try{ return zoneTodayDate(); }catch(e){ return new Date(); } }
function nwTodayKey(){ return nwKeyOf(nwTodayDate()); }
function nwActiveKey(){ return nwState.active || nwTodayKey(); }
function nwEsc(v){
  if(typeof escapeHtml === 'function'){ try{ return escapeHtml(v); }catch(e){} }
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function nwFmt(s, long){
  try{ return nwDateObj(s).toLocaleDateString(undefined, { weekday: long ? 'long' : 'short', day:'numeric', month:'long', year:'numeric' }); }
  catch(e){ return s; }
}
function nwFmtShort(s){
  try{ return nwDateObj(s).toLocaleDateString(undefined, { day:'numeric', month:'short' }); }
  catch(e){ return s; }
}
function nwTimeText(v){
  if(!v) return '';
  const m = String(v).split(':').map(Number);
  const h = m[0] || 0, mn = m[1] || 0;
  return ((h+11)%12)+1 + ':' + nwPad(mn) + ' ' + (h >= 12 ? 'PM' : 'AM');
}
function nwHrsLbl(mins){
  const h = (Number(mins)||0) / 60;
  return (h % 1 ? h.toFixed(1) : Math.round(h)) + 'h';
}

// ---------------- type mapping ----------------
const NW_TYPE_LABEL = { study:'Study session', goal:'Daily goal', exam:'Exam', meet:'Meeting', note:'Important date' };
const NW_TYPE_ICON  = { study:'◒', goal:'🎯', exam:'📝', meet:'📍', note:'📌' };
function nwStdType(t){
  t = String(t || '');
  if(/exam|test|quiz/i.test(t)) return 'exam';
  if(/meet|meeting|call|holiday/i.test(t)) return 'meet';
  if(/goal|target|objective/i.test(t)) return 'goal';
  if(/note|remind|important|deadline|submit/i.test(t)) return 'note';
  if(/lecture|study|revis|practic|read|lab/i.test(t)) return 'study';
  return 'study';
}
function nwEventType(cat){
  const c = String(cat || '');
  if(/exam/i.test(c)) return 'exam';
  if(/meet|meeting/i.test(c)) return 'meet';
  if(/deadline|submit/i.test(c)) return 'note';
  if(/holiday|other/i.test(c)) return 'note';
  return nwStdType(c);
}
function nwDurFor(t){ const v = { exam:120, meet:45, note:15, study:60, goal:60 }[t]; return v != null ? v : 60; }

// ---------------- unified items ----------------
function nwAllItems(){
  ppEnsure();
  const out = [];
  const byDate = data.priorityPlanner.byDate || {};
  Object.keys(byDate).forEach(key => {
    (byDate[key] || []).forEach(it => {
      if(!it || it.id == null) return;
      const text = it.text || '';
      const type = it.type ? nwStdType(it.type) : nwStdType(text);
      out.push({
        src:'pp', key: key, id: it.id, title: text, type: type,
        time: it.time || '09:00',
        duration: Number(it.estMinutes) || nwDurFor(type),
        note: it.note || '', done: !!it.done, important: !!it.important, link: it.link || null
      });
    });
  });
  (data.events || []).forEach(e => {
    if(!e || e.id == null) return;
    const cat = nwEventType(e.category);
    out.push({
      src:'ev', key: e.date, id: e.id, title: e.title || '', type: cat,
      time: e.time || '09:00',
      duration: Number(e.duration) || nwDurFor(cat),
      note: e.note || '', done: !!e.done, important: !!e.important, link: null
    });
  });
  return out;
}
function nwItemsFor(key){
  return nwAllItems().filter(x => x.key === key).sort((a,b)=>String(a.time).localeCompare(String(b.time)));
}
function nwWeekDates(anchor){
  let ws = 0; if(typeof appWeekStart === 'function'){ try{ ws = appWeekStart() || 0; }catch(e){} }
  const start = new Date(anchor); start.setDate(start.getDate() - ((start.getDay() - ws + 7) % 7));
  return Array.from({length:7}, (_,i) => { const d = new Date(start); d.setDate(start.getDate()+i); return d; });
}

// ---------------- main render ----------------
function renderPriorityPage(){
  ppEnsure();
  const view = document.getElementById('priorityView');
  if(!view) return;
  if(!nwState.active){
    let saved = null;
    try{ saved = localStorage.getItem('stdy.today.active'); }catch(e){}
    nwState.active = (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) ? saved : nwTodayKey();
  }
  if(!nwState.weekAnchor) nwState.weekAnchor = nwDateObj(nwState.active);
  if(!nwState.month) nwState.month = nwDateObj(nwState.active);
  ppSelectedDate = nwState.active;

  const hours = new Date().getHours();
  const greet = hours < 5 ? 'Good night' : hours < 12 ? 'Good morning' : hours < 17 ? 'Good afternoon' : 'Good evening';
  let name = 'there';
  try{ name = typeof MASCOT_NAME !== 'undefined' && MASCOT_NAME ? String(MASCOT_NAME) : 'there'; }catch(e){}
  if(name === 'friend') name = 'there';
  const nameShown = (name.charAt(0).toUpperCase() + name.slice(1));

  const f = nwState.filter;
  const mk = (k, active) => 'nw-filter' + (f === k || (k === 'all' && f === 'all') ? ' active' : '') + (active ? ' active' : '');

  view.innerHTML = `
  <div class="nw-page">
    <section class="nw-page-heading">
      <div>
        <div class="nw-heading-kicker">Daily command center</div>
        <h1>${greet}, <span>${nwEsc(nameShown)}.</span></h1>
        <p>One organized place for your study goals, weekly plan, exams, meetings and your complete study history.</p>
        <div class="nw-heading-meta"><span class="nw-dot"></span>Calm mode · focused planning · visual history</div>
      </div>
      <div class="nw-today-pill">✦ <span id="nwHeaderDate"></span></div>
    </section>

    <section class="nw-kpis">
      <div class="nw-kpi">
        <div class="nw-kpi-head"><div class="nw-kpi-label">Today's plan</div><div class="nw-kpi-icon">◷</div></div>
        <div class="nw-kpi-value" id="nwKpiTotal">0</div>
        <div class="nw-kpi-foot"><span>planned items</span><strong id="nwKpiTotalFoot">ready</strong></div>
      </div>
      <div class="nw-kpi">
        <div class="nw-kpi-head"><div class="nw-kpi-label">Completed</div><div class="nw-kpi-icon">✓</div></div>
        <div class="nw-kpi-value" id="nwKpiDone">0</div>
        <div class="nw-kpi-foot"><span>finished today</span><strong id="nwKpiRate">0%</strong></div>
      </div>
      <div class="nw-kpi">
        <div class="nw-kpi-head"><div class="nw-kpi-label">Study time</div><div class="nw-kpi-icon">◒</div></div>
        <div class="nw-kpi-value" id="nwKpiHours">0h</div>
        <div class="nw-kpi-foot"><span>scheduled today</span><span id="nwKpiBlocks">0 blocks</span></div>
      </div>
      <div class="nw-kpi">
        <div class="nw-kpi-head"><div class="nw-kpi-label">Next important</div><div class="nw-kpi-icon">!</div></div>
        <div class="nw-kpi-value" id="nwKpiNext">—</div>
        <div class="nw-kpi-foot"><span id="nwKpiNextTitle">nothing upcoming</span><span>calendar</span></div>
      </div>
    </section>

    <main class="nw-layout">
      <div class="nw-left">

        <section class="nw-card">
          <div class="nw-card-inner">
            <div class="nw-card-head">
              <div class="nw-head"><div class="nw-head-icon">☀</div><div><div class="nw-card-title">Today's plan</div><div class="nw-card-subtitle">Your tasks and study blocks for the selected day</div></div></div>
              <button class="nw-link" onclick="nwClearCompleted()">Clear completed</button>
            </div>
            <div class="nw-planner-top">
              <div class="nw-planner-date" id="nwPlanDate"></div>
              <div class="nw-filter-row">
                <button class="${mk('all', f==='all')}" data-filter="all" onclick="nwSetFilter('all')">All</button>
                <button class="${mk('study', f==='study')}" data-filter="study" onclick="nwSetFilter('study')">Study</button>
                <button class="${mk('goal', f==='goal')}" data-filter="goal" onclick="nwSetFilter('goal')">Goals</button>
              </div>
            </div>
            <button class="nw-add-btn" onclick="nwOpenAdd()">＋ Add goal, study block, exam, meeting or important date</button>
            <div class="nw-progress-line"><div class="nw-progress-track"><i id="nwTodayBar"></i></div><div class="nw-progress-percent" id="nwTodayPct">0%</div></div>
            <div class="nw-task-list" id="nwTaskList"></div>
          </div>
        </section>

        <section class="nw-card">
          <div class="nw-card-inner">
            <div class="nw-card-head">
              <div class="nw-head"><div class="nw-head-icon">▦</div><div><div class="nw-card-title">Weekly planner</div><div class="nw-card-subtitle">See workload, important items and free capacity before the week fills up</div></div></div>
              <button class="nw-link" onclick="nwOpenAdd()">＋ Plan week</button>
            </div>
            <div class="nw-week-toolbar">
              <div class="nw-week-range" id="nwWeekRange"></div>
              <div class="nw-week-nav"><button onclick="nwShiftWeek(-7)">‹</button><button onclick="nwShiftWeek(7)">›</button></div>
            </div>
            <div class="nw-week-overview">
              <div class="nw-week-stat"><small>Planned</small><strong id="nwWeekPlanned">0</strong><span>items this week</span></div>
              <div class="nw-week-stat"><small>Completed</small><strong id="nwWeekDone">0</strong><span>already finished</span></div>
              <div class="nw-week-stat"><small>Scheduled time</small><strong id="nwWeekHours">0h</strong><span>planned study + work</span></div>
            </div>
            <div class="nw-week-board">
              <div class="nw-week-board-head" id="nwWeekHead"></div>
              <div class="nw-day-columns" id="nwWeekColumns"></div>
              <div class="nw-capacity-footer"><label>Weekly capacity</label><div class="nw-capacity-bar"><i id="nwCapacityBar"></i></div><b id="nwCapacityText">0h planned</b></div>
            </div>
          </div>
        </section>

        <section class="nw-card">
          <div class="nw-card-inner">
            <div class="nw-card-head">
              <div class="nw-head"><div class="nw-head-icon">◔</div><div><div class="nw-card-title">Week progress</div><div class="nw-card-subtitle">Measure consistency across the whole week, not just one day</div></div></div>
              <span class="nw-card-subtitle" id="nwProgressCaption">This week</span>
            </div>
            <div class="nw-progress-grid">
              <div class="nw-ring" id="nwWeekRing"><div class="nw-ring-center"><strong id="nwWeekPct">0%</strong><span>COMPLETED</span></div></div>
              <div>
                <div class="nw-progress-lines">
                  <div class="nw-p-line"><span>Planned</span><div class="nw-p-track"><i id="nwPPlanned"></i></div><b id="nwPPlannedText">0</b></div>
                  <div class="nw-p-line"><span>Completed</span><div class="nw-p-track"><i id="nwPDone"></i></div><b id="nwPDoneText">0</b></div>
                  <div class="nw-p-line"><span>Study hours</span><div class="nw-p-track"><i id="nwPHours"></i></div><b id="nwPHoursText">0h</b></div>
                </div>
                <div class="nw-progress-note" id="nwProgressNote"></div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <aside class="nw-right">
        <section class="nw-card">
          <div class="nw-card-inner">
            <div class="nw-calendar-head">
              <div><div class="nw-calendar-title" id="nwCalendarTitle"></div><div class="nw-calendar-sub">Click any date to revisit your study history</div></div>
              <div class="nw-calendar-nav"><button onclick="nwShiftMonth(-1)">‹</button><button onclick="nwShiftMonth(1)">›</button></div>
            </div>
            <div class="nw-calendar-grid" id="nwCalendar"></div>
            <div class="nw-cal-footer">
              <span><i style="background:var(--nw-purple)"></i>Study</span>
              <span><i style="background:var(--nw-red)"></i>Exam</span>
              <span><i style="background:var(--nw-blue)"></i>Meeting</span>
              <span><i style="background:var(--nw-orange)"></i>Important</span>
            </div>
          </div>
        </section>

        <section class="nw-card">
          <div class="nw-card-inner">
            <div class="nw-card-head">
              <div class="nw-head"><div class="nw-head-icon">⌁</div><div><div class="nw-card-title">Study history</div><div class="nw-card-subtitle">What happened on the selected date</div></div></div>
              <button class="nw-link" onclick="nwOpenAdd()">＋ Add</button>
            </div>
            <div class="nw-selected-summary"><strong id="nwSelectedTitle"></strong><span id="nwSelectedCount"></span></div>
            <div class="nw-selected-list" id="nwSelectedList"></div>
          </div>
        </section>

        <section class="nw-card">
          <div class="nw-card-inner">
            <div class="nw-card-head">
              <div class="nw-head"><div class="nw-head-icon">!</div><div><div class="nw-card-title">Important dates</div><div class="nw-card-subtitle">Exams, meetings, deadlines and reminders</div></div></div>
              <button class="nw-link" onclick="nwOpenAdd('exam')">＋ Add</button>
            </div>
            <div class="nw-event-list" id="nwImportantList"></div>
          </div>
        </section>

        <section class="nw-card">
          <div class="nw-card-inner">
            <div class="nw-focus">
              <div class="nw-focus-row">
                <div class="nw-focus-bubble">◉</div>
                <div class="nw-focus-text">
                  <strong>Need a clean start?</strong>
                  <p>Start a short focus block and work only on the current item.</p>
                  <button class="nw-focus-btn" onclick="nwFocusStart()">Start 25-minute focus</button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </main>

    <div class="nw-backdrop" id="nwItemModal" onclick="if(event.target===this)nwCloseModal()">
      <div class="nw-modal">
        <div class="nw-modal-head">
          <div style="text-align:left"><h2 id="nwModalTitle">Add to StudyTrack</h2><p>Everything you add is attached to a date so the calendar can become your long-term study history.</p></div>
          <button class="nw-close" onclick="nwCloseModal()">×</button>
        </div>
        <div class="nw-form">
          <div class="nw-field nw-full"><label>Title</label><input id="nwItemTitle" placeholder="e.g. Revise DAA — asymptotic notation"></div>
          <div class="nw-field"><label>Type</label>
            <select id="nwItemType">
              <option value="study">Study session</option>
              <option value="goal">Daily goal</option>
              <option value="exam">Exam</option>
              <option value="meet">Meeting</option>
              <option value="note">Important date</option>
            </select>
          </div>
          <div class="nw-field"><label>Date</label><input id="nwItemDate" type="date"></div>
          <div class="nw-field"><label>Time</label><input id="nwItemTime" type="time" value="10:00"></div>
          <div class="nw-field"><label>Duration (minutes)</label><input id="nwItemDuration" type="number" min="0" step="15"></div>
          <div class="nw-field nw-full"><label>Note</label><textarea id="nwItemNote" placeholder="Optional: what do you want to finish, revise or remember?"></textarea></div>
        </div>
        <div class="nw-modal-foot"><button class="nw-secondary" onclick="nwCloseModal()">Cancel</button><button class="nw-primary" onclick="nwSaveItem()">Save item</button></div>
      </div>
    </div>

    <div class="nw-backdrop" id="nwFocusModal" onclick="if(event.target===this)nwCloseModal()">
      <div class="nw-modal nw-center">
        <div class="nw-modal-head">
          <div style="text-align:left"><h2>Focus mode</h2><p>25 minutes. One outcome. Keep the rest of the dashboard out of your head.</p></div>
          <button class="nw-close" onclick="nwCloseModal()">×</button>
        </div>
        <div class="nw-ring nw-ring-lg" id="nwFocusRing"><div class="nw-ring-center"><strong id="nwTimer">25:00</strong><span>FOCUS</span></div></div>
        <div class="nw-focus-controls"><button class="nw-secondary" onclick="nwFocusReset()">Reset</button><button class="nw-primary" id="nwFocusPauseBtn" onclick="nwFocusPause()">Pause</button></div>
      </div>
    </div>
  </div>`;

  nwRenderAll();
}
window.renderPriorityPage = renderPriorityPage;

// ---------------- renderers ----------------
function nwRenderAll(){
  nwRenderKpis();
  nwRenderTasks();
  nwRenderWeek();
  nwRenderWeekProgress();
  nwRenderCalendar();
  nwRenderHistory();
  nwRenderImportant();
  nwFocusTimerRender();
}

function nwRenderKpis(){
  const all = nwItemsFor(nwActiveKey());
  const done = all.filter(x => x.done).length;
  const mins = all.reduce((n,x)=>n+(Number(x.duration)||0),0);
  const important = nwAllItems()
    .filter(x => x.key >= nwActiveKey() && ['exam','meet','note'].includes(x.type) && !x.done)
    .sort((a,b)=> String(a.key+a.time).localeCompare(String(b.key+b.time)))[0];
  nwEl('nwKpiTotal').textContent = all.length;
  nwEl('nwKpiDone').textContent = done;
  nwEl('nwKpiHours').textContent = nwHrsLbl(mins);
  nwEl('nwKpiBlocks').textContent = all.filter(x=>x.type==='study').length + ' study blocks';
  nwEl('nwKpiRate').textContent = (all.length ? Math.round(done/all.length*100) : 0) + '%';
  nwEl('nwKpiTotalFoot').textContent = all.length ? 'active' : 'ready';
  nwEl('nwKpiNext').textContent = important ? nwFmtShort(important.key) : '—';
  nwEl('nwKpiNextTitle').textContent = important ? important.title.slice(0,22) : 'nothing upcoming';
  nwEl('nwHeaderDate').textContent = nwFmt(nwActiveKey(), true);
}

function nwRenderTasks(){
  const all = nwItemsFor(nwActiveKey());
  const shown = all.filter(x=>{
    if(nwState.filter === 'all') return true;
    if(nwState.filter === 'study') return ['study','exam'].includes(x.type);
    if(nwState.filter === 'goal') return ['goal','note'].includes(x.type);
    return true;
  });
  const done = all.filter(x=>x.done).length;
  const pct = all.length ? Math.round(done/all.length*100) : 0;
  nwEl('nwPlanDate').innerHTML = nwFmt(nwActiveKey(), true) + '<span>' + (all.length ? done + ' completed · ' + (all.length - done) + ' remaining' : 'Keep the next action visible.') + '</span>';
  const bar = nwEl('nwTodayBar'), pctEl = nwEl('nwTodayPct');
  if(bar) bar.style.width = pct + '%';
  if(pctEl) pctEl.textContent = pct + '%';
  const list = nwEl('nwTaskList');
  list.innerHTML = '';
  if(!shown.length){
    list.innerHTML = '<div class="nw-empty"><div style="font-size:21px">◌</div><b>' + (all.length ? 'No items match this filter.' : 'Your day is open.') + '</b><span>' + (all.length ? 'Try another filter.' : 'Add your first goal, study block or reminder.') + '</span></div>';
    return;
  }
  shown.forEach(x=>{
    const row = document.createElement('div');
    row.className = 'nw-task' + (x.done ? ' done' : '');
    row.innerHTML =
      '<button class="nw-check" onclick="nwToggleItem(\'' + x.key + '\',\'' + x.id + '\')">' + (x.done ? '✓' : '○') + '</button>' +
      '<div class="nw-task-body" onclick="nwOpenEdit(\'' + x.key + '\',\'' + x.id + '\')">' +
        '<div class="nw-task-title">' + NW_TYPE_ICON[x.type] || '•' + ' ' + nwEsc(x.title) + '</div>' +
        '<div class="nw-task-meta">' + (NW_TYPE_LABEL[x.type]||'Item') + (x.note ? ' · ' + nwEsc(x.note) : '') + '</div>' +
      '</div>' +
      '<div class="nw-task-time">' + nwTimeText(x.time) + '<span class="nw-task-duration">' + (x.duration||0) + ' min</span><button class="nw-task-del" title="Delete" onclick="nwDeleteItem(\'' + x.key + '\',\'' + x.id + '\')">✕</button></div>';
    list.appendChild(row);
  });
}

function nwRenderWeek(){
  const ds = nwWeekDates(nwState.weekAnchor);
  const start = ds[0], end = ds[6];
  nwEl('nwWeekRange').textContent = start.getDate() + ' — ' + end.getDate() + ' ' + start.toLocaleDateString(undefined,{month:'long'}) + ' ' + start.getFullYear();
  const total = ds.flatMap(d => nwItemsFor(nwKeyOf(d)));
  const done = total.filter(x=>x.done).length;
  const hours = total.reduce((n,x)=>n+(Number(x.duration)||0),0)/60;
  nwEl('nwWeekPlanned').textContent = total.length;
  nwEl('nwWeekDone').textContent = done;
  nwEl('nwWeekHours').textContent = nwHrsLbl(Math.round(hours*60));

  const head = nwEl('nwWeekHead'); head.innerHTML = '';
  const cols = nwEl('nwWeekColumns'); cols.innerHTML = '';
  const names = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const active = nwActiveKey();
  ds.forEach((d,idx)=>{
    const s = nwKeyOf(d);
    const a = nwItemsFor(s);
    const h = a.reduce((n,x)=>n+(Number(x.duration)||0),0);
    const hPct = Math.min(100, h/8*100);
    const hd = document.createElement('div');
    hd.innerHTML = names[idx] + '<b>' + d.getDate() + '</b>';
    head.appendChild(hd);

    const col = document.createElement('div');
    col.className = 'nw-day-column' + (s === active ? ' selected' : '');
    const chips = a.slice(0,3).map(x=>'<div class="nw-day-chip ' + x.type + '">' + (NW_TYPE_ICON[x.type]||'•') + ' ' + nwEsc(x.title) + '</div>').join('');
    col.innerHTML = '<div class="nw-capacity"><i style="width:' + Math.max(a.length?8:0, hPct) + '%"></i></div>' +
      '<div class="nw-day-items">' + (chips || '<div class="nw-no-item">Free day</div>') + '</div>' +
      (a.length > 3 ? '<div class="nw-more">+' + (a.length-3) + ' more</div>' : '');
    col.onclick = () => nwSetActive(s);
    cols.appendChild(col);
  });

  const capacity = Math.min(100, hours/42*100);
  nwEl('nwCapacityBar').style.width = capacity + '%';
  nwEl('nwCapacityText').textContent = nwHrsLbl(Math.round(hours*60)) + ' planned';
  nwEl('nwCapacityFooterText');
}

function nwRenderWeekProgress(){
  const ds = nwWeekDates(nwState.weekAnchor).map(nwKeyOf);
  const all = nwAllItems().filter(x=>ds.includes(x.key));
  const done = all.filter(x=>x.done).length;
  const hours = all.reduce((n,x)=>n+(Number(x.duration)||0),0)/60;
  const pct = all.length ? Math.round(done/all.length*100) : 0;
  nwEl('nwWeekPct').textContent = pct + '%';
  nwEl('nwWeekRing').style.background = 'conic-gradient(#7654dd 0 ' + pct + '%,#dedfe6 ' + pct + '% 100%)';
  nwEl('nwPPlanned').style.width = Math.min(100, all.length*9) + '%';
  nwEl('nwPDone').style.width = pct + '%';
  nwEl('nwPHours').style.width = Math.min(100, hours/42*100) + '%';
  nwEl('nwPPlannedText').textContent = all.length;
  nwEl('nwPDoneText').textContent = done;
  nwEl('nwPHoursText').textContent = nwHrsLbl(Math.round(hours*60));
  nwEl('nwProgressCaption').textContent = ds[0].slice(8) + '–' + ds[6].slice(8);
  nwEl('nwProgressNote').textContent = all.length
    ? done + ' of ' + all.length + ' planned items are complete. You have ' + nwHrsLbl(Math.round(hours*60)) + ' scheduled across the selected week.'
    : 'Your weekly summary will become useful as you add goals and study blocks.';
}

function nwRenderCalendar(){
  const y = nwState.month.getFullYear(), m = nwState.month.getMonth();
  nwEl('nwCalendarTitle').textContent = nwState.month.toLocaleDateString(undefined,{month:'long',year:'numeric'});
  const g = nwEl('nwCalendar'); g.innerHTML = '';
  ['S','M','T','W','T','F','S'].forEach(x=>{ const d=document.createElement('div'); d.className='nw-dow'; d.textContent=x; g.appendChild(d); });
  const first = new Date(y,m,1).getDay();
  const prev = new Date(y,m,0).getDate();
  const days = new Date(y,m+1,0).getDate();
  const todayKey = nwTodayKey();
  const active = nwActiveKey();
  for(let i=first-1;i>=0;i--){ const e=document.createElement('div'); e.className='nw-cal-day muted'; e.textContent=prev-i; g.appendChild(e); }
  for(let d=1;d<=days;d++){
    const s = y + '-' + nwPad(m+1) + '-' + nwPad(d);
    const a = nwItemsFor(s);
    const e = document.createElement('button');
    e.className = 'nw-cal-day' + (s===todayKey ? ' today' : '') + (s===active ? ' selected' : '');
    e.textContent = d;
    if(a.length){
      const mark = document.createElement('i');
      mark.className = 'nw-mark ' + (a.some(x=>x.type==='exam') ? 'exam' : a.some(x=>x.type==='meet') ? 'meet' : a.some(x=>x.type==='note') ? 'note' : 'study');
      e.appendChild(mark);
    }
    e.onclick = () => nwSetActive(s);
    g.appendChild(e);
  }
  const trailing = (7 - ((first+days)%7))%7;
  for(let d=1;d<=trailing;d++){ const e=document.createElement('div'); e.className='nw-cal-day muted'; e.textContent=d; g.appendChild(e); }
}

function nwRenderHistory(){
  const a = nwItemsFor(nwActiveKey());
  nwEl('nwSelectedTitle').textContent = nwFmt(nwActiveKey(), true);
  nwEl('nwSelectedCount').textContent = a.length + ' item' + (a.length===1?'':'s');
  const list = nwEl('nwSelectedList'); list.innerHTML = '';
  if(!a.length){
    list.innerHTML = '<div class="nw-empty" style="min-height:92px"><b>No record for this date.</b><span>Add something to start the history.</span></div>';
    return;
  }
  a.forEach(x=>{
    const r = document.createElement('div'); r.className = 'nw-history-row';
    r.onclick = () => nwOpenEdit(x.key, x.id);
    r.innerHTML =
      '<div class="nw-history-dot">' + (NW_TYPE_ICON[x.type]||'•') + '</div>' +
      '<div><b>' + nwEsc(x.title) + '</b><small>' + (NW_TYPE_LABEL[x.type]||'Item') + (x.note ? ' · ' + nwEsc(x.note) : '') + (x.done ? ' · done ✓' : '') + '</small></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><div class="nw-history-time">' + nwTimeText(x.time) + '</div><button class="nw-history-del" title="Delete" onclick="event.stopPropagation();nwDeleteItem(\'' + x.key + '\',\'' + x.id + '\')">✕</button></div>';
    list.appendChild(r);
  });
}

function nwRenderImportant(){
  const a = nwAllItems()
    .filter(x=>['exam','meet','note'].includes(x.type) && !x.done)
    .sort((x,y)=>String(x.key+x.time).localeCompare(String(y.key+y.time))).slice(0,6);
  const list = nwEl('nwImportantList'); list.innerHTML = '';
  if(!a.length){
    list.innerHTML = '<div class="nw-empty" style="min-height:90px"><b>No important dates yet.</b><span>Add exams, meetings or reminders.</span></div>';
    return;
  }
  a.forEach(x=>{
    const e = document.createElement('div'); e.className = 'nw-event';
    e.onclick = () => nwSetActive(x.key);
    e.innerHTML =
      '<div class="nw-event-icon ' + x.type + '">' + (NW_TYPE_ICON[x.type]||'•') + '</div>' +
      '<div><b>' + nwEsc(x.title) + '</b><small>' + (NW_TYPE_LABEL[x.type]||'Item') + (x.note ? ' · ' + nwEsc(x.note) : '') + '</small></div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px"><div class="nw-event-date">' + nwFmtShort(x.key) + '<span>' + nwTimeText(x.time) + '</span></div><button class="nw-event-del" title="Delete" onclick="event.stopPropagation();nwDeleteItem(\'' + x.key + '\',\'' + x.id + '\')">✕</button></div>';
    list.appendChild(e);
  });
}

// ---------------- navigation / state ----------------
function nwSetActive(key){
  if(!key) return;
  nwState.active = key;
  nwState.weekAnchor = nwDateObj(key);
  nwState.month = nwDateObj(key);
  try{ localStorage.setItem('stdy.today.active', key); }catch(e){}
  ppSelectedDate = key;
  renderPriorityPage();
}
function nwShiftWeek(delta){
  const a = new Date(nwState.weekAnchor || new Date());
  a.setDate(a.getDate() + delta);
  nwState.weekAnchor = a;
  nwRenderWeek();
  nwRenderWeekProgress();
}
function nwShiftMonth(delta){
  nwState.month.setMonth((nwState.month || new Date()).getMonth() + delta);
  nwRenderCalendar();
}
function nwSetFilter(f){
  nwState.filter = f;
  const pv = document.getElementById('priorityView');
  if(pv) pv.querySelectorAll('.nw-filter').forEach(b=>b.classList.toggle('active', b.dataset.filter === f));
  nwRenderTasks();
}

// ---------------- item actions ----------------
function nwToggleItem(key, id){
  ppEnsure();
  const arr = ppList(key);
  const it = arr.find(x => String(x.id) === String(id));
  if(it){
    if(it.link && typeof togglePriorityItemDone === 'function'){
      togglePriorityItemDone(key, id);
      return;
    }
    it.done = !it.done;
    it.doneAt = it.done ? Date.now() : null;
    if(typeof renderDashQuickGrid === 'function') renderDashQuickGrid();
    renderPriorityPage();
    saveData();
    showToast(it.done ? 'Completed.' : 'Marked as active.');
    return;
  }
  const evIdx = (data.events || []).findIndex(e => String(e.id) === String(id));
  if(evIdx >= 0){
    const e = data.events[evIdx];
    const cat = nwEventType(e.category);
    const done = !e.done;
    const pp = {
      id: uid(), text: e.title, done: done, doneAt: done ? Date.now() : null,
      time: e.time || '09:00', estMinutes: Number(e.duration) || nwDurFor(cat),
      note: e.note || '', type: cat, important: true, link: null
    };
    data.events.splice(evIdx, 1);
    data.priorityPlanner.byDate[e.date] = data.priorityPlanner.byDate[e.date] || [];
    data.priorityPlanner.byDate[e.date].push(pp);
    renderPriorityPage();
    saveData();
    if(typeof renderCalendar === 'function') renderCalendar();
    showToast(done ? 'Tracked as complete. ✓' : 'Marked as active.');
  }
}

function nwDeleteItem(key, id){
  ppEnsure();
  const arr = ppList(key);
  const it = arr.find(x => String(x.id) === String(id));
  if(it){
    if(typeof deletePriorityItem === 'function'){
      deletePriorityItem(key, id);
      return;
    }
    data.priorityPlanner.byDate[key] = arr.filter(x => String(x.id) !== String(id));
    renderPriorityPage();
    saveData();
    return;
  }
  const ev = (data.events || []).find(e => String(e.id) === String(id));
  if(!ev) return;
  const doDelete = () => {
    data.events = data.events.filter(e => String(e.id) !== String(id));
    saveData();
    renderPriorityPage();
    if(typeof renderCalendar === 'function') renderCalendar();
    showToast('Deleted.');
  };
  if(typeof askConfirm === 'function'){ askConfirm('Delete this from your calendar?', doDelete); }
  else { doDelete(); }
}

function nwClearCompleted(){
  let removed = 0;
  const key = nwActiveKey();
  const arr = ppList(key);
  data.priorityPlanner.byDate[key] = arr.filter(x => {
    if(x.done && !x.link) { removed++; return false; }
    return true;
  });
  // also clear any completed event-derived items across the whole app is NOT done here.
  saveData();
  renderPriorityPage();
  if(typeof renderDashQuickGrid === 'function') renderDashQuickGrid();
  showToast(removed ? removed + ' completed item' + (removed>1?'s':'') + ' cleared.' : 'Nothing completed to clear.');
}

// ---------------- add / edit modal ----------------
function nwOpenAdd(type){
  nwEditMode = null;
  nwEl('nwModalTitle').textContent = 'Add to StudyTrack';
  nwEl('nwItemTitle').value = '';
  nwEl('nwItemTitle').disabled = false;
  nwEl('nwItemType').value = type || 'study';
  nwEl('nwItemDate').disabled = false;
  nwEl('nwItemDate').value = nwActiveKey();
  const t = type || 'study';
  nwEl('nwItemTime').value = t === 'exam' ? '10:00' : t === 'meet' ? '16:00' : '10:00';
  nwEl('nwItemDuration').value = t === 'exam' ? 120 : t === 'meet' ? 45 : 60;
  nwEl('nwItemNote').value = '';
  nwEl('nwItemModal').classList.add('open');
  setTimeout(()=> nwEl('nwItemTitle').focus(), 60);
}

function nwOpenEdit(key, id){
  ppEnsure();
  const item = nwAllItems().find(x => x.key === key && String(x.id) === String(id));
  if(!item) return;
  nwEditMode = { key: key, id: String(id), src: item.src, locked: !!item.link };
  nwEl('nwModalTitle').textContent = 'Edit item';
  nwEl('nwItemTitle').value = item.title;
  nwEl('nwItemTitle').disabled = !!item.link;
  nwEl('nwItemType').value = item.type;
  nwEl('nwItemType').disabled = !!item.link;
  nwEl('nwItemDate').disabled = !!item.link;
  nwEl('nwItemDate').value = key;
  nwEl('nwItemTime').value = /^\d{2}:\d{2}$/.test(String(item.time)) ? item.time : '10:00';
  nwEl('nwItemDuration').value = item.duration || 0;
  nwEl('nwItemNote').value = item.note || '';
  nwEl('nwItemModal').classList.add('open');
}

function nwCloseModal(){
  const item = nwEl('nwItemModal'), focus = nwEl('nwFocusModal');
  if(item) item.classList.remove('open');
  if(focus) focus.classList.remove('open');
  nwEditMode = null;
}

function nwSaveItem(){
  const title = nwEl('nwItemTitle').value.trim();
  if(!title){ showToast('Give the item a title first.'); return; }
  const date = nwEl('nwItemDate').value || nwActiveKey();
  const type = nwEl('nwItemType').value;
  const time = nwEl('nwItemTime').value || '10:00';
  const dur = Math.max(0, parseInt(nwEl('nwItemDuration').value, 10) || 0);
  const note = nwEl('nwItemNote').value.trim();
  ppEnsure();
  showToast('Saved to your calendar.');

  if(nwEditMode){
    if(nwEditMode.src === 'ev'){
      const e = (data.events || []).find(x => String(x.id) === String(nwEditMode.id));
      if(e){
        e.title = title;
        e.date = date;
        e.category = type;
        e.time = time;
        e.duration = dur;
        e.note = note;
        if(['exam','meet','note'].includes(type)) e.important = true;
        saveData();
        renderPriorityPage();
        if(typeof renderCalendar === 'function') renderCalendar();
      }
    } else {
      const arr = ppList(nwEditMode.key);
      const it = arr.find(x => String(x.id) === String(nwEditMode.id));
      if(it && !it.link){
        it.text = title;
        it.time = time || null;
        it.estMinutes = dur || null;
        it.note = note || '';
        it.type = type;
        if(date !== nwEditMode.key){
          arr.splice(arr.indexOf(it), 1);
          data.priorityPlanner.byDate[date] = data.priorityPlanner.byDate[date] || [];
          data.priorityPlanner.byDate[date].push(it);
          nwState.active = date;
          try{ localStorage.setItem('stdy.today.active', date); }catch(e){}
        }
        saveData();
        renderPriorityPage();
        if(typeof renderDashQuickGrid === 'function') renderDashQuickGrid();
      } else if(it){
        it.time = time || null;
        it.estMinutes = dur || null;
        it.note = note || '';
        saveData();
        renderPriorityPage();
        if(typeof renderDashQuickGrid === 'function') renderDashQuickGrid();
      }
    }
    nwEditMode = null;
    return;
  }

  if(type === 'study' || type === 'goal'){
    const arr = ppList(date);
    arr.push({ id: uid(), text: title, done: false, time: time, estMinutes: dur, note: note, type: type, link: null });
    saveData();
    renderPriorityPage();
    if(typeof renderDashQuickGrid === 'function') renderDashQuickGrid();
  } else {
    data.events.push({
      id: uid(), title: title, date: date, category: type,
      important: true, time: time, duration: dur, note: note
    });
    saveData();
    renderPriorityPage();
    if(typeof renderCalendar === 'function') renderCalendar();
  }
  nwEditMode = null;
}

// ---------------- focus timer ----------------
function nwFocusTimerRender(){
  const t = nwEl('nwTimer');
  if(t) t.textContent = nwPad(Math.floor(Math.max(0,nwSeconds)/60)) + ':' + nwPad(Math.max(0,nwSeconds)%60);
  const ring = nwEl('nwFocusRing');
  if(ring){
    const pct = Math.max(0, Math.min(100, ((1500 - nwSeconds) / 1500) * 100));
    ring.style.background = 'conic-gradient(#7654dd 0 ' + pct + '%,#dedfe6 ' + pct + '% 100%)';
  }
}
function nwFocusStart(){
  const modal = nwEl('nwFocusModal');
  if(!modal) return;
  modal.classList.add('open');
  if(!nwInterval){
    nwRunning = true;
    const pb = nwEl('nwFocusPauseBtn'); if(pb) pb.textContent = 'Pause';
    nwInterval = setInterval(function(){
      if(!nwRunning) return;
      nwSeconds--;
      nwFocusTimerRender();
      if(nwSeconds <= 0){
        clearInterval(nwInterval); nwInterval = null; nwRunning = false;
        const pb = nwEl('nwFocusPauseBtn'); if(pb) pb.textContent = 'Restart';
        showToast('Focus block complete. 🎉');
      }
    }, 1000);
  }
}
function nwFocusPause(){
  if(nwSeconds <= 0){ nwSeconds = 1500; nwFocusTimerRender(); return; }
  nwRunning = !nwRunning;
  const pb = nwEl('nwFocusPauseBtn'); if(pb) pb.textContent = nwRunning ? 'Pause' : 'Resume';
}
function nwFocusReset(){
  nwSeconds = 1500;
  nwRunning = false;
  nwFocusTimerRender();
  const pb = nwEl('nwFocusPauseBtn'); if(pb) pb.textContent = 'Resume';
}

// ---------------- global shortcuts ----------------
if(typeof window === 'object'){
  window.nwToggleItem = nwToggleItem;
  window.nwDeleteItem = nwDeleteItem;
  window.nwOpenAdd = nwOpenAdd;
  window.nwOpenEdit = nwOpenEdit;
  window.nwCloseModal = nwCloseModal;
  window.nwSaveItem = nwSaveItem;
  window.nwSetActive = nwSetActive;
  window.nwSetFilter = nwSetFilter;
  window.nwShiftWeek = nwShiftWeek;
  window.nwShiftMonth = nwShiftMonth;
  window.nwClearCompleted = nwClearCompleted;
  window.nwFocusStart = nwFocusStart;
  window.nwFocusPause = nwFocusPause;
  window.nwFocusReset = nwFocusReset;
}

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape'){
    if(nwEl('nwItemModal')) nwEl('nwItemModal').classList.remove('open');
    if(nwEl('nwFocusModal')) nwEl('nwFocusModal').classList.remove('open');
    nwEditMode = null;
  }
});