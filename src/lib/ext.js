// src/lib/ext.js
export async function splynxFetch(env, path, init = {}) {
  const url = `${env.SPLYNX_URL}${path}`;
  const headers = {
    Authorization: env.AUTH_HEADER,
    "Content-Type": "application/json",
    ...(init.headers || {}),
  };
  const res = await fetch(url, { ...init, headers });
  let j = null;
  try {
    j = await res.json();
  } catch (_) {}
  return { ok: res.ok, status: res.status, json: j };
}

export async function splynxTariffsImport(env) {
  for (const p of [
    "/api/2.0/admin/finance/tariffs",
    "/api/2.0/admin/finance/internet/tariffs",
    "/api/2.0/admin/finance/services/tariffs",
  ]) {
    const r = await splynxFetch(env, p);
    if (r.ok && Array.isArray(r.json)) return r.json;
  }
  return [];
}

export async function splynxLeadSync(env, lead) {
  const all = await splynxFetch(env, `/api/2.0/admin/crm/leads`);
  const arr = Array.isArray(all.json) ? all.json : [];
  const fullname = `${lead.first_name || ""} ${lead.last_name || ""}`.trim();

  let match =
    arr.find(
      (l) => (l.email || "").toLowerCase() === (lead.email || "").toLowerCase(),
    ) ||
    arr.find(
      (l) =>
        (l.phone || "").replace(/\D+/g, "") ===
        (lead.phone || "").replace(/\D+/g, ""),
    ) ||
    arr.find(
      (l) =>
        (l.name || "").trim().toLowerCase() === fullname.toLowerCase(),
    );

  if (!match)
    match = arr.find((l) => (l.name || "").toLowerCase() === "re-use");

  const payload = {
    name: fullname || lead.company || "New lead",
    email: lead.email || null,
    phone: lead.phone || null,
    city: lead.city || null,
    street_1: lead.street || null,
    zip_code: lead.zip || null,
    comment: lead.comment || "via vinet-ops",
  };

  if (match) {
    const upd = await splynxFetch(
      env,
      `/api/2.0/admin/crm/leads/${match.id}`,
      { method: "PATCH", body: JSON.stringify(payload) },
    );
    return { action: "update", ok: upd.ok, status: upd.status, id: match.id };
  } else {
    const crt = await splynxFetch(env, `/api/2.0/admin/crm/leads`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const id = crt.json?.id || null;
    return { action: "create", ok: crt.ok, status: crt.status, id };
  }
}

export async function splynxCreateStockMove(env, { barcode, note, photo_url }) {
  const body = {
    store_id: Number(env.INVENTORY_STORE_ID || 1),
    move_type_id: Number(env.INVENTORY_MOVE_TYPE_ID || 1),
    comment: note || "quick-assign via vinet-ops",
    attachments: photo_url ? [{ url: photo_url }] : [],
    barcode: barcode,
  };
  return await splynxFetch(
    env,
    `/api/2.0/admin/inventory/stock-moves`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/**
 * Minimal Splynx Scheduling integration for tasks.
 * Adjust fields/endpoint to match your exact Splynx scheduling model.
 */
export async function splynxCreateSchedule(env, task) {
  const body = {
    // These fields may need tweaking according to your scheduling config.
    // "title" / "name"
    title: task.title,
    description: task.description || "",
    customer_id: task.customer_id || null,
    // Example fields – change as needed:
    start_date: task.due_at || Math.floor(Date.now() / 1000),
    end_date: task.due_at || Math.floor(Date.now() / 1000),
    // You can map assigned_user_id to Splynx admin/technician id if you want:
    technician_id: task.assigned_splynx_admin_id || null,
    status: "open",
  };

  return await splynxFetch(
    env,
    `/api/2.0/admin/scheduling/tasks`,
    { method: "POST", body: JSON.stringify(body) },
  );
}
