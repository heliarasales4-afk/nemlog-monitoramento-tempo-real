import { config } from "./config.js";

export async function sendWhatsApp(message) {
  if (!config.metaToken || !config.phoneNumberId || config.recipients.length === 0) {
    console.log("[WhatsApp não configurado]", message);
    return { skipped: true };
  }

  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const results = [];
  for (const to of config.recipients) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.metaToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body: message }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Meta WhatsApp ${response.status}: ${JSON.stringify(data)}`);
    console.log("WhatsApp enviado:", JSON.stringify({ to: to.slice(-4), messageId: data?.messages?.[0]?.id || null }));
    results.push(data);
  }
  return results;
}
