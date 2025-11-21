import { redirect, json } from "./http.js";
import { signJWT, verifyJWT } from "./jwt.js";
import { sendOtpWA } from "./ext.js";

const COOKIE_NAME = "vops_jwt";

export async function getUserFromCookie(req, env, { dbGetUser }) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(/vops_jwt=([^;]+)/);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  const payload = await verifyJWT(token, env.SSO_SECRET);
  if (!payload) return null;
  const user = await dbGetUser(payload.sub);
  if (!user || !user.active) return null;
  return { ...payload, email: user.email, name: user.name, role: user.role };
}

export function redirectLogin(env) {
  return redirect("/auth/login");
}

export async function handleAuth(req, env, { dbAll }) {
  const url = new URL(req.url);

  if (url.pathname === "/auth/logout") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: "/auth/login",
        "Set-Cookie": `${COOKIE_NAME}=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Domain=${env.COOKIE_DOMAIN}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  if (url.pathname === "/auth/login" && req.method === "GET") {
    return new Response(`<!doctype html><meta charset="utf-8"><title>Sign in · Vinet</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <body style="font-family:system-ui;background:#f7f7f8;margin:0;">
      <div style="max-width:400px;margin:40px auto;padding:16px;">
        <h2>Vinet staff login</h2>
        <form method="post" action="/auth/login" style="display:flex;flex-direction:column;gap:8px;">
          <input name="email" placeholder="Email" style="padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;">
          <button style="background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;">Send OTP</button>
        </form>
      </div></body>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (url.pathname === "/auth/login" && req.method === "POST") {
    const form = await req.formData();
    const email = String(form.get("email") || "").toLowerCase().trim();
    if (!email) return json({ ok: false, error: "email required" }, 400);

    const rows = await dbAll(
      `SELECT id,email,name,wa_number FROM users WHERE email=? AND active=1 LIMIT 1`,
      email,
    );
    const user = rows[0];
    if (!user || !user.wa_number) {
      return json({ ok: false, error: "user not found or missing WA" }, 400);
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = Math.floor(Date.now() / 1000);
    await env.AUTH.put(
      `otp:${user.id}:${code}`,
      JSON.stringify({ user_id: user.id }),
      { expiration: now + 10 * 60 },
    );
    await sendOtpWA(env, user.wa_number, code);

    return new Response(`<!doctype html><meta charset="utf-8"><title>Enter code</title>
      <meta name="viewport" content="width=device-width,initial-scale=1">
      <body style="font-family:system-ui;background:#f7f7f8;margin:0;">
      <div style="max-width:400px;margin:40px auto;padding:16px;">
        <h2>Enter code</h2>
        <p>We sent a 6-digit code to your WhatsApp.</p>
        <form method="post" action="/auth/verify" style="display:flex;flex-direction:column;gap:8px;">
          <input type="hidden" name="uid" value="${user.id}">
          <input name="code" placeholder="6-digit code" style="padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;">
          <button style="background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px;cursor:pointer;">Verify</button>
        </form>
      </div></body>`, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  if (url.pathname === "/auth/verify" && req.method === "POST") {
    const form = await req.formData();
    const uid = parseInt(String(form.get("uid") || "0"), 10) || 0;
    const code = String(form.get("code") || "").trim();
    const val = await env.AUTH.get(`otp:${uid}:${code}`);
    if (!val) {
      return new Response("Invalid or expired code", { status: 400 });
    }

    const rows = await dbAll(
      `SELECT id,email,name,role FROM users WHERE id=? AND active=1 LIMIT 1`,
      uid,
    );
    const user = rows[0];
    if (!user) return new Response("User not found", { status: 400 });

    const token = await signJWT(
      { sub: user.id, email: user.email, role: user.role },
      env.SSO_SECRET,
      8 * 3600,
    );

    return new Response(null, {
      status: 302,
      headers: {
        Location: "https://dash.vinet.co.za/",
        "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Domain=${env.COOKIE_DOMAIN}; HttpOnly; Secure; SameSite=Lax`,
      },
    });
  }

  return new Response("Not found", { status: 404 });
}
