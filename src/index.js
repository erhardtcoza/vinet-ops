
import { preflight } from "./lib/cors.js";
import { rateLimit } from "./lib/rate.js";
import { handleNew } from "./routes/new.js";
import { handleCoverage } from "./routes/coverage.js";
import { handleCoverageCheck } from "./routes/coverage_check.js";
import { handleAdmin } from "./routes/admin.js";
import { handleAgent } from "./routes/agent.js";
import { handleSplynx } from "./routes/splynx.js";
import { handleAuth } from "./routes/auth.js";
import { verifyJWT } from "./lib/auth.js";
import { waSendText } from "./lib/wa.js";
import { splynxTariffsImport } from "./lib/ext.js";

async function dbAll(env, sql, ...args){ return (await env.DB.prepare(sql).bind(...args).all()).results || []; }
async function dbOne(env, sql, ...args){ return (await env.DB.prepare(sql).bind(...args).first()) || null; }
async function dbRun(env, sql, ...args){ return await env.DB.prepare(sql).bind(...args).run(); }

const ctx = (env)=>({ dbAll:(...a)=>dbAll(env,...a), dbOne:(...a)=>dbOne(env,...a), dbRun:(...a)=>dbRun(env,...a) });

async function getUserFromCookie(req, env){
  const cookie = req.headers.get("Cookie")||"";
  const m = /(?:^|; )vops_jwt=([^;]+)/.exec(cookie);
  if (!m) return null;
  const token = decodeURIComponent(m[1]);
  return await verifyJWT(token, env.SSO_SECRET);
}
function redirectLogin(env){
  const h = new Headers({ "Location": "/auth/login" });
  h.append("Set-Cookie", `vops_jwt=; Domain=${env.COOKIE_DOMAIN||""}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return new Response(null, { status:302, headers: h });
}


export default {
  async fetch(req, env){
    if (req.method === "OPTIONS") return preflight("*");
    const url = new URL(req.url);
    const { hostname, pathname } = url;
    const ip = req.headers.get('CF-Connecting-IP')||'0.0.0.0';
    if (pathname.startsWith('/api/')){
      const ok = await rateLimit(env, `${ip}:${pathname}`, { limit: 180, window: 60 });
      if (!ok) return new Response("Rate limit", { status:429 });
    }
    if (url.pathname.startsWith('/auth/')) return handleAuth(req, env, ctx(env));
    if (hostname.startsWith("new.")){
      if (pathname.startsWith("/coverage") || pathname.startsWith("/api/coverage/kml")) return handleCoverage(req, env);
      if (pathname.startsWith("/api/coverage/check")) return handleCoverageCheck(req, env, ctx(env));
      return handleNew(req, env, ctx(env));
    }
    if (hostname.startsWith("dash.")) { const me = await getUserFromCookie(req, env); if (!me) return redirectLogin(env); return handleAdmin(req, env, ctx(env)); }
    if (hostname.startsWith("agent.")) { const me = await getUserFromCookie(req, env); if (!me) return redirectLogin(env); return handleAgent(req, env, ctx(env)); }
    if (pathname.startsWith("/api/admin/leads/")) return handleSplynx(req, env, ctx(env));
    // default: show landing (for single route setups)
    return handleNew(req, env, ctx(env));
  }
}

export async function scheduled(event, env, _ctx){
  try{
    const list = await splynxTariffsImport(env);
    const now = Math.floor(Date.now()/1000);
    for (const t of list){
      const code = t.code || t.name || `T${t.id}`;
      const name = t.name || code;
      const price = Number(t.price || t.monthly_price || 0);
      await env.DB.prepare(`INSERT OR REPLACE INTO tariffs (id, code, name, price, updated_at)
        VALUES (coalesce((SELECT id FROM tariffs WHERE code=?),NULL),?,?,?,?)`).bind(code, code, name, price, now).run();
    }
    await env.DB.prepare(`INSERT INTO audit_logs (event,meta,created_at) VALUES (?,?,?)`).bind('tariffs.cron', JSON.stringify({ imported: list?.length||0 }), now).run();
  }catch(e){
    await env.DB.prepare(`INSERT INTO audit_logs (event,meta,created_at) VALUES (?,?,?)`).bind('tariffs.cron.error', JSON.stringify({ error: String(e) }), Math.floor(Date.now()/1000)).run();
  }
}
