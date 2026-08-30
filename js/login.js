// Login gate + service worker registration trigger
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

function onLoginNameInput(){
  const name = document.getElementById('loginNameInput').value.trim();
  const greeting = document.getElementById('loginGreeting');
  if(!greeting) return;
  greeting.textContent = name ? `${name}. Fine. Now the password.` : "I'm Rei. Tell me your name — and don't waste my time.";
}

function toggleLoginPasswordVisibility(){
  const input = document.getElementById('loginPasswordInput');
  const btn = document.getElementById('loginPassToggle');
  if(!input || !btn) return;
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  btn.textContent = showing ? '👁' : '🙈';
  btn.title = showing ? 'Show password' : 'Hide password';
  input.focus();
}

// Subtle cursor-tracking tilt on the login card — she's watching you, after
// all. Same technique as the mascot's own 3D tilt elsewhere in the app,
// scoped to just the login screen and cleaned up once it's dismissed.
let mascotLoginTiltHandler = null;
function setupLoginCardTilt(){
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

let loginMode = 'signin'; // 'signin' | 'signup' — only used when Firebase is configured
let forgotMode = false;   // whether the password-reset panel is open (cloud only)

function resetLoginForm(){
  loginMode = 'signin';
  forgotMode = false;
  const cloud = cloudIsConfigured();
  const btn = document.getElementById('loginModeBtn');
  const emailField = document.getElementById('loginEmailField');
  const codeField = document.getElementById('loginCodeField');
  const forget = document.getElementById('loginForgetBtn');
  const label = document.getElementById('loginSubmitLabel');
  const arrow = document.getElementById('loginSubmitArrow');
  const submit = document.getElementById('loginSubmitBtn');
  const greeting = document.getElementById('loginGreeting');
  const err = document.getElementById('loginError');
  const name = document.getElementById('loginNameInput');
  const email = document.getElementById('loginEmailInput');
  const code = document.getElementById('loginCodeInput');
  const pass = document.getElementById('loginPasswordInput');
  const footnote = document.getElementById('loginFootnote');
  if(footnote) footnote.textContent = cloud
    ? '🔐 Your data is saved to this account and follows you anywhere'
    : '🔒 Your data stays on this device';
  if(btn) btn.textContent = "New here? Create an account";
  if(btn) btn.style.display = cloud ? '' : 'none';
  const googleBtn = document.getElementById('loginGoogleBtn');
  const googleSep = document.getElementById('loginGoogleSep');
  if(googleBtn) googleBtn.style.display = cloud ? '' : 'none';
  if(googleSep) googleSep.style.display = cloud ? '' : 'none';
  if(emailField) emailField.style.display = cloud ? '' : 'none';
  if(codeField) codeField.style.display = 'none';
  if(forget) forget.style.display = cloud ? '' : 'none';
  if(label) label.textContent = "Let's go";
  if(arrow) arrow.textContent = '→';
  if(submit){ submit.classList.remove('granted'); submit.disabled = false; }
  if(greeting) greeting.textContent = "I'm Rei. Tell me your name — and don't waste my time.";
  if(name) name.value = '';
  if(email) email.value = '';
  if(code) code.value = '';
  if(pass) pass.value = '';
  if(err){ err.textContent = ''; err.classList.remove('show', 'success'); }
  resetOtpHeld();
  const codePanel = document.getElementById('loginCodePanel');
  if(codePanel) codePanel.style.display = 'none';
  const resetPanel = document.getElementById('loginResetPanel');
  const resetFields = document.getElementById('loginFields');
  if(resetPanel) resetPanel.style.display = 'none';
  if(resetFields) resetFields.style.display = '';
  const s1 = document.getElementById('loginResetStage1');
  const s2 = document.getElementById('loginResetStage2');
  if(s1) s1.style.display = '';
  if(s2) s2.style.display = 'none';
  const codeStage = document.getElementById('loginResetCodeInput');
  const passStage = document.getElementById('loginResetPassInput');
  if(codeStage) codeStage.value = '';
  if(passStage) passStage.value = '';
  const resetErr = document.getElementById('loginResetError');
  if(resetErr){ resetErr.textContent = ''; resetErr.classList.remove('show', 'success'); }
}

function toggleLoginMode(){
  loginMode = loginMode === 'signin' ? 'signup' : 'signin';
  const signup = loginMode === 'signup';
  const btn = document.getElementById('loginModeBtn');
  const label = document.getElementById('loginSubmitLabel');
  const greeting = document.getElementById('loginGreeting');
  const resetErr = document.getElementById('loginResetError');
  if(resetErr){ resetErr.textContent = ''; resetErr.classList.remove('show'); }
  exitForgotPassword(true);
  if(btn) btn.textContent = signup ? "Already have an account? Sign in" : "New here? Create an account";
  if(label) label.textContent = signup ? "Create account" : "Let's go";
  if(greeting) greeting.textContent = signup
    ? "New identity check, then. Name, email, password."
    : "I'm Rei. Tell me your name — and don't waste my time.";
  const codeField = document.getElementById('loginCodeField');
  if(codeField) codeField.style.display = (signup && cloudInviteCodeRequired()) ? '' : 'none';
  const name = document.getElementById('loginNameInput');
  if(name) name.focus();
}

function enterForgotPassword(){
  if(!cloudIsConfigured() || forgotMode) return;
  forgotMode = true;
  const panel = document.getElementById('loginResetPanel');
  const fields = document.getElementById('loginFields');
  const resetEmail = document.getElementById('loginResetEmailInput');
  const resetErr = document.getElementById('loginResetError');
  const mainErr = document.getElementById('loginError');
  if(mainErr){ mainErr.textContent = ''; mainErr.classList.remove('show'); }
  if(resetErr){ resetErr.textContent = ''; resetErr.classList.remove('show', 'success'); }
  if(fields) fields.style.display = 'none';
  if(panel) panel.style.display = '';
  if(resetEmail){
    const mainEmail = document.getElementById('loginEmailInput');
    resetEmail.value = mainEmail ? mainEmail.value : '';
    setTimeout(()=> resetEmail.focus(), 50);
  }
}

function exitForgotPassword(silent){
  if(!forgotMode) return;
  forgotMode = false;
  const panel = document.getElementById('loginResetPanel');
  const fields = document.getElementById('loginFields');
  const resetBtn = document.getElementById('loginResetBtn');
  const resetLabel = document.getElementById('loginResetBtnLabel');
  if(resetBtn){ resetBtn.disabled = false; }
  if(resetLabel) resetLabel.textContent = 'Send code';
  if(panel) panel.style.display = 'none';
  if(fields) fields.style.display = '';
  const s1 = document.getElementById('loginResetStage1');
  const s2 = document.getElementById('loginResetStage2');
  if(s1) s1.style.display = '';
  if(s2) s2.style.display = 'none';
  const codeStage = document.getElementById('loginResetCodeInput');
  const passStage = document.getElementById('loginResetPassInput');
  if(codeStage) codeStage.value = '';
  if(passStage) passStage.value = '';
  resetOtpHeld();
  if(!silent){
    const name = document.getElementById('loginNameInput');
    if(name) name.focus();
  }
}

function showLoginResetMessage(msg, kind){
  const el = document.getElementById('loginResetError');
  if(!el) return;
  el.textContent = (kind === 'success' ? '✓ ' : '⚠ ') + msg;
  el.classList.remove('success');
  if(kind === 'success') el.classList.add('success');
  el.classList.add('show');
}

async function submitPasswordReset(){
  const resetEmail = document.getElementById('loginResetEmailInput');
  const email = resetEmail ? resetEmail.value.trim() : '';
  if(!cloudIsConfigured()){ showLoginResetMessage('Cloud is not configured.', 'error'); return; }
  if(!isValidEmail(email)){ showLoginResetMessage("That email doesn't look right.", 'error'); if(resetEmail) resetEmail.focus(); return; }
  const btn = document.getElementById('loginResetBtn');
  const label = document.getElementById('loginResetBtnLabel');
  if(btn) btn.disabled = true;
  if(label) label.textContent = 'Sending…';
  try{
    await otpSendCode('reset', email);
    window.__otpPending = { purpose: 'reset', email: email.trim().toLowerCase() };
    showResetStage2(email.trim());
    showLoginResetMessage('Code sent — enter it below.', 'success');
  }catch(err){
    showLoginResetMessage(authFriendlyError(err), 'error');
    if(btn) btn.disabled = false;
    if(label) label.textContent = 'Send code';
    if(resetEmail) resetEmail.focus();
  }
}

async function submitResetCode(){
  const code = document.getElementById('loginResetCodeInput');
  const pass = document.getElementById('loginResetPassInput');
  const err = document.getElementById('loginResetCodeError');
  const pending = window.__otpPending;
  if(!pending || pending.purpose !== 'reset'){ exitForgotPassword(); return; }
  if(!code || !code.value.trim()){ if(err){ err.textContent = '⚠ Enter the 6-digit code.'; err.classList.add('show'); } if(code) code.focus(); return; }
  if(!pass || pass.value.length < 6){ if(err){ err.textContent = '⚠ Password needs at least 6 characters.'; err.classList.add('show'); } if(pass) pass.focus(); return; }
  const btn = document.getElementById('loginResetCodeBtn');
  if(btn) btn.disabled = true;
  try{
    await otpVerify('reset', {
      email: pending.email,
      code: code.value.trim(),
      newPassword: pass.value
    });
    window.__otpPending = null;
    if(err){ err.textContent = '✓ Password reset! Sign in with your new password.'; err.classList.add('success'); err.classList.add('show'); }
    setTimeout(()=>{ exitForgotPassword(); }, 2400);
  }catch(e){
    if(err){ err.textContent = '⚠ ' + authFriendlyError(e); err.classList.add('show'); }
    if(pass) pass.value = '';
    if(code){ code.value = ''; code.focus(); }
    if(btn) btn.disabled = false;
  }
}

function showResetStage2(email){
  const s1 = document.getElementById('loginResetStage1');
  const s2 = document.getElementById('loginResetStage2');
  const badge = document.getElementById('loginResetStageEmail');
  if(s1) s1.style.display = 'none';
  if(s2) s2.style.display = '';
  if(badge) badge.textContent = email;
}

function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
let otpResendTimer = null;
function resetOtpHeld(){
  window.__otpPending = null;
  if(otpResendTimer){ clearTimeout(otpResendTimer); otpResendTimer = null; }
}
function showLoginCodePanel(purpose, email){
  const panel = document.getElementById('loginCodePanel');
  const fields = document.getElementById('loginFields');
  const title = document.getElementById('loginCodeTitle');
  const desc = document.getElementById('loginCodeDesc');
  const err = document.getElementById('loginCodeError');
  if(panel) panel.style.display = '';
  if(fields) fields.style.display = 'none';
  if(title) title.textContent = purpose === 'reset' ? 'Reset your password' : 'Check your inbox';
  if(desc) desc.textContent = 'We sent a 6-digit code to ' + email;
  setOtpResendCooldown(60);
  if(err){ err.textContent = ''; err.classList.remove('show', 'success'); }
  const input = document.getElementById('loginOtpInput');
  if(input){ input.value = ''; setTimeout(()=>input.focus(), 60); }
}
function exitCodePanel(){
  const panel = document.getElementById('loginCodePanel');
  const fields = document.getElementById('loginFields');
  resetOtpHeld();
  if(panel) panel.style.display = 'none';
  if(fields) fields.style.display = '';
}
function setOtpResendCooldown(seconds){
  const btn = document.getElementById('loginCodeResendBtn');
  if(!btn) return;
  btn.disabled = true;
  let left = seconds;
  const tick = ()=>{
    btn.textContent = 'Resend code (' + left + 's)';
    if(--left <= 0){
      btn.disabled = false;
      btn.textContent = 'Resend code';
    } else {
      otpResendTimer = setTimeout(tick, 1000);
    }
  };
  tick();
}
function showLoginCodeError(msg, kind){
  const err = document.getElementById('loginCodeError');
  if(!err) return;
  err.textContent = (kind === 'success' ? '✓ ' : '⚠ ') + msg;
  err.classList.remove('success');
  if(kind === 'success') err.classList.add('success');
  err.classList.add('show');
}
async function resendOtpHeld(){
  const pending = window.__otpPending;
  if(!pending) return;
  try{
    await otpSendCode(pending.purpose, pending.email);
    showLoginCodeError('Code sent again.', 'success');
    setOtpResendCooldown(60);
  }catch(err){
    showLoginCodeError(authFriendlyError(err));
  }
}
async function submitLoginCode(){
  const input = document.getElementById('loginOtpInput');
  const pending = window.__otpPending;
  const code = input ? input.value.trim() : '';
  if(!pending || !code){ if(input) input.focus(); return; }
  const btn = document.getElementById('loginCodeBtn');
  if(btn) btn.disabled = true;
  try{
    if(pending.purpose === 'signup'){
      await otpVerify('signup', {
        email: pending.email,
        name: pending.name,
        password: pending.pass,
        code: code
      });
      // Account exists server-side now — sign in normally to boot the app.
      await firebase.auth().signInWithEmailAndPassword(pending.email, pending.pass);
      resetOtpHeld();
      // auth listener starts the app (verified account).
    } else if(pending.purpose === 'verify'){
      await otpVerify('verify', { email: pending.email, code: code });
      resetOtpHeld();
      // Session is already signed in; refresh user state and restart cleanly.
      try{ await firebase.auth().currentUser.reload(); }catch(e){}
      location.reload();
    } else {
      resetOtpHeld();
      exitCodePanel();
    }
  }catch(err){
    showLoginCodeError(authFriendlyError(err));
    if(btn) btn.disabled = false;
    if(input){ input.value = ''; input.focus(); }
  }
}

function authFriendlyError(err){
  const code = err && err.code;
  const map = {
    'auth/invalid-email': "That email doesn't look right.",
    'auth/user-not-found': "No account with that email — create one below.",
    'auth/wrong-password': "Wrong password. Try again.",
    'auth/email-already-in-use': "That email is already registered — sign in instead.",
    'auth/weak-password': "Password needs at least 6 characters.",
    'auth/invalid-login-credentials': "Email or password is wrong.",
    'auth/network-request-failed': "Network error — check your connection.",
    'auth/too-many-requests': "Too many attempts. Wait a bit, then retry.",
    'auth/popup-closed-by-user': "Sign-in was cancelled.",
    'auth/popup-blocked': "Pop-up was blocked — allow pop-ups for this site, then try again.",
    'auth/unauthorized-domain': "Google sign-in isn't enabled for this domain yet.",
    'auth/account-exists-with-different-credential': "That email already has a password account — sign in with your password instead.",
    'auth/cancelled-popup-request': "Sign-in was cancelled.",
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
    // Google accounts are already email-verified, so they sail straight past
    // the verification gate; the auth listener starts the app for them.
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

function showLoginScreen(){
  const screen = document.getElementById('loginScreen');
  if(!screen) return;
  resetLoginForm();
  const petals = document.getElementById('loginPetals');
  if(petals) petals.innerHTML = loginPetalsHtml();
  const img = document.getElementById('loginMascotImg');
  if(img) img.src = MASCOT_IMAGES.hmph;
  screen.classList.add('show');
  setupLoginCardTilt();
  setTimeout(()=>document.getElementById('loginNameInput')?.focus(), 350);
}
function hideLoginScreen(){
  const screen = document.getElementById('loginScreen');
  if(!screen) return;
  teardownLoginCardTilt();
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
function handleLoginKeydown(e){
  if(e.key === 'Enter') attemptLogin();
}
function loginGrantedBeat(){
  // A brief "access granted" beat instead of an instant cut — makes the
  // checkpoint framing pay off rather than just being a locked door.
  const btn = document.getElementById('loginSubmitBtn');
  const label = document.getElementById('loginSubmitLabel');
  const arrow = document.getElementById('loginSubmitArrow');
  if(btn && label){
    btn.classList.add('granted');
    label.textContent = 'Access granted';
    if(arrow) arrow.textContent = '✓';
  }
  setTimeout(()=>{
    hideLoginScreen();
    // With Firebase the auth-state change below already started the app the
    // moment sign-in resolved — only the local door needs the start here.
    if(!cloudIsConfigured()) startApp();
  }, 550);
}

async function attemptLogin(){
  const nameInput = document.getElementById('loginNameInput');
  const emailInput = document.getElementById('loginEmailInput');
  const passInput = document.getElementById('loginPasswordInput');
  const name = nameInput.value.trim();
  const email = emailInput ? emailInput.value.trim() : '';
  const pass = passInput.value;

  if(cloudIsConfigured()){
    const btn = document.getElementById('loginSubmitBtn');
    if(btn) btn.disabled = true;
    try{
      if(loginMode === 'signup'){
        if(!name){ showLoginError("I need a name for the account."); if(btn) btn.disabled = false; nameInput.focus(); return; }
        if(!isValidEmail(email)){ showLoginError("That email doesn't look right."); if(btn) btn.disabled = false; emailInput.focus(); return; }
        if(pass.length < 6){ showLoginError("Password needs at least 6 characters."); if(btn) btn.disabled = false; passInput.focus(); return; }
        if(cloudInviteCodeRequired()){
          const codeInput = document.getElementById('loginCodeInput');
          const code = codeInput ? codeInput.value.trim() : '';
          const expected = (typeof SIGNUP_INVITE_CODE !== 'undefined') ? String(SIGNUP_INVITE_CODE).trim() : '';
          if(!code){ showLoginError("This one needs a join code — ask the owner."); if(btn) btn.disabled = false; if(codeInput) codeInput.focus(); return; }
          if(code !== expected){ showLoginError("That's not the right join code."); if(btn) btn.disabled = false; if(codeInput){ codeInput.value=''; codeInput.focus(); } return; }
        }
        await otpSendCode('signup', email);
        // Hold the signup details, then ask for the emailed code.
        window.__otpPending = { purpose: 'signup', email: email.trim().toLowerCase(), name: name, pass: pass };
        if(btn) btn.disabled = false;
        showLoginCodePanel('signup', email.trim());
        return;
      } else {
        if(!isValidEmail(email)){ showLoginError("That email doesn't look right."); if(btn) btn.disabled = false; emailInput.focus(); return; }
        if(!pass){ showLoginError("I need the password too."); if(btn) btn.disabled = false; passInput.focus(); return; }
        await cloudSignIn(email, pass);
      }
    }catch(err){
      showLoginError(authFriendlyError(err));
      passInput.value = '';
      const btn = document.getElementById('loginSubmitBtn');
      if(btn) btn.disabled = false;
      passInput.focus();
      return;
    }
    // Email-verification gate: a legacy (pre-OTP) account that's still
    // unverified gets a code sent to its inbox. The user stays signed in so
    // the verify call can mark the account verified, then we reload cleanly.
    if(cloudEmailVerificationRequired() && loginMode === 'signin'){
      const cu = firebase.auth().currentUser;
      if(cu && !cu.emailVerified){
        window.__verifyGateShown = true;
        const gateBtn = document.getElementById('loginSubmitBtn');
        if(gateBtn) gateBtn.disabled = false;
        passInput.value = '';
        window.__otpPending = { purpose: 'verify', email: cu.email };
        showLoginCodePanel('verify', cu.email);
        try{ await otpSendCode('verify', cu.email); }catch(err){ showLoginCodeError(authFriendlyError(err)); }
        return;
      }
    }
    // Signed in / account created — apply the name she'll call you, then load.
    if(name) applyUserName(name);
    loginGrantedBeat();
    return;
  }

  // ---- No Firebase configured: the original local door remains ----
  if(!name){
    showLoginError("I need a name. That's not optional.");
    nameInput.focus();
    return;
  }
  if(pass !== 'kanii30'){
    showLoginError("Wrong. Try again.");
    passInput.value = '';
    passInput.focus();
    return;
  }
  try{
    localStorage.setItem('studyUserName', name);
    localStorage.setItem('studyLoggedIn', '1');
  }catch(e){}
  MASCOT_NAME = name;
  loginGrantedBeat();
}

async function signOutAndShowLogin(){
  try{ localStorage.removeItem('studyLoggedIn'); }catch(e){}
  if(typeof cloudSignOut === 'function'){ try{ await cloudSignOut(); }catch(e){} }
  location.reload(); // re-runs checkLoginAndStart, which now shows the login screen
}

function updateAccountInfo(){
  const section = document.getElementById('settingsAccountSection');
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
  if(cloudIsConfigured()){
    // Firebase remembers the sign-in per browser, so restore it asynchronously.
    // initCloudSync() must finish before firebase.auth() exists in the project.
    const loader = document.getElementById('appLoader');
    initCloudSync().then(ready => {
      if(!ready){ // e.g. bad config — degrade to the original local gate
        if(loader && loader.parentNode) loader.remove();
        showLoginScreen();
        return;
      }
      let cloudStartDecided = false;
      let appStarted = false;
      // Note: on a persisted session this can fire null first, then the user.
      // The listener stays active for the session so a manual sign-in (attemptLogin)
      // can start the app at the exact moment auth resolves, no matter the order.
      firebase.auth().onAuthStateChanged((user)=>{
        if(user){
          // Unverified session (fake email, or account created pre-verification):
          // never start the app — bounce to the gate and offer a resend link.
if(typeof cloudEmailVerificationRequired === 'function' && cloudEmailVerificationRequired() && !user.emailVerified){
            if(loader && loader.parentNode) loader.remove();
            const gateScreen = document.getElementById('loginScreen');
            if(gateScreen && !gateScreen.classList.contains('show')) showLoginScreen();
            if(!window.__verifyGateShown){
              window.__verifyGateShown = true;
              showLoginError('This account isn\u2019t verified yet — sign in again and we\u2019ll send a code.');
            }
return;
          }
          if(loader && loader.parentNode) loader.remove();
          try{ const saved = localStorage.getItem('studyUserName'); if(saved) MASCOT_NAME = saved; }catch(e){}
          const screen = document.getElementById('loginScreen');
          const btn = document.getElementById('loginSubmitBtn');
          if(screen && screen.classList.contains('show') && (!btn || !btn.classList.contains('granted'))){
            // Latent sign-in arriving after a null event — close the gate quietly.
            hideLoginScreen();
          }
          if(!appStarted){ appStarted = true; startApp(); }
        } else {
          if(!cloudStartDecided){
            cloudStartDecided = true;
            if(loader && loader.parentNode) loader.remove();
            showLoginScreen();
          }
          // Later null events = sign-out; signOutAndShowLogin handles the reload.
        }
      });
    });
    return;
  }
  let savedName = null, loggedIn = false;
  try{
    savedName = localStorage.getItem('studyUserName');
    loggedIn = localStorage.getItem('studyLoggedIn') === '1';
  }catch(e){}
  if(savedName && loggedIn){
    MASCOT_NAME = savedName;
    const screen = document.getElementById('loginScreen');
    if(screen) screen.remove();
    startApp();
  } else {
    const loader = document.getElementById('appLoader');
    if(loader) loader.remove(); // don't show the "loading" spinner behind the login screen
    showLoginScreen();
  }
})();

// Register service worker for offline support when running as a deployed app.
// Silently no-ops inside Claude's sandboxed artifact preview — that's expected.
if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(() => { /* not deployed standalone yet */ });
  });
}