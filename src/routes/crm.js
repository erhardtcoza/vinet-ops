
import { html } from "../utils.js";

export async function handleCRM(req, env, { dbAll }){
  const url = new URL(req.url);
  if (url.pathname === "/" || url.pathname === "/index.html"){
    const rows = await dbAll(`SELECT id, first_name, last_name, phone, email, city, created_at FROM signup_leads ORDER BY id DESC LIMIT 200`);
    const rowsHtml = rows.map(r=>`<tr><td>${r.id}</td><td>${(r.first_name||'')+' '+(r.last_name||'')}</td><td>${r.phone||''}</td><td>${r.email||''}</td><td>${r.city||''}</td><td>${r.created_at||''}</td></tr>`).join("");
    return html(`<!doctype html><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"><title>CRM</title><style>body{font-family:system-ui;margin:0;padding:16px} table{border-collapse:collapse;width:100%} td,th{border-bottom:1px solid #eee;padding:6px;text-align:left}</style><h2>Leads</h2><a href="/crm.csv">Export CSV</a><table><tr><th>#</th><th>Name</th><th>Phone</th><th>Email</th><th>City</th><th>Created</th></tr>${rowsHtml}</table>`);
  }
  if (url.pathname === "/crm.csv"){
    const rows = await dbAll(`SELECT id, first_name, last_name, phone, email, city, created_at FROM signup_leads ORDER BY id DESC`);
    const header = "id,first_name,last_name,phone,email,city,created_at\n";
    const csv = header + rows.map(r=>[r.id,r.first_name,r.last_name,r.phone,r.email,r.city,r.created_at].map(x=>`"${String(x||"").replace(/"/g,'""')}"`).join(",")).join("\n");
    return new Response(csv, { headers: { "content-type":"text/csv; charset=utf-8" }});
  }
  return new Response("Not found", { status: 404 });
}
