import { Router } from "./router.js";
import { handleAuth, getUserFromCookie, redirectLogin } from "./lib/auth.js";
import { handlePublic } from "./routes/public.js";
import { handleAdmin } from "./routes/admin.js";
import { handleAgent } from "./routes/agent.js";

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

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const host = url.hostname;
    const db = makeDbHelpers(env);

    // Auth routes shared across hosts
    if (url.pathname.startsWith("/auth/") || url.pathname === "/auth") {
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
