
import { html, json } from "../lib/http.js";
import { splynxTariffsImport } from "../lib/ext.js";

function adminHTML(){
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Vinet · Admin</title>
  <link rel="icon" href="/favicon.ico"/>
  <style>body{font:14px system-ui;background:#f7f7f8;color:#0b1320;margin:0} .wrap{max-width:980px;margin:24px auto;padding:0 16px}
  .card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06);margin-bottom:12px} .btn{background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px}
  input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px} .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}</style>
  </head><body><div class="wrap">
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:center"><h3 style="margin-top:0">Tariffs</h3><a class="btn" href="/auth/logout">Logout</a></div>
      <div class="row"><button class="btn" id="import">Import from Splynx</button><span id="tstat"></span></div>
      <div id="tlist" style="margin-top:8px"></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Users</h3>
      <form id="usr"><input name="email" placeholder="email"><input name="name" placeholder="name"><select name="role"><option>admin</option><option>agent</option></select><input name="wa_number" placeholder="wa number"><input name="splynx_admin_id" placeholder="splynx admin id"><button class="btn">Save</button></form>
      <div id="ulist" class="muted"></div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Coverage Check</h3>
      <div class="row"><input id="covLat" placeholder="lat" style="width:160px"><input id="covLng" placeholder="lng" style="width:160px"><button id="covBtn" class="btn">Check</button></div>
      <div id="covRes" class="muted" style="margin-top:8px">—</div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Live View</h3>
      <p class="muted">Last pings & per-user timeline</p>
      <div id="map" style="height:420px;border-radius:12px;margin-bottom:8px"></div>
      <div id="timeline" class="muted">—</div>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Audit</h3>
      <div class="row"><a href="/api/admin/audit.csv" class="btn" target="_blank">Download CSV</a></div>
      <div id="alist" class="muted" style="margin-top:8px">—</div>
    </div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script>
    async function loadTariffs(){ const r = await fetch('/api/admin/tariffs').then(r=>r.json()); document.getElementById('tlist').innerHTML=(r.rows||[]).map(t=>t.code+' — R'+t.price).join('<br>'); }
    document.getElementById('import').onclick = async ()=>{ document.getElementById('tstat').textContent='...'; const r = await fetch('/api/admin/tariffs/import',{method:'POST'}).then(r=>r.json()); document.getElementById('tstat').textContent='Imported '+(r.imported||0); loadTariffs(); };
    document.getElementById('usr').onsubmit = async (e)=>{ e.preventDefault(); const f = new FormData(e.target); const r = await fetch('/api/admin/users/save',{method:'POST', body:f}).then(r=>r.json()); loadUsers(); };
    async function loadUsers(){ const r = await fetch('/api/admin/users').then(r=>r.json()); document.getElementById('ulist').innerHTML=(r.rows||[]).map(u=>u.email+' · '+u.role).join('<br>'); }
    document.getElementById('covBtn').onclick = async ()=>{ const lat = (document.getElementById('covLat').value||'').trim(); const lng = (document.getElementById('covLng').value||'').trim(); const r = await fetch('/api/coverage/check?lat='+lat+'&lng='+lng).then(r=>r.json()); document.getElementById('covRes').textContent = r.ok ? ('Matches: '+(r.matches||[]).join(', ') + (r.recommendation? (' | Recommend: '+r.recommendation.code+' @ R'+r.recommendation.price):'')) : 'Error'; };
    async function loadAudit(){ const a = await fetch('/api/admin/audit').then(r=>r.json()); document.getElementById('alist').innerHTML=(a.rows||[]).slice(0,20).map(r=>('['+new Date(r.created_at*1000).toLocaleString()+'] '+r.event)).join('<br>'); }
    loadTariffs(); loadUsers(); loadAudit();

    const m = L.map('map').setView([-33.84, 18.84], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(m);
    let markers = [];
    async function loadPings(){
      const r = await fetch('/api/admin/time').then(r=>r.json()).catch(()=>({rows:[] }));
      markers.forEach(mm=>m.removeLayer(mm)); markers=[];
      const byUser = {};
      r.rows.forEach(p=>{ if (!byUser[p.user_id||0]) byUser[p.user_id||0]=[]; byUser[p.user_id||0].push(p); });
      const parts=[];
      for (const uid in byUser){
        const arr = byUser[uid].sort((a,b)=>b.created_at-a.created_at);
        const last = arr[0];
        if (last && last.lat && last.lng){ markers.push(L.marker([last.lat,last.lng]).addTo(m).bindPopup((last.name||('User '+uid))+' · '+new Date(last.created_at*1000).toLocaleString()+' · '+(last.status||''))); }
        parts.push('<strong>'+(last?.name||('User '+uid))+'</strong><br>'+arr.slice(0,10).map(p=>('['+new Date(p.created_at*1000).toLocaleTimeString()+'] '+(p.status||'')+(p.task?(' · '+p.task):'')+(p.lat?(' · '+p.lat.toFixed(4)+','+p.lng.toFixed(4)):'') )).join('<br>'));
      }
      document.getElementById('timeline').innerHTML = parts.join('<hr>');
    }
    loadPings(); setInterval(loadPings, 60000);
  </script></body></html>`;
}

export async function handleAdmin(req, env, { dbAll, dbRun }){
  const url = new URL(req.url);
  if (url.pathname === "/" || url.pathname === "/admin") return html(adminHTML());
  if (url.pathname === "/api/admin/tariffs" && req.method === "GET"){
    const rows = await dbAll(`SELECT code,name,price FROM tariffs ORDER BY price ASC`);
    return json({ rows });
  }
  if (url.pathname === "/api/admin/tariffs/import" && req.method === "POST"){
    const list = await (await import("../lib/ext.js")).splynxTariffsImport(env);
    const now = Math.floor(Date.now()/1000);
    let ins=0; for (const t of list){ const code=t.code||t.name||('T'+t.id), name=t.name||code, price=Number(t.price||t.monthly_price||0); await dbRun(`INSERT OR REPLACE INTO tariffs (id, code, name, price, updated_at) VALUES (coalesce((SELECT id FROM tariffs WHERE code=?),NULL),?,?,?,?)`, code, code, name, price, now); ins++; }
    await dbRun(`INSERT INTO audit_logs (event,meta,created_at) VALUES (?,?,?)`, 'tariffs.import', JSON.stringify({count:ins}), now);
    return json({ imported: ins });
  }
  if (url.pathname === "/api/admin/users" && req.method === "GET"){
    const rows = await dbAll(`SELECT id,email,name,role,wa_number,splynx_admin_id,active FROM users ORDER BY id DESC`);
    return json({ rows });
  }
  if (url.pathname === "/api/admin/users/save" && req.method === "POST"){
    const f = await req.formData();
    const email=String(f.get('email')||''), name=String(f.get('name')||''), role=String(f.get('role')||'agent');
    const wa=String(f.get('wa_number')||''), sid = parseInt(String(f.get('splynx_admin_id')||'0'))||null;
    const now = Math.floor(Date.now()/1000);
    await dbRun(`INSERT OR IGNORE INTO users (email,name,role,wa_number,splynx_admin_id,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)`, email,name,role,wa,sid,1,now,now);
    await dbRun(`UPDATE users SET name=?, role=?, wa_number=?, splynx_admin_id=?, updated_at=? WHERE email=?`, name,role,wa,sid,now,email);
    await dbRun(`INSERT INTO audit_logs (event,meta,created_at) VALUES (?,?,?)`, 'users.save', JSON.stringify({ email, role }), now);
    return json({ ok:true });
  }
  if (url.pathname === "/api/admin/audit" && req.method === "GET"){
    const rows = await dbAll(`SELECT id,user_id,event,meta,created_at FROM audit_logs ORDER BY id DESC LIMIT 500`);
    return json({ rows });
  }
  if (url.pathname === "/api/admin/audit.csv" && req.method === "GET"){
    const rows = await dbAll(`SELECT id,user_id,event,meta,created_at FROM audit_logs ORDER BY id DESC`);
    const header="id,user_id,event,meta,created_at\n";
    const csv = header + rows.map(r=>[r.id,r.user_id,r.event,r.meta,r.created_at].map(x=>`"${String(x||'').replace(/"/g,'""')}"`).join(',')).join('\n');
    return new Response(csv, { headers:{ "content-type":"text/csv; charset=utf-8" }});
  }
  if (url.pathname === "/api/admin/time" && req.method === "GET"){
    const rows = await dbAll(`
      SELECT tp.id, tp.user_id, tp.lat, tp.lng, tp.status, tp.task, tp.created_at,
             u.name, u.email
      FROM time_pings tp LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.created_at >= (strftime('%s','now') - 7*24*3600)
      ORDER BY tp.created_at DESC
      LIMIT 2000
    `);
    return json({ rows });
  }
  return new Response("Not found", { status:404 });
}
