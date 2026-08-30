// POST /api/verify-code  → validates a 6-digit code, then performs the action.
//   signup: { type:'signup', email, code, name, password }  → creates verified account
//   verify: { type:'verify', email, code }                   → marks existing account verified
//   reset:  { type:'reset',  email, code, newPassword }      → sets a new password
const { getAdmin, normalizeEmail, isValidEmail, consumeCode } = require('./_lib');

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'POST only.' });
    return;
  }
  try{
    const { type, email, code, name, password, newPassword } = req.body || {};
    if(!type || !email || !isValidEmail(email) || !code){
      res.status(400).json({ error: 'Missing details.' });
      return;
    }
    const e = normalizeEmail(email);

    const ok = await consumeCode(type, e, String(code).trim());
    if(!ok){
      res.status(401).json({ error: 'Wrong or expired code. Request a new one.' });
      return;
    }

    const auth = getAdmin().auth();
    if(type === 'signup'){
      if(!password || typeof password !== 'string' || password.length < 6){
        res.status(400).json({ error: 'Password needs at least 6 characters.' });
        return;
      }
      await auth.createUser({
        email: e,
        password,
        displayName: String(name || '').trim(),
        emailVerified: true
      });
    } else if(type === 'verify'){
      const user = await auth.getUserByEmail(e);
      await auth.updateUser(user.uid, { emailVerified: true });
    } else if(type === 'reset'){
      if(!newPassword || typeof newPassword !== 'string' || newPassword.length < 6){
        res.status(400).json({ error: 'Password needs at least 6 characters.' });
        return;
      }
      const user = await auth.getUserByEmail(e);
      await auth.updateUser(user.uid, { password: newPassword });
    } else {
      res.status(400).json({ error: 'Unknown request type.' });
      return;
    }

    res.json({ ok: true });
  }catch(err){
    res.status(400).json({ error: err.message || 'Something went wrong.' });
  }
};