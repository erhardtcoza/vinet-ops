import { html, json, redirect } from "../lib/http.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { splynxLeadSync } from "../lib/ext.js";

function getCookie(req, name) {
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}

function splashHTML(env) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Vinet · Loading</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;font-family:system-ui;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;}
    .box{text-align:center}
    .bar{height:4px;width:200px;background:#333;border-radius:999px;margin:16px auto;overflow:hidden}
    .bar-inner{height:100%;width:40%;background:#E10600;animation:move 1.2s infinite}
    @keyframes move{0%{margin-left:-40%}100%{margin-left:100%}}
    button{background:#E10600;color:#fff;border:none;border-radius:999px;padding:10px 18px;margin:8px;cursor:pointer}
  </style>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
  <div class="box">
    <img src="https://static.vinet.co.za/logo.jpeg" alt="Vinet" style="max-width:180px;border-radius:12px;"><br>
    <div class="bar"><div class="bar-inner"></div></div>
    <form id="f" method="post" action="/splash">
      <div class="cf-challenge" data-sitekey="${env.TURNSTILE_SITE_KEY}" data-callback="onTurnstileDone"></div>
      <input type="hidden" name="cf-turnstile-response" id="cf-token">
      <div style="margin-top:18px;">
        <button name="mode" value="install">Install app</button>
        <button name="mode" value="browser">Use in browser</button>
      </div>
    </form>
    <script>
      function onTurnstileDone(token){document.getElementById('cf-token').value = token;}
      window.onTurnstileDone = onTurnstileDone;
    </script>
  </div>
</body>
</html>`;
}

function landingHTML() {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Vinet · Get Connected</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;font-family:system-ui;background:#f7f7f8;color:#0b1320;}
    .wrap{max-width:480px;margin:40px auto;padding:0 16px;text-align:center;}
    .card{background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.06);}
    .btn{display:block;width:100%;background:#E10600;color:#fff;border:none;border-radius:999px;padding:10px 14px;margin-top:10px;font-size:15px;cursor:pointer;}
    a.btn-secondary{display:block;width:100%;background:#fff;color:#E10600;border:1px solid #E10600;border-radius:999px;padding:10px 14px;margin-top:10px;font-size:15px;text-decoration:none;}
  </style>
</head>
<body>
  <div class="wrap">
    <div style="margin-bottom:16px;">
      <img src="https://static.vinet.co.za/logo.jpeg" alt="Vinet" style="max-width:180px;border-radius:12px;">
    </div>
    <div class="card">
      <h2 style="margin-top:0;">Fast, Reliable Internet</h2>
      <p>Get connected with Vinet Internet Solutions.</p>
      <form method="get" action="/signup">
        <button class="btn" type="submit">I am new / interested in your service</button>
      </form>
      <a class="btn-secondary" href="https://splynx.vinet.co.za/" target="_blank">I am already connected</a>
    </div>
  </div>
</body>
</html>`;
}

function signupHTML(tariffs = []) {
  const tariffOptions = tariffs
    .map((t) => `<label style="display:block;"><input type="checkbox" name="tariffs" value="${t.code}"> ${t.name} (R${t.price})</label>`)
    .join("") || "<p>No tariffs synced yet.</p>";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Vinet · Self signup</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;font-family:system-ui;background:#f7f7f8;color:#0b1320;}
    .wrap{max-width:520px;margin:24px auto;padding:0 16px;}
    .card{background:#fff;border-radius:18px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.06);}
    input,textarea{width:100%;padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;font:inherit;}
    textarea{min-height:70px;resize:vertical;}
    .row{display:flex;gap:8px;flex-wrap:wrap;}
    .row > div{flex:1;min-width:0;}
    .btn{background:#E10600;color:#fff;border:none;border-radius:999px;padding:10px 14px;margin-top:10px;font-size:15px;cursor:pointer;width:100%;}
    label{font-size:13px;}
  </style>
</head>
<body>
  <div class="wrap">
    <div style="margin-bottom:12px;text-align:center;">
      <img src="https://static.vinet.co.za/logo.jpeg" alt="Vinet" style="max-width:160px;border-radius:12px;">
    </div>
    <div class="card">
      <h2 style="margin-top:0;">Self signup</h2>
      <form method="post" action="/signup">
        <div class="row">
          <div><input name="first_name" placeholder="First name *" required></div>
          <div><input name="last_name" placeholder="Last name *" required></div>
        </div>
        <input name="company" placeholder="Company name (optional)" style="margin-top:8px;">
        <input name="phone" placeholder="Phone number *" required style="margin-top:8px;">
        <input name="email" placeholder="Email *" required style="margin-top:8px;">
        <input name="street" placeholder="Street *" required style="margin-top:8px;">
        <div class="row" style="margin-top:8px;">
          <div><input name="city" placeholder="City *" required></div>
          <div><input name="zip" placeholder="ZIP code *" required></div>
        </div>
        <textarea name="comment" placeholder="Tell us what you are looking for" style="margin-top:8px;"></textarea>
        <div style="margin-top:8px;">
          <p style="margin:4px 0;font-weight:600;">Interested in tariff(s)</p>
          ${tariffOptions}
        </div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-size:13px;">
          <input type="checkbox" name="accept" value="1" required>
          I agree with the Terms & Conditions
        </label>
        <button class="btn" type="submit">Submit</button>
      </form>
    </div>
  </div>
</body>
</html>`;
}

function signupThankYouHTML(splynxId) {
  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Thank you</title>
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui;background:#f7f7f8;margin:0;">
<div style="max-width:480px;margin:40px auto;padding:16px;background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(0,0,0,.06);">
  <h2>Thank you</h2>
  <p>We received your details and will contact you soon.</p>
  ${
    splynxId
      ? `<p>Your reference in our system: <strong>Lead #${splynxId}</strong></p>`
      : ""
  }
  <p>If you need help, contact us:<br>
     Phone: 021 007 0200<br>
     Email: sales@vinet.co.za</p>
</div>
</body></html>`;
}

export async function handlePublic(req, env, { dbAll, dbRun }) {
  const url = new URL(req.url);
  const path = url.pathname;

  // Turnstile gate
  const tsOk = getCookie(req, "vops_ts") === "1";
  if (!tsOk && path !== "/" && path !== "/splash") {
    return redirect("/");
  }

  if (path === "/" && req.method === "GET") {
    return html(splashHTML(env));
  }

  if (path === "/splash" && req.method === "POST") {
    const form = await req.formData();
    const token = String(form.get("cf-turnstile-response") || "");
    const mode = String(form.get("mode") || "browser");
    const res = await verifyTurnstile(env, token, req.headers.get("cf-connecting-ip"));
    if (!res.ok) {
      return new Response("Turnstile failed", { status: 400 });
    }
    const dest = "/landing";
    return new Response(null, {
      status: 302,
      headers: {
        Location: dest,
        "Set-Cookie": `vops_ts=1; Path=/; Domain=${env.COOKIE_DOMAIN}; Secure; SameSite=Lax`,
      },
    });
  }

  if (path === "/landing" && req.method === "GET") {
    return html(landingHTML());
  }

  if (path === "/signup" && req.method === "GET") {
    const tariffs = await dbAll(
      "SELECT code,name,price FROM tariffs ORDER BY price ASC",
    );
    return html(signupHTML(tariffs));
  }

  if (path === "/signup" && req.method === "POST") {
    const f = await req.formData();
    const first_name = String(f.get("first_name") || "").trim();
    const last_name = String(f.get("last_name") || "").trim();
    const company = String(f.get("company") || "").trim();
    const phone = String(f.get("phone") || "").trim();
    const email = String(f.get("email") || "").trim();
    const street = String(f.get("street") || "").trim();
    const city = String(f.get("city") || "").trim();
    const zip = String(f.get("zip") || "").trim();
    const comment = String(f.get("comment") || "").trim();
    const accept = f.get("accept");
    const tariffs = f.getAll("tariffs").map((v) => String(v));

    if (!first_name || !last_name || !phone || !email || !street || !city || !zip || !accept) {
      return json({ ok: false, error: "missing fields" }, 400);
    }

    const now = Math.floor(Date.now() / 1000);
    const lead = {
      first_name,
      last_name,
      company,
      phone,
      email,
      street,
      city,
      zip,
      comment,
      tariffs: tariffs.join(","),
    };

    const res = await dbRun(
      `INSERT INTO signup_leads
       (first_name,last_name,company,phone,email,street,city,zip,comment,tariffs,created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      first_name,
      last_name,
      company,
      phone,
      email,
      street,
      city,
      zip,
      comment,
      lead.tariffs,
      now,
    );

    let splynxId = null;
    try {
      const sync = await splynxLeadSync(env, lead);
      if (sync.ok && sync.id) {
        splynxId = sync.id;
        await dbRun(
          "UPDATE signup_leads SET splynx_lead_id=? WHERE rowid=?",
          splynxId,
          res.meta.last_row_id,
        );
      }
    } catch (_) {}

    return html(signupThankYouHTML(splynxId));
  }

  return new Response("Not found", { status: 404 });
}
