// Demo / trial mode — lets a reviewer (e.g. someone checking the project on
// GitHub or LinkedIn) explore a fully-populated copy of the app WITHOUT signing
// in or touching real data.
//
// HOW IT STAYS SAFE
//  - Demo data lives under its own local-only key (study-tracker-data:demo),
//    so it can never overwrite a real user's guest/cloud data.
//  - saveData() never pushes demo data to the cloud, and loadData() never
//    pulls cloud data while in demo mode.
//  - The data self-cleans on exit (Exit demo / sign out) and is regenerated
//    fresh if an old demo copy is found (24h), so stale or half-edited trial
//    data never lingers.
//  - A visible "DEMO" banner makes it obvious this is a trial session.
// ---------------- DEMO MODE ----------------

const DEMO_KEY = 'study-tracker-data:demo';
const DEMO_EXPIRY_MS = 24 * 60 * 60 * 1000; // regen demo data if older than 24h

function demoDateKey(d){
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function demoDaysAgo(n){
  const d = new Date(); d.setDate(d.getDate()-n); return d;
}
function demoMin(sec){ return sec; } // stored as seconds

// Builds a convincing, self-consistent semester for a reviewer to click around.
// Everything references real subject/unit/lecture ids so timers, scores,
// planner-link lectures, and the analytics dashboard all line up.
function buildDemoData(){
  const subjects = [];
  const folderIdByName = {};

  const folders = [
    { id: 'demo-fld-sem', name: 'Semester 5', icon: '🎓' },
    { id: 'demo-fld-proj', name: 'Projects', icon: '🚀' },
    { id: 'demo-fld-self', name: 'Self Learning', icon: '📖' },
  ];
  folders.forEach(f=>{ folderIdByName[f.name] = f.id; });

  // Packed: [label, folderName, unitNames[], lecturesPerUnit, minutesPerLecture, withTests]
  const plan = [
    { name:'Mathematics – Probability & Stats', folder:'Semester 5', colors:null,
      units:[
        { name:'Unit 1 · Probability', lecs:[120, 95, 150, 40], tests:[{n:'Quiz 1', o:21, t:25},{n:'Unit Test',o:34,t:40}] },
        { name:'Unit 2 · Statistics', lecs:[110, 80, 130], tests:[{n:'Quiz 2', o:18, t:25}] },
      ]},
    { name:'Database Management System', folder:'Semester 5',
      units:[
        { name:'Unit 1 · ER Models & SQL', lecs:[150, 140, 120, 90], tests:[{n:'Midterm', o:39, t:50},{n:'SQL Quiz',o:22,t:25}] },
        { name:'Unit 2 · Normalization', lecs:[95, 105], tests:[{n:'Normalization Test', o:28, t:30}] },
      ]},
    { name:'Object-Oriented Programming', folder:'Semester 5',
      units:[
        { name:'Unit 1 · OOP Essentials', lecs:[90, 75, 60, 100], tests:[{n:'OOP Mini', o:17, t:20},{n:'Lab Exam',o:43,t:50}] },
        { name:'Unit 2 · Design Patterns', lecs:[70, 65], tests:[] },
      ]},
    { name:'Software Engineering', folder:'Semester 5',
      units:[
        { name:'Unit 1 · SDLC & Agile', lecs:[110, 85, 70], tests:[{n:'SE Quiz', o:24, t:25}] },
        { name:'Unit 2 · UML & Requirements', lecs:[60, 55], tests:[] },
      ]},
    { name:'Portfolio Website', folder:'Projects',
      units:[
        { name:'Build · HTML/CSS/JS', lecs:[45, 60, 40], tests:[] },
      ]},
    { name:'Deep Learning (Self-Study)', folder:'Self Learning',
      units:[
        { name:'Intro · Neural Nets', lecs:[80, 70], tests:[] },
      ]},
  ];

  plan.forEach(p=>{
    const subject = {
      id: 'dsubj-' + Math.random().toString(36).slice(2,10),
      name: p.name,
      folderId: folderIdByName[p.folder] || null,
      units: []
    };
    p.units.forEach((unit, ui)=>{
      const uo = { id:'dunit-'+Math.random().toString(36).slice(2,10), name: unit.name, open: ui===0, lectures: [], tests: [] };
      unit.lecs.forEach((mins, li)=>{
        const lec = {
          id: 'dlec-'+Math.random().toString(36).slice(2,10),
          title: p.name.split(' – ')[0] + ' · Topic ' + (li+1),
          link: '',
          notes: '',
          completed: li < unit.lecs.length - 1, // last one unfinished → shows a live "to do"
          seconds: demoMin(Math.round(mins*60*(0.75 + Math.random()*0.4))),
          timerStart: null
        };
        // Give the first lecture of the first unit a small rich-note page and
        // a couple of headings/points so the notes editor looks alive.
        if(ui===0 && li===0){
          lec.richNotes = '<h3>Quick summary</h3><p>Drafted in demo mode so you can see the rich-text editor, <b>bold</b>, <i>italics</i>, and <mark>highlights</mark> in action. Open any lecture and hit ✎ Notes.</p><ul><li>Paginate, draw, and search across pages</li><li>Find &amp; replace (Ctrl+F), link (Ctrl+K), timestamp</li></ul>';
          lec.notesPages = [lec.richNotes];
          lec.notes = 'Quick summary';
        }
        uo.lectures.push(lec);
      });
      (unit.tests||[]).forEach(t=>{
        uo.tests.push({ id:'dtst-'+Math.random().toString(36).slice(2,10), name:t.n, obtained:t.o, total:t.t, questions:null });
      });
      subject.units.push(uo);
    });
    subjects.push(subject);
  });

  // Daily log — a realistic ~6 week commit-graph/heatmap with a live streak.
  const dailyLog = {};
  for(let i=44;i>=0;i--){
    const d = demoDaysAgo(i);
    const key = demoDateKey(d);
    // Weekend dip + occasional skip = believable, non-perfect habit.
    const dow = d.getDay();
    let minutes = 0;
    if(i===0) minutes = 95;                       // today, in-progress
    else if(dow===0 || dow===6) minutes = [0,45,0,20][i%4];
    else minutes = [70,120,95,140,60,110,50][i%7];
    if(minutes <= 0) continue;
    const secs = minutes*60;
    const entry = { total: secs, bySubject:{} };
    // Spread across the semester subjects so the per-subject bars look real.
    const active = subjects.slice(0,4);
    let assigned = 0;
    active.forEach((s,si)=>{
      const share = (si===0) ? 0.4 : 0.2;
      const sSec = Math.round(secs * share);
      if(sSec > 0){ entry.bySubject[s.id] = sSec; assigned += sSec; }
    });
    if(assigned < secs && active[0]) entry.bySubject[active[0].id] += (secs - assigned);
    dailyLog[key] = entry;
  }

  // Habits — gym + reading for the last ~2 weeks, mostly done (streak).
  const habitEntries = {};
  for(let i=12;i>=0;i--){
    const d = demoDaysAgo(i);
    const key = demoDateKey(d);
    habitEntries[key] = { gym: i%3!==2, reading: i%4!==1, gymNote: i===0 ? 'Leg day + 20 min cardio' : '', readingNote: i===0 ? 'Chapter 3 of Deep Learning' : '' };
  }

  // Priority planner — today's plan with two lecture-linked items + one free task.
  const todayStr = demoDateKey(new Date());
  const tomorrowStr = demoDateKey(demoDaysAgo(-1));
  const dbs = subjects[1]; // Database
  const dbsU = dbs.units[0];
  const math = subjects[0]; const mathU = math.units[0];
  // Point the "not done" plan item at an unfinished lecture, and the "done"
  // item at a finished one, so the planner ↔ lecture completion stays truthful.
  const pp1 = dbsU.lectures[dbsU.lectures.length - 1]; // DBMS Unit 1 last (incomplete)
  const pp2 = mathU.lectures[0];                        // Math Unit 1 first (completed)
  const priorityPlanner = { byDate: {} };
  priorityPlanner.byDate[todayStr] = [
    { id:'dp-'+Math.random().toString(36).slice(2,8), text: pp1.title, done:false, link:{ subjectId:dbs.id, unitId:dbsU.id, lectureId:pp1.id }, estMinutes:50, level:'high', time:'09:00', type:'Lecture' },
    { id:'dp-'+Math.random().toString(36).slice(2,8), text: pp2.title, done:true, link:{ subjectId:math.id, unitId:mathU.id, lectureId:pp2.id }, estMinutes:60, level:'medium', time:'11:30', type:'Lecture' },
    { id:'dp-'+Math.random().toString(36).slice(2,8), text:'Revise ER diagram symbols', done:false, link:null, estMinutes:30, level:'low', time:'16:00', type:'Task' },
  ];
  priorityPlanner.byDate[tomorrowStr] = [
    { id:'dp-'+Math.random().toString(36).slice(2,8), text:'Start UML case study', done:false, link:null, estMinutes:45, level:'medium', time:'10:00', type:'Task' },
  ];

  // Events — a couple of upcoming deadlines on the calendar.
  const events = [
    { id:'dev-'+Math.random().toString(36).slice(2,8), title:'Database Midterm', date: demoDateKey(demoDaysAgo(-4)), category:'exam', important:true },
    { id:'dev-'+Math.random().toString(36).slice(2,8), title:'Submit Portfolio v1', date: demoDateKey(demoDaysAgo(-6)), category:'project', important:false },
    { id:'dev-'+Math.random().toString(36).slice(2,8), title:'Team standup', date: demoDateKey(demoDaysAgo(-2)), category:'other', important:false },
  ];

  // Flag today's lecture-linked items as priority so the planner ↔ lecture rows match.
  priorityPlanner.byDate[todayStr].forEach(it=>{
    if(it.link){
      const s = subjects.find(x=>x.id===it.link.subjectId);
      const u = s && s.units.find(x=>x.id===it.link.unitId);
      const l = u && u.lectures.find(x=>x.id===it.link.lectureId);
      if(l){ l.priority = true; l.plannedDate = todayStr; }
    }
  });

  return {
    subjects,
    folders,
    dailyLog,
    habits: { entries: habitEntries },
    priorityPlanner,
    events,
    updatedAt: Date.now()
  };
}

function isDemoModeActive(){
  return typeof DEMO_MODE !== 'undefined' && DEMO_MODE;
}

// Enters demo mode: flags the global, boots the app against the throwaway
// demo dataset, and reveals the banner. Called from "Try the demo" on login.
async function startDemoMode(){
  DEMO_MODE = true;
  if(typeof MASCOT_NAME !== 'undefined') MASCOT_NAME = 'Reviewer';
  try{
    document.dispatchEvent(new CustomEvent('demo:modeStart'));
  }catch(e){}
  if(typeof startApp === 'function'){
    await startApp(); // startApp() → loadData() builds/loads the demo copy
  }
  if(typeof renderUsernameDisplay === 'function'){ try{ renderUsernameDisplay(); }catch(e){} }
  showDemoBanner();
}

// Leaves demo mode and wipes the trial copy so nothing lingers.
async function exitDemoMode(){
  DEMO_MODE = false;
  try{
    const keys = [DEMO_KEY];
    keys.forEach(k=>{
      try{ localStorage.removeItem(k); }catch(e){}
    });
    try{
      const req = indexedDB.open('study-tracker-db', 1);
      req.onsuccess = ()=>{
        const db = req.result;
        const tx = db.transaction('kv','readwrite');
        keys.forEach(k=>tx.objectStore('kv').delete(k));
      };
    }catch(e){}
  }catch(e){}
  hideDemoBanner();
  location.reload(); // back to the login / real flow
}

// Banner is injected by demo.js if the markup isn't present, so the demo
// works even before the main shell pushes an update.
let __demoBannerEl = null;
function showDemoBanner(){
  let el = document.getElementById('demoBanner');
  if(!el){
    el = document.createElement('div');
    el.id = 'demoBanner';
    el.className = 'demo-banner';
    el.innerHTML = '<span>🎓 <b>Demo mode</b> — this is sample data. Nothing you do here is saved to your account.</span> <button onclick="exitDemoMode()">Exit demo →</button>';
    const ref = document.querySelector('.app');
    if(ref) ref.insertBefore(el, ref.firstChild);
  }
  el.style.display = 'flex';
  __demoBannerEl = el;
}
function hideDemoBanner(){
  if(__demoBannerEl) __demoBannerEl.style.display = 'none';
}
