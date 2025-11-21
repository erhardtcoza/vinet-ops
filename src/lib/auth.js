
async function sha256(txt){ const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(txt)); return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function base64url(b){ return btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
function enc(o){ return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
export async function signJWT(payload, secret){
  const now = Math.floor(Date.now()/1000);
  payload.iat = payload.iat || now;
  payload.exp = payload.exp || (now + 7*24*3600);
  const header = enc({ alg:"HS256", typ:"JWT" });
  const body = enc(payload);
  const toSign = `${header}.${body}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
  return `${toSign}.${base64url(sig)}`;
}
export async function verifyJWT(token, secret){
  try{
    const [h,b,s] = token.split('.'); const toSign = `${h}.${b}`;
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
    const ok = base64url(sig) === s;
    const payload = JSON.parse(decodeURIComponent(escape(atob(b))));
    const now = Math.floor(Date.now()/1000);
    if (!ok || (payload.exp && payload.exp < now)) return null;
    return payload;
  }catch{ return null; }
}
