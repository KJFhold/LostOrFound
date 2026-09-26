"use strict";
const { supaAdmin } = require("../supabaseClient");

async function notifyUser({ userId, type, entityType, entityId, title, body, data = {} }) {
  const inserted = await supaAdmin
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      entity_type: entityType,
      entity_id: entityId,
      title,
      body,
    })
    .select("id")
    .single();

  if (inserted.error) console.warn("[notify] in-app failed", inserted.error.message);

  const q = await supaAdmin
    .from("push_installations")
    .select("installation_id,expo_push_token,language")
    .eq("user_id", userId)
    .eq("active", true);

  if (q.error || !q.data?.length) return { inApp: !inserted.error, push: 0 };

  const deliveries = q.data.map((x) => ({
    installation: x,
    message: {
      to: x.expo_push_token,
      sound: "default",
      title,
      body,
      data: { type, targetKind: entityType, targetId: entityId, ...data },
    },
  }));

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    body: JSON.stringify(deliveries.map((x) => x.message)),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn("[notify] push failed", result);
    return { inApp: !inserted.error, push: 0 };
  }

  const tickets = Array.isArray(result?.data) ? result.data : [];
  const now = new Date().toISOString();
  const rows = deliveries.map((delivery, index) => {
    const ticket = tickets[index] || {};
    const ok = ticket.status === "ok";
    return {
      user_id: userId,
      installation_id: delivery.installation.installation_id,
      notification_type: type,
      notification_key: `${type}:${entityType}:${entityId}:${inserted.data?.id || now}:${delivery.installation.installation_id}`,
      status: ok ? "TICKET_OK" : "TICKET_ERROR",
      expo_ticket_id: ticket.id || null,
      error_code: ticket?.details?.error || null,
      error_message: ticket?.message || null,
      created_at: now,
    };
  });

  if (rows.length) {
    const logged = await supaAdmin.from("push_delivery_log").insert(rows);
    if (logged.error) console.warn("[notify] delivery log failed", logged.error.message);
  }

  return {
    inApp: !inserted.error,
    push: rows.filter((row) => row.status === "TICKET_OK").length,
    tickets,
  };
}

module.exports = { notifyUser };
