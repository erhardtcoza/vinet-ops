
import { json } from "../lib/http.js";
import { splynxLeadSync } from "../lib/ext.js";
export async function handleSplynx(req, env, { dbAll, dbRun }){
  const url = new URL(req.url);
  if (url.pathname === "/api/admin/leads/sync" && req.method === "POST"){
    const rows = await dbAll(`SELECT * FROM signup_leads ORDER BY id DESC LIMIT 1000`);
    let ok=0, fail=0;
    for (const r of rows){
      const res = await splynxLeadSync(env, r);
      if (res.ok) ok++; else fail++;
      await dbRun(`INSERT INTO audit_logs (event,meta,created_at) VALUES (?,?,?)`, 'lead.sync', JSON.stringify(res), Math.floor(Date.now()/1000));
    }
    return json({ ok, fail });
  }
  return new Response("Not found", { status:404 });
}
