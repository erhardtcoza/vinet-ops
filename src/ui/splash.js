
import { base } from "./shell.js";
export function splashHTML(siteKey){
  return base({
    title: "Vinet · Welcome",
    extraHead: `<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>`,
    body: `<div class="card" style="text-align:center">
      <img src="https://static.vinet.co.za/logo.jpeg" alt="Vinet" style="height:52px"/>
      <h2>Welcome</h2>
      <p class="muted">Fast, Reliable Internet</p>
      <form method="post" action="/splash">
        <div class="cf-turnstile" data-sitekey="${siteKey}" data-theme="light"></div>
        <div style="margin-top:12px"><button class="btn">Continue</button></div>
      </form>
      <div style="margin-top:12px" class="row" style="justify-content:center; gap:12px">
        <a class="btn" href="/install">Install</a>
        <a class="btn" href="/landing">Use in browser</a>
      </div>
    </div>`
  });
}
