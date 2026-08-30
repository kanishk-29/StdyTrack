// Cloud sync (Firebase Authentication + Firestore) — makes your data follow
// your Google account to any browser or device, instead of being stuck in one
// browser's storage. Sign-in is Google-only; each account (crypto: the Firebase
// auth uid) gets its own private Firestore document, so people never collide.
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
//  2. Authentication → Sign-in method → enable "Google".
//  3. Authentication → Settings → Authorized domains → add your site
//     (e.g. stdytrack.vercel.app) so the Google popup is allowed there.
//  4. Firestore Database → create a database (production mode is fine).
//  5. Firestore Rules → publish these. Google accounts are always verified,
//     so requiring `email_verified == true` is what keeps the door shut to
//     any fake/throwaway identity:
//
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /studyTracker/{docId} {
//           allow read, write: if request.auth != null
//               && request.auth.uid == docId
//               && request.auth.token.email_verified == true;
//         }
//       }
//     }
//
//     Firestore caches deployed rules for up to ~5 minutes, so allow a short
//     window for the new rules to take effect after publishing them.
//
//  6. Paste your web config below. Leave FIREBASE_CONFIG as null to run purely
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

// Require every account to be email-verified before it can touch any data.
// Google accounts are always verified already, so this is purely an extra
// defensive floor, paired with the Firestore rules check above. Without it,
// a leftover unverified session could still pull its own doc.
const REQUIRE_EMAIL_VERIFICATION = true;

const CLOUD_COLLECTION = 'studyTracker'; // one document per signed-in user (doc id = auth uid)

let cloudApp = null;
let cloudDb = null;
let cloudReadyPromise = null;

function cloudIsConfigured(){
  return !!FIREBASE_CONFIG && typeof firebase !== 'undefined';
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

async function cloudSignOut(){
  try{
    if(cloudIsConfigured() && typeof firebase.auth === 'function'){
      await firebase.auth().signOut();
    }
  }catch(e){ console.error('Cloud sign out failed:', e); }
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