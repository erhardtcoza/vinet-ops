
const MIN = 60;
export async function rateLimit(env, key, { limit=180, window=MIN }={}){
  try{
    const now = Math.floor(Date.now()/1000);
    const bucket = Math.floor(now / window);
    const k = `ratelimit:${key}:${bucket}`;
    const v = await env.RATE.get(k); const n = v ? (parseInt(v,10)||0) : 0;
    if (n >= limit) return false;
    await env.RATE.put(k, String(n+1), { expirationTtl: window+5 });
    return true;
  }catch{ return true; }
}
