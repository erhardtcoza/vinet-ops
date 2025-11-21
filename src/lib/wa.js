export async function sendWhatsAppText(env, to, body) {
  if (!to || !env.WHATSAPP_TOKEN || !env.PHONE_NUMBER_ID) {
    return { ok: false, status: 0, json: { error: "wa misconfigured" } };
  }

  const url = `https://graph.facebook.com/v20.0/${env.PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: String(to),
    type: "text",
    text: { body: String(body) },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let j = null;
  try {
    j = await res.json();
  } catch {}

  return { ok: res.ok, status: res.status, json: j };
}
