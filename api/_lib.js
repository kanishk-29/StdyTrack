// Shared helpers for the Study Tracker OTP verify endpoints.
// Codes are generated, stored (hashed) and validated only server-side via the
// Firebase Admin SDK + Firestore, so a client can never self-verify.
const crypto = require('crypto');
const admin = require('firebase-admin');

let _app = null;
function getAdmin(){
  if(_app) return _app;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if(!sa){
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set on this deployment.');
  }
  const parsed = typeof sa === 'string' ? JSON.parse(sa) : sa;
  _app = admin.initializeApp({ credential: admin.credential.cert(parsed) });
  return _app;
}

const OTP_COLLECTION = 'otp';
const CODE_TTL_MS = 10 * 60 * 1000;      // code valid for 10 minutes
const MAX_TRIES = 5;                     // wrong guesses before the code dies
const RESEND_INTERVAL_MS = 60 * 1000;    // one code per email per minute

function normalizeEmail(email){ return String(email || '').trim().toLowerCase(); }
function isValidEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function genCode(){ return String(Math.floor(100000 + Math.random() * 900000)); }
function hashCode(code, email){
  return crypto.createHash('sha256').update(email + '::' + code).digest('hex');
}

async function readOtp(email){
  const snap = await getAdmin().firestore().collection(OTP_COLLECTION).doc(email).get();
  return snap.exists ? snap.data() : null;
}

async function checkCooldown(email){
  const d = await readOtp(email);
  if(!d || !d.lastSentAt) return;
  const last = new Date(d.lastSentAt).getTime();
  if(Date.now() - last < RESEND_INTERVAL_MS){
    throw new Error('Wait about a minute before requesting another code.');
  }
}

async function saveCode(purpose, email, code){
  await getAdmin().firestore().collection(OTP_COLLECTION).doc(email).set({
    purpose,
    codeHash: hashCode(code, email),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    lastSentAt: new Date(),
    tries: 0
  });
}

async function consumeCode(purpose, email, code){
  const d = await readOtp(email);
  if(!d || d.purpose !== purpose) return false;
  if(new Date(d.expiresAt).getTime() < Date.now()){
    await getAdmin().firestore().collection(OTP_COLLECTION).doc(email).delete();
    return false;
  }
  if((d.tries || 0) >= MAX_TRIES){
    await getAdmin().firestore().collection(OTP_COLLECTION).doc(email).delete();
    return false;
  }
  const ok = d.codeHash === hashCode(code, email);
  if(ok){
    await getAdmin().firestore().collection(OTP_COLLECTION).doc(email).delete();
    return true;
  }
  await getAdmin().firestore().collection(OTP_COLLECTION).doc(email).update({ tries: (d.tries || 0) + 1 });
  return false;
}

async function sendCodeEmail(email, code){
  const key = process.env.RESEND_API_KEY;
  if(!key){
    throw new Error('RESEND_API_KEY is not set on this deployment.');
  }
  const from = process.env.VERIFY_FROM_EMAIL || 'Study Tracker <onboarding@resend.dev>';
  const html =
    '<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e7e2d3;border-radius:14px;background:#fffdf8">' +
    '  <div style="font-size:19px;font-weight:800;color:#1b1b2f">Study Tracker</div>' +
    '  <p style="font-size:14px;color:#44415a;line-height:1.5">Here is your login code. It expires in <b>10 minutes</b>. Don\u2019t share it with anyone.</p>' +
    '  <div style="font-size:34px;font-weight:800;letter-spacing:10px;color:#d9a441;background:#f7f2e3;border-radius:12px;padding:16px 12px;text-align:center;margin:16px 0">' + code + '</div>' +
    '  <p style="font-size:12px;color:#8a8678;margin:0">If you didn\u2019t request this, you can ignore this email.</p>' +
    '</div>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: 'Your Study Tracker verification code', html })
  });
  if(!res.ok){
    const text = await res.text().catch(() => '');
    throw new Error('Email delivery failed (' + res.status + ').');
  }
}

module.exports = {
  getAdmin,
  normalizeEmail,
  isValidEmail,
  genCode,
  checkCooldown,
  saveCode,
  consumeCode,
  sendCodeEmail
};