
import { html } from "../lib/http.js";
import { signJWT, verifyJWT } from "../lib/auth.js";
import { waSendTemplate } from "../lib/wa.js";

function loginHTML(msg=""){
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Vinet · Sign in</title>
  <style>body{font:14px system-ui;background:#f7f7f8;color:#0b1320;margin:0}.wrap{max-width:480px;margin:24px auto;padding:0 16px}
  .card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06)} .btn{background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px}
  input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;width:100%;margin:8px 0}</style></head><body><div class="wrap">
    <div class="card">
      <h3 style="margin-top:0">Sign in</h3>
      ${msg? `<div style="color:#b91c1c">${msg}</div>` : ''}
      <form method="post" action="/auth/login">
        <input name="email" type="email" placeholder="Work email" required>
        <button class="btn">Send OTP</button>
      </form>
    </div>
  </div></body></html>`;
}
function verifyHTML(email, msg=""){
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Vinet · Verify</title>
  <style>body{font:14px system-ui;background:#f7f7f8;color:#0b1320;margin:0}.wrap{max-width:480px;margin:24px auto;padding:0 16px}
  .card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06)} .btn{background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px}
  input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;width:100%;margin:8px 0}</style></head><body><div class="wrap">
    <div class="card">
      <h3 style="margin-top:0">Enter code</h3>
      <div class="muted">We sent a WhatsApp code to your registered number.</div>
      ${msg? `<div style="color:#b91c1c">${msg}</div>` : ''}
      <form method="post" action="/auth/verify">
        <input type="hidden" name="email" value="${email}">
        <input name="code" placeholder="6-digit code" required>
        <button class="btn">Verify</button>
      </form>
    </div>
  </div></body></html>`;
}
export async function handleAuth(req, env, { dbAll }){
  const url = new URL(req.url);
  if (url.pathname === "/auth/login" && req.method === "GET") return html(loginHTML());
  if (url.pathname === "/auth/login" && req.method === "POST"){
    const f = await req.formData();
    const email = String(f.get("email")||"").toLowerCase().trim();
    if (!email) return html(loginHTML("Email required"));
    const u = (await dbAll(`SELECT * FROM users WHERE email=? AND active=1`, email))[0];
    if (!u || !u.wa_number) return html(loginHTML("User not found or missing WhatsApp number"));
    const code = (""+Math.floor(100000 + Math.random()*900000));
    await env.AUTH.put(`otp:${u.wa_number}`, JSON.stringify({ code, email }), { expirationTtl: 600 });
    try{ await waSendTemplate(env, u.wa_number, env.WA_TEMPLATE_OTP || "vinet_otp", "en_US", [ { type:"body", parameters:[ { type:"text", text: code } ] } ]); }catch(e){}
    return html(verifyHTML(email));
  }
  if (url.pathname === "/auth/verify" && req.method === "POST"){
    const f = await req.formData();
    const email = String(f.get("email")||"").toLowerCase().trim();
    const code = String(f.get("code")||"").trim();
    const u = (await dbAll(`SELECT * FROM users WHERE email=? AND active=1`, email))[0];
    if (!u || !u.wa_number) return html(loginHTML("User not found"));
    const got = await env.AUTH.get(`otp:${u.wa_number}`, "json");
    if (!got || got.code !== code) return html(verifyHTML(email, "Invalid or expired code"));
    const token = await signJWT({ sub: u.id, email: u.email, name: u.name, role: u.role }, env.SSO_SECRET);
    const h = new Headers({ "Location": "/" });
    h.append("Set-Cookie", `vops_jwt=${token}; Domain=${env.COOKIE_DOMAIN||""}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${7*24*3600}`);
    return new Response(null, { status:302, headers: h });
  }
  if (url.pathname === "/auth/logout"){
    const h = new Headers({ "Location": "/auth/login" });
    h.append("Set-Cookie", `vops_jwt=; Domain=${env.COOKIE_DOMAIN||""}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return new Response(null, { status:302, headers: h });
  }
  return new Response("Not found", { status:404 });
}
