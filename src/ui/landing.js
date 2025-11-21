
import { base } from "./shell.js";
export function landingHTML(){
  return base({
    title: "Vinet · Get Connected",
    body: `<div class="card">
      <div class="row" style="justify-content:space-between; align-items:center">
        <img src="https://static.vinet.co.za/logo.jpeg" alt="Vinet" style="height:40px"/>
        <strong>Fast, Reliable Internet</strong>
      </div>
      <h2 style="margin:12px 0">Get Connected</h2>
      <div class="grid">
        <a class="btn" href="/signup">I am new / interested</a>
        <a class="btn" href="https://splynx.vinet.co.za/" target="_blank" rel="noopener">I am already connected</a>
        <a class="btn" href="/coverage">Coverage map</a>
      </div>
      <p class="muted" style="margin-top:12px">Protected by Turnstile. Install this app to your device for best experience.</p>
    </div>`
  });
}
