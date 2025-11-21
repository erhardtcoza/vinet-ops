
export function withCORS(res, origin="*"){
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", origin);
  h.set("Access-Control-Allow-Headers", "content-type, authorization");
  h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  return new Response(res.body, { status: res.status, headers: h });
}
export function preflight(origin="*"){
  return new Response("", { headers:{ "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "content-type, authorization", "Access-Control-Allow-Methods":"GET, POST, OPTIONS" }});
}
