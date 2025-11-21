
export async function splynxFetch(env, path, init={}){
  const url = `${env.SPLYNX_URL}${path}`;
  const headers = { Authorization: env.AUTH_HEADER, "Content-Type":"application/json", ...(init.headers||{}) };
  const res = await fetch(url, { ...init, headers });
  let j = null; try{ j = await res.json(); }catch{}
  return { ok: res.ok, status: res.status, json: j };
}
export async function splynxTariffsImport(env){
  for (const p of ["/api/2.0/admin/finance/tariffs", "/api/2.0/admin/finance/internet/tariffs", "/api/2.0/admin/finance/services/tariffs"]){
    const r = await splynxFetch(env, p);
    if (r.ok && Array.isArray(r.json)) return r.json;
  }
  return [];
}
export async function splynxLeadSync(env, lead){
  const all = await splynxFetch(env, `/api/2.0/admin/crm/leads`);
  const arr = Array.isArray(all.json) ? all.json : [];
  const fullname = `${lead.first_name||''} ${lead.last_name||''}`.trim();
  let match = arr.find(l => (l.email||'').toLowerCase() === (lead.email||'').toLowerCase())
           || arr.find(l => (l.phone||'').replace(/\D+/g,'') === (lead.phone||'').replace(/\D+/g,''))
           || arr.find(l => (l.name||'').trim().toLowerCase() === fullname.toLowerCase());
  if (!match) match = arr.find(l => (l.name||'').toLowerCase() === 're-use');
  const payload = { name: fullname || lead.company || 'New lead', email: lead.email||null, phone: lead.phone||null,
                    city: lead.city||null, street_1: lead.street||null, zip_code: lead.zip||null, comment: lead.comment||'via vinet-ops' };
  if (match){
    const upd = await splynxFetch(env, `/api/2.0/admin/crm/leads/${match.id}`, { method:"PATCH", body: JSON.stringify(payload) });
    return { action:"update", ok: upd.ok, status: upd.status, id: match.id };
  } else {
    const crt = await splynxFetch(env, `/api/2.0/admin/crm/leads`, { method:"POST", body: JSON.stringify(payload) });
    const id = crt.json?.id || null;
    return { action:"create", ok: crt.ok, status: crt.status, id };
  }
}
