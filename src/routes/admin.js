// /src/routes/admin.js
import { html, json } from "../lib/http.js";
import { splynxTariffsImport, splynxCreateSchedule } from "../lib/ext.js";
import { sendWhatsAppText } from "../lib/wa.js";

function adminHTML() {
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Vinet · Admin</title>
  <link rel="icon" href="/favicon.ico"/>
  <style>
    body{font:14px system-ui;background:#f7f7f8;color:#0b1320;margin:0}
    .wrap{max-width:980px;margin:24px auto;padding:0 16px}
    .card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06);margin-bottom:12px}
    .btn{background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px;cursor:pointer}
    input,select,textarea{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px;font:inherit}
    .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    .muted{color:#6b7280}
    textarea{width:100%;min-height:60px;resize:vertical}
    table{border-collapse:collapse;width:100%;font-size:13px}
    th,td{padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:left}
    th{background:#f3f4f6;font-weight:600}
    .pill{display:inline-block;padding:2px 6px;border-radius:999px;font-size:11px}
    .pill-open{background:#fee2e2;color:#b91c1c}
    .pill-in_progress{background:#fef3c7;color:#92400e}
    .pill-done{background:#dcfce7;color:#166534}
    .pill-cancelled{background:#e5e7eb;color:#374151}
  </style>
  </head><body><div class="wrap">

    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:center">
        <h3 style="margin-top:0">Tariffs</h3>
        <a class="btn" href="/auth/logout">Logout</a>
      </div>
      <div class="row">
        <button class="btn" id="import">Import from Splynx</button>
        <span id="tstat" class="muted"></span>
      </div>
      <div id="tlist" style="margin-top:8px" class="muted">Loading…</div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Users</h3>
      <form id="usr" class="row">
        <input name="email" placeholder="email">
        <input name="name" placeholder="name">
        <select name="role">
          <option value="admin">admin</option>
          <option value="agent">agent</option>
        </select>
        <input name="wa_number" placeholder="wa number">
        <input name="splynx_admin_id" placeholder="splynx admin id">
        <button class="btn">Save</button>
      </form>
      <div id="ulist" class="muted" style="margin-top:8px">Loading…</div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Tasks</h3>
      <form id="taskForm">
        <input type="hidden" name="id">
        <div class="row" style="margin-bottom:8px">
          <input name="title" placeholder="Title" style="flex:2" required>
          <select name="priority" style="flex:1">
            <option value="low">Low</option>
            <option value="normal" selected>Normal</option>
            <option value="high">High</option>
          </select>
          <select name="status" style="flex:1">
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div class="row" style="margin-bottom:8px">
          <select name="assigned_user_id" id="taskUser" style="flex:2">
            <option value="">Unassigned</option>
          </select>
          <input name="customer_id" placeholder="Customer ID (optional)" style="flex:1">
          <input name="due_date" placeholder="Due date YYYY-MM-DD" style="flex:1">
        </div>
        <textarea name="description" placeholder="Description / notes"></textarea>
        <div class="row" style="margin-top:8px">
          <button class="btn">Save task</button>
          <span id="taskMsg" class="muted"></span>
        </div>
      </form>

      <div class="row" style="margin-top:12px">
        <label class="muted">Filter:</label>
        <select id="taskFilterStatus">
          <option value="">All</option>
          <option value="open" selected>Open</option>
          <option value="in_progress">In progress</option>
          <option value="done">Done</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="taskFilterUser">
          <option value="">All users</option>
        </select>
        <button class="btn" id="taskReload">Reload</button>
      </div>

      <div id="taskList" style="margin-top:8px;max-height:380px;overflow:auto" class="muted">Loading…</div>
    </div>

    <div class="card">
      <h3 style="margin-top:0">Coverage Check</h3>
      <div class="row">
        <input id="covLat" placeholder="lat" style="width:160px">
        <input id="covLng" placeholder="lng" style="width:160px">
        <button id="covBtn" class="btn">Check</button>
      </div>
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
      <div class="row">
        <a href="/api/admin/audit.csv" class="btn" target="_blank">Download CSV</a>
      </div>
      <div id="alist" class="muted" style="margin-top:8px">—</div>
    </div>

  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script>
    async function loadTariffs(){
      const r = await fetch('/api/admin/tariffs').then(r=>r.json());
      document.getElementById('tlist').innerHTML =
        (r.rows||[]).map(t => t.code+' — R'+t.price).join('<br>') || 'No tariffs yet.';
    }
    document.getElementById('import').onclick = async ()=>{
      document.getElementById('tstat').textContent='Importing…';
      const r = await fetch('/api/admin/tariffs/import',{method:'POST'}).then(r=>r.json());
      document.getElementById('tstat').textContent='Imported '+(r.imported||0);
      loadTariffs();
    };

    async function loadUsers(){
      const r = await fetch('/api/admin/users').then(r=>r.json());
      const rows = r.rows || [];
      document.getElementById('ulist').innerHTML =
        rows.map(u => u.email+' · '+u.role).join('<br>') || 'No users yet.';

      const sel = document.getElementById('taskUser');
      const filt = document.getElementById('taskFilterUser');
      if (sel && filt){
        sel.innerHTML = '<option value="">Unassigned</option>';
        filt.innerHTML = '<option value="">All users</option>';
        rows.forEach(u=>{
          const opt = document.createElement('option');
          opt.value = u.id;
          opt.textContent = u.name ? (u.name+' ('+u.email+')') : u.email;
          sel.appendChild(opt);

          const opt2 = document.createElement('option');
          opt2.value = u.id;
          opt2.textContent = u.name ? (u.name+' ('+u.email+')') : u.email;
          filt.appendChild(opt2);
        });
      }
    }
    document.getElementById('usr').onsubmit = async (e)=>{
      e.preventDefault();
      const f = new FormData(e.target);
      await fetch('/api/admin/users/save',{method:'POST', body:f}).then(r=>r.json());
      loadUsers();
    };

    async function loadAudit(){
      const a = await fetch('/api/admin/audit').then(r=>r.json());
      document.getElementById('alist').innerHTML =
        (a.rows||[]).slice(0,50).map(r =>
          '['+new Date(r.created_at*1000).toLocaleString()+'] '+r.event
        ).join('<br>') || 'No audit rows yet.';
    }

    async function loadTasks(){
      const s = document.getElementById('taskFilterStatus').value;
      const u = document.getElementById('taskFilterUser').value;
      const params = new URLSearchParams();
      if (s) params.set('status', s);
      if (u) params.set('assigned_user_id', u);
      const r = await fetch('/api/admin/tasks?'+params.toString()).then(r=>r.json());
      const rows = r.rows || [];
      const root = document.getElementById('taskList');
      if (!rows.length){ root.innerHTML = 'No tasks.'; return; }
      const pill = (st)=>{
        const cls = st==='open'?'pill-open':(st==='in_progress'?'pill-in_progress':(st==='done'?'pill-done':'pill-cancelled'));
        return '<span class="pill '+cls+'">'+st.replace('_',' ')+'</span>';
      };
      root.innerHTML = '<table><thead><tr><th>ID</th><th>Title</th><th>Assigned</th><th>Status</th><th>Due</th><th>Pri</th></tr></thead><tbody>'+
        rows.map(t =>
          '<tr>'+
          '<td>'+t.id+'</td>'+
          '<td>'+t.title+'</td>'+
          '<td>'+(t.assigned_name||'–')+'</td>'+
          '<td>'+pill(t.status||'open')+'</td>'+
          '<td>'+(t.due_at? new Date(t.due_at*1000).toLocaleDateString():'–')+'</td>'+
          '<td>'+(t.priority||'')+'</td>'+
          '</tr>'
        ).join('')+
        '</tbody></table>';
    }
    document.getElementById('taskReload').onclick = loadTasks;
    document.getElementById('taskFilterStatus').onchange = loadTasks;
    document.getElementById('taskFilterUser').onchange = loadTasks;

    document.getElementById('taskForm').onsubmit = async (e)=>{
      e.preventDefault();
      const msg = document.getElementById('taskMsg');
      msg.textContent = 'Saving…';
      const f = new FormData(e.target);
      const r = await fetch('/api/admin/tasks/save',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
      msg.textContent = r.ok ? 'Saved.' : 'Error saving task.';
      if (r.ok){
        e.target.reset();
        loadTasks();
      }
    };

    document.getElementById('covBtn').onclick = async ()=>{
      const lat = (document.getElementById('covLat').value||'').trim();
      const lng = (document.getElementById('covLng').value||'').trim();
      const r = await fetch('/api/coverage/check?lat='+lat+'&lng='+lng).then(r=>r.json());
      document.getElementById('covRes').textContent =
        r.ok
          ? ('Matches: '+(r.matches||[]).join(', ') + (r.recommendation ? (' | Recommend: '+r.recommendation.code+' @ R'+r.recommendation.price) : ''))
          : 'Error';
    };

    const m = L.map('map').setView([-33.84, 18.84], 9);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(m);
    let markers = [];
    async function loadPings(){
      const r = await fetch('/api/admin/time').then(r=>r.json()).catch(()=>({rows:[]}));
      markers.forEach(mm=>m.removeLayer(mm)); markers=[];
      const byUser = {};
      r.rows.forEach(p=>{
        if (!byUser[p.user_id||0]) byUser[p.user_id||0] = [];
        byUser[p.user_id||0].push(p);
      });
      const parts=[];
      for (const uid in byUser){
        const arr = byUser[uid].sort((a,b)=>b.created_at-a.created_at);
        const last = arr[0];
        if (last && last.lat && last.lng){
          markers.push(
            L.marker([last.lat,last.lng]).addTo(m)
             .bindPopup((last.name||('User '+uid))+' · '+new Date(last.created_at*1000).toLocaleString()+' · '+(last.status||''))
          );
        }
        parts.push(
          '<strong>'+(last?.name||('User '+uid))+'</strong><br>'+
          arr.slice(0,10).map(p =>
            '['+new Date(p.created_at*1000).toLocaleTimeString()+'] '+
            (p.status||'')+
            (p.task?(' · '+p.task):'')+
            (p.lat?(' · '+p.lat.toFixed(4)+','+p.lng.toFixed(4)):'')
          ).join('<br>')
        );
      }
      document.getElementById('timeline').innerHTML = parts.join('<hr>') || 'No pings yet.';
    }

    loadTariffs();
    loadUsers();
    loadAudit();
    loadTasks();
    loadPings();
    setInterval(loadPings, 60000);
  </script></body></html>`;
}

export async function handleAdmin(req, env, { dbAll, dbRun, me }) {
  const url = new URL(req.url);

  if (!me) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (url.pathname === "/" || url.pathname === "/admin")
    return html(adminHTML());

  if (url.pathname === "/api/admin/tariffs" && req.method === "GET") {
    const rows = await dbAll(
      `SELECT code,name,price FROM tariffs ORDER BY price ASC`,
    );
    return json({ rows });
  }

  if (url.pathname === "/api/admin/tariffs/import" && req.method === "POST") {
    const list = await splynxTariffsImport(env);
    const now = Math.floor(Date.now() / 1000);
    let ins = 0;
    for (const t of list) {
      const code = t.code || t.name || "T" + t.id;
      const name = t.name || code;
      const price = Number(t.price || t.monthly_price || 0);
      await dbRun(
        `INSERT OR REPLACE INTO tariffs (id, code, name, price, updated_at)
         VALUES (coalesce((SELECT id FROM tariffs WHERE code=?),NULL),?,?,?,?)`,
        code,
        code,
        name,
        price,
        now,
      );
      ins++;
    }
    await dbRun(
      `INSERT INTO audit_logs (user_id,event,meta,created_at)
       VALUES (?,?,?,?)`,
      me.sub,
      "tariffs.import",
      JSON.stringify({ count: ins }),
      now,
    );
    return json({ imported: ins });
  }

  if (url.pathname === "/api/admin/users" && req.method === "GET") {
    const rows = await dbAll(
      `SELECT id,email,name,role,wa_number,splynx_admin_id,active FROM users ORDER BY id DESC`,
    );
    return json({ rows });
  }

  if (url.pathname === "/api/admin/users/save" && req.method === "POST") {
    const f = await req.formData();
    const email = String(f.get("email") || "").toLowerCase().trim();
    const name = String(f.get("name") || "").trim();
    const role = String(f.get("role") || "agent");
    const wa = String(f.get("wa_number") || "").trim();
    const sid =
      parseInt(String(f.get("splynx_admin_id") || "0"), 10) || null;
    const now = Math.floor(Date.now() / 1000);

    if (!email) return json({ ok: false, error: "email required" }, 400);

    await dbRun(
      `INSERT OR IGNORE INTO users (email,name,role,wa_number,splynx_admin_id,active,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      email,
      name,
      role,
      wa,
      sid,
      1,
      now,
      now,
    );
    await dbRun(
      `UPDATE users SET name=?, role=?, wa_number=?, splynx_admin_id=?, updated_at=? WHERE email=?`,
      name,
      role,
      wa,
      sid,
      now,
      email,
    );
    await dbRun(
      `INSERT INTO audit_logs (user_id,event,meta,created_at)
       VALUES (?,?,?,?)`,
      me.sub,
      "users.save",
      JSON.stringify({ email, role }),
      now,
    );
    return json({ ok: true });
  }

  // --- TASKS ADMIN API ---

  if (url.pathname === "/api/admin/tasks" && req.method === "GET") {
    const status = url.searchParams.get("status") || "";
    const assigned = url.searchParams.get("assigned_user_id") || "";

    const params = [];
    let where = "WHERE 1=1";
    if (status) {
      where += " AND t.status = ?";
      params.push(status);
    }
    if (assigned) {
      where += " AND t.assigned_user_id = ?";
      params.push(parseInt(assigned, 10) || 0);
    }

    const rows = await dbAll(
      `
      SELECT t.*, u.name AS assigned_name
      FROM tasks t
      LEFT JOIN users u ON t.assigned_user_id = u.id
      ${where}
      ORDER BY t.created_at DESC
      LIMIT 500
      `,
      ...params,
    );
    return json({ rows });
  }

  if (url.pathname === "/api/admin/tasks/save" && req.method === "POST") {
    const f = await req.formData();
    const id = parseInt(String(f.get("id") || "0"), 10) || null;
    const title = String(f.get("title") || "").trim();
    const description = String(f.get("description") || "").trim();
    const priority = String(f.get("priority") || "normal");
    const status = String(f.get("status") || "open");
    const assigned_user_id_raw = String(f.get("assigned_user_id") || "").trim();
    const assigned_user_id = assigned_user_id_raw
      ? parseInt(assigned_user_id_raw, 10) || null
      : null;
    const customer_id_raw = String(f.get("customer_id") || "").trim();
    const customer_id = customer_id_raw
      ? parseInt(customer_id_raw, 10) || null
      : null;
    const due_date_str = String(f.get("due_date") || "").trim();
    let due_at = null;
    if (due_date_str) {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due_date_str);
      if (m) {
        const d = Date.UTC(
          parseInt(m[1], 10),
          parseInt(m[2], 10) - 1,
          parseInt(m[3], 10),
          10,
          0,
          0,
        );
        due_at = Math.floor(d / 1000);
      }
    }

    if (!title) return json({ ok: false, error: "title required" }, 400);

    const now = Math.floor(Date.now() / 1000);

    // fetch assigned user for WA + Splynx mapping
    let assignedUser = null;
    if (assigned_user_id != null) {
      const rows = await dbAll(
        `SELECT id,name,email,wa_number,splynx_admin_id
         FROM users WHERE id=?`,
        assigned_user_id,
      );
      assignedUser = rows[0] || null;
    }

    if (!id) {
      // insert
      await dbRun(
        `INSERT INTO tasks
         (title,description,status,priority,assigned_user_id,created_by_user_id,customer_id,due_at,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        title,
        description,
        status,
        priority,
        assigned_user_id,
        me.sub,
        customer_id,
        due_at,
        now,
        now,
      );
      const row = await dbAll(
        `SELECT id FROM tasks ORDER BY id DESC LIMIT 1`,
      );
      const newId = row[0]?.id || null;

      // push to Splynx scheduling if possible
      try {
        const t = {
          id: newId,
          title,
          description,
          customer_id,
          due_at,
          assigned_splynx_admin_id: assignedUser?.splynx_admin_id || null,
        };
        const res = await splynxCreateSchedule(env, t);
        if (res.ok && res.json?.id) {
          await dbRun(
            `UPDATE tasks SET splynx_task_id = ?, updated_at=? WHERE id=?`,
            res.json.id,
            now,
            newId,
          );
        }
      } catch (e) {
        await dbRun(
          `INSERT INTO audit_logs (user_id,event,meta,created_at)
           VALUES (?,?,?,?)`,
          me.sub,
          "tasks.sync_error",
          JSON.stringify({ error: String(e) }),
          now,
        );
      }

      // WhatsApp notify on new assignment
      if (assignedUser?.wa_number) {
        const msg =
          `New task assigned:\n` +
          `#${newId} · ${title}\n` +
          (due_at ? `Due: ${new Date(due_at*1000).toLocaleString()}\n` : "") +
          (description ? `Notes: ${description}` : "");
        await sendWhatsAppText(env, assignedUser.wa_number, msg);
      }

      await dbRun(
        `INSERT INTO audit_logs (user_id,event,meta,created_at)
         VALUES (?,?,?,?)`,
        me.sub,
        "tasks.create",
        JSON.stringify({ title, assigned_user_id }),
        now,
      );
      return json({ ok: true });
    } else {
      // update
      await dbRun(
        `UPDATE tasks
         SET title=?,description=?,status=?,priority=?,assigned_user_id=?,customer_id=?,due_at=?,updated_at=?
         WHERE id=?`,
        title,
        description,
        status,
        priority,
        assigned_user_id,
        customer_id,
        due_at,
        now,
        id,
      );

      // WhatsApp notify on status / reassignment
      if (assignedUser?.wa_number) {
        const msg =
          `Task update:\n` +
          `#${id} · ${title}\n` +
          `Status: ${status}\n` +
          (due_at ? `Due: ${new Date(due_at*1000).toLocaleString()}\n` : "") +
          (description ? `Notes: ${description}` : "");
        await sendWhatsAppText(env, assignedUser.wa_number, msg);
      }

      await dbRun(
        `INSERT INTO audit_logs (user_id,event,meta,created_at)
         VALUES (?,?,?,?)`,
        me.sub,
        "tasks.update",
        JSON.stringify({ id, status, assigned_user_id }),
        now,
      );
      return json({ ok: true });
    }
  }

  if (url.pathname === "/api/admin/audit" && req.method === "GET") {
    const rows = await dbAll(
      `SELECT id,user_id,event,meta,created_at FROM audit_logs ORDER BY id DESC LIMIT 500`,
    );
    return json({ rows });
  }

  if (url.pathname === "/api/admin/audit.csv" && req.method === "GET") {
    const rows = await dbAll(
      `SELECT id,user_id,event,meta,created_at FROM audit_logs ORDER BY id DESC`,
    );
    const header = "id,user_id,event,meta,created_at\n";
    const csv =
      header +
      rows
        .map((r) =>
          [r.id, r.user_id, r.event, r.meta, r.created_at]
            .map((x) =>
              `"${String(x || "").replace(/"/g, '""')}"`,
            )
            .join(","),
        )
        .join("\n");
    return new Response(csv, {
      headers: { "content-type": "text/csv; charset=utf-8" },
    });
  }

  if (url.pathname === "/api/admin/time" && req.method === "GET") {
    const rows = await dbAll(
      `
      SELECT tp.id, tp.user_id, tp.lat, tp.lng, tp.status, tp.task, tp.created_at,
             u.name, u.email
      FROM time_pings tp
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.created_at >= (strftime('%s','now') - 7*24*3600)
      ORDER BY tp.created_at DESC
      LIMIT 2000
      `,
    );
    return json({ rows });
  }

  return new Response("Not found", { status: 404 });
}
