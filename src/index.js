import { Router } from "./router.js";
import { handleAuth, getUserFromCookie, redirectLogin } from "./lib/auth.js";
import { handlePublic } from "./routes/public.js";
import { handleAdmin } from "./routes/admin.js";
import { handleAgent } from "./routes/agent.js";
import { json, text } from "./lib/http.js";

function makeDbHelpers(env) {
  const dbAll = async (sql, ...params) => {
    const res = await env.DB.prepare(sql).bind(...params).all();
    return res.results || [];
  };
  const dbRun = async (sql, ...params) => {
    return await env.DB.prepare(sql).bind(...params).run();
  };
  const dbGetUser = async (id) => {
    const rows = await dbAll(
      "SELECT id,email,name,role,active FROM users WHERE id=?",
      id,
    );
    return rows[0] || null;
  };
  return { dbAll, dbRun, dbGetUser };
}

// Shared PWA manifest (works for all 3 hosts)
function manifestForHost(host) {
  const name = "Vinet Ops";
  const short_name =
    host === "agent.vinet.co.za"
      ? "Vinet Agent"
      : host === "dash.vinet.co.za"
        ? "Vinet Dash"
        : "Vinet";
  const start_url =
    host === "agent.vinet.co.za"
      ? "/"
      : host === "dash.vinet.co.za"
        ? "/"
        : "/landing";

  return {
    name,
    short_name,
    start_url,
    display: "standalone",
    background_color: "#000000",
    theme_color: "#E10600",
    icons: [
      {
        src: "https://static.vinet.co.za/icons/vinet-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "https://static.vinet.co.za/icons/vinet-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}

const SW_JS = `// Simple Vinet Ops service worker
const CACHE_NAME = 'vinet-ops-v1';
const CORE_URLS = ['/', '/landing', '/signup'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_URLS)).catch(() => null)
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached || Response.error());
    })
  );
});`;

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const host = url.hostname;
    const path = url.pathname;
    const db = makeDbHelpers(env);

    // PWA: manifest (JSON) – shared for all hosts
    if (path === "/manifest.webmanifest") {
      const mf = manifestForHost(host);
      return new Response(JSON.stringify(mf), {
        status: 200,
        headers: { "content-type": "application/manifest+json; charset=utf-8" },
      });
    }

    // PWA: service worker JS – shared for all hosts
    if (path === "/sw.js") {
      return new Response(SW_JS, {
        status: 200,
        headers: { "content-type": "application/javascript; charset=utf-8" },
      });
    }

    // Auth routes shared across hosts
    if (path.startsWith("/auth/") || path === "/auth") {
      return handleAuth(req, env, db);
    }

    // Who is logged in (for dash / agent)
    const me = await getUserFromCookie(req, env, { dbGetUser: db.dbGetUser });

    // new.vinet.co.za : splash + landing + signup
    if (host === "new.vinet.co.za") {
      return handlePublic(req, env, { ...db });
    }

    // dash.vinet.co.za : admin dashboard
    if (host === "dash.vinet.co.za") {
      if (!me) return redirectLogin(env);
      return handleAdmin(req, env, { ...db, me });
    }

    // agent.vinet.co.za : field app
    if (host === "agent.vinet.co.za") {
      if (!me) return redirectLogin(env);
      return handleAgent(req, env, { ...db, me });
    }

    return new Response("Not found", { status: 404 });
  },
};
