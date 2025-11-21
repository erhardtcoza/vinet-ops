export async function verifyTurnstile(env, token, remoteip) {
  if (!env.TURNSTILE_SECRET_KEY) return { ok: true };
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET_KEY);
  form.append("response", token || "");
  if (remoteip) form.append("remoteip", remoteip);

  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    { method: "POST", body: form },
  );
  const data = await res.json().catch(() => ({}));
  return { ok: !!data.success, data };
}
