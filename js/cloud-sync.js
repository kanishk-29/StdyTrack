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
//  4. Firestore Rules → publish these so each user can only touch their own doc:
//
//     rules_version = '2';
//     service cloud.firestore {
//       match /databases/{database}/documents {
//         match /studyTracker/{docId} {
//           allow read, write: if request.auth != null && request.auth.uid == docId;
//         }
//       }
//     }
//
//  5. Paste your web config below. Leave FIREBASE_CONFIG as null to run purely
//     on local device storage (like the app behaved before this file existed).
//
// Deploying with Vercel: just build/serve this folder as a static site — the
// Firebase SDK scripts are already loaded from the CDN in index.html, so no
// bundling is needed. Auth state is remembered per browser automatically.

const FIREBASE_CONFIG = null;
// Example of what it should look like once you paste your real one:
// const FIREBASE_CONFIG = {
//   apiKey: "AIza...",
//   authDomain: "your-project.firebaseapp.com",
//   projectId: "your-project",
//   storageBucket: "your-project.appspot.com",
//   messagingSenderId: "1234567890",
//   appId: "1:1234567890:web:abcdef"
// };

const CLOUD_COLLECTION = 'studyTracker'; // one document per signed-in user (doc id = auth uid)

let cloudApp = null;
let cloudDb = null;
let cloudReadyPromise = null;

function cloudIsConfigured(){
  return !!FIREBASE_CONFIG && typeof firebase !== 'undefined';
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