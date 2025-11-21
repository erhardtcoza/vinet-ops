
import { base } from "./shell.js";
export function coverageHTML(){
  return base({
    title:"Coverage",
    extraHead:`<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>`,
    body:`<div class="card">
      <h3 style="margin-top:0">Coverage Map</h3>
      <div id="map" style="height:420px;border-radius:12px"></div>
      <div class="row" style="margin-top:10px">
        <input id="lat" placeholder="lat" style="width:150px">
        <input id="lng" placeholder="lng" style="width:150px">
        <button class="btn" id="check">Check availability</button>
        <div id="out" class="muted">—</div>
      </div>
    </div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/@mapbox/leaflet-omnivore@0.3.4/leaflet-omnivore.min.js"></script>
    <script>
      const m = L.map('map').setView([-33.84, 18.84], 9);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(m);
      ['wireless.kml','ftth_vinet.kml','ftth_frogfoot.kml'].forEach(k=>{
        const l = omnivore.kml('/api/coverage/kml?key='+encodeURIComponent(k)).on('ready',()=>{
          try{ m.fitBounds(l.getBounds(), { maxZoom: 12 }); }catch{}
        }).addTo(m);
      });
      document.getElementById('check').onclick = async ()=>{
        const lat = document.getElementById('lat').value, lng = document.getElementById('lng').value;
        const r = await fetch('/api/coverage/check?lat='+lat+'&lng='+lng).then(r=>r.json()).catch(()=>({ok:false}));
        document.getElementById('out').textContent = r.ok ? ('Matches: '+(r.matches||[]).join(', ') + (r.recommendation? (' | Recommend: '+r.recommendation.code+' @ R'+r.recommendation.price):'')) : 'Error';
      };
    </script>`
  });
}
