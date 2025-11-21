
import { html, json, bad } from "../lib/http.js";
import { landingHTML } from "../ui/landing.js";
import { signupHTML } from "../ui/signup.js";

export async function handleNew(req, env, { dbRun, dbAll }){
  const url = new URL(req.url);
  if (url.pathname === "/" || url.pathname === "/landing") return html(landingHTML());
  if (url.pathname === "/signup" && req.method === "GET") return html(signupHTML());
  if (url.pathname === "/signup" && req.method === "POST"){
    const f = await req.formData();
    const payload = Object.fromEntries([...f].map(([k,v])=>[k,String(v||'')]));
    const now = Math.floor(Date.now()/1000);
    await dbRun(`INSERT INTO signup_leads (first_name,last_name,company,phone,email,street,city,zip,comment,created_at,updated_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
                 payload.first_name, payload.last_name, payload.company, payload.phone, payload.email, payload.street, payload.city, payload.zip, payload.comment, now, now);
    return html("<p>Thanks! We will contact you.</p>");
  }
  return new Response("Not found", { status:404 });
}
