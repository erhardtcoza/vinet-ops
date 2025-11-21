
export async function verifyTurnstile(env, token, ip){
  try{
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: ip||'' })
    });
    const j = await r.json();
    return !!j.success;
  }catch{ return false; }
}
