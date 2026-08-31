// Study mascot: hidden respect system, free positioning/dragging/wandering, pseudo-3D tilt
// ---------------- HIDDEN RESPECT SYSTEM ----------------
// Never shown as a number in the UI. Starts near zero and drifts up with
// consistent real effort, down with neglect. Reroutes her dialogue tone at
// a few thresholds (see mascotRespectTier below) without ever announcing
// itself — it's felt, not read.
let mascotRespect = (() => {
  const raw = parseInt(localStorage.getItem('studyMascotRespect'), 10);
  return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0;
})();
function mascotAdjustRespect(delta){
  mascotRespect = Math.max(0, Math.min(100, mascotRespect + delta));
  try{ localStorage.setItem('studyMascotRespect', String(mascotRespect)); }catch(e){}
}
function mascotRespectTier(){
  if(mascotRespect >= 100) return 100;
  if(mascotRespect >= 80) return 80;
  if(mascotRespect >= 50) return 50;
  if(mascotRespect >= 20) return 20;
  return 0;
}
const MASCOT_RESPECT_LINES = {
  0:   ["Move.", "Start. Now.", "I'm not impressed yet.", "That's it? Try again.", "Respect is earned. You're currently... accruing.", "Don't expect a cheer. Standards."],
  20:  ["At least you're trying.", "Fine. Keep going.", "Not terrible.", "...Better than yesterday.", "That's a start. Emphasis on start.", "Enough to not embarrass yourself."],
  50:  ["You're getting consistent.", "Good. Don't stop now.", "This is what showing up looks like.", "Noted. Keep it up.", "You're proving it. Slowly. But proving it.", "I almost respect the routine."],
  80:  ["I knew you could do it.", "This is the version of you that wins.", "You're actually dangerous now.", "Don't get soft on me.", "Genuine respect. Don't make me regret it.", "You've earned the good opinion. Guard it."],
  100: ["Let's reach the top together.", "You earned this. All of it.", "I stopped doubting you a while ago.", "We're not stopping here.", "Max respect. There's nowhere to go but with me.", "I'd follow your schedule. Don't tell anyone."],
};

// One-time-per-day flags so respect deltas and milestone lines don't fire
// repeatedly on every render — persisted so a page reload doesn't reset them.
let mascotDayFlags = (() => {
  try{ return JSON.parse(localStorage.getItem('studyMascotDayFlags') || '{}'); }catch(e){ return {}; }
})();
function mascotFlagKey(){ return todayKey(); }
function mascotHasFlag(name){
  const day = mascotFlagKey();
  return !!(mascotDayFlags[day] && mascotDayFlags[day][name]);
}
function mascotSetFlag(name){
  const day = mascotFlagKey();
  if(!mascotDayFlags[day]) mascotDayFlags[day] = {};
  mascotDayFlags[day][name] = true;
  // keep only the last 14 days of flags so this never grows unbounded
  const keys = Object.keys(mascotDayFlags).sort();
  while(keys.length > 14){ delete mascotDayFlags[keys.shift()]; }
  try{ localStorage.setItem('studyMascotDayFlags', JSON.stringify(mascotDayFlags)); }catch(e){}
}

const MASCOT_LINES = {
  // === Core mood banks (mapped 1:1 to the 10-mood table) ===
  annoyed: [ // wasting time
    "Still here?",
    "Your notes won't read themselves.",
    "Mouse movement isn't studying.",
    "Start already.",
    "I'm waiting.",
    "Clock's ticking, {name}.",
    "This isn't progress.",
    "Doing nothing has a sound. I can hear it.",
    "You opened the app. That's step one of ten thousand.",
    "Tick. Tock. {name}.",
    "I've seen paint dry with more urgency.",
    "This is the part where you start.",
    "The timer's still off. That's a choice.",
    "Twenty minutes of staring at me won't count as study time.",
    "You're glowing. From the screen. Not from effort.",
    "Somewhere, a syllabus just sighed.",
    "Break's over. You know it. I know it.",
    "Don't make me count to three in an encouraging voice.",
    "I could time this—your inaction is getting consistent.",
    "Your chair won't study for you. Trust me, I checked.",
  ],
  angry: [ // skipped study
    "You skipped it. I noticed.",
    "Zero minutes. Today. Explain.",
    "You knew this deadline existed.",
    "I'm not asking twice.",
    "That's a whole day, gone.",
    "{name}. We need to talk about today.",
    "Skipping isn't resting. It's losing.",
    "You had time. You chose not to.",
    "I don't do disappointed quietly.",
    "This is the one thing I asked.",
    "An empty day is still a day you'll have to pay for.",
    "I counted zero. I counted twice. Still zero.",
    "The syllabus didn't take today off. Why did you?",
    "That zero is going to sit in the log like a witness.",
    "You're not 'taking a break.' You're avoiding it. There's a difference.",
    "{name}, I'm not the one you should be dodging.",
  ],
  disappointed: [ // missed today's goal
    "You didn't finish. I noticed that too.",
    "So close. And still short.",
    "Today's goal is still sitting there. Untouched.",
    "I expected more. I always do.",
    "This wasn't your day, was it.",
    "{name}, we both know you could've finished this.",
    "Not angry. Just... let down.",
    "You'll do better tomorrow. You'd better.",
    "I watched the numbers stall at the end. Unbecoming.",
    "You had the momentum and you set it down gently.",
    "Close counts in horseshoes. Not in this app.",
    "I don't sulk. I just remember.",
  ],
  suspicious: [ // tab-switched away / caught slacking
    "Where did you go just now?",
    "That wasn't the lecture tab.",
    "I saw that.",
    "Mm-hmm. Sure you were 'checking something quick.'",
    "You're back fast. Suspiciously fast.",
    "{name}. Eyes on the work.",
    "I don't need proof. I have a feeling.",
    "Whatever that was — it wasn't studying.",
    "The timer kept running in your absence. Tsk.",
    "Ah, you're back. How was the 'research'?",
    "I won't say I was counting. But I was counting.",
    "You can't sneak away from me. I'm everywhere in this log.",
  ],
  evilSmile: [ // blowing past your own usual pace — smug about it
    "Let's make this interesting.",
    "I have a challenge for you. You'll hate it.",
    "Bet you can't beat this tomorrow.",
    "Ehehe~ look who showed up today.",
    "One more lecture. I dare you.",
    "You think you're done? Cute.",
    "Let's see what you're actually made of, {name}.",
    "I'm not being nice right now. On purpose.",
    "Careful. Keep this up and I'll start expecting it.",
    "You're on a roll. I'm choosing not to be impressed. Out loud.",
    "Tsk, tsk. Showing off~ Or just... finally keeping pace?",
    "Round two tomorrow. I've already planned your excuses.",
  ],
  neutral: [ // baseline
    "Ready when you are.",
    "Let's have a decent day, {name}.",
    "I'm watching. Same as always.",
    "No excuses today, okay?",
    "Tap me if you need a push. Or don't.",
    "Everything's normal. For now.",
    "The tab's open. The timer's ready. The ball's in your court.",
    "I've got nothing snarky. That's worrying, isn't it.",
    "One day at a time. Two if I'm feeling generous.",
    "Let's see what kind of day this is going to be.",
  ],
  happy: [ // finished one task
    "Finally.",
    "One down. Don't stop.",
    "Good. Next.",
    "...Fine, that was decent.",
    "Progress. Actual progress.",
    "See? Wasn't so hard.",
    "That's more like it, {name}.",
    "One in the books. The momentum's yours now.",
    "See what happens when you actually start?",
    "Okay, that counted.",
  ],
  proud: [ // daily goal complete
    "Today's done. All of it.",
    "...Not bad, {name}. Not bad at all.",
    "You actually finished. I'm almost impressed.",
    "Full day, cleared. Remember this feeling.",
    "This is what I keep pushing you for.",
    "Goal met. Don't get used to my approval.",
    "Look at you. Carrying the whole day on your back.",
    "I'll let that one slide as 'good'.",
    "Now THAT is a log entry I don't mind reading.",
  ],
  sleepy: [ // no activity for a long time
    "Done staring at the screen?",
    "You've been gone a while.",
    "I got bored. Then worried. Then bored again.",
    "The lectures missed you. I didn't say I did.",
    "Well? Are we doing this today or not.",
    "{name}? Anyone home?",
    "I've been counting dust motes. There's a rhythm to it.",
    "Say the word if you're ever planning to return.",
  ],
  ignored: [
    "Are you even listening to me~?",
    "Hehe~ ignore me again? Typical.",
    "Hmph! Fine, be that way.",
    "Just one more minute~ ...that's what you said an hour ago.",
    "{name}, I've been talking to myself over here.",
    "Excuse me?? Am I invisible now?",
    "I'll just sit here and re-read my own dialogue. Fascinating stuff.",
    "Oh, you're finally back. Try not to sound so thrilled.",
    "Yoo-hoo~ the future is happening without you.",
  ],

  // === Situational banks ===
  study: [ // general study-session commentary
    "Keep this pace.",
    "This is fine. Barely.",
    "Don't check your phone. I'll know.",
    "You're doing the thing. Keep doing the thing.",
    "Halfway. Don't slow down now.",
    "This is what discipline looks like, apparently.",
    "Steady {minutes} minutes in. Let's see if you hold.",
    "You're in flow. I'd almost call it graceful.",
    "Don't stop to admire your own progress. Next slide.",
  ],
  deadline: [
    "{subject} deadline in a few hours. Still zero progress.",
    "{subject} is untouched. That's not going to fix itself.",
    "{subject} can wait, you said. It can't.",
    "Finish it. You're close.",
    "The deadline doesn't care how tired you are.",
    "{subject} is breathing down your neck. Figuratively. For now.",
    "That deadline is closer than you want to admit about {subject}.",
    "{subject}. Hours, not days. Move.",
  ],
  exam: [ // exam mode — 7 days out, serious tone
    "No games. Not this week.",
    "Finish this unit. Today.",
    "You're already behind for this exam.",
    "Skip the videos. Skip the scrolling. Just this once, skip everything but this.",
    "Seven days. That's it. That's all you get.",
    "I'm not going to pretend this is optional anymore.",
    "This is the part where it actually matters.",
    "The exam doesn't negotiate. Neither do I.",
    "Every lecture now is a deposit. Spend wisely.",
    "Anxiety for {subject} is already on my calendar. Make it pointless.",
  ],
  morning: [
    "Good. Start.",
    "Morning. Don't waste it.",
    "Early start. I approve. Barely.",
    "The day's fresh. Keep it that way.",
    "Morning momentum is worth double. Go.",
  ],
  afternoon: [
    "Half the day is gone.",
    "It's not morning anymore. What happened?",
    "Afternoon slump? Not my problem.",
    "The clock's not bluffing. Pick it back up.",
  ],
  night: [
    "Don't tell me you're starting now.",
    "Night session. Fine. Make it count.",
    "This is late. Not too late. Move.",
  ],
  lateNight: [
    "Sleep after one chapter.",
    "It's late, {name}. One more, then rest.",
    "Your brain needs sleep more than this lecture needs you right now.",
  ],
  reminder: [ // smart reminders
    "Drink water. Your brain needs it.",
    "Five minutes. Not fifty.",
    "Sit up straight. I can somehow tell you're not.",
    "Blink. Look away from the screen. Then get back to it.",
  ],
  streak: [ // milestone-triggered, see mascotStreakLine()
  ],

  // === New mood banks (mapped to closest pose in init.js) ===
  determined: [ // fresh resolve / close to a goal — focused grit
    "Locked in.",
    "Focus. It's the whole game.",
    "This is where it's decided. Right here.",
    "One thing at a time. Nail it.",
    "Clear head, clear target. Go.",
    "You can feel the finish line. Drag it closer.",
  ],
  smug: [ // periodic reminder that she was right / you doubted her
    "I told you so. Quietly. Once.",
    "I could've said 'I told you so.' I'm being generous today.",
    "See? I'm never wrong. Annoying, isn't it.",
    "I keep receipts. Just so you know.",
  ],
  curious: [ // a fresh subject/unit — she's interested, a little teasing
    "Ooh, a new toy. I mean, a new subject.",
    "This one's interesting. Don't make me regret saying that.",
    "New material. Let's see how you chew it.",
  ],
  excited: [ // a good streak is rolling or the day's going great — genuine enthusiasm leaks
    "Okay, fine. This is going well."
  ],
  celebrate: [ // milestone celebrations
    "Milestone. Actually impressive.",
    "Put that in a frame. You earned it.",
  ],

  // === New situational banks ===
  goalNear: [ // within reach of today's goal
    "You're close to your goal. Don't trip now.",
    "Almost there. Finish the job.",
    "One push and today's yours. I can feel it.",
  ],
  goalMissed: [ // goal was within reach but slipped
    "So close you could taste it. Then it slipped.",
    "That finish line was basically in reach. Hmph.",
    "You had it. Then you sat down. On the last lap.",
  ],
  focusEnter: [ // entering focus mode
    "Focus mode. No witnesses. Just results.",
    "I'll keep watch. You keep working.",
    "Nothing else exists for a while. Understood?",
  ],
  focusExit: [ // leaving focus mode
    "Session over. Sustainable? We'll see.",
    "Pulled the plug early? I wasn't counting. Much.",
    "Back to the world. Keep the momentum in your pocket.",
  ],
  breakTime: [ // periodic break reminder during long sessions
    "Water. Stretch. Twenty seconds. Then back.",
    "Your eyes earned a flicker of daylight. Briefly.",
    "Stand up before your spine files a complaint.",
  ],

  // === JARVIS/Complete-spec mood banks (fed by the brain + mood score) ===
  grumpy: [ // <2h, repeated inactivity, ignored subject
    "Less than two hours? I'm officially giving you the grumpy face.",
    "That's not a study day. That's a study appetizer.",
    "You can't keep feeding me tiny study sessions.",
    "I expected a comeback, not a cameo.",
    "Your study timer is looking a little embarrassed.",
    "Come on, {name}. We can do better than this.",
    "You really opened the app just to disappoint me, huh?",
  ],
  playful: [
    "Ohooo, look who's suddenly productive.",
    "Who gave you motivation today?",
    "Excuse me? Where did this productivity come from?",
    "Someone woke up serious today.",
    "Well well well... productivity has entered the chat.",
    "I see you. Keep going.",
  ],
  flirty: [ // 6h+, hard topic, milestone — wholesome playful pride
    "Doing all that hard work just to impress me, huh?",
    "Six hours already? You're making it very difficult not to brag about you.",
    "Okay, hardworking looks good on you.",
    "Careful. Keep studying like this and I might actually become impressed.",
    "Seven hours? Okay, you have my attention.",
    "Hard work suits you. Don't let it go to waste.",
  ],
  quizFail: [ // gentle, never shaming
    "That score wasn't the disaster of the century. Review, then retake.",
    "One quiz won't define you. The retake will.",
    "Low score logged. No drama. We close the gap next time.",
    "That average needs a hero. Pick the weak units and go again.",
  ],
  comeback: [ // returning to a subject after a long absence
    "Yayy, finally giving this subject some life again!",
    "Oh look... I recognize this subject. It missed you.",
    "Back to this one? Excellent choice.",
    "Welcome back to the subject you abandoned.",
    "You came back! I knew you'd eventually remember.",
    "No disappearing again, understood?",
  ],
  research: [ // research = long-term mission
    "Research time? Okay scientist, let's investigate.",
    "Another piece of evidence collected. The picture is getting clearer.",
    "You're not just studying anymore. You're investigating.",
    "Evidence first, conclusions second. Keep documenting everything.",
  ],
  excellent: [ // exceptional day — extremely proud
    "WAIT. You actually did it?!",
    "Okay, THAT deserves a celebration.",
    "You didn't just start. You finished.",
    "Today goes in the victory column.",
    "I'm officially impressed. Don't get used to it.",
  ],
  neglect: [ // subject left too long
    "That subject is beginning to look jealous.",
    "It's been a while. Let's fix that.",
    "Your textbook has officially forgiven you. Mostly.",
  ],
};

function mascotStreakLine(days){
  if(days >= 100) return "...I'm impressed. 100 straight days. That's not luck.";
  if(days >= 30) return "Thirty days. Don't ruin it now.";
  if(days >= 10) return `${days} days straight. Okay. That's real.`;
  if(days >= 7)  return `One week. Unbroken. I noticed.`;
  if(days >= 3)  return `${days} days. Keep stacking.`;
  return null;
}

// Fills in every {token} a line might contain. Any token left unfilled
// (e.g. {rival} with no rival in context) is intentionally left as literal
// text here — callers that care (mascotPickLine) check for leaked braces
// afterward and fall back to a token-free line instead.
function mascotResolveTokens(line, ctx){
  const c = ctx || {};
  let out = line.replace(/\{name\}/g, MASCOT_NAME);
  if(c.rivalName) out = out.replace(/\{rival\}/g, c.rivalName);
  if(c.subjectName) out = out.replace(/\{subject\}/g, c.subjectName);
  if(c.rank) out = out.replace(/\{rank\}/g, c.rank);
  if(c.activityRival) out = out.replace(/\{activityRival\}/g, c.activityRival);
  if(c.activitySubject) out = out.replace(/\{activitySubject\}/g, c.activitySubject);
  if(c.minutes) out = out.replace(/\{minutes\}/g, String(c.minutes));
  if(c.days) out = out.replace(/\{days\}/g, String(c.days));
  return out;
}

// Anti-repeat picker: never the same line twice in a row within a given
// pool, and biased away from anything used in the last few picks when the
// pool is large enough to afford it — so she stops feeling like a fixed
// rotation even with a modest line count per category.
let mascotRecentLines = {};
function mascotPickFromPool(pool, poolKey){
  if(!pool || !pool.length) return '';
  if(pool.length === 1) return pool[0];
  const recent = mascotRecentLines[poolKey] || [];
  const historyDepth = Math.min(recent.length, Math.max(1, pool.length - 2));
  const recentSet = new Set(recent.slice(-historyDepth));
  let candidates = pool.filter(l => !recentSet.has(l));
  if(!candidates.length) candidates = pool; // pool exhausted — allow repeats rather than getting stuck
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  recent.push(pick);
  while(recent.length > 8) recent.shift();
  mascotRecentLines[poolKey] = recent;
  return pick;
}

// Exam mode: true when any subject with an exam date has ≤7 days left,
// exam not already passed, and lectures still remaining — dials her whole
// personality toward "no games" seriousness.
function mascotExamMode(){
  try{
    return (data.subjects||[]).some(s=>{
      const p = examPacing(s);
      return p && p.daysLeft >= 0 && p.daysLeft <= 7 && p.remaining > 0;
    });
  }catch(e){ return false; }
}

function mascotPickLine(mood, ctx){
  const c = ctx || {};

  // Being ignored overrides the baseline 'neutral' mood specifically.
  if(mood === 'neutral' && c.ignoredMs && c.ignoredMs > 4*60000 && Math.random() < 0.55){
    return mascotResolveTokens(mascotPickFromPool(MASCOT_LINES.ignored, 'ignored'), c);
  }

  // Exam mode (≤7 days out, work still remaining) dials up seriousness for
  // her more "ambient" moods — but never overrides a direct reaction like
  // happy/competitive/suspicious/angry, since those are about something
  // that just actually happened and shouldn't get swallowed by the countdown.
  const AMBIENT_MOODS = ['neutral','annoyed','sleepy','evilSmile'];
  if(mascotExamMode() && AMBIENT_MOODS.includes(mood) && Math.random() < 0.7){
    return mascotResolveTokens(mascotPickFromPool(MASCOT_LINES.exam, 'exam'), c);
  }

  // Occasionally let her hidden respect level color a baseline/positive
  // moment instead of the mood-specific line — this is what makes her
  // slow-earned approval actually feel earned over time, instead of a
  // number nobody ever sees changing anything.
  const RESPECT_ELIGIBLE = ['neutral','happy','proud'];
  if(RESPECT_ELIGIBLE.includes(mood) && Math.random() < 0.3){
    const tier = mascotRespectTier();
    return mascotResolveTokens(mascotPickFromPool(MASCOT_RESPECT_LINES[tier], 'respect'+tier), c);
  }

  // Time-of-day flavor and the occasional smart reminder, folded into her
  // otherwise-ambient 'neutral' moments so they don't compete with real reactions.
  if(mood === 'neutral'){
    if(c.achievableLine) return mascotResolveTokens(c.achievableLine, c);
    const roll = Math.random();
    if(roll < 0.15){
      const h = new Date().getHours();
      const timeBank = h>=5&&h<12 ? 'morning' : h>=12&&h<17 ? 'afternoon' : h>=17&&h<22 ? 'night' : 'lateNight';
      return mascotResolveTokens(mascotPickFromPool(MASCOT_LINES[timeBank], timeBank), c);
    }
    if(roll < 0.3){
      return mascotResolveTokens(mascotPickFromPool(MASCOT_LINES.reminder, 'reminder'), c);
    }
  }

  // Near-goal determination: when she's in focused near-goal mode, lean on
  // the 'goalNear' coaching lines a good chunk of the time rather than the
  // generic determined pool — keeps the "you're almost there" energy front
  // and center instead of generic grit.
  if(mood === 'determined' && Math.random() < 0.55){
    const near = mascotPickFromPool(MASCOT_LINES.goalNear, 'goalNear');
    if(!/\{[a-zA-Z]+\}/.test(near)) return mascotResolveTokens(near, c);
  }

  const pool = MASCOT_LINES[mood] || MASCOT_LINES.neutral;
  let line = mascotResolveTokens(mascotPickFromPool(pool, mood), c);

  // Safety net: if a token had nothing to fill it with (e.g. no live
  // activity tidbit available right now), fall back to a token-free
  // neutral line instead of leaking literal "{rank}" text onto screen.
  if(/\{[a-zA-Z]+\}/.test(line)){
    const safe = MASCOT_LINES.neutral.filter(l=>!/\{[a-zA-Z]+\}/.test(l));
    return mascotResolveTokens(mascotPickFromPool(safe, 'neutral'), c);
  }
  return line;
}

// Figure out how the mascot should feel, using ONLY the real user's own
// data (independent of whatever analytics panel happens to be open elsewhere
// in the app).
// How much of a typical study day has plausibly elapsed by the current
// time — weighted realistically (quiet overnight, steady through the day)
// rather than linearly, so her pace expectations feel sane at 7am vs 7pm.
const DAY_HOUR_WEIGHTS = [
  0.04,0.04,0.04,0.04,0.04,0.09,
  0.78,0.87,0.92,0.96,0.96,0.92,
  0.87,0.85,0.87,0.92,0.96,1.01,
  1.01,0.96,0.92,0.83,0.69,0.58
];
function todayProgressFraction(){
  const now = new Date();
  const h = now.getHours();
  const minuteFrac = now.getMinutes()/60 + now.getSeconds()/3600;
  const totalWeight = DAY_HOUR_WEIGHTS.reduce((a,b)=>a+b,0);
  let acc = 0;
  for(let i=0;i<h;i++) acc += DAY_HOUR_WEIGHTS[i];
  acc += DAY_HOUR_WEIGHTS[h] * minuteFrac;
  return Math.min(1, acc/totalWeight);
}

function computeGlobalStreak(){
  const now = new Date();
  const todaySnap = getTodaySnapshot();
  let streak = 0;
  for(let d=0; d<365; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    const seconds = (key===todayKey(now)) ? todaySnap.total : ((data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0);
    if(seconds>0) streak++;
    else break;
  }
  return streak;
}

// Consecutive recent days (not counting today) with essentially no study
// time — a proxy for "having a rough patch," used to soften competitive
// comparisons instead of piling on when someone's already struggling.
function mascotBadDayStreak(){
  let streak = 0;
  const now = new Date();
  for(let d=1; d<=7; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    const seconds = (data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0;
    if(seconds < 300) streak++; // under 5 minutes counts as a "bad day"
    else break;
  }
  return streak;
}

// Finds the subject closest to being finished, for a specific, achievable
// call-to-action instead of another "everyone is ahead of you" comparison.
function mascotAchievableGoalLine(){
  let best = null;
  (data.subjects||[]).forEach(s=>{
    const c = countLectures(s);
    if(c.total>0){
      const pct = c.done/c.total;
      if(pct>0 && pct<1 && (!best || pct>best.pct)) best = { name:s.name, pct, remaining:c.total-c.done };
    }
  });
  if(!best) return null;
  if(best.remaining===1) return `One lecture left in ${best.name}. Finish it.`;
  return `${best.name} is ${Math.round(best.pct*100)}% done. Close the gap.`;
}

function mascotComputeMood(){
  const now = new Date();
  const todaySeconds = getTodaySnapshot().total;

  let recentTotal = 0;
  for(let d=1; d<=7; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    recentTotal += (data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0;
  }
  const avgDailySeconds = recentTotal/7;
  const dayFrac = Math.max(todayProgressFraction(), 0.12);
  const expectedByNow = avgDailySeconds * dayFrac;
  const ignoredMs = Date.now() - mascotLastInteraction;

  // Priority-ordered mood decision — highest-priority signal wins. Direct
  // event reactions (task completed, tab-switched-away) are handled
  // separately via mascotFireEvent() for instant response; this function is
  // her *ambient* baseline mood between those moments. Entirely based on
  // your own pace against your own recent average — no rival comparisons.
  let mood;
  if(ignoredMs > 30*60000){
    mood = 'sleepy';
  } else if(avgDailySeconds > 300 && dayFrac > 0.35 && todaySeconds < expectedByNow*0.4){
    mood = 'disappointed';
  } else if(todaySeconds === 0 && dayFrac > 0.55 && avgDailySeconds > 0){
    mood = 'angry';
  } else if(avgDailySeconds > 0 && todaySeconds >= expectedByNow*1.5 && todaySeconds > 0){
    mood = 'evilSmile'; // blowing past your own usual pace — she's smug about it, in a good way
  } else if(avgDailySeconds > 0 && todaySeconds >= expectedByNow && todaySeconds > 0){
    mood = (dayFrac > 0.7) ? 'proud' : 'happy';
  } else if(avgDailySeconds > 0 && todaySeconds >= expectedByNow*0.72 && todaySeconds > 0){
    // Within reach of today's normal pace but not there yet — focused grit,
    // "don't trip on the last lap" energy rather than pure neutral.
    mood = (Math.random() < 0.6) ? 'determined' : 'neutral';
  } else if(ignoredMs > 2*60000 && ignoredMs <= 10*60000 && todaySeconds === 0){
    mood = 'annoyed';
  } else {
    mood = 'neutral';
  }

  // Adaptive tone: after a rough patch, dial back the "impressed" tone in
  // favor of a specific, achievable next step — stays motivating without
  // piling on someone who's already struggling.
  let achievableLine = null;
  if(mood==='evilSmile' && mascotBadDayStreak() >= 2){
    const goalLine = mascotAchievableGoalLine();
    if(goalLine){ mood = 'neutral'; achievableLine = goalLine; }
  }

  const streak = computeGlobalStreak();
  return { mood, ignoredMs, streak, todaySeconds, achievableLine };
}

// Original chibi character (not the copyrighted anime character from any
// screenshot reference — own design, own palette matching the app theme).
function mascotSVG(mood){
  const p = MASCOT_PALETTE;
  const ink = '#4a3324'; // soft warm-brown linework — matches her palette, not harsh black

  // Mirrored eye/brow builders so left/right are always perfectly symmetric
  // (never hand-duplicated coordinates that could drift out of sync).
  function eye(cx, cy, mirror, kind){
    const m = mirror ? -1 : 1;
    if(kind==='open'){
      return `<g transform="translate(${cx},${cy}) scale(${m},1)">
        <path d="M-9,-1 Q-8,-9.2 0,-9.7 Q9,-9.2 9,-1 Q9,6.2 0,7.8 Q-9,6.2 -9,-1 Z" fill="#fff"/>
        <circle cx="0.4" cy="0.6" r="6.7" fill="url(#mEyeGrad)"/>
        <circle cx="0.4" cy="1.6" r="3.1" fill="#2b1f42"/>
        <circle cx="-2.1" cy="-2.4" r="2.4" fill="#fff"/>
        <circle cx="2.8" cy="3" r="1.1" fill="#fff" opacity="0.9"/>
        <path d="M-9,-1 Q-8,-9.2 0,-9.7 Q9,-9.2 9,-1" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M-9,-1 L-12.5,-3.2" stroke="${ink}" stroke-width="1.4" stroke-linecap="round"/>
      </g>`;
    }
    if(kind==='happy'){
      return `<g transform="translate(${cx},${cy}) scale(${m},1)"><path d="M-9,0 Q0,-11 9,0" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>`;
    }
    if(kind==='sad'){
      return `<g transform="translate(${cx},${cy}) scale(${m},1)">
        <path d="M-9,1 Q0,-7 9,1" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        <path d="M-2,6 Q-4,15 -7,24" stroke="#7fc4ff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.85"/>
        <ellipse cx="-8" cy="26" rx="3" ry="4" fill="#7fc4ff" opacity="0.85"/>
      </g>`;
    }
    if(kind==='wink'){
      return `<g transform="translate(${cx},${cy}) scale(${m},1)"><path d="M-9,0 Q0,7 9,0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
    }
    if(kind==='angry'){
      return `<g transform="translate(${cx},${cy}) scale(${m},1)">
        <path d="M-9,-1 Q-8,-8.4 0,-8.8 Q9,-8.4 9,-1 Q9,5.4 0,7 Q-9,5.4 -9,-1 Z" fill="#fff"/>
        <circle cx="0.3" cy="0.8" r="6.4" fill="url(#mEyeGrad)"/>
        <circle cx="0.3" cy="1.6" r="3" fill="#2b1f42"/>
        <circle cx="-1.9" cy="-2.1" r="2.1" fill="#fff"/>
        <path d="M-9.5,-4.5 Q-4,-9.5 8,-3.5" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      </g>`;
    }
    if(kind==='determined'){
      return `<g transform="translate(${cx},${cy}) scale(${m},1)">
        <path d="M-9,-1 Q-8,-8 0,-8.4 Q8,-8 9,-1 Q9,5 0,6.6 Q-9,5 -9,-1 Z" fill="#fff"/>
        <circle cx="0.3" cy="0.4" r="6" fill="url(#mEyeGrad)"/>
        <circle cx="0.3" cy="1.2" r="2.8" fill="#2b1f42"/>
        <circle cx="-1.8" cy="-2" r="2" fill="#fff"/>
        <path d="M-9,-3 L9,-6.5" stroke="${ink}" stroke-width="2.3" fill="none" stroke-linecap="round"/>
      </g>`;
    }
    return '';
  }
  function brow(cx, cy, mirror, kind){
    const m = mirror ? -1 : 1;
    const shapes = {
      idle:'M-9,-2 Q0,-6 9,-3', cheer:'M-9,-3 Q0,-8 9,-4', cry:'M-9,3 Q0,-1 9,3',
      encourage:'M-9,-1 L9,-5', bakaOpen:'M-9,-4 Q0,-9 9,-2', bakaClosed:'M-9,-3 L9,-6',
      angry:'M-9,-6 Q0,0 9,-3'
    };
    return `<g transform="translate(${cx},${cy}) scale(${m},1)"><path d="${shapes[kind]||shapes.idle}" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.75"/></g>`;
  }
  const NOSE = `<path d="M49,58 Q50,61.5 51.6,60.6" stroke="#e5b48f" stroke-width="1.5" fill="none" stroke-linecap="round" opacity="0.8"/>`;

  let eyes, brows, mouth, arms, fx = '';

  if(mood==='cheer'){
    eyes = eye(36,50,true,'happy') + eye(64,50,false,'happy');
    brows = brow(36,36,true,'cheer') + brow(64,36,false,'cheer');
    mouth = `<path d="M39,65 Q50,80 61,65" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
             <path d="M43,66 Q50,73 57,66" fill="#ff8fb8" opacity="0.55"/>`;
    arms = `<path d="M16,96 Q4,70 20,58" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>
            <path d="M84,96 Q96,70 80,58" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>`;
    fx = `<g fill="#ffd23f">
            <path d="M10,24 l2.4,7.2 7.2,2.4 -7.2,2.4 -2.4,7.2 -2.4,-7.2 -7.2,-2.4 7.2,-2.4 z"/>
            <path d="M90,16 l2,6 6,2 -6,2 -2,6 -2,-6 -6,-2 6,-2 z"/>
          </g>`;
  } else if(mood==='cry'){
    eyes = eye(36,50,true,'sad') + eye(64,50,false,'sad');
    brows = brow(36,38,true,'cry') + brow(64,38,false,'cry');
    mouth = `<path d="M42,69 Q50,63 58,69" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    arms = `<path d="M18,93 Q28,70 43,57" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>
            <path d="M82,93 Q72,70 57,57" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>`;
    fx = '';
  } else if(mood==='baka'){
    eyes = eye(36,50,true,'open') + eye(64,50,false,'wink');
    brows = brow(36,36,true,'bakaOpen') + brow(64,38,false,'bakaClosed');
    mouth = `<path d="M40,63 Q48,72 63,60" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>
             <path d="M46,65 Q50,73 56,64" stroke="#ff8fb8" stroke-width="4.2" fill="none" stroke-linecap="round"/>`;
    arms = `<path d="M18,91 Q11,74 25,63" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>
            <path d="M82,91 Q89,74 75,63" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>`;
    fx = `<text x="86" y="28" font-size="17" font-weight="800" fill="${p.hoodieDk}" font-family="Inter,sans-serif">!</text>`;
  } else if(mood==='nag'){
    eyes = eye(36,50,true,'angry') + eye(64,50,false,'angry');
    brows = brow(36,36,true,'angry') + brow(64,36,false,'angry');
    mouth = `<path d="M40,64 Q50,80 60,64 Q50,71 40,64 Z" fill="${ink}"/>
             <path d="M46,66 L48,71 L50,66 L52,71 L54,66 Z" fill="#fff"/>`;
    arms = `<path d="M18,90 Q26,72 42,79" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>
            <path d="M82,90 Q74,72 58,79" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>
            <circle cx="50" cy="80" r="6.5" fill="${p.hoodieDk}"/>`;
    fx = `<g stroke="#e2536e" stroke-width="2.2" stroke-linecap="round" opacity="0.8">
            <path d="M84,16 L92,24"/><path d="M92,16 L84,24"/>
            <path d="M84,10 L92,18"/><path d="M92,10 L84,18"/>
          </g>`;
  } else if(mood==='encourage'){
    eyes = eye(36,50,true,'determined') + eye(64,50,false,'determined');
    brows = brow(36,36,true,'encourage') + brow(64,36,false,'encourage');
    mouth = `<path d="M43,66 Q50,70 57,66" stroke="${ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
    arms = `<path d="M18,93 Q16,68 33,66" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>
            <circle cx="33" cy="64" r="8.2" fill="${p.hoodieDk}"/>
            <path d="M82,93 Q86,74 77,64" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>`;
    fx = `<g stroke="${p.hoodieDk}" stroke-width="2.4" stroke-linecap="round" opacity="0.55">
            <path d="M4,56 L13,56"/><path d="M2,65 L12,65"/><path d="M4,74 L13,74"/>
          </g>`;
  } else {
    eyes = eye(36,50,true,'open') + eye(64,50,false,'open');
    brows = brow(36,36,true,'idle') + brow(64,36,false,'idle');
    mouth = `<path d="M45,67 Q50,70.5 55,67" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
    arms = `<path d="M18,93 Q14,74 27,64" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>
            <path d="M82,93 Q86,74 73,64" stroke="url(#mCardiGrad)" stroke-width="13" fill="none" stroke-linecap="round"/>`;
    fx = '';
  }

  return `
  <svg viewBox="0 0 100 132" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="mHairGrad" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0%" stop-color="${p.hairFront}"/>
        <stop offset="100%" stop-color="${p.hairBack}"/>
      </linearGradient>
      <linearGradient id="mCardiGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${p.hoodie}"/>
        <stop offset="100%" stop-color="${p.hoodieDk}"/>
      </linearGradient>
      <radialGradient id="mEyeGrad" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stop-color="${p.eyeLight}"/>
        <stop offset="50%" stop-color="${p.eyeMid}"/>
        <stop offset="100%" stop-color="${p.eyeDark}"/>
      </radialGradient>
      <radialGradient id="mBlushGrad" cx="50%" cy="50%" r="55%">
        <stop offset="0%" stop-color="${p.blush}" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="${p.blush}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="mSkinGrad" cx="45%" cy="35%" r="70%">
        <stop offset="0%" stop-color="#fff5ea"/>
        <stop offset="100%" stop-color="${p.skin}"/>
      </radialGradient>
    </defs>

    <!-- flowing twin-tail hair, behind body -->
    <path d="M14,50 Q4,72 10,100 Q13,116 22,126 Q16,104 20,84 Q22,66 26,54 Z" fill="url(#mHairGrad)"/>
    <path d="M86,50 Q96,72 90,100 Q87,116 78,126 Q84,104 80,84 Q78,66 74,54 Z" fill="url(#mHairGrad)"/>

    <!-- blouse under-layer -->
    <path d="M28,122 Q24,84 34,72 L66,72 Q76,84 72,122 Z" fill="${p.collar}"/>

    <!-- cardigan, worn open over the blouse -->
    <path d="M22,122 Q17,82 30,70 L38,74 L38,122 Z" fill="url(#mCardiGrad)"/>
    <path d="M78,122 Q83,82 70,70 L62,74 L62,122 Z" fill="url(#mCardiGrad)"/>
    <path d="M30,70 Q50,64 70,70 L66,78 Q50,72 34,78 Z" fill="url(#mCardiGrad)"/>

    <!-- ruffled collar trim -->
    <path d="M32,72 Q38,78 44,73 Q50,79 56,73 Q62,78 68,72 L68,80 Q62,85 56,80 Q50,86 44,80 Q38,85 32,80 Z" fill="${p.collar}"/>
    <!-- chest bow with heart charm -->
    <g transform="translate(50,86)">
      <path d="M0,0 L-11,-6.5 L-11,6.5 Z" fill="${p.hoodieDk}"/>
      <path d="M0,0 L11,-6.5 L11,6.5 Z" fill="${p.hoodieDk}"/>
      <circle cx="0" cy="0" r="3" fill="${p.bow}"/>
      <path d="M0,-2.2 Q-3,-5 -5,-2.5 Q-5,0.5 0,4 Q5,0.5 5,-2.5 Q3,-5 0,-2.2 Z" fill="${p.bowDk}" opacity="0.85"/>
    </g>

    ${arms}
    <!-- puffy blouse sleeve cuffs -->
    <circle cx="18" cy="93" r="7" fill="${p.collar}"/>
    <circle cx="82" cy="93" r="7" fill="${p.collar}"/>

    <!-- hair back -->
    <path d="M16,58 Q11,18 50,12 Q89,18 84,58 Q86,74 75,66 Q50,50 25,66 Q14,74 16,58 Z" fill="url(#mHairGrad)"/>

    <!-- face -->
    <circle cx="50" cy="51" r="31" fill="url(#mSkinGrad)"/>

    <!-- bangs -->
    <path d="M18,43 Q22,14 50,13 Q78,14 82,43 Q69,28 50,28 Q31,28 18,43 Z" fill="url(#mHairGrad)"/>
    <path d="M27,24 Q40,17 50,17" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity="0.4"/>
    <path d="M20,54 Q17,36 27,24" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round" opacity="0.3"/>

    <!-- yellow hair bow + dangling heart charm, right pigtail -->
    <g transform="translate(77,24) rotate(14)">
      <path d="M0,0 L-10,-5.5 L-10,5.5 Z" fill="${p.bow}"/>
      <path d="M0,0 L10,-5.5 L10,5.5 Z" fill="${p.bow}"/>
      <circle cx="0" cy="0" r="2.8" fill="${p.bowDk}"/>
      <path d="M6,4 Q5,9 8,12 Q11,9 10,4" fill="${p.heart}" opacity="0.9"/>
    </g>
    <!-- bunny hair clip with heart, left side -->
    <g transform="translate(21,32)">
      <ellipse cx="-5" cy="-11" rx="3.2" ry="7.5" fill="#fdfaf5" stroke="${p.hoodieDk}" stroke-width="0.6" transform="rotate(-16 -5 -11)"/>
      <ellipse cx="5" cy="-11" rx="3.2" ry="7.5" fill="#fdfaf5" stroke="${p.hoodieDk}" stroke-width="0.6" transform="rotate(16 5 -11)"/>
      <ellipse cx="-5" cy="-9.5" rx="1.4" ry="4.2" fill="${p.blush}" opacity="0.55" transform="rotate(-16 -5 -9.5)"/>
      <ellipse cx="5" cy="-9.5" rx="1.4" ry="4.2" fill="${p.blush}" opacity="0.55" transform="rotate(16 5 -9.5)"/>
      <circle cx="0" cy="0" r="9" fill="#fdfaf5" stroke="${p.hoodieDk}" stroke-width="0.6"/>
      <circle cx="-3.2" cy="-1" r="1.3" fill="${p.eyeDark}"/>
      <circle cx="3.2" cy="-1" r="1.3" fill="${p.eyeDark}"/>
      <circle cx="-4.5" cy="2.2" r="1.6" fill="${p.blush}" opacity="0.6"/>
      <circle cx="4.5" cy="2.2" r="1.6" fill="${p.blush}" opacity="0.6"/>
      <path d="M-2,3.5 Q0,5.4 2,3.5" stroke="${p.eyeDark}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
      <path d="M0,9 Q-3.4,13 0,17 Q3.4,13 0,9 Z" fill="${p.heart}"/>
    </g>

    <circle cx="32" cy="60" r="8" fill="url(#mBlushGrad)"/>
    <circle cx="68" cy="60" r="8" fill="url(#mBlushGrad)"/>
    ${brows}
    ${eyes}
    ${NOSE}
    ${mouth}
    ${fx}
  </svg>`;
}


// Which subject the user is *actually* on right now (live running session,
// else the currently-open subject), used to pick subject-aware art & copy.
function mascotActiveSubject(){
  if(runningRef){
    const s = (data.subjects||[]).find(x=>x.id===runningRef.subjectId);
    if(s) return s;
  }
  if(activeSubjectId){
    const s = (data.subjects||[]).find(x=>x.id===activeSubjectId);
    if(s) return s;
  }
  return null;
}
function mascotActiveSubjectName(){
  const s = mascotActiveSubject();
  return s ? s.name : '';
}

// Only rewrite the avatar <img> when the pose actually changed — every
// renderAll rebuilds the avatar DOM, so caching the last-rendered src skips
// re-parsing innerHTML + re-decoding the image on every unrelated action.
let mascotLastRenderedImageSrc = '';
function mascotSetAvatar(imageKey){
  const avatarBtn = document.getElementById('mascotAvatarBtn');
  if(!avatarBtn) return;
  const src = mascotImageFor(imageKey);
  if(mascotLastRenderedImageSrc === src) return;
  mascotLastRenderedImageSrc = src;
  avatarBtn.innerHTML = `<div class="mascot-tilt-inner"><img src="${src}" alt="study buddy" draggable="false"></div>`;
}

function renderMascot(){
  const wrap = document.getElementById('mascotWrap');
  if(!wrap) return;
  wrap.classList.toggle('minimized', mascotMinimized);
  if(mascotMinimized) return;

  const ctx = mascotComputeMood();
  const { mood } = ctx;
  const activeSubjectName = mascotActiveSubjectName();
  const avatarBtn = document.getElementById('mascotAvatarBtn');
  const bubble = document.getElementById('mascotBubble');
  if(!avatarBtn || !bubble) return;

  // One-time-per-day respect adjustments + streak milestones tied to the
  // ambient mood actually reached today (not just momentarily computed).
  if(mood === 'proud' && !mascotHasFlag('proudBonus')){
    mascotAdjustRespect(8); mascotSetFlag('proudBonus');
  }
  if(mood === 'angry' && !mascotHasFlag('angryPenalty')){
    mascotAdjustRespect(-10); mascotSetFlag('angryPenalty');
  }
  if(mood === 'disappointed' && !mascotHasFlag('disappointedPenalty')){
    mascotAdjustRespect(-5); mascotSetFlag('disappointedPenalty');
  }
  // 7-day streak respect bonus — checked independently of which milestone
  // line (3/10/30/100) is actually displayed, since 7 isn't one of them.
  if(ctx.streak >= 7 && localStorage.getItem('studyMascotRespect7Given') !== '1'){
    mascotAdjustRespect(15);
    try{ localStorage.setItem('studyMascotRespect7Given', '1'); }catch(e){}
  }
  const streakMilestones = [3,7,10,30,100];
  if(streakMilestones.includes(ctx.streak) && !mascotHasFlag('streak'+ctx.streak)){
    mascotSetFlag('streak'+ctx.streak);
    mascotState.mood = 'proud';
    mascotState.line = mascotStreakLine(ctx.streak) || mascotPickLine('proud', ctx);
mascotState.imageKey = mascotPickImageKey('celebrate', activeSubjectName);
    bubble.textContent = mascotState.line;
    bubble.classList.add('show');
    mascotSetAvatar(mascotState.imageKey);
    return;
  }

  if(mood !== mascotState.mood){
    mascotState.mood = mood;
    mascotState.line = mascotPickLine(mood, ctx);
    mascotState.imageKey = mascotPickImageKey(mood, activeSubjectName);
    bubble.textContent = mascotState.line;
    bubble.classList.add('show');
  } else if(mood === 'neutral' && ctx.ignoredMs > 4*60000){
    // Same mood, but she's been ignored a while — let her pipe up again
    // instead of going silent after the first "hello".
    mascotState.line = mascotPickLine(mood, ctx);
    mascotState.imageKey = mascotPickImageKey('ignored', activeSubjectName);
    bubble.textContent = mascotState.line;
    bubble.classList.add('show');
}
  mascotSetAvatar(mascotState.imageKey);
}

// Instant reaction to something that JUST happened, bypassing the normal
// "only update when the ambient mood changes" gate — this is what makes
// her feel like she's actually watching, not just polling every 60s.
// extraCtx.forcedLine, if given, skips the random pool entirely — for the
// handful of moments (5-task milestone, streak milestones) with one exact
// scripted line rather than a pool to pick from.
function mascotFireEvent(mood, extraCtx){
  const avatarBtn = document.getElementById('mascotAvatarBtn');
  const bubble = document.getElementById('mascotBubble');
  if(!avatarBtn || !bubble) return;
  // Respect focus mode: stay quiet during deep work unless it's an actively
  // encouraging mood (same policy as mascotUtter) so we never over-popup.
  const loud = ['milestone','proud','celebrate','happy','determined'];
  if(focusRef && !loud.includes(mood)) return;
  let ctx = {};
  try{ ctx = mascotComputeMood(); }catch(e){}
  ctx = Object.assign(ctx, extraCtx||{});
  mascotState.mood = mood;
  mascotState.line = ctx.forcedLine ? mascotResolveTokens(ctx.forcedLine, ctx) : mascotPickLine(mood, ctx);
  mascotState.imageKey = ctx.overrideImageKey
    ? ctx.overrideImageKey
    : mascotPickImageKey(mood, mascotActiveSubjectName());
  bubble.textContent = mascotState.line;
  bubble.classList.add('show');
  mascotSetAvatar(mascotState.imageKey);
  avatarBtn.classList.remove('bump');
  void avatarBtn.offsetWidth;
  avatarBtn.classList.add('bump');
}

// Lightweight per-day task-completion counter (separate from the core
// lecture/subject data model — just powers her "...Not bad." at 5 tasks).
function mascotIncrementTodayTaskCount(){
  const day = todayKey();
  if(!mascotDayFlags[day]) mascotDayFlags[day] = {};
  mascotDayFlags[day].tasksCompleted = (mascotDayFlags[day].tasksCompleted || 0) + 1;
  try{ localStorage.setItem('studyMascotDayFlags', JSON.stringify(mascotDayFlags)); }catch(e){}
  return mascotDayFlags[day].tasksCompleted;
}

// Called whenever a lecture is freshly marked complete — the "happy" event
// reaction, the 5-tasks milestone override, and the "difficult topic
// defeated" asset for hard/neglected subjects (Complete spec §13).
function mascotOnTaskCompleted(subjectId, unitId, lectureId){
  mascotLastInteraction = Date.now();
  const count = mascotIncrementTodayTaskCount();
  if(count === 5 && !mascotHasFlag('fiveTasks')){
    mascotSetFlag('fiveTasks');
    mascotFireEvent('happy', { forcedLine: '...Not bad.' });
    return;
  }
  // Difficult / neglected subject defeated → pull out the good art.
  let overrideImageKey = null;
  let forcedLine = null;
  if(subjectId && typeof data !== 'undefined'){
    const s = (data.subjects||[]).find(x=>x.id===subjectId);
    if(s){
      const avg = (typeof subjectTestAvg === 'function') ? subjectTestAvg(s) : null;
      const daysOff = (typeof mascotDaysSinceSubject === 'function') ? mascotDaysSinceSubject(subjectId) : null;
      if((avg !== null && avg < 75) || (daysOff !== null && daysOff >= 4)){
        overrideImageKey = 'img_difficult_defeated';
        forcedLine = avg !== null && avg < 75
          ? `That one's been beating you — average ${Math.round(avg)}%. Beat it back.`
          : `${s.name} after ${daysOff} days of neglect, and you bring it back. Noted.`;
      }
    }
  }
  mascotFireEvent('happy', { forcedLine: forcedLine || undefined, overrideImageKey: overrideImageKey || undefined });
}

const MASCOT_POKE_LINES = [
  'six clicks? seriously 😑 I was starting to think you had a study plan',
  'you know, clicking me won\'t make your studies disappear 😒 now stop bullying the poor girl and go study — I\'m watching 👁️',
  'I counted every single one of those clicks, you know 📋',
  'okay, that\'s enough. I\'m telling your future self about this 😤',
  'do you click on your textbooks this much? didn\'t think so 📚',
];
// Poking Rei more than ~5 times in a row flips her into a grumpy scolding
// (face + bubble) instead of the usual ambient reply — escalating angrier
// assets the longer you keep clicking.
function mascotPokeReaction(count){
  if(count < 6) return null;
  const idx = (count - 6) % MASCOT_POKE_LINES.length;
  let pool;
  if(count >= 15) pool = ['img_bro_really','img_i_cant_believe_you','img_excuse_me'];
  else if(count >= 10) pool = ['img_im_not_mad','img_why_are_you_like_this'];
  else pool = ['img_grumpy','img_annoyed'];
  return { line: MASCOT_POKE_LINES[idx], imageKey: pool[Math.floor(Math.random()*pool.length)], mood: 'grumpy' };
}
function mascotPresentLine(line, imageKey){
  mascotState.line = line;
  mascotState.imageKey = imageKey;
  const bubble = document.getElementById('mascotBubble');
  if(bubble){ bubble.textContent = line; bubble.classList.add('show'); }
  mascotSetAvatar(imageKey);
  const avatarBtn = document.getElementById('mascotAvatarBtn');
  if(avatarBtn){
    avatarBtn.classList.remove('bump');
    void avatarBtn.offsetWidth; // restart animation
    avatarBtn.classList.add('bump');
  }
}
function mascotTap(){
  mascotLastInteraction = Date.now();
  mascotPokeCount++;
  if(mascotPokeResetTimer) clearTimeout(mascotPokeResetTimer);
  // Once the rapid-click window lapses with no further pokes, drop the
  // grumpy act and restore her normal ambient face/line — otherwise she'd
  // hold the scolding pose indefinitely until the mood next happens to change.
  mascotPokeResetTimer = setTimeout(()=>{
    mascotPokeCount = 0;
    const ctx = mascotComputeMood();
    mascotState.mood = ctx.mood;
    mascotPresentLine(mascotPickLine(ctx.mood, ctx), mascotPickImageKey(ctx.mood, mascotActiveSubjectName()));
  }, 3500);
  const poke = mascotPokeReaction(mascotPokeCount);
  if(poke){
    mascotPresentLine(poke.line, poke.imageKey);
    return;
  }
  const ctx = mascotComputeMood();
  mascotState.mood = ctx.mood;
  mascotPresentLine(mascotPickLine(ctx.mood, ctx), mascotPickImageKey(ctx.mood, mascotActiveSubjectName()));
}

function toggleMascot(){
  mascotMinimized = !mascotMinimized;
  try{ localStorage.setItem('studyMascotMinimized', mascotMinimized ? '1' : '0'); }catch(e){}
  renderMascot();
}

// ---- Free positioning, dragging, and autonomous wandering ----
function mascotClamp(x, y){
  const wrap = document.getElementById('mascotWrap');
  const w = wrap ? wrap.offsetWidth : 90;
  const h = wrap ? wrap.offsetHeight : 140;
  const maxX = Math.max(8, window.innerWidth - w - 8);
  const maxY = Math.max(8, window.innerHeight - h - 8);
  return { x: Math.min(Math.max(8, x), maxX), y: Math.min(Math.max(8, y), maxY) };
}
function mascotApplyPosition(x, y){
  const wrap = document.getElementById('mascotWrap');
  if(!wrap) return;
  const c = mascotClamp(x, y);
  mascotPos = c;
  wrap.style.left = c.x + 'px';
  wrap.style.top = c.y + 'px';
}
function mascotInitPosition(){
  const wrap = document.getElementById('mascotWrap');
  if(!wrap) return;
  let saved = null;
  try{
    const raw = localStorage.getItem('studyMascotPos');
    if(raw) saved = JSON.parse(raw);
  }catch(e){}
  if(saved && typeof saved.x === 'number' && typeof saved.y === 'number'){
    mascotApplyPosition(saved.x, saved.y);
  } else {
    // Default: bottom-right corner, like before.
    mascotApplyPosition(window.innerWidth - 110, window.innerHeight - 170);
  }
}
function mascotWander(){
  if(mascotDragging || mascotMinimized) return;
  if(document.hidden) return; // window is hidden, pointless + innerWidth is stale
  if(Date.now() - mascotLastInteraction < 15000) return; // give her a rest after you move her
  const margin = 60;
  const x = margin + Math.random() * Math.max(40, window.innerWidth - margin*2 - 90);
  const y = margin + Math.random() * Math.max(40, window.innerHeight - margin*2 - 150);
  mascotApplyPosition(x, y);
}
// ---- Pseudo-3D tilt: cursor-follow parallax + a ground shadow that shifts
// opposite the tilt, so she reads as sitting *in* the scene instead of
// pasted flat on top of it. Not an actual 3D model — just perspective +
// a light "camera" that tracks the pointer, applied to an inner wrapper
// so it never fights the existing float/bump keyframe animations.
function mascotApplyTilt(rotX, rotY, scale, shadowX, shadowScale, shadowOpacity){
  const inner = document.querySelector('#mascotAvatarBtn .mascot-tilt-inner');
  if(inner) inner.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
  const shadow = document.getElementById('mascotGroundShadow');
  if(shadow){
    shadow.style.transform = `translateX(calc(-50% + ${shadowX}px)) scale(${shadowScale})`;
    shadow.style.opacity = shadowOpacity;
  }
}
function mascotResetTilt(){
  mascotApplyTilt(0, 0, 1, 0, 1, 1);
}
let mascotTiltActive = false; // true while the cursor-follow tilt is driving her pose

function mascotSetupTilt(){
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(prefersReduced) return;

  const MAX_TILT = 20;
  let raf = null;
  // Cache the avatar holder rect; only recompute on resize (the holder is
  // position:fixed + fixed size, so layout never changes between resizes).
  let tiltRect = null;

  function refreshTiltRect(){ tiltRect = null; }
  window.addEventListener('resize', refreshTiltRect);

  window.addEventListener('mousemove', (e)=>{
    if(mascotDragging || mascotMinimized) return;
    const holder = document.getElementById('mascotAvatarHolder');
    if(!holder) return;
    if(!tiltRect) tiltRect = holder.getBoundingClientRect();
    const rect = tiltRect;
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const reach = rect.width * 3.2; // how far the "spotlight" extends before she stops reacting
    const dist = Math.sqrt(dx*dx + dy*dy);

    if(dist > reach){
      if(mascotTiltActive){ mascotTiltActive = false; if(raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(mascotResetTilt); }
      return;
    }
    mascotTiltActive = true;
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=>{
      const falloff = 1 - dist/reach; // stronger tilt the closer the cursor is
      const rotY = Math.max(-MAX_TILT, Math.min(MAX_TILT, (dx/rect.width) * MAX_TILT * 2.2 * falloff));
      const rotX = Math.max(-MAX_TILT, Math.min(MAX_TILT, (-dy/rect.height) * MAX_TILT * 2.2 * falloff));
      const scale = 1 + 0.09 * falloff;
      const shadowX = -rotY * 1.3;
      const shadowScale = 1 - Math.min(0.28, (Math.abs(rotX)+Math.abs(rotY))/60);
      mascotApplyTilt(rotX, rotY, scale, shadowX, shadowScale, 1 - 0.18*falloff);
    });
  });
  window.addEventListener('mouseleave', ()=>{ mascotTiltActive = false; mascotResetTilt(); });

  mascotIdleSway();
}

// Gentle continuous sway so she still reads as three-dimensional even when
// nobody's cursor is near her — a slow figure-eight-ish drift in rotateX/Y,
// paused the instant cursor-tilt or dragging takes over so they never fight.
// Half-rate on purpose: the drift is ~0.5Hz, so 30fps is far more than enough
// and keeps the rAF cost near-zero on laptops.
let swaySkipFrame = false;
function mascotIdleSway(){
  swaySkipFrame = !swaySkipFrame;
  const t = performance.now() / 1000;
  if(swaySkipFrame && !document.hidden && !mascotTiltActive && !mascotDragging && !mascotMinimized){
    const rotY = Math.sin(t * 0.5) * 5;
    const rotX = Math.cos(t * 0.35) * 2.6;
    const shadowX = -rotY * 1.3;
    mascotApplyTilt(rotX, rotY, 1, shadowX, 1 - Math.abs(rotY)/90, 1 - Math.abs(rotY)/260);
  }
  requestAnimationFrame(mascotIdleSway);
}

function mascotSetupDrag(){
  const wrap = document.getElementById('mascotWrap');
  const btn = document.getElementById('mascotAvatarBtn');
  if(!wrap || !btn) return;
  let startX=0, startY=0, startLeft=0, startTop=0, moved=false;
  let lastMoveX=0, lastMoveT=0;

  btn.addEventListener('pointerdown', (e)=>{
    e.preventDefault();
    mascotDragging = true;
    moved = false;
    wrap.classList.add('dragging');
    startX = e.clientX; startY = e.clientY;
    startLeft = wrap.offsetLeft; startTop = wrap.offsetTop;
    lastMoveX = e.clientX; lastMoveT = performance.now();
    try{ btn.setPointerCapture(e.pointerId); }catch(err){}
  });
  btn.addEventListener('pointermove', (e)=>{
    if(!mascotDragging) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if(Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    mascotApplyPosition(startLeft + dx, startTop + dy);

    // Lean into the direction she's being dragged — a little swing that
    // makes the drag itself feel like it has weight/momentum behind it.
    const now = performance.now();
    const dt = Math.max(8, now - lastMoveT);
    const vx = (e.clientX - lastMoveX) / dt * 16; // px moved per ~16ms frame
    lastMoveX = e.clientX; lastMoveT = now;
    const leanY = Math.max(-16, Math.min(16, vx * 1.4));
    mascotApplyTilt(5, leanY, 1.06, -leanY*0.5, 1 - Math.abs(leanY)/70, 0.85);
  });
  const endDrag = (e)=>{
    if(!mascotDragging) return;
    mascotDragging = false;
    wrap.classList.remove('dragging');
    mascotLastInteraction = Date.now();
    mascotResetTilt();
    if(moved){
      try{ localStorage.setItem('studyMascotPos', JSON.stringify(mascotPos)); }catch(err){}
    } else {
      mascotTap(); // it was a tap, not a drag
    }
  };
  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', ()=> mascotApplyPosition(mascotPos.x, mascotPos.y));
}

function renderUsernameDisplay(){
  const el = document.getElementById('userWelcome');
  if(!el) return;
  if(MASCOT_NAME){
    el.innerHTML = `👋 Welcome back, <b>${escapeHtml(MASCOT_NAME)}</b>`;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
}

async function startApp(){
  await loadData();
  if(data.subjects.length) activeSubjectId = data.subjects[0].id;
  runningRef = findRunningLecture();
  showView(currentView);
  try{ mascotMinimized = localStorage.getItem('studyMascotMinimized') === '1'; }catch(e){}
  mascotLastInteraction = Date.now(); // start the ignore-timer fresh on page load, not mid-ignore
  renderUsernameDisplay();
  renderAll();
  mascotInitPosition();
  mascotSetupDrag();
  mascotSetupTilt();
  if(runningRef) startTicking();
  maybeShowStorageBanner();
  mascotSetupSuspicion();
  mascotShowYesterdayMemory();
  // Unified brain tick: ambient mood + periodic milestone/end-of-day events +
  // focus-guardian breather, so intelligence and personality both keep running.
  function mascotRunBrainTick(){
    if(document.hidden) return; // skip re-render/mood cycles while the tab is hidden
    renderMascot();
    mascotPeriodicBrain();
    mascotFocusBreather();
    mascotSessionMilestoneCheck();
  }
  setTimeout(mascotRunBrainTick, 4000); // let the page settle, then one brain pass
  setInterval(mascotRunBrainTick, 60000); // let her mood & insights drift as the day moves on
  setInterval(mascotWander, 22000); // she wanders to a new spot every so often on her own
  const loader = document.getElementById('appLoader');
  if(loader){
    loader.classList.add('hide');
    setTimeout(()=>loader.remove(), 300);
  }
}

// "Suspicious" mood: catches you tab-switching away while a timer is
// actively running, and calls it out the moment you come back.
function mascotSetupSuspicion(){
  let awayWhileStudying = false;
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden){
      if(runningRef) awayWhileStudying = true;
    } else if(awayWhileStudying){
      awayWhileStudying = false;
      mascotFireEvent('suspicious', {});
    }
  });
}

// Yesterday-memory: a one-off callback line at startup, referencing what
// actually happened yesterday (skipped a subject / finished one / lost a
// streak) — surfaced as her first line of the session instead of a generic
// greeting, whenever there's something specific worth mentioning.
function mascotShowYesterdayMemory(){
  try{
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate()-1);
    const yKey = todayKey(yesterday);
    const yLog = (data.dailyLog && data.dailyLog[yKey]) ? data.dailyLog[yKey] : null;
    const todaySnap = getTodaySnapshot();

    let line = null;
    if(yLog){
      // A subject with real time yesterday and nothing so far today, vs a
      // subject skipped both days — prioritize "skipped again" as most worth saying.
      const skippedBoth = (data.subjects||[]).find(s => !(yLog.bySubject[s.id]>0) && !(todaySnap.bySubject[s.id]>0));
      const continuedMomentum = (data.subjects||[]).find(s => (yLog.bySubject[s.id]>0) && (todaySnap.bySubject[s.id]>0));
      if(skippedBoth){
        line = `${skippedBoth.name} again?`;
      } else if(continuedMomentum){
        line = `Good. Keep that momentum.`;
      }
    } else {
      // No record at all yesterday — likely a broken streak.
      const hadOlderActivity = Object.keys(data.dailyLog||{}).some(k=>k<yKey);
      if(hadOlderActivity && todaySnap.total === 0){
        line = `Let's rebuild it.`;
      }
    }
    if(line){
      mascotState.mood = 'neutral';
      mascotState.line = line;
      mascotState.imageKey = mascotPickImageKey('neutral', mascotActiveSubjectName());
      const bubble = document.getElementById('mascotBubble');
      if(bubble){ bubble.textContent = line; bubble.classList.add('show'); }
      mascotSetAvatar(mascotState.imageKey);
    }
  }catch(e){}
}

// ============================================================
// JARVIS-LEVEL MASCOT BRAIN â€” Observe â†’ Interpret â†’ Personalize â†’
// Respond â†’ Optional action. Reads only real tracker data. It is a
// behaviour-aware personality layer, NOT a quote generator.
// ============================================================

// ---------- Memory: recent messages (anti-repetition) ----------
let mascotMessageHistory = (()=>{
  try{ const a = JSON.parse(localStorage.getItem('studyMascotMessages') || '[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; }
})();
function mascotRememberMessage(line){
  try{
    mascotMessageHistory.push(String(line));
    const keep = Math.max(30, MASCOT_CONFIG.antiRepeatWindow||30);
    while(mascotMessageHistory.length > keep) mascotMessageHistory.shift();
    localStorage.setItem('studyMascotMessages', JSON.stringify(mascotMessageHistory));
  }catch(e){}
}
function mascotClean(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim(); }
function mascotIsRecent(line){
  const key = mascotClean(line);
  if(key.length < 3) return false;
  const recent = mascotMessageHistory.slice(-(MASCOT_CONFIG.antiRepeatWindow||30));
  return recent.some(m => mascotClean(m) === key);
}

// ---------- Event log / cooldowns ----------
let mascotEventLog = (()=>{
  try{ const a = JSON.parse(localStorage.getItem('studyMascotEventLog') || '{}'); return a&&typeof a==='object'?a:{}; }catch(e){ return {}; }
})();
function mascotLastEvent(cat){ return mascotEventLog[cat] || 0; }
function mascotMarkEvent(cat){
  try{ mascotEventLog[cat]=Date.now(); localStorage.setItem('studyMascotEventLog', JSON.stringify(mascotEventLog)); }catch(e){}
}
function mascotCooldownOk(cat){
  if(cat === 'milestone') return true;          // major milestones always fire
  const cd = MASCOT_CONFIG.cooldowns[cat];
  if(cd === Infinity || cd === undefined) return true; // anti-rep / default handle
  return (Date.now() - mascotLastEvent(cat)) >= cd;
}

// ---------- Longest streak (scans real history) ----------
function mascotLongestStreak(){
  const now = new Date(); now.setHours(0,0,0,0);
  let longest = 0, run = 0;
  for(let d=0; d<800; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    const sec = (data.dailyLog && data.dailyLog[key]) ? data.dailyLog[key].total : 0;
    if(sec > 0){ run++; if(run>longest) longest=run; }
    else run = 0;
  }
  return longest;
}

// ---------- Per-subject last-studied / neglect ----------
function mascotDaysSinceSubject(subjectId){
  const now = new Date(); now.setHours(0,0,0,0);
  const log = data.dailyLog || {};
  for(let d=0; d<400; d++){
    const day = new Date(now); day.setDate(day.getDate()-d);
    const key = todayKey(day);
    if(log[key] && log[key].bySubject && log[key].bySubject[subjectId] > 0) return d;
  }
  return 400;
}

// ---------- Context builder â€” a compact snapshot of the real tracker ----------
function mascotBuildContext(){
  const snap = getTodaySnapshot();               // seconds incl. live
  const weekMin = (rangeTotal ? rangeTotal(7) : 0) / 60;
  const monthMin = (rangeTotal ? rangeTotal(30) : 0) / 60;
  const streak = computeGlobalStreak();
  const sessionRef = runningRef ? { ...runningRef } : null;
  const subjects = (data.subjects||[]).map(s=>{
    const sec = subjectSeconds ? subjectSeconds(s) : 0;
    const c = countLectures ? countLectures(s) : {done:0, total:0};
    const pct = c.total>0 ? Math.round(c.done/c.total*100) : 0;
    const lastDays = mascotDaysSinceSubject(s.id);
    const testAvg = subjectTestAvg ? subjectTestAvg(s) : null;
    const pace = examPacing ? examPacing(s) : null;
    return {
      id: s.id, name: s.name, totalSec: sec, totalMin: Math.round(sec/60),
      progressPct: pct, done: c.done, remaining: Math.max(0, c.total - c.done),
      lastDays, testAvg, pace,
    };
  });
  const neglectDays = (MASCOT_CONFIG && MASCOT_CONFIG.neglectDays) || 4;

  let topic = null;
  if(sessionRef){
    const l = getLecture(sessionRef.subjectId, sessionRef.unitId, sessionRef.lectureId);
    if(l){
      const s = (data.subjects||[]).find(x=>x.id===sessionRef.subjectId);
      topic = { title: l.title, subject: s ? s.name : '', durationMinutes: Math.round(liveLectureSeconds(l)/60) };
    }
  }

  let plan = { total: 0, done: 0, pct: 0 };
  try{
    if(typeof ppList === 'function'){
      const items = ppList(todayKey());
      plan.total = items.length;
      plan.done = items.filter(i=>i.done).length;
      plan.pct = plan.total>0 ? Math.round(plan.done/plan.total*100) : 0;
    }
  }catch(e){}

  return {
    user: { name: MASCOT_NAME },
    now: { hour: new Date().getHours() },
    focusMode: !!focusRef,
    session: {
      active: !!sessionRef,
      subjectName: topic ? topic.subject : '',
      topic: topic ? topic.title : '',
      durationMinutes: topic ? topic.durationMinutes : 0,
    },
    today: { studyMinutes: Math.round(snap.total/60), bySubject: snap.bySubject, plan, planPct: plan.pct },
    streak: { current: streak, longest: mascotLongestStreak() },
    stats: { weekMin: Math.round(weekMin), monthMin: Math.round(monthMin) },
    subjects,
    neglected: subjects.filter(s=>s.lastDays >= neglectDays && s.totalSec > 0).sort((a,b)=>b.lastDays-a.lastDays).slice(0,3),
  };
}

// ---------- Recommendation engine (data-driven, never random) ----------
function mascotRecommendNext(ctx){
  const c = ctx || mascotBuildContext();
  const cands = c.subjects.filter(s=>s.totalSec > 0 || s.remaining > 0);
  if(!cands.length) return null;
  const withRev = cands.map(s=>{
    let score = s.lastDays * 10;
    if(s.remaining > 0 && s.pace && s.pace.perWeek > 0) score += Math.min(40, s.pace.perWeek*4);
    if(s.testAvg !== null && s.testAvg < 75) score += 15;
    if(s.remaining === 0) score -= 100;
    return { s, score };
  });
  withRev.sort((a,b)=>b.score-a.score);
  const s = withRev[0].s;
  const pieces = [];
  if(s.lastDays >= 3) pieces.push(`it's been ${s.lastDays} day${s.lastDays===1?'':'s'}`);
  if(s.remaining > 0 && s.pace && s.pace.daysLeft>0 && s.pace.remaining>0) pieces.push(`you still have ${s.pace.remaining} before its ${s.pace.daysLeft}-day exam`);
  if(s.testAvg !== null && s.testAvg < 75) pieces.push(`its recent average is ${Math.round(s.testAvg)}%`);
  return { subject: s.name, days: s.lastDays, why: pieces.join(' and ') };
}

// ---------- Insight engine ----------
let mascotInsightFlags = (()=>{ try{return JSON.parse(localStorage.getItem('studyMascotInsightFlags')||'{}');}catch(e){return{};} })();
function mascotInsightSeen(name){
  const today = todayKey();
  if(mascotInsightFlags[name] === today) return true;
  mascotInsightFlags[name] = today;
  try{ localStorage.setItem('studyMascotInsightFlags', JSON.stringify(mascotInsightFlags)); }catch(e){}
  return false;
}
function mascotInsightEngine(ctx){
  const c = ctx || mascotBuildContext();
  const out = [];
  try{
    const w1 = rangeTotal ? rangeTotal(7) : 0;
    const w2 = rangeTotal ? (rangeTotal(14) - rangeTotal(7)) : 0;
    if(w1>0 && w2>0){
      if(w1 > w2*1.25 && !mascotInsightSeen('week_up') && mascotCooldownOk('analytics')){ out.push('week_up'); mascotMarkEvent('analytics'); }
      else if(w1 < w2*0.75 && !mascotInsightSeen('week_down') && mascotCooldownOk('analytics')){ out.push('week_down'); mascotMarkEvent('analytics'); }
    }
  }catch(e){}
  if(c.neglected.length && !mascotInsightSeen('neglect')) out.push('neglect');
  const subjDists=(()=>{const t=c.subjects.reduce((a,b)=>a+b.totalMin,0);return t>0?c.subjects.map(s=>({name:s.name,frac:s.totalMin/t})).sort((a,b)=>b.frac-a.frac):[];})();
  if(subjDists.length>=2 && subjDists[0].frac>0.7 && !mascotInsightSeen('imbalance')) out.push('imbalance');
  if(c.today.studyMinutes>=300 && c.today.studyMinutes<360 && !mascotInsightSeen('goal_near')) out.push('goal_near');
  if(c.today.planPct===100 && c.today.plan.total>0 && !mascotInsightSeen('plan_done')) out.push('plan_done');
  return out;
}

// ---------- Hidden Study Mood Score (Â§9) ----------
function mascotComputeMoodScore(ctx){
  const c = ctx || mascotBuildContext();
  const P = MASCOT_CONFIG.moodPoints;
  let score = 0;
  const snap = getTodaySnapshot();
  const minToday = Math.round(snap.total/60);

  if(c.today.planPct===100 && c.today.plan.total>0) score += P.dailyGoalDone;
  if(minToday >= 360) score += P.study6h;
  else if(minToday >= 300) score += P.study5h;
  if(computeGlobalStreak() > 0) score += P.streakUp;
  if(minToday>0 && c.subjects.some(s=>s.lastDays>=4 && snap.bySubject[s.id]>0)) score += P.neglectedStudied;
  if(c.neglected.length) score += P.subjectIgnored * c.neglected.length;
  if(minToday < 120) score += P.lowStudy;
  if(c.today.plan.total>0 && c.today.planPct<100) score += P.goalMissed;
  if(mascotBadDayStreak() >= 3) score -= 2;
  return score;
}
function mascotMoodFromScore(score){
  // Complete spec §9 mapping:
  //  ≤−3 GRUMPY · −2..−1 DISAPPOINTED · 0..2 NEUTRAL · 3..4 PLAYFUL ·
  //  5..6 PROUD · 7+ CELEBRATORY. First matching upper-bound wins (break).
  const bounds = [-3, -1, 2, 4, 6, Infinity];
  const labels = ['grumpy', 'disappointed', 'neutral', 'playful', 'proud', 'celebrate'];
  for(let i=0;i<bounds.length;i++){ if(score <= bounds[i]) return labels[i]; }
  return 'celebrate';
}
function mascotMoodToKey(mood){
  if(mood==='playful') return 'happy';
  if(mood==='grumpy')  return 'grumpy';
  return mood;
}

// ---------- Subject comeback / recency teasing copy ----------
function mascotComebackLine(subj){
  const d = subj.lastDays;
  if(d>=15) return `${subj.name} has been gone ${d} days. Your textbook probably thinks you've graduated.`;
  if(d>=8)  return `${subj.name} returns after ${d} days. I was about to file a missing-person report.`;
  if(d>=6)  return `${d} days without ${subj.name}? That subject definitely filed a missing-person report.`;
  if(d>=4)  return `Look who's finally giving ${subj.name} some attention again.`;
  return `${subj.name} again? Alright, I'll allow it.`;
}
function mascotNeglectLine(subj){
  const d = subj.lastDays;
  return `${subj.name} has been untouched for ${d} day${d===1?'':'s'}. It's starting to look jealous.`;
}

// ---------- The brain: pick what to say & with which art ----------
function mascotUtter(moodKey, ctx, forcedLine){
  const bubble = document.getElementById('mascotBubble');
  const avatarBtn = document.getElementById('mascotAvatarBtn');
  if(!bubble || !avatarBtn) return;
  if(focusRef && !['milestone','proud','celebrate','happy','determined'].includes(moodKey)){
    if(Math.random() < 0.8) return;
  }
  let line = forcedLine || mascotPickLine(moodKey, ctx);
  if(mascotIsRecent(line)){
    const alt = mascotPickLine(moodKey, ctx);
    line = mascotIsRecent(alt) ? line : alt;
  }
  mascotRememberMessage(line);
  mascotState.mood = moodKey;
  mascotState.line = line;
mascotState.imageKey = mascotPickImageKey(moodKey, ctx ? ctx.session.subjectName : mascotActiveSubjectName());
  bubble.textContent = line;
  bubble.classList.add('show');
  mascotSetAvatar(mascotState.imageKey);
  avatarBtn.classList.remove('bump');
  void avatarBtn.offsetWidth;
  avatarBtn.classList.add('bump');
}

// ---------- Conversational AI (freeform, tracker-context aware) ----------
function mascotRespond(userText){
  const q = (userText||'').toLowerCase();
  const ctx = mascotBuildContext();

  if(/(how.*(do|am|i).*(doing|going)|how (am i|do i) (doing|going))/i.test(q) ||
     /(debrief|status|report)/i.test(q)){
    const min = ctx.today.studyMinutes;
    const s = ctx.streak.current;
    const done = ctx.subjects.reduce((a,b)=>a+b.done,0);
    let line = `Today: ${min} min, streak ${s} day${s===1?'':'s'}, ${done} topic${done===1?'':'s'} done.`;
    if(ctx.stats.weekMin > ctx.stats.monthMin*0.9) line += ` Your week is trending up.`;
    if(ctx.neglected.length) line += ` Watch ${ctx.neglected[0].name} â€” it's neglected.`;
    return line;
  }
  if(/(what (should|to) (study|do next)|recommend|next (move|step|subject)|study next)/i.test(q)){
    const rec = mascotRecommendNext(ctx);
    if(!rec) return `No subjects on file yet. Add one and I'll start advising.`;
    if(rec.days>=4) return `I'd turn to ${rec.subject} â€” it's been ${rec.days} days, the clearest gap.`;
    return `Next move: ${rec.subject}. ${rec.why ? rec.why[0].toUpperCase()+rec.why.slice(1)+'.' : ''}`;
  }
  if(/(why.*(behind|falling|fall|slow)|falling behind|struggl)/i.test(q)){
    if(ctx.stats.weekMin < ctx.stats.monthMin*0.75) return `You've dipped below your usual pace this week. One weak day doesn't erase your trend â€” start with one good session.`;
    if(ctx.today.studyMinutes < 120) return `Today's been light. Not a judgement â€” just a nudge. Pick the nearest subject and give it 25 focused minutes.`;
    return `Honestly? You're not badly behind. Numbers look steady. Keep stacking.`;
  }
  if(/(what (am i|are) (good|strong) at|strength|best subject)/i.test(q)){
    const best = [...ctx.subjects].filter(s=>s.testAvg!==null).sort((a,b)=>b.testAvg-a.testAvg)[0];
    if(best) return `${best.name} is your strongest on record (avg ${Math.round(best.testAvg)}%). Keep feeding it â€” but don't starve the others.`;
    const heavy = [...ctx.subjects].sort((a,b)=>b.totalMin-a.totalMin)[0];
    return heavy ? `You've given ${heavy.name} the most time so far. That counts as a strength.` : `Not enough data to brag about you yet.`;
  }
  if(/(what (am i|are) (i )?ignoring|neglect|ignored|avoiding)/i.test(q)){
    if(ctx.neglected.length) return `Ignoring ${ctx.neglected.map(n=>n.name).join(', ')}${ctx.neglected[0].lastDays>=5 ? ' for a while now' : ''}. I noticed.`;
    return `Nothing glaring right now. Impressive.`;
  }
  if(/(what did i (study|do) today|today.*summary|today's)/i.test(q)){
    const bySubj = Object.entries(ctx.today.bySubject||{})
      .map(([id,sec])=>{ const s=(data.subjects||[]).find(x=>x.id===id); return s?`${s.name} ${Math.round(sec/60)}m`:null; })
      .filter(Boolean);
    if(!bySubj.length) return `Nothing recorded today yet. The timer's right there.`;
    return `Today: ${bySubj.join(', ')} â€” ${ctx.today.studyMinutes} min total.`;
  }
  if(/(how was|how.*(week|week))/i.test(q)){
    const w = ctx.stats.weekMin, m = ctx.stats.monthMin;
    let verdict = w>=m*0.9 ? 'a strong week' : (w>=m*0.6 ? 'decent' : 'a quiet week');
    const neg = ctx.neglected.map(n=>n.name).join(', ');
    return `This week: ${w} min â€” that's ${verdict}.${neg ? ` Neglected: ${neg}.` : ''}`;
  }
  if(/(should i (keep|stop) studying|keep going|keep studying|stop for today)/i.test(q)){
    if(ctx.session.active && ctx.session.durationMinutes >= (MASCOT_CONFIG.longSessionMin||75)){
      return `You've been on this for ${ctx.session.durationMinutes} min. A short reset is sensible â€” then come back.`;
    }
    return ctx.today.studyMinutes>=300 ? `Today's already ${ctx.today.studyMinutes} min â€” that's plenty. Rest or do one small push.` : `You've got ${300-Math.max(0,ctx.today.studyMinutes)} min to a nice day-total. Worth one more session.`;
  }
  // fallback
  const moods = ['annoyed','curious','neutral'];
  return mascotPickLine(moods[Math.floor(Math.random()*moods.length)], ctx);
}

// IANA: tap already covers empty; user-triggered question uses mascotRespond().

// ---------- One-time day/event evaluation (called from startApp + interval) ----------
function mascotPeriodicBrain(){
  if(document.visibilityState === 'hidden') return;
  const ctx = mascotBuildContext();
  // Plan completion = daily goal event
  if(ctx.today.plan.total>0 && ctx.today.planPct===100){
    const key='plan_done_'+todayKey();
    if(mascotLocalOnce(key) && mascotCooldownOk('achievement')){
      mascotLocalMark(key); mascotMarkEvent('achievement');
      mascotUtter('proud', ctx, `Today's whole plan is done. ${ctx.today.plan.total} item${ctx.today.plan.total===1?'':'s'} cleared. Remember this feeling.`);
      return;
    }
  }
  // end-of-day (after 22:00 with real study done) â€” once
  const h = new Date().getHours();
  if(h>=22 && ctx.today.studyMinutes>=60){
    const key='eod_'+todayKey();
    if(mascotLocalOnce(key)){ mascotLocalMark(key); mascotUtter('sleepy', ctx, `That's enough for today. ${ctx.today.studyMinutes} min logged â€” go recharge, ${ctx.user.name}.`); return; }
  }
}
let mascotLocalFlags = (()=>{ try{return JSON.parse(localStorage.getItem('studyMascotLocalFlags')||'{}');}catch(e){return{};} })();
function mascotLocalOnce(k){ return !mascotLocalFlags[k]; }
function mascotLocalMark(k){ try{ mascotLocalFlags[k]=1; localStorage.setItem('studyMascotLocalFlags', JSON.stringify(mascotLocalFlags)); }catch(e){} }

// ============================================================
// EVENT TRIGGERS â€” called from the app's action hooks
// ============================================================

// NOTE: mascotOnSessionStart / mascotOnSessionEnd live in the
// "PERSONALIZED SUBJECT INTERACTION SYSTEM" section at the end of
// this file (comeback / short-session / milestone-aware variants).

function mascotOnQuizSaved(obtained, total, subjectId){
  const pct = total>0 ? obtained/total*100 : 0;
  const ctx = mascotBuildContext();
  const s = (data.subjects||[]).find(x=>x.id===subjectId);
  const line = pct>=75
    ? `${Math.round(pct)}% on ${s?`${s.name}: `:''}I'll allow bragging rights.`
    : `${Math.round(pct)}%${s?` on ${s.name}`:''}. Not a disaster â€” review and retake. Promising? We'll see.`;
  // avoid interrupting focus for a quiz reaction unless notable
  mascotUtter(pct>=90 ? 'celebrate' : (pct>=75?'happy':'quizFail'), ctx, line);
}

function mascotOnFocusEnter(subjectId, unitId, lectureId){
  mascotLastInteraction = Date.now();
  const ctx = mascotBuildContext();
  mascotUtter('determined', ctx, `Focus mode. No witnesses. Just results.`);
}
function mascotOnFocusExit(){
  const ctx = mascotBuildContext();
  mascotUtter('happy', ctx, `Focus lifted. Keep the momentum in your pocket.`);
}

// Focus-guardian breather reminder during long focused sessions (driven by
// the 60s ambient tick, not intrusive).
function mascotFocusBreather(){
  if(!focusRef) return;
  const ctx = mascotBuildContext();
  if(ctx.session.durationMinutes >= (MASCOT_CONFIG.focusBreaksAfterMin||55) && mascotCooldownOk('minorMood')){
    mascotMarkEvent('minorMood');
    mascotUtter('breakTime', ctx, `You've been at this ${ctx.session.durationMinutes} min. Water. Stretch. Twenty seconds, then back.`);
  }
}

// ============================================================
// PERSONALIZED SUBJECT INTERACTION SYSTEM (spec §1–§19)
// ============================================================
// The mascot reacts personally to the user clicking/opening a subject or
// topic, using ONLY real tracker/analytics data. Works for EVERY subject —
// never hard-codes DBMS / Software Engineering / Mathematics etc. by name.
// All "days", "minutes", "sessions", "%" come from the tracker, never invented.

// Per-subject persistent memory: comeback counts + last seen reaction, so
// her personality evolves with repeated behavior instead of resetting each time.
let mascotSubjectMem = (()=>{
  try{ const a = JSON.parse(localStorage.getItem('studyMascotSubjectMem') || '{}'); return a&&typeof a==='object'?a:{}; }catch(e){ return {}; }
})();
function mascotMemGet(subjectId, key){ const m = mascotSubjectMem[subjectId] || {}; return m[key]; }
function mascotMemSet(subjectId, key, val){
  const m = (mascotSubjectMem[subjectId] = mascotSubjectMem[subjectId] || {});
  m[key] = val;
  try{ localStorage.setItem('studyMascotSubjectMem', JSON.stringify(mascotSubjectMem)); }catch(e){}
}
function mascotMemBump(subjectId, key){ mascotMemSet(subjectId, key, (mascotMemGet(subjectId, key)||0) + 1); }

// Build a subject's analytics profile from the live `data` model (§15 — every
// value is read from the tracker; anything absent is left null, never guessed).
// Returns an object with: name, lastStudiedMs, daysSince, totalSeconds,
// sessionCount, avgSessionSeconds, longestSessionSeconds, recentSessions ([]),
// completionPct, doneTopics, remainingTopics, revision, quizAvg, quizCount,
// trend ('up'|'down'|'steady'|null), neglected, lastSessionSeconds.
function mascotSubjectProfile(subjectId){
  const s = (data.subjects||[]).find(x=>x.id===subjectId);
  if(!s) return null;
  const name = s.name;
  const totalSeconds = (typeof subjectSeconds==='function') ? subjectSeconds(s) : 0;
  const c = (typeof countLectures==='function') ? countLectures(s) : {done:0, total:0};
  const completionPct = c.total>0 ? Math.round(c.done/c.total*100) : 0;
  const quizAvg = (typeof subjectTestAvg==='function') && (s.units||[]).some(u=>(u.tests||[]).length)
    ? subjectTestAvg(s) : null;
  let quizCount = 0; (s.units||[]).forEach(u=> quizCount += (u.tests||[]).length);

  // Rebuild session list from dailyLog (per-subject seconds per day) + the
  // stored lecture seconds so we can derive avg/longest session durations.
  const daily = data.dailyLog || {};
  const daySessions = [];
  for(const dayKey of Object.keys(daily)){
    const bs = daily[dayKey] && daily[dayKey].bySubject && daily[dayKey].bySubject[subjectId];
    if(bs && bs > 0) daySessions.push({ dayKey, seconds: bs });
  }
  // Merge lecture-level seconds too (may exceed dailyLog for old imports).
  let lectureSeconds = [];
  (s.units||[]).forEach(u => (u.lectures||[]).forEach(l => {
    if((l.seconds||0) > 0) lectureSeconds.push((l.seconds||0));
  }));
  const allSeconds = lectureSeconds.length ? lectureSeconds : daySessions.map(d=>d.seconds);
  const sessionCount = allSeconds.length;
  const avgSessionSeconds = sessionCount ? allSeconds.reduce((a,b)=>a+b,0)/sessionCount : null;
  const longestSessionSeconds = sessionCount ? Math.max(...allSeconds) : null;
  const lastSessionSeconds = sessionCount ? Math.max(...allSeconds) : null; // best available proxy

  const lastStudiedMs = mascotLastStudiedMs(subjectId);
  const daysSince = lastStudiedMs ? Math.max(0, Math.floor((Date.now()-lastStudiedMs)/86400000)) : null;
  const neglectDays = (MASCOT_CONFIG && MASCOT_CONFIG.neglectDays) || 4;
  const neglected = daysSince !== null ? daysSince >= neglectDays : false;

  // Revision: completed vs total returned as the milestone list; simplified
  // to completion + whether any topic is mid-way (started but not completed).
  const inProgress = (s.units||[]).some(u => (u.lectures||[]).some(l => !l.completed && (l.seconds||0)>0));

  // Recent trend (§1): compare total minutes in the last 3 days vs the 3 days
  // before that, per the daily log. up if the recent window is >=1.3x old.
  const trend = mascotSubjectTrend(daily, subjectId);

  return {
    id: subjectId, name,
    lastStudiedMs, daysSince,
    totalSeconds, totalMinutes: Math.round(totalSeconds/60),
    sessionCount, avgSessionSeconds,
    avgSessionMinutes: avgSessionSeconds ? Math.round(avgSessionSeconds/60) : null,
    longestSessionSeconds: longestSessionSeconds ? Math.round(longestSessionSeconds/60) : null,
    lastSessionSeconds: lastSessionSeconds ? Math.round(lastSessionSeconds/60) : null,
    recentSessions: daySessions.slice(-5).map(d=>({ day:d.dayKey, minutes: Math.round(d.seconds/60) })),
    completionPct, doneTopics: c.done, remainingTopics: Math.max(0,c.total-c.done),
    revision: { inProgress, hasExam: !!s.examDate },
    quizAvg: quizAvg!==null ? Math.round(quizAvg) : null, quizCount,
    trend, neglected,
  };
}

// When a subject was last studied (ms): scan dailyLog newest→oldest.
function mascotLastStudiedMs(subjectId){
  const daily = data.dailyLog || {};
  let best = null;
  for(const dayKey of Object.keys(daily)){
    const bs = daily[dayKey] && daily[dayKey].bySubject && daily[dayKey].bySubject[subjectId];
    if(bs && bs > 0){ const ms = new Date(dayKey+'T00:00:00').getTime(); if(ms && ms > (best||0)) best = ms; }
  }
  return best; // midnight of the last studied day (best resolution we have)
}

// Trend: recent 3-day minutes vs previous 3-day minutes from dailyLog.
function mascotSubjectTrend(daily, subjectId){
  const now = new Date();
  const w1 = {a:0, b:0};
  for(let i=0;i<3;i++){ // recent window
    const d = new Date(now); d.setDate(now.getDate()-i);
    const e = daily[todayKey(d)];
    w1.a += (e && e.bySubject && e.bySubject[subjectId]) || 0;
  }
  for(let i=3;i<6;i++){ // older window
    const d = new Date(now); d.setDate(now.getDate()-i);
    const e = daily[todayKey(d)];
    w1.b += (e && e.bySubject && e.bySubject[subjectId]) || 0;
  }
  if(w1.a===0 && w1.b===0) return null;
  if(w1.a >= w1.b*1.3) return 'up';
  if(w1.b >= w1.a*1.3) return 'down';
  return 'steady';
}

// Subject comparison (§8): pick the most-studied and a recent one to contrast.
function mascotSubjectComparison(profile, ctx){
  const others = (ctx.subjects||[]).filter(s=>s.id!==profile.id);
  if(!others.length) return null;
  const top = others.slice().sort((a,b)=>b.totalMin-a.totalMin)[0];
  if(!top || top.totalMin <= 0) return null;
  // Only bother if there's a real imbalance vs the opened subject.
  const diff = top.totalMin - (profile.totalMinutes||0);
  if(diff < 30) return null;
  const theirs = profile.name;
  const othersNames = others.slice(0,3).map(s=>s.name).join(', ');
  if(Math.random()<0.5){
    return `Interesting... you've given ${top.name} ${top.totalMin} min total, but only ${profile.totalMinutes||0} min to ${theirs}. I think ${theirs} feels neglected.`;
  }
  return `You're pouring attention into ${top.name} while ${theirs} sits at ${profile.totalMinutes||0} min. We should probably talk about that.`;
}

// Personality evolution (§9, §10): the more come-backs a subject sees, the more
// she trusts the habit. Returns a richer comeback "start" line.
function mascotEvolvingComebackLine(profile){
  const name = profile.name;
  const come = mascotMemGet(profile.id, 'comebackCount') || 0;
  if(come <= 1) return `Finally. ${name}. Let's see if you actually stay this time.`;
  if(come === 2) return `${name} again? Look who decided to visit twice this week.`;
  return `Okay, you're actually becoming consistent with ${name}. I wasn't expecting this character development.`;
}

// ---------- SECTION A: user opens/clicks a subject (§1, §2, §7, §8) ----------
function mascotOnSubjectOpen(subjectId){
  if(!subjectId) return;
  if(document.visibilityState === 'hidden') return;
  const profile = mascotSubjectProfile(subjectId);
  if(!profile) return;
  // Respect cooldown so rapid re-clicks / navigation don't spam (§17).
  const cd = (MASCOT_CONFIG.subjectInteraction && MASCOT_CONFIG.subjectInteraction.subjectOpenCooldown) || 30*60000;
  if(Date.now() - (mascotLastEvent('subjectOpen') || 0) < cd) return;
  mascotMarkEvent('subjectOpen');
  mascotLastInteraction = Date.now();

  const ctx = mascotBuildContext();
  const cfg = MASCOT_CONFIG.subjectInteraction || {};
  const days = profile.daysSince;

  // §2 mood scale based on the ACTUAL number of days.
  const tiers = cfg.tiers || [{max:1,mood:'happy'},{max:3,mood:'playful'},{max:6,mood:'grumpy'},{max:9,mood:'disappointed'},{max:Infinity,mood:'grumpy'}];
  let tier = tiers[tiers.length-1];
  for(const t of tiers){ if(days !== null && days <= t.max){ tier = t; break; } }
  const mood = tier.mood;
  const overrideImageKey = tier.image; // may be null → mood pool picks

  let line;
  if(days === null || days === 0){
    // Fresh / studied today — no neglect, cheerful but measured (§15: don't invent gap).
    line = `Hmm, ${profile.name} again? Look at you being responsible.`;
  } else if(days <= 1){
    line = `Hmm, ${profile.name} again? Look at you being responsible.`;
  } else if(days <= 3){
    line = `Oh? You remembered ${profile.name} before I had to remind you. I'm impressed.`;
  } else if(days <= 6){
    line = `Baka. You were supposed to study ${profile.name}, remember? It's been ${days} days.`;
  } else if(days <= 9){
    line = `BAKA. It's been ${days} days since you touched ${profile.name}. And now you suddenly remember this subject exists?`;
  } else {
    line = `Ten days?! TEN?! ${profile.name} has basically filed a missing-person report.`;
  }
  // Add a data-driven comparison nudge sometimes (§8, §7).
  const cmp = mascotSubjectComparison(profile, ctx);
  if(cmp && days>=3 && Math.random()<0.5) line = cmp;

  mascotFireEvent(mood, {
    forcedLine: line,
    overrideImageKey: overrideImageKey || undefined,
    subjectName: profile.name,
  });
}

// ---------- SECTION B: user opens/clicks a topic/lecture (§11) ----------
function mascotOnTopicOpen(subjectId, unitId, lectureId){
  if(!subjectId || !unitId) return;
  if(document.visibilityState === 'hidden') return;
  const profile = mascotSubjectProfile(subjectId);
  if(!profile) return;
  const s = (data.subjects||[]).find(x=>x.id===subjectId);
  const u = s && s.units.find(x=>x.id===unitId);
  const l = u && u.lectures.find(x=>x.id===lectureId);
  if(!u || !l) return;

  mascotLastInteraction = Date.now();
  const cd = (MASCOT_CONFIG.subjectInteraction && MASCOT_CONFIG.subjectInteraction.subjectOpenCooldown) || 30*60000;
  if(Date.now() - (mascotLastEvent('topicOpen')||0) < cd) return;
  mascotMarkEvent('topicOpen');

  const title = l.title || u.name;
  const startedPct = l.completed ? 100 : ((l.seconds||0)>0 ? Math.min(90, Math.round(l.seconds/180)) : 0);
  const dayUnder = l.completed && l.completedAt && (Date.now()-l.completedAt) < 24*3600e3;
  const dayStr = profile.daysSince !== null ? profile.daysSince : 'several';

  let mood, line, image = null;
  if(l.completed || startedPct >= 80){
    mood = 'proud';
    line = `You're already most of the way through "${title}". Finish it today and get it off the list.`;
  } else if(profile.quizAvg !== null && profile.quizAvg < 60 && Math.random()<0.6){
    mood = 'confused';
    line = `Back to "${title}"? You've struggled with this topic's material before (avg ${profile.quizAvg}%). Let's see if today's you is stronger.`;
  } else if(profile.daysSince !== null && profile.daysSince >= 4){
    mood = 'comeback';
    image = 'img_comeback';
    line = `Ohhh, "${title}". We left ${profile.name} untouched ${dayStr} days ago. Let's finally finish what we started.`;
  } else {
    mood = 'curious';
    line = `"${title}" it is. ${startedPct>0?`Looks like you've started this one (${startedPct}%).`:`Fresh topic — nice.`}`;
  }
  mascotFireEvent(mood, { forcedLine: line, overrideImageKey: image || undefined, subjectName: profile.name });
}

// ---------- SECTION C: session start (comeback / consistency evolution) ----------
function mascotOnSessionStart(subjectId, unitId, lectureId){
  mascotLastInteraction = Date.now();
  const s = (data.subjects||[]).find(x=>x.id===subjectId);
  if(!s) return;
  const ctx = mascotBuildContext();
  const profile = mascotSubjectProfile(subjectId);
  const cfg = MASCOT_CONFIG.subjectInteraction || {};
  const comebackDays = cfg.comebackDays || 5;
  const days = profile.daysSince;

  // §3: comeback — a long gap, now being closed. Acknowledge BOTH the gap and
  // the start. Image 18 (COMEBACK) for the memorable return.
  if(days !== null && days >= comebackDays){
    const cdOk = mascotCooldownOk('subjectTease');
    if(cdOk){
      mascotMarkEvent('subjectTease');
      mascotMemBump(subjectId, 'comebackCount');
    }
    const come = mascotMemGet(subjectId, 'comebackCount') || 1;
    let line;
    if(days >= 7){
      line = `FINALLY. You actually started ${s.name}. It's been ${days} days — please, for the love of ${s.name.toLowerCase().includes('database')?'databases':'everything'}, stay longer than 15 minutes this time.`;
      mascotFireEvent('comeback', { forcedLine:line, overrideImageKey:'img_comeback', subjectName:s.name });
    } else {
      // milder comeback (<7 days): evolving tone based on repeat returns (§9).
      line = mascotEvolvingComebackLine(profile);
      mascotFireEvent('comeback', { forcedLine:line, overrideImageKey:'img_comeback', subjectName:s.name });
    }
    return;
  }

  // Welcome-back after a broken streak where the just-started subject is one
  // of the neglected ones being reopened (§10).
  if(ctx.streak.current===0 && (ctx.neglected||[]).some(n=>n.id===subjectId)){
    mascotFireEvent('comeback', { forcedLine:`${s.name} again? Fine, welcome back.`, subjectName:s.name });
    return;
  }

  // §5: normal / continuity start — but never spam (§17).
  if(mascotCooldownOk('minorMood')){
    mascotMarkEvent('minorMood');
    const consistent = (mascotMemGet(subjectId,'comebackCount')||0) >= ((cfg.comebackConsistency)||2);
    const line = consistent
      ? `${s.name}? Fine, you're consistent now. I've stopped being surprised.`
      : `On ${s.name}. Good start. Don't stop.`;
    mascotFireEvent('happy', { forcedLine: line, subjectName:s.name });
  }
}

// ---------- SECTION D: session end (§4, §6) + mid-session milestones (§5) ----------
function mascotOnSessionEnd(subjectId, unitId, lectureId, elapsedSec){
  mascotLastInteraction = Date.now();
  const ctx = mascotBuildContext();
  const min = Math.max(0, Math.round((elapsedSec||0)/60));
  const s = (data.subjects||[]).find(x=>x.id===subjectId);
  const profile = mascotSubjectProfile(subjectId);
  const cfg = MASCOT_CONFIG.subjectInteraction || {};
  const comebackDays = cfg.comebackDays || 5;
  const days = profile ? profile.daysSince : null;
  const avgMin = profile ? profile.avgSessionMinutes : null;
  const todayMin = ctx.today.studyMinutes;

  const nm = s ? s.name : 'it';
  let mood, line, image;

  // §6 & §4: a comeback session that ended — judge by how short it was vs
  // (a) the gap and (b) the subject's normal session length (§15 no invented avg).
  if(days !== null && days >= comebackDays){
    const ratio = (avgMin && avgMin>0) ? min/avgMin : null;
    if(min < 15 || (ratio !== null && ratio < (cfg.shortSessionRatio||0.4))){
      // Very short comeback — the "WHY ARE YOU LIKE THIS" meme reaction.
      mood = 'grumpy';
      image = (Math.random()<0.5 ? 'img_why_are_you_like_this' : (Math.random()<0.5?'img_brain_left':'img_im_not_mad'));
      if(ratio !== null){
        line = `That was ${min} minutes. Your ${nm} sessions usually run about ${avgMin} min. ${days>=7?`After a ${days}-day gap, `:''}are we studying or just visiting?`;
      } else {
        line = `WTF. ${days>=7?`After a ${days}-day gap, `:''}you came back for ${min} minute${min===1?'':'s'}?`;
      }
    } else if(min >= 60){
      // Strong long comeback (§6 Example C / §18) — proud + flirty.
      mood = 'proud';
      image = 'img_so_proud';
      line = `Okay. I take back everything I said. ${min} minutes after a ${days}-day disappearance? That's actually impressive.`;
    } else {
      // Decent comeback (§6 Example A) — proud + playful.
      mood = 'proud';
      if(min>=45){
        line = `${min} minutes?! After disappearing for ${days} days, you came back and did a REAL ${nm} session. ...I'm proud of you. Don't make me wait another week.`;
      } else {
        line = `${min} min back on ${nm} after ${days} days away. Not bad. Now keep it up.`;
      }
    }
    mascotFireEvent(mood, { forcedLine:line, overrideImageKey:image, subjectName:nm });
    return;
  }

  // §6: normal session end — compare to subject average when available.
  if(min < 2){
    mood='disappointed'; line = `That was ${min} minute${min===1?'':'s'}. I blinked and you were done.`;
  } else if(avgMin && min < avgMin*0.6 && Math.random()<0.6){
    mood='grumpy';
    line = `${min} min on ${nm}. Usually you hang around ${avgMin} min — short today. Or visiting?`;
  } else if(min >= (MASCOT_CONFIG.longSessionMin||75)){
    mood='flirty'; line = `${min} min on ${nm} (today ${todayMin} total). Okay, overachiever. I'm impressed.`;
  } else {
    mood='happy'; line = `${min} min logged on ${nm}. Today's at ${todayMin} min.`;
  }
  mascotFireEvent(mood, { forcedLine:line, subjectName:nm });
}

// ---------- SECTION E: mid-session milestone check (§5) — called by ambient tick ----------
function mascotSessionMilestoneCheck(){
  if(!runningRef) return;
  const ctx = mascotBuildContext();
  const min = ctx.session.durationMinutes;
  if(min < 5) return;
  const milestones = (MASCOT_CONFIG.subjectInteraction && MASCOT_CONFIG.subjectInteraction.sessionMilestones) || [30,60];
  const s = (data.subjects||[]).find(x=>x.id===runningRef.subjectId);
  const subjName = s ? s.name : ctx.session.subjectName;
  const prev = mascotMemGet(runningRef.subjectId, 'lastMilestoneShown') || 0;
  const next = milestones.find(m => m > prev && min >= m);
  if(next === undefined) return;
  mascotMemSet(runningRef.subjectId, 'lastMilestoneShown', next);
  if(!mascotCooldownOk('milestone')) return; // milestones always fire per cooldown config
  mascotMarkEvent('milestone');
  if(min >= milestones[milestones.length-1] && min >= ((MASCOT_CONFIG.subjectInteraction||{}).comebackDays||5)*10){
    mascotFireEvent('flirty', { forcedLine:`You're still going?! Okay, ${subjName} warrior. I see you. (${min} min)`, subjectName:subjName });
  } else if(min >= 60){
    mascotFireEvent('proud', { forcedLine:`Now THAT looks like an actual ${subjName} session. (${min} min)`, subjectName:subjName });
  } else if(min >= 30){
    mascotFireEvent('playful', { forcedLine:`Okay... you're still here after ${min} min. I'm pleasantly surprised.`, subjectName:subjName });
  }
}

