
export function base({ title, body, extraHead="" }){
  return `<!doctype html><html lang="en"><head>
  <meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${title||"Vinet Ops"}</title>
  <link rel="icon" href="/favicon.ico"/>
  <style>
    :root{ --bg:#f7f7f8; --card:#fff; --ink:#0b1320; --muted:#6b7280; --brand:#E10600; }
    *{ box-sizing:border-box; } body{ margin:0; font:14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:var(--bg); color:var(--ink); }
    .wrap{ max-width:960px; margin:24px auto; padding:0 16px; }
    .card{ background:var(--card); border-radius:16px; padding:16px; box-shadow:0 1px 2px rgba(0,0,0,.06) }
    .btn{ background:var(--brand); color:#fff; padding:10px 14px; border:none; border-radius:10px; cursor:pointer; }
    .muted{ color:var(--muted); }
    .row{ display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
    input,select{ padding:10px 12px; border:1px solid #e5e7eb; border-radius:10px; }
    .grid{ display:grid; gap:12px; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); }
    a{ color:var(--brand); text-decoration:none; }
  </style>
  ${extraHead}
  </head><body><div class="wrap">${body}</div></body></html>`;
}
