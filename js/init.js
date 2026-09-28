// App init
// ---------------- INIT ----------------
function dismissStorageBanner(){
  const el = document.getElementById('storageBanner');
  if(el) el.style.display = 'none';
  try{ localStorage.setItem('studyTrackerBannerDismissed', '1'); }catch(e){}
}

function maybeShowStorageBanner(){
  if(hasClaudeStorage()) return; // Claude's own storage is reliable — no need to warn.
  let dismissed = false;
  try{ dismissed = localStorage.getItem('studyTrackerBannerDismissed') === '1'; }catch(e){}
  if(dismissed) return;
  const el = document.getElementById('storageBanner');
  if(el) el.style.display = 'flex';
}

// ============================================================
// STUDY MASCOT — an original chibi study-buddy who reacts to your
// real tracked data. Fully offline: no network, no AI calls — just
// your own numbers (today's time, your recent pace, your streak)
// driving her mood.
// ============================================================
let mascotState = { mood: null, line: '', imageKey: 'img_happy' };
let mascotMinimized = false;
let mascotPos = { x: null, y: null };
let mascotDragging = false;
let mascotLastInteraction = 0;
let mascotPokeCount = 0; // consecutive rapid pokes at Rei — she gets grumpy about it
let mascotPokeResetTimer = null;

const MASCOT_IMAGES = {
  hmph: 'assets/mascot-fallback.webp',
};

const MASCOT_SELF_NAME = 'Rei'; // her own name — change this one constant if you want a different one

// ============================================================
// CUSTOM MASCOT ART — the 35 canonical PNGs from the IMG pack,
// copied into assets/mascot/. Each mood/event key maps to one or
// more custom assets; where no custom asset fits, we fall back to the single
// always-present assets/mascot-fallback.webp below. Files are loaded by URL
// (relative, so they work offline). That fallback is a real file rather than a
// base64 data URI so 35 KB of image data stays out of this parse-blocking
// script; it deliberately sits outside assets/mascot/ because the error handler
// further down retries this path on failure.
// Aspect ratio is preserved by the CSS (width:100%; height:auto).
// ============================================================
const MASCOT_ASSET_DIR = 'assets/mascot/';
const MASCOT_ASSETS = {
  img_happy:                 '1. HAPPY - NORMAL STUDY SUCCESS.webp',
  img_playful:               '2_PLAYFUL - TEASING.webp',
  img_proud:                 '3. PROUD - 6+ HOURS.webp',
  img_flirty:                '4. FLIRTY - HARD WORK.webp',
  img_grumpy:                '5. GRUMPY - LESS THAN 2 HOURS.webp',
  img_disappointed:          '6. DISAPPOINTED - MISSED GOAL.webp',
  img_annoyed:               '7. ANNOYED - SUBJECT IGNORED.webp',
  img_focused:               '8. FOCUSED - DEEP STUDY.webp',
  img_se:                    '9. SOFTWARE ENGINEERING  CODING.webp',
  img_math:                  '10. MATHEMATICS - THINKING.webp',
  img_research:              '11. RESEARCH MODE.webp',
  img_motivational:          '12. MOTIVATIONAL GET BACK TO WORK.webp',
  img_celebration:           '13. CELEBRATION - BIG ACHIEVEMENT.webp',
  img_sleepy:                '14. SLEEPY - LATE NIGHT.webp',
  img_tired:                 '15. TIRED - AFTER LONG SESSION.webp',
  img_confused:              '16. CONFUSED - DIFFICULT TOPIC.webp',
  img_analytics:             '17. ANALYTICS  AI MODE.webp',
  img_comeback:              '18. COMEBACK - AFTER SEVERAL DAYS.webp',
  img_coffee_break:          '19. COFFEE BREAK - RELAXED.webp',
  img_watching_you:          '20. I\'M WATCHING YOU PROCRASTINATION DETECTED.webp',
  img_bro_really:            '21. BRO REALLY.webp',
  img_you_did_what:          '22. YOU DID WHAT.webp',
  img_im_not_mad:            '23. I\'M NOT MAD... I\'M MAD.webp',
  img_caught_you:            '24. CAUGHT YOU.webp',
  img_brain_left:            '25. MY BRAIN HAS LEFT THE CHAT.webp',
  img_excuse_me:             '26. EXCUSE ME.webp',
  img_i_cant_believe_you:    '27. I CAN\'T BELIEVE YOU.webp',
  img_oh_youre_done:         '28. OH, YOU\'RE DONE.webp',
  img_so_proud:              '29. I AM SO PROUD OF YOU.webp',
  img_why_are_you_like_this: '30. WHY ARE YOU LIKE THIS.webp',
  img_caught_scrolling:      '31. CAUGHT YOU SCROLLING.webp',
  img_streak7:               '32. 7-DAY STREAK.webp',
  img_failed_quiz:           '33. FAILED QUIZ.webp',
  img_difficult_defeated:    '34. DIFFICULT TOPIC DEFEATED.webp',
  img_neglected:             '35. 10 DAYS AWAY FROM A SUBJECT.webp',
};

// Mascot art put back on screen (instead of a generic pose) so she always
// shows exactly the intended pose for the current brain mood.
function mascotAsset(key){
  const f = MASCOT_ASSETS[key];
  return f ? MASCOT_ASSET_DIR + encodeURI(f) : null;
}

// The brain produces a mood (or an explicit imageKey); here we map every
// mood/event key to its custom asset(s) - with the always-present fallback
// preserved in mascotImageFor() below. Subject/persona poses are picked
// deliberately.
const MASCOT_MOOD_IMAGE_POOL = {
  annoyed:      ['img_watching_you', 'img_why_are_you_like_this'],   // wasting time
  angry:        ['img_im_not_mad', 'img_why_are_you_like_this'],     // skipped study
  disappointed: ['img_disappointed', 'img_bro_really', 'img_i_cant_believe_you'], // missed goal
  suspicious:   ['img_caught_you', 'img_watching_you', 'img_caught_scrolling'],   // caught slacking
  evilSmile:    ['img_bro_really', 'img_you_did_what'],              // about to challenge you
  grumpy:       ['img_grumpy', 'img_annoyed'],                       // low-study grump
  neutral:      ['img_happy', 'img_playful'],                        // baseline
  determined:   ['img_focused', 'img_motivational'],                 // focused grit / near goal
  confused:     ['img_confused', 'img_brain_left'],                  // difficult / lost
  smug:         ['img_oh_youre_done', 'img_excuse_me'],              // told-you-so
  curious:      ['img_excuse_me', 'img_confused'],                   // fresh subject interest
  excited:      ['img_celebration', 'img_proud'],                    // streak rolling
  celebrate:    ['img_celebration', 'img_streak7'],                  // milestone
  happy:        ['img_happy', 'img_proud'],                          // finished a task
  proud:        ['img_so_proud', 'img_proud', 'img_celebration'],    // daily goal complete
  flirty:       ['img_flirty', 'img_playful'],                       // hard work done well
  sleepy:       ['img_sleepy', 'img_tired'],                         // long absence
  ignored:      ['img_grumpy', 'img_annoyed'],                       // been quiet on you too long
  motivated:    ['img_motivational'],                                // get-back-to-work push
  comeback:     ['img_comeback', 'img_motivational'],                // subject return
  breakTime:    ['img_coffee_break', 'img_tired'],                   // break reminder
  analyst:      ['img_analytics'],                                   // interpreting your numbers
  research:     ['img_research', 'img_analytics'],                   // research mission
  streak:       ['img_streak7', 'img_celebration'],                  // streak milestone
  quizFail:     ['img_failed_quiz', 'img_disappointed'],             // quiz miss
  quizSuccess:  ['img_celebration', 'img_happy'],                    // quiz win
  neglected:    ['img_neglected', 'img_comeback'],                   // subject left too long
  coding:       ['img_se'],                                          // Software Engineering
  math:         ['img_math'],                                        // Mathematics
  tired:        ['img_tired', 'img_sleepy'],                         // after long session
};

// Subject-aware override: when the active session is on a known subject,
// we prefer that subject's bespoke asset — but ONLY for positive/neutral
// moods. Negative moods (grumpy, disappointed, confused, neglected, quizFail,
// comeback, etc.) must stay mood-correct so she never shows cheerful subject
// art while being upset about it.
const MASCOT_POSITIVE_MOODS = ['happy','neutral','playful','proud','flirty','excited','determined','curious','motivated','streak','quizSuccess','celebrate'];
function mascotImageKeyForMood(mood, subjectName){
  if(MASCOT_POSITIVE_MOODS.includes(mood)){
    const subj = (subjectName||'').toLowerCase();
    if(subj.includes('software') || subj.includes('engineering') || subj.includes('coding')) return 'coding';
    if(subj.includes('math')) return 'math';
    if(subj.includes('research')) return 'research';
  }
  return mood;
}

// Reads the live context the mascot image should align to: which subject is
// active, the current lecture/topic state, and that subject's test average.
function mascotImageContext(){
  const ctx = { subjectName:'', topicState:'fresh', topicTitle:'', testAvg:null };
  // Resolve the subject object we're aligned to (active selection, or the
  // subject currently being studied when a timer is running).
  let subjectObj = null;
  const active = (typeof mascotActiveSubject==='function') ? mascotActiveSubject() : null;
  if(active){ ctx.subjectName = active.name || ''; subjectObj = active; }
  let run = null;
  try{ if(typeof runningRef!=='undefined') run = runningRef; }catch(e){}
  if(run && run.subjectId && typeof data!=='undefined' && data){
    const subj = (data.subjects||[]).find(x=>x.id===run.subjectId);
    if(subj){
      subjectObj = subj;                       // running session is the most precise
      ctx.subjectName = subj.name || ctx.subjectName;
      const u = (subj.units||[]).find(x=>x.id===run.unitId);
      const l = u && (u.lectures||[]).find(x=>x.id===run.lectureId);
      if(l){
        ctx.topicTitle = l.title || '';
        if(l.completed) ctx.topicState = 'done';
        else if((l.seconds||0) > 0) ctx.topicState = 'inProgress';
        else ctx.topicState = 'fresh';
      }
    }
  }
  // Capture the subject's test average whether or not a timer is running,
  // so a persistently hard subject (avg < 60) can steer the art on it.
  if(subjectObj && typeof subjectTestAvg==='function'){
    const a = subjectTestAvg(subjectObj);
    if(a !== null) ctx.testAvg = a;
  }
  return ctx;
}

// Refine a positive/neutral mood toward the most context-relevant asset, so
// the mascot visibly aligns with the current subject / topic / test.
function mascotImageForContext(mood, ctx){
  if(!ctx) return null;
  if(!MASCOT_POSITIVE_MOODS.includes(mood)) return null; // keep negative moods mood-correct
  const subj = (ctx.subjectName||'').toLowerCase();
  const persona = (subj.includes('software')||subj.includes('engineering')||subj.includes('coding')) ? 'coding'
    : (subj.includes('math')) ? 'math'
    : (subj.includes('research')) ? 'research'
    : null;
  if(persona){
    const p = MASCOT_MOOD_IMAGE_POOL[persona];
    if(p && p.length) return p[Math.floor(Math.random()*p.length)];
  }
  if(ctx.topicState === 'done'){
    const p = MASCOT_MOOD_IMAGE_POOL['proud'] || MASCOT_MOOD_IMAGE_POOL['celebrate'];
    if(p && p.length) return p[Math.floor(Math.random()*p.length)];
  } else if(ctx.topicState === 'inProgress'){
    const p = MASCOT_MOOD_IMAGE_POOL['determined'] || MASCOT_MOOD_IMAGE_POOL['focused'];
    if(p && p.length) return p[Math.floor(Math.random()*p.length)];
  }
  if(ctx.testAvg !== null && ctx.testAvg < 60){
    const p = MASCOT_MOOD_IMAGE_POOL['confused'];
    if(p && p.length) return p[Math.floor(Math.random()*p.length)];
  }
  return null;
}

function mascotPickImageKey(mood, subjectName){
  // Try to align the image with the live subject / topic / test context.
  let ctx = null;
  try{ ctx = mascotImageContext(); }catch(e){}
  const override = mascotImageForContext(mood, ctx);
  if(override) return override;
  const base = mascotImageKeyForMood(mood, ctx && ctx.subjectName ? ctx.subjectName : subjectName);
  const pool = MASCOT_MOOD_IMAGE_POOL[base] || MASCOT_MOOD_IMAGE_POOL[mood] || ['img_happy'];
  return pool[Math.floor(Math.random()*pool.length)];
}
// Resolve a key that may be a custom asset OR a legacy MASCOT_IMAGES key → always
// returns a usable src (custom art first, then the always-present fallback file).
function mascotImageFor(key){
  const asset = mascotAsset(key);
  if(asset) return asset;
  return MASCOT_IMAGES[key] || MASCOT_IMAGES.hmph;
}

document.addEventListener('error', (e)=>{
  const img = e.target;
  if(img && img.tagName === 'IMG' && img.src.indexOf('assets/mascot') !== -1){
    img.src = MASCOT_IMAGES.hmph;
  }
}, true);

const MASCOT_PALETTE = {
  hairBack:  '#8a5a35',
  hairFront: '#c48a52',
  skin:      '#ffe3c6',
  blush:     '#ff9ec4',
  hoodie:    '#f6b6c6',
  hoodieDk:  '#e888a2',
  collar:    '#fff7f9',
  eyeLight:  '#ffd7dd',
  eyeMid:    '#e2536e',
  eyeDark:   '#7a2436',
  bow:       '#f5cf4a',
  bowDk:     '#e0b32e',
  heart:     '#ff6f9c',
};

let MASCOT_NAME = localStorage.getItem('studyUserName') || 'friend'; // what she calls you — set at login, editable in Settings

// ============================================================
// MASCOT CONFIG — every threshold & cooldown the JARVIS brain uses,
// surfaced here so they're easy to tune without touching logic.
// True behaviour-driven: the brain reads real tracker data only.
// ============================================================
const MASCOT_CONFIG = {
  // Hidden Study Mood Score point weights (Complete spec §9)
  moodPoints: {
    dailyGoalDone:     2,
    study6h:           2,
    study5h:           1,
    streakUp:          1,
    difficultDone:     1,
    neglectedStudied:  1,
    weeklyOnTrack:     1,
    researchDone:      1,
    lowStudy:         -2,
    goalMissed:       -1,
    subjectIgnored:   -1,
    inactive3:        -2,
    repeatPostpone:   -1,
  },
  moodTiers: { // score <= key → mood
    '-100': 'grumpy',
    '-3':   'grumpy',
    '-2':   'disappointed',
    '0':    'neutral',
    '3':    'playful',
    '5':    'proud',
    '7':    'celebrate',
  },
  // Event priority (highest first). Major milestone > comeback > streak >
  // difficult topic > daily goal > excellent duration > normal.
  eventPriority: [
    'milestone', 'comeback', 'streak_milestone', 'difficult_topic',
    'daily_goal', 'excellent_duration', 'session_end', 'session_start',
    'low_study', 'inactivity', 'end_of_day', 'quiz',
  ],
  // Cooldowns (ms) — set to Infinity to disable a category.
  cooldowns: {
    minorMood:   45*60000,   // between similar minor popups
    subjectTease:24*3600000, // same subject tease once per day
    achievement: Infinity,   // don't repeat identical wording (anti-rep handles)
    analytics:   60*60000,   // avoid repeating same insight while data unchanged
    milestone:   0,          // major milestones override cooldowns
  },
  // Thresholds
  focusBreaksAfterMin: 55,   // suggest a break after this many focused minutes
  longSessionMin:      75,   // "unusually long" current session
  neglectDays:         4,    // subject ignored this long = neglect tease
  comebackDays:        5,    // >= 5 days → comeback mode for that subject
  inactivityBreachMin: 120,  // after ~2h no interaction, one idle nudge
  // Anti-repetition: never repeat a line seen in the last N messages.
  antiRepeatWindow: 30,
  // Global noise gate: higher = talkative. 0 = almost silent.
  talkativeness: 1.0,
  maxPopupChars: 160,
  // === Personalized Subject Interaction System (spec §1–§19) ===
  subjectInteraction: {
    // Days since last studied → reaction tier. First matching upper bound wins.
    // mood = emotional key; image = forced asset (null → mood pool decides).
    tiers: [
      { max: 1, mood: 'happy',      image: null,               label: 'fresh' },
      { max: 3, mood: 'playful',    image: null,               label: 'recent' },
      { max: 4, mood: 'grumpy',     image: null,               label: 'mild' },      // 2-3 handled above; 3-4 teasing
      { max: 6, mood: 'grumpy',     image: 'img_annoyed',      label: 'teasing' },   // 4-6 baka teasing
      { max: 9, mood: 'disappointed', image: 'img_comeback',   label: 'strong' },    // 7-9 dramatic
      { max: Infinity, mood: 'grumpy', image: 'img_neglected', label: 'dramatic' },  // 10+ missing-person
    ],
    // These exact "(number) days" phrased to match spec examples:
    comebackDays: 5,            // >= this on a *new* session = comeback mode
    subjectOpenCooldown: 30*60000,   // ignore rapid re-clicks of same subject
    // Short-session detection: a session shorter than this fraction of the
    // subject's average session length gets the "WHY ARE YOU LIKE THIS" tease.
    shortSessionRatio: 0.4,
    // Prudent mile markers celebrated mid-session (spec §5), in minutes.
    sessionMilestones: [30, 60],
    // Personality evolution: how many comebacks before she shifts tone.
    comebackConsistency: 2,
  },
};
// Built from localStorage so a power user can mute/liven her up in Settings.
try{
  const overrides = JSON.parse(localStorage.getItem('studyMascotConfig') || '{}');
  Object.keys(overrides||{}).forEach(k=>{ if(k in MASCOT_CONFIG) MASCOT_CONFIG[k]=overrides[k]; });
}catch(e){}
