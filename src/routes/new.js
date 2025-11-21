
import { html } from "../lib/http.js";
import { splashHTML } from "../ui/splash.js";
import { landingHTML } from "../ui/landing.js";
import { signupHTML } from "../ui/signup.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { waSendText } from "../lib/wa.js";

export async function handleNew(req, env, { dbRun }){
  const url = new URL(req.url);
  const cookie = req.headers.get("Cookie")||"";
  const hasTS = /(?:^|; )vops_ts=1/.test(cookie);
  if (!hasTS && url.pathname !== "/splash") return html(splashHTML(env.TURNSTILE_SITE_KEY));
  if (url.pathname === "/" || url.pathname === "/landing") return html(landingHTML());
  if (url.pathname === "/install") return html("<p>On your browser, choose 'Add to Home Screen' to install.</p>");
  if (url.pathname === "/splash" && req.method === "GET") return html(splashHTML(env.TURNSTILE_SITE_KEY));
  if (url.pathname === "/splash" && req.method === "POST"){
    const f = await req.formData(); const token = String(f.get("cf-turnstile-response")||"");
    const ok = await verifyTurnstile(env, token, req.headers.get("CF-Connecting-IP"));
    if (!ok) return html(splashHTML(env.TURNSTILE_SITE_KEY));
    const h = new Headers({ "Location": "/landing" });
    h.append("Set-Cookie", `vops_ts=1; Domain=${env.COOKIE_DOMAIN||""}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7*24*3600}`);
    return new Response(null, { status:302, headers:h });
  }
  if (url.pathname === "/signup" && req.method === "GET") return html(signupHTML());
  if (url.pathname === "/signup" && req.method === "POST"){
    const f = await req.formData();
    const payload = Object.fromEntries([...f].map(([k,v])=>[k,String(v||'')]));
    const now = Math.floor(Date.now()/1000);
    await dbRun(`INSERT INTO signup_leads (first_name,last_name,company,phone,email,street,city,zip,comment,created_at,updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                 payload.first_name, payload.last_name, payload.company, payload.phone, payload.email, payload.street, payload.city, payload.zip, payload.comment, now, now);
    try{ if (env.WA_ADMIN_MSISDN) await waSendText(env, env.WA_ADMIN_MSISDN, `New signup: ${payload.first_name} ${payload.last_name} ${payload.phone}`); }catch(e){}
    return html("<p>Thanks! We will contact you.</p>");
  }
  return new Response("Not found", { status:404 });
}
