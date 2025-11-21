import { html, json } from "../lib/http.js";
import { splynxCreateStockMove } from "../lib/ext.js";

function agentHTML(me) {
  const name = me?.name || me?.email || "Agent";
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Vinet · Field app</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{margin:0;font-family:system-ui;background:#f7f7f8;color:#0b1320;}
    .wrap{max-width:520px;margin:0 auto;padding:8px 12px 40px;}
    .card{background:#fff;border-radius:16px;padding:12px 14px;box-shadow:0 1px 2px rgba(0,0,0,.06);margin-bottom:10px;}
    .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
    .tabs{display:flex;gap:6px;margin-bottom:8px;}
    .tab{flex:1;text-align:center;padding:8px;border-radius:999px;border:1px solid #e5e7eb;cursor:pointer;font-size:13px;}
    .tab.active{background:#E10600;color:#fff;border-color:#E10600;}
    .btn{background:#E10600;color:#fff;border:none;border-radius:999px;padding:8px 12px;font-size:14px;cursor:pointer;}
    input,textarea{width:100%;padding:8px 10px;border-radius:10px;border:1px solid #e5e7eb;font:inherit;}
    textarea{min-height:60px;resize:vertical;}
    .muted{color:#6b7280;font-size:12px;}
    .task{border:1px solid #e5e7eb;border-radius:12px;padding:8px 10px;margin-bottom:6px;}
    .task h4{margin:0 0 4px 0;font-size:14px;}
    .task small{font-size:11px;color:#6b7280;}
    .status-pill{display:inline-block;padding:2px 6px;border-radius:999px;font-size:11px;margin-top:4px;}
    .status-open{background:#fee2e2;color:#b91c1c;}
    .status-in_progress{background:#fef3c7;color:#92400e;}
    .status-done{background:#dcfce7;color:#166534;}
    .status-cancelled{background:#e5e7eb;color:#374151;}
    .row{display:flex;gap:6px;flex-wrap:wrap;}
    .row > div{flex:1;min-width:0;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="top">
      <div>
        <div style="font-size:13px;" class="muted">Logged in as</div>
        <div style="font-weight:600;">${name}</div>
      </div>
      <img src="https://static.vinet.co.za/logo.jpeg" style="height:32px;border-radius:8px;">
    </div>
    <div class="tabs">
      <div class="tab active" data-tab="tasks">Tasks</div>
      <div class="tab" data-tab="stock">Stock</div>
      <div class="tab" data-tab="status">Status</div>
    </div>
  </div>

  <div class="card" id="tab-tasks">
    <div class="top" style="margin-bottom:6px;">
      <h3 style="margin:0;font-size:15px;">My tasks</h3>
      <button class="btn" id="reloadTasks">Reload</button>
    </div>
    <div id="tasksList" class="muted">Loading…</div>
  </div>

  <div class="card" id="tab-stock" style="display:none;">
    <h3 style="margin-top:0;font-size:15px;">Quick stock assign</h3>
    <form id="stockForm">
      <input name="barcode" placeholder="Barcode / scan result" required>
      <textarea name="note" placeholder="Note (where used / which client)"></textarea>
      <div style="margin-top:6px;">
        <input type="file" name="photo" accept="image/*" capture="environment">
      </div>
      <div style="margin-top:8px;">
        <button class="btn" type="submit">Save & push to Splynx</button>
      </div>
      <div id="stockMsg" class="muted" style="margin-top:4px;"></div>
    </form>
  </div>

  <div class="card" id="tab-status" style="display:none;">
    <h3 style="margin-top:0;font-size:15px;">Status / time ping</h3>
    <form id="pingForm">
      <input name="status" placeholder="Short status (e.g. On site, Travelling)" required>
      <input name="task" placeholder="Task ref (optional)">
      <div style="margin-top:8px;">
        <button class="btn" type="submit">Send ping</button>
      </div>
      <div class="muted" style="margin-top:4px;">Location is optional; turn on location in browser for richer data.</div>
    </form>
    <div id="pingMsg" class="muted" style="margin-top:4px;"></div>
  </div>
</div>
<script>
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(t => t.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    const name = t.dataset.tab;
    document.getElementById('tab-tasks').style.display = name==='tasks'?'block':'none';
    document.getElementById('tab-stock').style.display = name==='stock'?'block':'none';
    document.getElementById('tab-status').style.display = name==='status'?'block':'none';
  }));

  function statusPill(s){
    const cls = s==='open'?'status-open':(s==='in_progress'?'status-in_progress':(s==='done'?'status-done':'status-cancelled'));
    return '<span class="status-pill '+cls+'">'+s.replace('_',' ')+'</span>';
  }

  async function loadTasks(){
    const r = await fetch('/api/agent/tasks').then(r=>r.json()).catch(()=>({rows:[]}));
    const rows = r.rows || [];
    const root = document.getElementById('tasksList');
    if (!rows.length){ root.textContent = 'No tasks assigned.'; return; }
    root.innerHTML = rows.map(t =>
      '<div class="task">'+
        '<h4>#'+t.id+' · '+t.title+'</h4>'+
        (t.description?('<div>'+t.description+'</div>'):'')+
        '<div><small>Priority: '+(t.priority||'')+'</small></div>'+
        (t.due_at ? ('<div><small>Due: '+new Date(t.due_at*1000).toLocaleString()+'</small></div>') : '')+
        statusPill(t.status||'open')+
        '<div style="margin-top:6px;">'+
          '<button data-id="'+t.id+'" data-status="open" class="btn btn-sm" style="padding:4px 8px;font-size:11px;margin-right:4px;">Open</button>'+
          '<button data-id="'+t.id+'" data-status="in_progress" class="btn btn-sm" style="padding:4px 8px;font-size:11px;margin-right:4px;">In progress</button>'+
          '<button data-id="'+t.id+'" data-status="done" class="btn btn-sm" style="padding:4px 8px;font-size:11px;">Done</button>'+
        '</div>'+
      '</div>'
    ).join('');
    root.querySelectorAll('button[data-status]').forEach(btn=>{
      btn.addEventListener('click', async ()=>{
        const id = btn.dataset.id;
        const st = btn.dataset.status;
        await fetch('/api/agent/tasks/update',{method:'POST', body:new URLSearchParams({id, status:st})});
        loadTasks();
      });
    });
  }
  document.getElementById('reloadTasks').onclick = loadTasks;
  loadTasks();

  document.getElementById('stockForm').onsubmit = async (e)=>{
    e.preventDefault();
    const msg = document.getElementById('stockMsg');
    msg.textContent = 'Saving…';
    const f = new FormData(e.target);
    const r = await fetch('/api/agent/stock',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
    msg.textContent = r.ok ? 'Saved and pushed to Splynx.' : 'Error: '+(r.error||'save failed');
    if (r.ok) e.target.reset();
  };

  document.getElementById('pingForm').onsubmit = async (e)=>{
    e.preventDefault();
    const msg = document.getElementById('pingMsg');
    msg.textContent = 'Sending…';
    const f = new FormData(e.target);
    let lat = '', lng = '';
    if (navigator.geolocation){
      navigator.geolocation.getCurrentPosition(async pos=>{
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        f.append('lat', lat);
        f.append('lng', lng);
        const r = await fetch('/api/agent/ping',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
        msg.textContent = r.ok ? 'Ping saved.' : 'Ping failed.';
        if (r.ok) e.target.reset();
      }, async _err=>{
        const r = await fetch('/api/agent/ping',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
        msg.textContent = r.ok ? 'Ping saved (no location).' : 'Ping failed.';
        if (r.ok) e.target.reset();
      });
    } else {
      const r = await fetch('/api/agent/ping',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
      msg.textContent = r.ok ? 'Ping saved.' : 'Ping failed.';
      if (r.ok) e.target.reset();
    }
  };
</script>
</body>
</html>`;
}

export async function handleAgent(req, env, { dbAll, dbRun, me }) {
  const url = new URL(req.url);
  const path = url.pathname;

  if (!me) return new Response("Unauthorized", { status: 401 });

  if (path === "/" && req.method === "GET") {
    return html(agentHTML(me));
  }

  // My tasks
  if (path === "/api/agent/tasks" && req.method === "GET") {
    const rows = await dbAll(
      `SELECT * FROM tasks WHERE assigned_user_id=? ORDER BY created_at DESC LIMIT 200`,
      me.sub,
    );
    return json({ rows });
  }

  if (path === "/api/agent/tasks/update" && req.method === "POST") {
    const f = await req.formData();
    const id = parseInt(String(f.get("id") || "0"), 10) || 0;
    const status = String(f.get("status") || "").trim() || "open";
    const now = Math.floor(Date.now() / 1000);
    await dbRun(
      `UPDATE tasks SET status=?, updated_at=? WHERE id=? AND assigned_user_id=?`,
      status,
      now,
      id,
      me.sub,
    );
    await dbRun(
      `INSERT INTO audit_logs (user_id,event,meta,created_at)
       VALUES (?,?,?,?)`,
      me.sub,
      "tasks.status.agent",
      JSON.stringify({ id, status }),
      now,
    );
    return json({ ok: true });
  }

  // Stock quick-assign
  if (path === "/api/agent/stock" && req.method === "POST") {
    const f = await req.formData();
    const barcode = String(f.get("barcode") || "").trim();
    const note = String(f.get("note") || "").trim();
    const file = f.get("photo");
    if (!barcode) return json({ ok:false, error:"barcode required" }, 400);

    const now = Math.floor(Date.now() / 1000);
    let photoUrl = null;
    if (file && file.name) {
      const key = `stock/${me.sub}/${Date.now()}-${file.name}`;
      await env.OPS_MEDIA.put(key, file.stream());
      photoUrl = `${env.R2_PUBLIC_BASE}/${key}`;
    }

    await dbRun(
      `INSERT INTO stock_moves (agent_id,barcode,photo_url,note,created_at)
       VALUES (?,?,?,?,?)`,
      me.sub,
      barcode,
      photoUrl,
      note,
      now,
    );

    try {
      await splynxCreateStockMove(env, { barcode, note, photo_url: photoUrl });
    } catch (_) {}

    await dbRun(
      `INSERT INTO audit_logs (user_id,event,meta,created_at)
       VALUES (?,?,?,?)`,
      me.sub,
      "stock.quick_assign",
      JSON.stringify({ barcode }),
      now,
    );
    return json({ ok: true });
  }

  // Time ping
  if (path === "/api/agent/ping" && req.method === "POST") {
    const f = await req.formData();
    const status = String(f.get("status") || "").trim();
    const task = String(f.get("task") || "").trim();
    const lat = parseFloat(String(f.get("lat") || "")) || null;
    const lng = parseFloat(String(f.get("lng") || "")) || null;
    const now = Math.floor(Date.now() / 1000);

    await dbRun(
      `INSERT INTO time_pings (user_id,lat,lng,status,task,created_at)
       VALUES (?,?,?,?,?,?)`,
      me.sub,
      lat,
      lng,
      status,
      task,
      now,
    );
    return json({ ok: true });
  }

  return new Response("Not found", { status: 404 });
}
