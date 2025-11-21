
import { json } from "../lib/http.js";
import { pointInPoly } from "../lib/geo.js";

function parseCoords(block){
  return block.trim().split(/\s+/).map(p=>{
    const [lon,lat] = p.split(',').map(Number); return [lon,lat];
  }).filter(a=>Number.isFinite(a[0]) && Number.isFinite(a[1]));
}

async function loadKML(env, key){
  const txt = await env.COVERAGE.get(key); if(!txt) return [];
  const out=[];
  const polyRe=/<Polygon[\s\S]*?<outerBoundaryIs>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>[\s\S]*?<\/outerBoundaryIs>[\s\S]*?<\/Polygon>/gi;
  let m; while ((m = polyRe.exec(txt))){
    out.push(parseCoords(m[1]));
  }
  return out;
}

const LAYERS=[
  { key:"ftth_vinet.kml", code:"fibre_vinet" },
  { key:"ftth_frogfoot.kml", code:"fibre_frogfoot" },
  { key:"wireless.kml", code:"wireless" }
];

export async function handleCoverageCheck(req, env, { dbAll }){
  const url = new URL(req.url);
  if (url.pathname !== "/api/coverage/check") return new Response("Not found", { status:404 });
  const lat = Number(url.searchParams.get("lat")); const lng = Number(url.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return json({ ok:false, error:"lat,lng required" }, 400);
  const pt=[lng,lat];
  const matches=[];
  for (const L of LAYERS){
    const polys = await loadKML(env, L.key);
    if (polys.some(poly=> pointInPoly(pt, poly))) matches.push(L.code);
  }
  const tariffs = await dbAll(`SELECT code,name,price FROM tariffs`);
  const pick = (fam)=>{
    const rx = fam==="wireless"? /^W-/ : (fam==="fibre_frogfoot"? /^FF-/ : /^F-/);
    const list = tariffs.filter(t=> rx.test(t.code||"")).sort((a,b)=>(a.price||0)-(b.price||0));
    return list[0]||null;
  };
  const recommendation = matches.includes("fibre_vinet") ? pick("fibre_vinet")
                        : matches.includes("fibre_frogfoot") ? pick("fibre_frogfoot")
                        : matches.includes("wireless") ? pick("wireless") : null;
  return json({ ok:true, matches, recommendation });
}
