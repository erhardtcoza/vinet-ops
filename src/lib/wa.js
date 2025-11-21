
export async function waSendTemplate(env, to, template, lang="en_US", components=[]){
  const url = `https://graph.facebook.com/v19.0/${env.PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: String(to).replace(/\D+/g,''),
    type: "template",
    template: { name: template, language: { code: lang }, components }
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type":"application/json" },
    body: JSON.stringify(payload)
  });
  let j=null; try{ j=await res.json(); }catch{}
  return { ok: res.ok, status: res.status, json: j };
}

export async function waSendText(env, to, body){
  const url = `https://graph.facebook.com/v19.0/${env.PHONE_NUMBER_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, "Content-Type":"application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: String(to).replace(/\D+/g,''), type: "text", text: { body } })
  });
  let j=null; try{ j=await res.json(); }catch{}
  return { ok: res.ok, status: res.status, json: j };
}
