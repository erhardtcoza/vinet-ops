
export const text = (s, c=200, h={}) => new Response(s, { status:c, headers: { "content-type":"text/plain; charset=utf-8", ...h }});
export const json = (o, c=200, h={}) => new Response(JSON.stringify(o), { status:c, headers: { "content-type":"application/json; charset=utf-8", ...h }});
export const html = (s, c=200, h={}) => new Response(s, { status:c, headers: { "content-type":"text/html; charset=utf-8", ...h }});
export function bad(msg="Bad request", c=400){ return json({ ok:false, error: msg }, c); }
