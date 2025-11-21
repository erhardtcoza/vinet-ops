
import { html } from "../lib/http.js";
import { coverageHTML } from "../ui/coverage.js";
export async function handleCoverage(req, env){
  const url = new URL(req.url);
  if (url.pathname === "/coverage") return html(coverageHTML());
  if (url.pathname === "/api/coverage/kml"){
    const key = url.searchParams.get("key") || "wireless.kml";
    const stream = await env.COVERAGE.get(key, { type:"stream" });
    if (!stream) return new Response("Not found", { status:404 });
    return new Response(stream, { headers: { "content-type":"application/vnd.google-earth.kml+xml; charset=utf-8", "cache-control":"max-age=600" }});
  }
  return new Response("Not found", { status:404 });
}
