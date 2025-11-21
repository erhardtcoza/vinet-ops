// /src/routes/agent.js
import { html, json } from "../lib/http.js";

function agentHTML() {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Vinet · Agent</title>
  <style>
    body{font:14px system-ui;background:#f7f7f8;color:#0b1320;margin:0}
    .wrap{max-width:720px;margin:24px auto;padding:0 16px}
    .card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06);margin-bottom:12px}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .btn{background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px;cursor:pointer}
    input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px}
    .muted{color:#6b7280}
    .pill{display:inline-block;padding:2px 6px;border-radius:999px;font-size:11px}
    .pill-open{background:#fee2e2;color:#b91c1c}
    .pill-in_progress{background:#fef3c7;color:#92400e}
    .pill-done{background:#dcfce7;color:#166534}
    .pill-cancelled{background:#e5e7eb;color:#374151}
  </style>
  </head><body><div class="wrap">

    <div class="card">
      <h3 style="margin-top:0">Quick Assign</h3>
      <form id="qa" enctype="multipart/form-data">
        <input name="barcode" placeholder="Scan / enter barcode" required>
        <input type="url" name="photo_url" placeholder="Photo URL (auto-filled after upload)">
        <input name="note" placeholder="Note">
        <button class="btn">Save</button>
      </form>
      <div id="out" class="muted" style="margin-top:8px">—</div>
    </div>

    <div class="card">
      <h4>Scan Barcode</h4>
      <video id="preview" style="width:100%;border-radius:12px"></video>
      <div class="row">
        <button class="btn" id="startScan" type="button">Start camera</button>
        <span id="scanOut" class="muted">—</span>
      </div>
    </div>

    <div class="card">
      <h4>Upload Photo</h4>
      <input type="file" id="photo" accept="image/*" capture="environment">
      <div class="row">
        <button class="btn" id="upBtn" type="button">Upload</button>
        <span id="upOut" class="muted">—</span>
      </div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">My Tasks</h3>
      <div id="tasksMe" class="muted">Loading…</div>
    </div>

  </div>
  <script>
    // --- Upload to R2 ---
    document.getElementById('upBtn').onclick = async ()=>{
      const f = document.getElementById('photo').files[0];
      if (!f){
        document.getElementById('upOut').textContent='Pick a photo first';
        return;
      }
      const fd = new FormData(); fd.append('file', f, f.name);
      const r = await fetch('/api/agent/upload', { method:'POST', body: fd }).then(r=>r.json()).catch(()=>({ok:false}));
      document.getElementById('upOut').textContent = r.ok ? r.url : 'Error';
      if (r.ok){
        const pu = document.querySelector('input[name="photo_url"]');
        if (pu) pu.value = r.url;
      }
    };

    // --- Barcode camera ---
    let codeReader = null;
    document.getElementById('startScan').onclick = async ()=>{
      if (!codeReader){
        const m = await import('https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js');
        codeReader = new m.BrowserMultiFormatReader();
      }
      const video = document.getElementById('preview');
      try{
        await codeReader.decodeFromVideoDevice(undefined, video, (res, err)=>{
          if (res){
            document.querySelector('input[name="barcode"]').value = res.getText();
            document.getElementById('scanOut').textContent = res.getText();
          }
        });
      }catch(e){
        document.getElementById('scanOut').textContent='No camera';
      }
    };

    // --- Quick assign ---
    document.getElementById('qa').onsubmit = async (e)=>{
      e.preventDefault();
      const f = new FormData(e.target);
      const r = await fetch('/api/agent/quick-assign',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
      document.getElementById('out').textContent = r.ok
        ? ('Saved & pushed'+ (r.sync && r.sync.ok ? ' (Splynx OK)' : ' (Splynx NOK)'))
        : 'Error';
    };

    // --- Time ping (background) ---
    async function sendPing(status="on", task=""){
      try{
        let lat = null, lng = null;
        if (navigator.geolocation){
          await new Promise((res)=>{
            navigator.geolocation.getCurrentPosition(
              (pos)=>{ lat = pos.coords.latitude; lng = pos.coords.longitude; res(); },
              ()=>res(),
              { enableHighAccuracy:true, maximumAge:15000, timeout:5000 }
            );
          });
        }
        const fd = new FormData();
        if (lat != null) fd.append('lat', lat);
        if (lng != null) fd.append('lng', lng);
        fd.append('status', status);
        fd.append('task', task || '');
        await fetch('/api/agent/ping', { method:'POST', body: fd });
      }catch(e){}
    }
    setInterval(()=>sendPing("on",""), 60000);
    sendPing("on","");

    // --- My tasks ---
    function pill(st){
      const cls = st==='open'?'pill-open':(st==='in_progress'?'pill-in_progress':(st==='done'?'pill-done':'pill-cancelled'));
      return '<span class="pill '+cls+'">'+st.replace('_',' ')+'</span>';
    }

    async function loadMyTasks(){
      const r = await fetch('/api/agent/tasks').then(r=>r.json()).catch(()=>({rows:[]}));
      const rows = r.rows || [];
      const root = document.getElementById('tasksMe');
      if (!rows.length){
        root.innerHTML = 'No tasks assigned.';
        return;
      }
      root.innerHTML = rows.map(t=>{
        const due = t.due_at ? new Date(t.due_at*1000).toLocaleString() : '–';
        const btn =
          t.status === 'open'
            ? '<button class="btn" data-id="'+t.id+'" data-next="in_progress">Start</button>'
          : t.status === 'in_progress'
            ? '<button class="btn" data-id="'+t.id+'" data-next="done">Done</button>'
          : '';
        return '<div style="border-bottom:1px solid #e5e7eb;padding:8px 0">'+
          '<div><strong>'+t.title+'</strong></div>'+
          '<div class="muted">'+(t.description||'')+'</div>'+
          '<div class="muted">Due: '+due+'</div>'+
          '<div class="row" style="margin-top:4px">'+pill(t.status||"open")+' '+btn+'</div>'+
        '</div>';
      }).join('');
      root.querySelectorAll('button[data-id]').forEach(btn=>{
        btn.onclick = async ()=>{
          const id = btn.getAttribute('data-id');
          const next = btn.getAttribute('data-next');
          const fd = new FormData();
          fd.append('id', id);
          fd.append('status', next);
          await fetch('/api/agent/tasks/status',{method:'POST', body:fd});
          loadMyTasks();
        };
      });
    }

    loadMyTasks();
    setInterval(loadMyTasks, 60000);
  </script></body></html>`;
}

export async function handleAgent(req, env, { dbRun, dbAll, me }) {
  const url = new URL(req.url);

  // Agent routes require a logged-in user
  if (!me) return new Response("Unauthorized", { status: 401 });

  if (url.pathname === "/" || url.pathname === "/agent")
    return html(agentHTML());

  if (url.pathname === "/api/agent/quick-assign" && req.method === "POST") {
    const f = await req.formData();
    const barcode = String(f.get("barcode") || "");
    const photo = String(f.get("photo_url") || "");
    const note = String(f.get("note") || "");
    const now = Math.floor(Date.now() / 1000);

    await dbRun(
      `INSERT INTO stock_moves (agent_id, barcode, photo_url, note, created_at)
       VALUES (?,?,?,?,?)`,
      me.sub,
      barcode,
      photo,
      note,
      now,
    );
    await dbRun(
      `INSERT INTO audit_logs (user_id,event,meta,created_at)
       VALUES (?,?,?,?)`,
      me.sub,
      "agent.quick_assign",
      JSON.stringify({ barcode, photo }),
      now,
    );

    let sync = null;
    try {
      const { splynxCreateStockMove } = await import("../lib/ext.js");
      sync = await splynxCreateStockMove(env, {
        barcode,
        note,
        photo_url: photo,
      });
    } catch (e) {
      sync = { ok: false, status: 0, json: { error: String(e) } };
    }

    // Optional WA notify is already in your previous version; add back if needed.
    return json({ ok: true, sync });
  }

  if (url.pathname === "/api/agent/upload" && req.method === "POST") {
    const f = await req.formData();
    const file = f.get("file");
    if (!file || typeof file === "string")
      return json({ ok: false, error: "file required" }, 400);

    const key = `stock/${new Date().toISOString().slice(0, 10)}/${
      crypto.randomUUID()
    }-${file.name.replace(/[^\w.\-]+/g, "_")}`;
    await env.OPS_MEDIA.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    const urlPub = `${env.R2_PUBLIC_BASE.replace(/\/$/, "")}/${key}`;
    return json({ ok: true, key, url: urlPub });
  }

  if (url.pathname === "/api/agent/ping" && req.method === "POST") {
    const f = await req.formData();
    const lat = parseFloat(String(f.get("lat") || ""));
    const lng = parseFloat(String(f.get("lng") || ""));
    const status = String(f.get("status") || "on");
    const task = String(f.get("task") || "");
    const now = Math.floor(Date.now() / 1000);

    await dbRun(
      `INSERT INTO time_pings (user_id, lat, lng, status, task, created_at)
       VALUES (?,?,?,?,?,?)`,
      me.sub,
      Number.isFinite(lat) ? lat : null,
      Number.isFinite(lng) ? lng : null,
      status,
      task,
      now,
    );
    return json({ ok: true });
  }

  // Agent task endpoints
  if (url.pathname === "/api/agent/tasks" && req.method === "GET") {
    const rows = await dbAll(
      `SELECT id,title,description,status,priority,due_at,customer_id,splynx_task_id
       FROM tasks
       WHERE assigned_user_id = ?
       ORDER BY status != 'open', status != 'in_progress', due_at IS NULL, due_at ASC, id DESC
       LIMIT 200`,
      me.sub,
    );
    return json({ rows });
  }

  if (url.pathname === "/api/agent/tasks/status" && req.method === "POST") {
    const f = await req.formData();
    const id = parseInt(String(f.get("id") || "0"), 10) || null;
    const status = String(f.get("status") || "").trim();
    if (!id || !status)
      return json({ ok: false, error: "id,status required" }, 400);

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
      "tasks.status",
      JSON.stringify({ id, status }),
      now,
    );
    // You can optionally sync status to Splynx scheduling here.
    return json({ ok: true });
  }

  return new Response("Not found", { status: 404 });
}
