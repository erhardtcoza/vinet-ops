
import { html, json, requireTurnstile, sendWhatsApp, sendWhatsAppTemplate } from "../utils.js";

export async function handleOnboard(req, env, { dbOne, dbRun }){
  const url = new URL(req.url); const { pathname } = url;

  if (pathname === "/" || pathname === "/index.html"){
    return html(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><h3>Onboarding</h3><p>Start link will be sent to your phone.</p><form method=POST action="/start"><input name=phone placeholder="Phone" required><button>Send OTP</button></form>`);
  }
  if (pathname === "/start" && req.method === "POST"){
    if (!(await requireTurnstile(req, env))) return html("Turnstile failed", 403);
    const f = await req.formData(); const phone = (f.get('phone')||'').toString();
    const token = crypto.randomUUID().slice(0,8); const code = String(Math.floor(100000 + Math.random()*900000)); const now = Math.floor(Date.now()/1000);
    await dbRun(`INSERT INTO onboard_sessions (token, phone, step, status, otp_code, otp_expires, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`, token, phone, 'otp', 'pending', code, now+600, now, now);
    if (env.WA_TEMPLATE_OTP) { await sendWhatsAppTemplate(env, phone, env.WA_TEMPLATE_OTP, env.WA_LANG||'en', [ { type:"body", parameters:[{ type:"text", text: code }] } ]); } else { await sendWhatsApp(env, phone, \`Vinet onboarding code: *\${code}* (valid 10 min)\`); }
    return html(`<p>OTP sent to WhatsApp.</p><form method=POST action="/verify"><input name=token value="${token}" hidden><input name=code placeholder="Enter code" required><button>Verify</button></form>`);
  }
  if (pathname === "/verify" && req.method === "POST"){
    const f = await req.formData(); const token = (f.get('token')||'').toString(); const code = (f.get('code')||'').toString();
    const s = await dbOne(`SELECT * FROM onboard_sessions WHERE token=?`, token); if(!s) return html('Session not found',404);
    const now = Math.floor(Date.now()/1000); if (s.otp_code !== code || (s.otp_expires||0) < now) return html('Invalid/expired',403);
    await dbRun(`UPDATE onboard_sessions SET verified=1, step='details', updated_at=? WHERE id=?`, now, s.id);
    return new Response("", { status:302, headers:{ Location: "/details?token="+encodeURIComponent(token) }});
  }
  if (pathname === "/details" && req.method === "GET"){
    const token = url.searchParams.get('token')||''; const s=await dbOne(`SELECT * FROM onboard_sessions WHERE token=?`, token); if(!s) return html('Session?',404);
    return html(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><h3>Details</h3>
    <form method=POST action="/details"><input type=hidden name=token value="${token}">
      <input name=first_name placeholder="First name" value="${s.first_name||''}">
      <input name=last_name placeholder="Last name" value="${s.last_name||''}">
      <input name=email placeholder="Email" value="${s.email||''}">
      <input name=phone placeholder="Phone" value="${s.phone||''}">
      <input name=street placeholder="Street" value="${s.street||''}">
      <input name=city placeholder="City" value="${s.city||''}">
      <input name=zip placeholder="ZIP" value="${s.zip||''}">
      <input name=fno placeholder="FNO (e.g., Frogfoot)">
      <input name=product_code placeholder="Product code">
      <input name=addons placeholder="Add-ons">
      <label><input type=checkbox name=agree ${s.agree?'checked':''}> I agree to the terms</label>
      <button>Next</button></form>`);
  }
  if (pathname === "/details" && req.method === "POST"){
    if (!(await requireTurnstile(req, env))) return html("Turnstile failed", 403);
    const f = await req.formData(); const token = (f.get('token')||'').toString(); const s=await dbOne(`SELECT * FROM onboard_sessions WHERE token=?`, token); if(!s) return html('Session?',404);
    const now = Math.floor(Date.now()/1000);
    await dbRun(`UPDATE onboard_sessions SET first_name=?, last_name=?, email=?, phone=?, street=?, city=?, zip=?, fno=?, product_code=?, addons=?, agree=?, step='upload', updated_at=? WHERE id=?`,
      f.get('first_name')||'', f.get('last_name')||'', f.get('email')||'', f.get('phone')||'', f.get('street')||'', f.get('city')||'', f.get('zip')||'', f.get('fno')||'', f.get('product_code')||'', f.get('addons')||'', (f.get('agree')?1:0), now, s.id);
    return new Response("", { status:302, headers:{ Location: "/upload?token="+encodeURIComponent(token) }});
  }
  if (pathname === "/upload" && req.method === "GET"){
    const token = url.searchParams.get('token')||''; const s=await dbOne(`SELECT * FROM onboard_sessions WHERE token=?`, token); if(!s) return html('Session?',404);
    return html(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><h3>Upload Documents</h3>
    <form method=POST action="/upload" enctype="multipart/form-data"><input type=hidden name=token value="${token}">
      <label>ID Document <input type=file name=id_doc accept="image/*,application/pdf" required></label>
      <label>Proof of Address <input type=file name=poa_doc accept="image/*,application/pdf"></label>
      <button>Upload</button></form>`);
  }
  if (pathname === "/upload" && req.method === "POST"){
    const f = await req.formData(); const token=(f.get('token')||'').toString(); const s=await dbOne(`SELECT * FROM onboard_sessions WHERE token=?`, token); if(!s) return html('Session?',404);
    const put = async (file, kind)=>{ if(!file || typeof file.stream!=='function') return null; const key = `onboard/${token}/${Date.now()}-${kind}`; await env.OPS_MEDIA.put(key, file.stream(), { httpMetadata:{ contentType: file.type||'application/octet-stream' } }); const pub=(env.R2_PUBLIC_BASE||'').replace(/\/$/,'')+'/'+key; await dbRun(`INSERT INTO onboard_files (session_id, kind, r2_key, public_url, created_at) VALUES (?,?,?,?,?)`, s.id, kind, key, pub, Math.floor(Date.now()/1000)); return pub; };
    await put(f.get('id_doc'), 'id'); await put(f.get('poa_doc'), 'poa');
    await dbRun(`UPDATE onboard_sessions SET step='sign', updated_at=? WHERE id=?`, Math.floor(Date.now()/1000), s.id);
    return new Response("", { status:302, headers:{ Location: "/sign?token="+encodeURIComponent(token) }});
  }
  if (pathname === "/sign" && req.method === "GET"){
    const token = url.searchParams.get('token')||''; const s=await dbOne(`SELECT * FROM onboard_sessions WHERE token=?`, token); if(!s) return html('Session?',404);
    return html(`<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><h3>Sign Agreement</h3>
    <canvas id=c width=320 height=160 style="border:1px solid #ccc"></canvas><br>
    <button id=clr>Clear</button>
    <form method=POST action="/sign"><input type=hidden name=token value="${token}"><input type=hidden name=sig id=sig><button>Sign</button></form>
    <script>const c=document.getElementById('c'),ctx=c.getContext('2d');let d=false;function xy(e){const r=c.getBoundingClientRect();return [(e.touches?e.touches[0].clientX:e.clientX)-r.left,(e.touches?e.touches[0].clientY:e.clientY)-r.top]}c.onmousedown=e=>{d=true};c.onmouseup=e=>{d=false};c.onmouseleave=e=>{d=false};c.onmousemove=e=>{if(!d)return;const[a,b]=xy(e);ctx.fillRect(a,b,2,2)};c.ontouchstart=e=>{d=true};c.ontouchend=e=>{d=false};c.ontouchmove=e=>{if(!d)return;const[a,b]=xy(e);ctx.fillRect(a,b,2,2)};document.getElementById('clr').onclick=()=>ctx.clearRect(0,0,c.width,c.height);document.querySelector('form').onsubmit=(e)=>{document.getElementById('sig').value=c.toDataURL('image/png');}</script>`);
  }
  if (pathname === "/sign" && req.method === "POST"){
    const f = await req.formData(); const token=(f.get('token')||'').toString(); const s=await dbOne(`SELECT * FROM onboard_sessions WHERE token=?`, token); if(!s) return html('Session?',404);
    const png = (f.get('sig')||'').toString(); const now=Math.floor(Date.now()/1000);
    if (png.startsWith('data:image/png;base64,')){
      const bin = Uint8Array.from(atob(png.split(',')[1]),c=>c.charCodeAt(0)); const key=`onboard/${token}/signature.png`; await env.OPS_MEDIA.put(key, bin, { httpMetadata:{ contentType:'image/png' }});
      const pub=(env.R2_PUBLIC_BASE||'').replace(/\/$/,'')+'/'+key; await dbRun(`INSERT INTO onboard_files (session_id, kind, r2_key, public_url, created_at) VALUES (?,?,?,?,?)`, s.id, 'signature', key, pub, now);
    }
    await dbRun(`UPDATE onboard_sessions SET step='done', status='ready', signed_at=?, signed_ip=?, signed_agent=?, updated_at=? WHERE id=?`, now, (req.headers.get('CF-Connecting-IP')||''), (req.headers.get('User-Agent')||''), now, s.id);
    return html('<p>Thanks! We\'ll be in touch.</p>');
  }

  return new Response("Not found", { status: 404 });
}
