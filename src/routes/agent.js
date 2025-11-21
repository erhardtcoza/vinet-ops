
import { html, json } from "../lib/http.js";

function agentHTML(){
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Vinet · Agent</title>
  <style>body{font:14px system-ui;background:#f7f7f8;color:#0b1320;margin:0}.wrap{max-width:720px;margin:24px auto;padding:0 16px}.card{background:#fff;border-radius:16px;padding:16px;box-shadow:0 1px 2px rgba(0,0,0,.06)} .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.btn{background:#E10600;color:#fff;border:none;border-radius:10px;padding:8px 12px}input{padding:8px 10px;border:1px solid #e5e7eb;border-radius:10px}</style>
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

    <div class="card" style="margin-top:12px">
      <h4>Scan Barcode</h4>
      <video id="preview" style="width:100%;border-radius:12px"></video>
      <div class="row"><button class="btn" id="startScan" type="button">Start camera</button><span id="scanOut" class="muted">—</span></div>
    </div>

    <div class="card" style="margin-top:12px">
      <h4>Upload Photo</h4>
      <input type="file" id="photo" accept="image/*" capture="environment">
      <div class="row"><button class="btn" id="upBtn" type="button">Upload</button><span id="upOut" class="muted">—</span></div>
    </div>
  </div>
  <script>
    document.getElementById('upBtn').onclick = async ()=>{
      const f = document.getElementById('photo').files[0];
      if (!f){ document.getElementById('upOut').textContent='Pick a photo first'; return; }
      const fd = new FormData(); fd.append('file', f, f.name);
      const r = await fetch('/api/agent/upload', { method:'POST', body: fd }).then(r=>r.json()).catch(()=>({ok:false}));
      document.getElementById('upOut').textContent = r.ok ? r.url : 'Error';
      if (r.ok){ const pu = document.querySelector('input[name="photo_url"]'); if (pu) pu.value = r.url; }
    };
    let codeReader = null;
    document.getElementById('startScan').onclick = async ()=>{
      if (!codeReader){
        const m = await import('https://unpkg.com/@zxing/browser@0.1.5/umd/index.min.js');
        codeReader = new m.BrowserMultiFormatReader();
      }
      const video = document.getElementById('preview');
      try{
        await codeReader.decodeFromVideoDevice(undefined, video, (res, err)=>{
          if (res){ document.querySelector('input[name="barcode"]').value = res.getText(); document.getElementById('scanOut').textContent = res.getText(); }
        });
      }catch(e){ document.getElementById('scanOut').textContent='No camera'; }
    };
    document.getElementById('qa').onsubmit = async (e)=>{
      e.preventDefault(); const f = new FormData(e.target);
      const r = await fetch('/api/agent/quick-assign',{method:'POST', body:f}).then(r=>r.json()).catch(()=>({ok:false}));
      document.getElementById('out').textContent = r.ok? ('Saved & pushed'+ (r.sync?.ok? ' (Splynx OK)' : ' (Splynx NOK)')) : 'Error';
    };

    async function sendPing(status="on", task=""){
      try{
        let lat=null,lng=null;
        if (navigator.geolocation){
          await new Promise((res)=>{
            navigator.geolocation.getCurrentPosition((pos)=>{ lat=pos.coords.latitude; lng=pos.coords.longitude; res(); }, ()=>res(), { enableHighAccuracy:true, maximumAge:15000, timeout:5000 });
          });
        }
        const fd = new FormData(); if(lat!=null) fd.append('lat', lat); if(lng!=null) fd.append('lng', lng);
        fd.append('status', status); fd.append('task', task);
        await fetch('/api/agent/ping', { method:'POST', body: fd });
      }catch(e){}
    }
    setInterval(()=>sendPing("on",""), 60000);
    sendPing("on","");
  </script></body></html>`;
}

export async function handleAgent(req, env, { dbRun }){
  const url = new URL(req.url);
  if (url.pathname === "/" || url.pathname === "/agent") return html(agentHTML());
  if (url.pathname === "/api/agent/quick-assign" && req.method === "POST"){
    const f = await req.formData();
    const barcode = String(f.get("barcode")||"");
    const photo = String(f.get("photo_url")||"");
    const note = String(f.get("note")||"");
    const now = Math.floor(Date.now()/1000);
    await dbRun(`INSERT INTO stock_moves (agent_id, barcode, photo_url, note, created_at) VALUES (?,?,?,?,?)`, null, barcode, photo, note, now);
    await dbRun(`INSERT INTO audit_logs (event,meta,created_at) VALUES (?,?,?)`, 'agent.quick_assign', JSON.stringify({ barcode, photo }), now);
    let sync=null; try{ const { splynxCreateStockMove } = await import('../lib/ext.js'); sync = await splynxCreateStockMove(env, { barcode, note, photo_url: photo }); }catch(e){ sync={ ok:false, status:0, json:{ error: String(e) } }; }
    try{ if (env.WA_ADMIN_MSISDN){ const { waSendText } = await import('../lib/wa.js'); await waSendText(env, env.WA_ADMIN_MSISDN, `QA: ${barcode} ${photo||''}`); } }catch(e){}
    return json({ ok:true, sync });
  }
  if (url.pathname === "/api/agent/upload" && req.method === "POST"){
    const f = await req.formData();
    const file = f.get("file");
    if (!file || typeof file === "string") return json({ ok:false, error:"file required" }, 400);
    const key = `stock/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}-${file.name.replace(/[^\w\.\-]+/g,'_')}`;
    await env.OPS_MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const urlPub = `${env.R2_PUBLIC_BASE.replace(/\/$/,'')}/${key}`;
    return json({ ok:true, key, url: urlPub });
  }
  if (url.pathname === "/api/agent/ping" && req.method === "POST"){
    const f = await req.formData();
    const lat = parseFloat(String(f.get("lat")||""));
    const lng = parseFloat(String(f.get("lng")||""));
    const status = String(f.get("status")||"on");
    const task = String(f.get("task")||"");
    const now = Math.floor(Date.now()/1000);
    await dbRun(`INSERT INTO time_pings (user_id, lat, lng, status, task, created_at) VALUES (?,?,?,?,?,?)`, null, Number.isFinite(lat)?lat:null, Number.isFinite(lng)?lng:null, status, task, now);
    return json({ ok:true });
  }
  return new Response("Not found", { status:404 });
}
