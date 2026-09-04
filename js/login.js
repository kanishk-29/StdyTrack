// Login gate + service worker registration trigger.
// Security is delegated to Google: the only door in the app is Google sign-in,
// and Google accounts are already email-verified — so fake/throwaway email
// signups simply cannot happen here.
// ---------- LOGIN GATE ----------
function loginPetalsHtml(){
  let seed = 4242;
  const rand = ()=>{ seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  let spans = '';
  for(let i=0;i<10;i++){
    const size = 8 + rand()*12;
    const left = rand()*96;
    const top = rand()*96;
    const dur = 16 + rand()*12;
    const delay = -rand()*dur;
    const dx = (rand()*70-35).toFixed(0);
    const dy = -(50 + rand()*60).toFixed(0);
    const rot = (120 + rand()*180).toFixed(0);
    spans += `<span style="width:${size.toFixed(1)}px;height:${size.toFixed(1)}px;left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;animation-duration:${dur.toFixed(1)}s;animation-delay:${delay.toFixed(1)}s;--pdx:${dx}px;--pdy:${dy}px;--prot:${rot}deg;"></span>`;
  }
  return spans;
}

// Subtle cursor-tracking tilt on the login card — she's watching you, after
// all. Same technique as the mascot's own 3D tilt elsewhere in the app,
// scoped to just the login screen and cleaned up once it's dismissed.
let mascotLoginTiltHandler = null;
function setupLoginCardTilt(){
  if(mascotLoginTiltHandler) return; // already listening — don't stack duplicates
  const stage = document.getElementById('loginStage');
  const card = document.getElementById('loginCard');
  if(!stage || !card) return;
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  mascotLoginTiltHandler = (e)=>{
    const rect = stage.getBoundingClientRect();
    const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
    const dx = (e.clientX - cx) / (rect.width/2);
    const dy = (e.clientY - cy) / (rect.height/2);
    const max = 7;
    card.style.transform = `rotateY(${(dx*max).toFixed(2)}deg) rotateX(${(-dy*max).toFixed(2)}deg)`;
  };
  window.addEventListener('mousemove', mascotLoginTiltHandler);
}
function teardownLoginCardTilt(){
  if(mascotLoginTiltHandler) window.removeEventListener('mousemove', mascotLoginTiltHandler);
  mascotLoginTiltHandler = null;
}

// Night-shrine atmosphere: stars, snow, embers, subtle parallax and a cursor
// glass sheen on the card. Decorative only — guarded so it never breaks the
// login on touch / reduced-motion devices, and torn down when the gate hides.
let loginSceneFx = null;
function setupLoginScene(){
  if(loginSceneFx) return; // already listening — don't stack duplicates
  const screen = document.getElementById('loginScreen');
  if(!screen) return;
  const reduceMotion = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const finePointer = (window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  const emberRoot = document.getElementById('loginEmbers');
  const starRoot = document.getElementById('loginStars');
  const snowRoot = document.getElementById('loginSnow');

  if(emberRoot && !reduceMotion && emberRoot.childElementCount === 0){
    const count = finePointer ? 18 : 10;
    const frag = document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const e = document.createElement('span');
      e.className = 'login-ember';
      e.style.left = `${2 + Math.random()*22}%`;
      e.style.bottom = `${8 + Math.random()*24}%`;
      e.style.setProperty('--dur', `${4.5 + Math.random()*5}s`);
      e.style.setProperty('--delay', `${-Math.random()*8}s`);
      e.style.setProperty('--drift', `${-28 + Math.random()*56}px`);
      frag.appendChild(e);
    }
    emberRoot.appendChild(frag);
  }
  if(starRoot && starRoot.childElementCount === 0){
    const count = finePointer ? 55 : 34;
    const frag = document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const s = document.createElement('span');
      s.className = 'login-star';
      const size = 1 + Math.random()*1.6;
      s.style.left = `${Math.random()*100}%`;
      s.style.top = `${Math.random()*62}%`;
      s.style.width = `${size}px`;
      s.style.height = `${size}px`;
      s.style.setProperty('--dur', reduceMotion ? '0s' : `${2.5 + Math.random()*4}s`);
      s.style.setProperty('--delay', `${-Math.random()*6}s`);
      s.style.setProperty('--peak', `${.5 + Math.random()*.5}`);
      if(reduceMotion) s.style.opacity = '.55';
      frag.appendChild(s);
    }
    starRoot.appendChild(frag);
  }
  if(snowRoot && !reduceMotion && snowRoot.childElementCount === 0){
    const count = finePointer ? 46 : 26;
    const frag = document.createDocumentFragment();
    for(let i=0;i<count;i++){
      const f = document.createElement('span');
      f.className = 'login-flake';
      const size = 2 + Math.random()*3.5;
      f.style.left = `${Math.random()*100}%`;
      f.style.width = `${size}px`;
      f.style.height = `${size}px`;
      f.style.setProperty('--dur', `${9 + Math.random()*10}s`);
      f.style.setProperty('--delay', `${-Math.random()*18}s`);
      f.style.setProperty('--drift', `${-60 + Math.random()*120}px`);
      f.style.setProperty('--peak', `${.4 + Math.random()*.5}`);
      frag.appendChild(f);
    }
    snowRoot.appendChild(frag);
  }

  let parallaxMove = null, parallaxLeave = null;
  let raf = 0, px = 0, py = 0;
  if(finePointer && !reduceMotion){
    parallaxMove = (e)=>{
      const dx = (e.clientX / Math.max(1, window.innerWidth) - .5) * 2;
      const dy = (e.clientY / Math.max(1, window.innerHeight) - .5) * 2;
      px = dx * -8; py = dy * -5;
      if(!raf){
        raf = requestAnimationFrame(()=>{
          screen.style.setProperty('--px', `${px}px`);
          screen.style.setProperty('--py', `${py}px`);
          raf = 0;
        });
      }
    };
    parallaxLeave = ()=>{
      screen.style.setProperty('--px','0px');
      screen.style.setProperty('--py','0px');
    };
    screen.addEventListener('pointermove', parallaxMove);
    screen.addEventListener('pointerleave', parallaxLeave);
  }

  let sheenMove = null, sheenLeave = null;
  const card = document.getElementById('loginCard');
  if(card && finePointer && !reduceMotion){
    sheenMove = (e)=>{
      const r = card.getBoundingClientRect();
      card.style.setProperty('--gx', `${((e.clientX - r.left) / r.width) * 100}%`);
      card.style.setProperty('--gy', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    sheenLeave = ()=>{
      card.style.setProperty('--gx','50%');
      card.style.setProperty('--gy','12%');
    };
    card.addEventListener('pointermove', sheenMove);
    card.addEventListener('pointerleave', sheenLeave);
  }

  loginSceneFx = ()=>{
    if(parallaxMove) screen.removeEventListener('pointermove', parallaxMove);
    if(parallaxLeave) screen.removeEventListener('pointerleave', parallaxLeave);
    if(sheenMove && card) card.removeEventListener('pointermove', sheenMove);
    if(sheenLeave && card) card.removeEventListener('pointerleave', sheenLeave);
    loginSceneFx = null;
  };
}
function teardownLoginScene(){
  if(loginSceneFx) loginSceneFx();
}

function authFriendlyError(err){
  const code = err && err.code;
  const map = {
    'auth/network-request-failed': "Network error — check your connection.",
    'auth/too-many-requests': "Too many attempts. Wait a bit, then retry.",
    'auth/popup-closed-by-user': "Sign-in was cancelled.",
    'auth/popup-blocked': "Pop-up was blocked — allow pop-ups for this site, then try again.",
    'auth/cancelled-popup-request': "Sign-in was cancelled.",
    'auth/unauthorized-domain': "Google sign-in isn't enabled for this domain yet.",
    'auth/account-exists-with-different-credential': "That email already belongs to an account on this app.",
    'auth/operation-not-allowed': "Google sign-in isn't enabled in Firebase yet.",
  };
  return map[code] || (err && err.message ? err.message : "Something went wrong. Try again.");
}

async function googleSignIn(){
  if(!cloudIsConfigured()) return;
  const btn = document.getElementById('loginGoogleBtn');
  if(btn) btn.disabled = true;
  try{
    const ready = await initCloudSync();
    if(!ready) throw new Error('Cloud is unavailable');
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await firebase.auth().signInWithPopup(provider);
    // Google accounts are already email-verified — the auth listener below
    // sees them the moment sign-in resolves and starts the app.
    const user = firebase.auth().currentUser;
    if(user && user.displayName) applyUserName(user.displayName);
  }catch(err){
    showLoginError(authFriendlyError(err));
  }
  if(btn) btn.disabled = false;
}

function applyUserName(name){
  if(typeof MASCOT_NAME !== 'undefined') MASCOT_NAME = name;
  try{ localStorage.setItem('studyUserName', name); }catch(e){}
}

// Demo / trial entry — lets a reviewer explore a populated copy with no account.
// Bypasses the whole login gate: no Google, no cloud, data self-cleans on exit.
async function startDemo(){
  if(typeof startDemoMode !== 'function') return;
  const screen = document.getElementById('loginScreen');
  if(screen) screen.classList.remove('show');
  if(typeof hideLoginScreen === 'function'){ try{ hideLoginScreen(); }catch(e){} }
  await startDemoMode();
}

// While the login gate is up, lock the viewport scale so a pinch-zoom can't
// shrink the login to a tiny box (mobile). Restored on hide so the rest of
// the app stays zoomable/accessible.
let loginViewportPrev = null;
function lockLoginViewport(){
  if(loginViewportPrev !== null) return; // already locked
  const m = document.querySelector('meta[name="viewport"]');
  if(!m) return;
  loginViewportPrev = m.getAttribute('content') || '';
  m.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
}
function restoreLoginViewport(){
  if(loginViewportPrev === null) return;
  const m = document.querySelector('meta[name="viewport"]');
  if(m) m.setAttribute('content', loginViewportPrev);
  loginViewportPrev = null;
}

function showLoginScreen(){
  const screen = document.getElementById('loginScreen');
  if(!screen) return;
  const err = document.getElementById('loginError');
  if(err){
    err.textContent = '';
    err.classList.remove('show', 'success');
  }
  const img = document.getElementById('loginMascotImg');
  if(img) img.src = 'rei-avatar.png';
  screen.classList.add('show');
  lockLoginViewport();
  setupLoginCardTilt();
  setupLoginScene();
}
function hideLoginScreen(){
  const screen = document.getElementById('loginScreen');
  if(!screen) return;
  teardownLoginCardTilt();
  teardownLoginScene();
  restoreLoginViewport();
  screen.classList.remove('show');
  screen.classList.add('hide');
  setTimeout(()=>screen.remove(), 400);
}
function showLoginError(msg){
  const err = document.getElementById('loginError');
  if(err){ err.textContent = '⚠ ' + msg; err.classList.add('show'); }
  const card = document.getElementById('loginCard');
  if(card){ card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake'); }
}

async function signOutAndShowLogin(){
  try{ localStorage.removeItem('studyLoggedIn'); }catch(e){}
  if(typeof cloudSignOut === 'function'){ try{ await cloudSignOut(); }catch(e){} }
  location.reload(); // re-runs checkLoginAndStart, which now shows the login screen
}

function updateAccountInfo(){
  const section = document.getElementById('settingsAccountSection');
  if(DEMO_MODE){
    if(section) section.style.display = 'none';
    return;
  }
  if(!section) return;
  if(cloudIsConfigured()){
    section.style.display = '';
    const emailEl = document.getElementById('settingsAccountEmail');
    if(emailEl){
      emailEl.value = (typeof firebase.auth === 'function' && firebase.auth().currentUser) ? (firebase.auth().currentUser.email || '') : '';
    }
  } else {
    section.style.display = 'none';
  }
}

(function checkLoginAndStart(){
  // If a demo/trial session kicked off first (fast "Try the demo" click before
  // the async auth check below settles), don't let auth re-show the login gate
  // or clobber the running demo.
  if(typeof DEMO_MODE !== 'undefined' && DEMO_MODE){
    const loader = document.getElementById('appLoader');
    if(loader && loader.parentNode) loader.remove();
    return;
  }
  if(cloudIsConfigured()){
    // Firebase remembers the sign-in per browser, so restore it asynchronously.
    // initCloudSync() must finish before firebase.auth() exists in the project.
    const loader = document.getElementById('appLoader');
    initCloudSync().then(ready => {
      if(!ready){ // e.g. bad config — just show the gate; Google will fail with a clear error.
        if(loader && loader.parentNode) loader.remove();
        showLoginScreen();
        return;
      }
      let cloudStartDecided = false;
      let appStarted = false;
      firebase.auth().onAuthStateChanged((user)=>{
        if(user){
          // Google users are always verified. This branch only matters for a
          // stale session left over from the old email/password era.
          if(typeof cloudEmailVerificationRequired === 'function' && cloudEmailVerificationRequired() && !user.emailVerified){
            if(loader && loader.parentNode) loader.remove();
            const gateScreen = document.getElementById('loginScreen');
            if(gateScreen && !gateScreen.classList.contains('show')) showLoginScreen();
            if(!window.__verifyGateShown){
              window.__verifyGateShown = true;
              showLoginError('This account was never verified. Sign out and use your Google account to continue.');
            }
            return;
          }
          if(loader && loader.parentNode) loader.remove();
          try{ const saved = localStorage.getItem('studyUserName'); if(saved) MASCOT_NAME = saved; }catch(e){}
          const screen = document.getElementById('loginScreen');
          if(screen && screen.classList.contains('show')) hideLoginScreen();
          if(!appStarted){ appStarted = true; startApp(); }
        } else {
          if(!cloudStartDecided){
            cloudStartDecided = true;
            if(loader && loader.parentNode) loader.remove();
            // Never show the login gate over a running demo/trial session.
            if(typeof DEMO_MODE === 'undefined' || !DEMO_MODE) showLoginScreen();
          }
          // Later null events = sign-out; signOutAndShowLogin handles the reload.
        }
      });
    });
    return;
  }

  // No Firebase configured: there is nothing to authenticate against.
  if(typeof DEMO_MODE !== 'undefined' && DEMO_MODE) return;
  const loader = document.getElementById('appLoader');
  if(loader) loader.remove();
  showLoginScreen();
})();

// Register service worker for offline support when running as a deployed app.
// Silently no-ops inside Claude's sandboxed artifact preview — that's expected.
if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* not deployed standalone yet */ });
  });
}