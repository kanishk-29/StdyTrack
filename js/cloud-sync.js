// Cloud sync (Firebase Authentication + Firestore) — makes your data follow
// your account to any browser or device, instead of being stuck in one
// browser's storage. Every user signs in with email + password; each account
// gets its own private Firestore document, so two people never collide.
//
// HOW IT WORKS
// Every save writes to the device's local storage first (instant, works
// offline) AND, in the background, pushes a copy up to that user's private
// Firestore document (doc id = Firebase auth uid). On load, the app checks
// both the local copy and the cloud copy and uses whichever was updated more
// recently (data.updatedAt). Because the local cache key is also scoped to
// the user (see studyDataCacheKey in data.js), signing out and signing in as
// a different person on the same device never mixes their data.
//
// SETUP (one-time, ~5 minutes)
//  1. Firebase Console → create a project → "Add app" → choose the </> Web app.
//  2. Authentication → Sign-in method → enable "Email/Password".
//  3. Firestore Database → create a database (production mode is fine).
//  4. Firestore Rules → publish these so each user can only touch their own doc,
//     AND only after verifying their email. The `email_verified == true` check is
//     the real (server-side) guard against anyone signing up with a fake email:
//
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /studyTracker/{docId} {
//           allow read, write: if request.auth != null
//               && request.auth.uid == docId
//               && request.auth.token.email_verified == true;
//         }
//         // One-time verification codes — only the server (Admin SDK) touches
//         // these; clients can neither read nor write them.
//         match /otp/{email} {
//           allow read, write: if false;
//         }
//       }
//     }
//
//     Firestore caches deployed rules for up to ~5 minutes, so allow a short
//     window for the new rules to take effect after publishing them.
//
//  5. Paste your web config below. Leave FIREBASE_CONFIG as null to run purely
//     on local device storage (like the app behaved before this file existed).
//
// Deploying with Vercel: just build/serve this folder as a static site — the
// Firebase SDK scripts are already loaded from the CDN in index.html, so no
// bundling is needed. Auth state is remembered per browser automatically.

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDp5EbhoQty1XV_hRXq013bZd-dgFM_gUc",
  authDomain: "stdytrackr.firebaseapp.com",
  projectId: "stdytrackr",
  storageBucket: "stdytrackr.firebasestorage.app",
  messagingSenderId: "797785116897",
  appId: "1:797785116897:web:ae836446135e93191e27a0",
  measurementId: "G-2XSKTM03C5"
};

// Optional gate on account creation. Leave it as '' to let ANYONE create an
// account (open-source friendly — ideal for letting people try the app).
// Set it to a secret word and visitors must enter that word when signing up.
// Honest note: it's frontend-only, so it deters casual signups and bots by
// friction — it is NOT real security. The Firestore rules are the real
// protection for data, and this just keeps your user list from being spammed.
const SIGNUP_INVITE_CODE = '';

// Require every account to verify its email before it can sign in and touch
// any Firestore data. This is paired with the Firestore rules check
// `request.auth.token.email_verified == true`, which is enforced server-side
// (a fake email can't pass, because Firebase mails a one-time link to the
// address — and only that address can confirm it). New sign-ups get a
// verification email automatically; any account that was created before this
// was turned on just clicks "Resend verification email" once to unlock.
const REQUIRE_EMAIL_VERIFICATION = true;

const CLOUD_COLLECTION = 'studyTracker'; // one document per signed-in user (doc id = auth uid)

let cloudApp = null;
let cloudDb = null;
let cloudReadyPromise = null;

function cloudIsConfigured(){
  return !!FIREBASE_CONFIG && typeof firebase !== 'undefined';
}

function cloudInviteCodeRequired(){
  return cloudIsConfigured() && SIGNUP_INVITE_CODE.trim() !== '';
}

function cloudEmailVerificationRequired(){
  return cloudIsConfigured() && !!REQUIRE_EMAIL_VERIFICATION;
}

function initCloudSync(){
  if(!cloudIsConfigured()) return Promise.resolve(false);
  if(cloudReadyPromise) return cloudReadyPromise;

  cloudReadyPromise = (async () => {
    try{
      cloudApp = firebase.initializeApp(FIREBASE_CONFIG);
      cloudDb = firebase.firestore();
      return true;
    }catch(e){
      console.error('Cloud sync unavailable:', e);
      return false;
    }
  })();
  return cloudReadyPromise;
}

function cloudCurrentUserId(){
  try{
    if(cloudIsConfigured() && typeof firebase.auth === 'function'){
      const u = firebase.auth().currentUser;
      return u ? u.uid : null;
    }
  }catch(e){}
  return null;
}

async function cloudSignIn(email, password){
  if(!cloudIsConfigured()) throw new Error('Cloud is not configured');
  const ready = await initCloudSync();
  if(!ready) throw new Error('Cloud is unavailable');
  return firebase.auth().signInWithEmailAndPassword(email.trim(), password);
}

async function cloudSignUp(email, password, displayName){
  if(!cloudIsConfigured()) throw new Error('Cloud is not configured');
  const ready = await initCloudSync();
  if(!ready) throw new Error('Cloud is unavailable');
  const cred = await firebase.auth().createUserWithEmailAndPassword(email.trim(), password);
  const user = cred && cred.user;
  if(user && displayName){
    try{ await user.updateProfile({ displayName }); }catch(e){ /* cosmetic only */ }
  }
  return cred;
}

async function cloudSignOut(){
  try{
    if(cloudIsConfigured() && typeof firebase.auth === 'function'){
      await firebase.auth().signOut();
    }
  }catch(e){ console.error('Cloud sign out failed:', e); }
}

async function cloudSendPasswordReset(email){
  if(!cloudIsConfigured()) throw new Error('Cloud is not configured');
  const ready = await initCloudSync();
  if(!ready) throw new Error('Cloud is unavailable');
  return firebase.auth().sendPasswordResetEmail(email.trim());
}

async function cloudSendEmailVerification(){
  if(!cloudIsConfigured()) throw new Error('Cloud is not configured');
  const ready = await initCloudSync();
  if(!ready) throw new Error('Cloud is unavailable');
  const user = firebase.auth().currentUser;
  if(!user) throw new Error('No signed-in user');
  return user.sendEmailVerification();
}

// ---- OTP (6-digit code) verification via Vercel serverless functions ----
// Codes are generated, emailed, stored and checked on the server, so a fake
// email can never self-verify itself from the browser.
function otpApiHeaders(){ return { 'Content-Type': 'application/json' }; }

async function otpRequest(path, body){
  const res = await fetch(path, {
    method: 'POST',
    headers: otpApiHeaders(),
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if(!res.ok) throw new Error((data && data.error) || 'Something went wrong.');
  return data;
}

// type: 'signup' | 'verify' | 'reset'
async function otpSendCode(type, email){
  return otpRequest('/api/send-code', { type, email: String(email || '').trim() });
}

// Verify a code and finish its action (create account / mark verified / reset password).
async function otpVerify(type, payload){
  return otpRequest('/api/verify-code', Object.assign({ type }, payload));
}

async function cloudPull(){
  if(!cloudIsConfigured()) return null;
  const ready = await initCloudSync();
  if(!ready) return null;
  const uid = cloudCurrentUserId();
  if(!uid) return null;
  try{
    const ref = cloudDb.collection(CLOUD_COLLECTION).doc(uid);
    const snap = await Promise.race([
      ref.get(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('cloud pull timeout')), 6000))
    ]);
    if(snap && snap.exists){
      const p = snap.data();
      if(p && p.json){
        return { json: p.json, userName: p.userName || null };
      }
    }
    return null;
  }catch(e){
    console.error('Cloud pull failed:', e);
    return null;
  }
}

async function cloudPush(jsonString){
  if(!cloudIsConfigured()) return false;
  const ready = await initCloudSync();
  if(!ready) return false;
  const uid = cloudCurrentUserId();
  if(!uid) return false;
  try{
    const ref = cloudDb.collection(CLOUD_COLLECTION).doc(uid);
    const userName = (typeof MASCOT_NAME !== 'undefined' && MASCOT_NAME) ? String(MASCOT_NAME) : '';
    await ref.set({ json: jsonString, userName, savedAt: firebase.firestore.FieldValue.serverTimestamp() });
    return true;
  }catch(e){
    console.error('Cloud push failed:', e);
    return false;
  }
}