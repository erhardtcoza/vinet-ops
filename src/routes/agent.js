
import { html, json } from "../lib/http.js";

function agentHTML(){
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Vinet · Agent</title>
  <style>body{font:14px system-ui;background:#f7f7f8;color:#0b1320;margin:0}.wrap{max-width:720px;margin:24px auto;padding:0 16px}.card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06)} .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.btn{background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px}input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px}</style>
  </head><body><div class="wrap">
    <div class="card">
      <h3 style="margin-top:0">Quick Assign</h3>
      <form id="qa" enctype="multipart/form-data">
        <input name="barcode" placeholder="Scan / enter barcode" required>
        <input type="url" name="photo_url" placeholder="Photo URL (from R2 public)">
        <input name="note" placeholder="Note">
        <button class="btn">Save</button>
      </form>
      <div id="out" class="muted" style="margin-top:8px">—</div>
    </div>
  </div>
  <script>
    document.getElementById('qa').onsubmit = async (e)=>{
      e.preventDefault(); const f = new FormData(e.target);
      const r = await fetch('/api/agent/quick-assign',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
      document.getElementById('out').textContent = r.ok? ('Saved: '+(r.id||'-')) : 'Error';
    };
  </script></body></html>`;
}

export async function handleAgent(req, env, { dbRun, dbAll }){
  const url = new URL(req.url);
  if (url.pathname === "/" || url.pathname === "/agent") return html(agentHTML());
  if (url.pathname === "/api/agent/quick-assign" && req.method === "POST"){
    const f = await req.formData();
    const barcode = String(f.get("barcode")||"");
    const photo = String(f.get("photo_url")||"");
    const note = String(f.get("note")||"");
    const now = Math.floor(Date.now()/1000);
    await dbRun(`INSERT INTO stock_moves (agent_id, barcode, photo_url, note, created_at) VALUES (?,?,?,?,?)`, null, barcode, photo, note, now);
    await dbRun(`INSERT INTO audit_logs (event,meta,created_at) VALUES (?,?,?)`, 'agent.quick_assign', JSON.stringify({ barcode }), now);
    return json({ ok:true, id: 'ok' });
  }
  return new Response("Not found", { status:404 });
}
