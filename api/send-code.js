// POST /api/send-code  { type: 'signup' | 'verify' | 'reset', email }
const { getAdmin, normalizeEmail, isValidEmail, genCode, checkCooldown, saveCode, sendCodeEmail } = require('./_lib');

module.exports = async function handler(req, res){
  if(req.method !== 'POST'){
    res.status(405).json({ error: 'POST only.' });
    return;
  }
  try{
    const { type, email } = req.body || {};
    if(!email || !isValidEmail(email)){
      res.status(400).json({ error: "That email doesn't look right." });
      return;
    }
    const e = normalizeEmail(email);

    if(type === 'signup'){
      let exists = true;
      try{ await getAdmin().auth().getUserByEmail(e); }catch(err){ exists = false; }
      if(exists){
        res.status(409).json({ error: 'That email is already registered — sign in instead.' });
        return;
      }
    } else if(type === 'reset' || type === 'verify'){
      let user = null;
      try{ user = await getAdmin().auth().getUserByEmail(e); }catch(err){ user = null; }
      if(!user){
        res.status(404).json({ error: 'No account with that email.' });
        return;
      }
    } else {
      res.status(400).json({ error: 'Unknown request type.' });
      return;
    }

    await checkCooldown(e);
    const code = genCode();
    await saveCode(type, e, code);
    await sendCodeEmail(e, code);
    res.json({ ok: true });
  }catch(err){
    res.status(400).json({ error: err.message || 'Something went wrong.' });
  }
};