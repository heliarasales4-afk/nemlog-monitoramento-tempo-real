import { config } from "./config.js";

export async function sendWhatsApp(message) {
  if (!config.metaToken || !config.phoneNumberId || config.recipients.length === 0) {
    console.log("[WhatsApp não configurado]", message);
    return { skipped: true };
  }

  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const results = [];
  const failures = [];
  for (const to of config.recipients) {
    try {
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
      results.push({ to, data });
    } catch (error) {
      failures.push({ to: to.slice(-4), error: error.message });
      console.error("Falha ao enviar WhatsApp para destinatário:", JSON.stringify(failures.at(-1)));
    }
  }
  if (failures.length === config.recipients.length) throw new Error(`Falha para todos os destinatários: ${JSON.stringify(failures)}`);
  return results;
}

export async function sendWhatsAppTemplate(name, parameters = [], language = "pt_BR") {
  if (!config.metaToken || !config.phoneNumberId || config.recipients.length === 0) {
    console.log("[WhatsApp não configurado]", name, parameters);
    return { skipped: true };
  }

  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;
  const results = [];
  const failures = [];
  for (const to of config.recipients) {
    try {
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
          type: "template",
          template: {
            name,
            language: { code: language },
            components: [{
              type: "body",
              parameters: parameters.map((value) => ({ type: "text", text: String(value) }))
            }]
          }
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(`Meta WhatsApp ${response.status}: ${JSON.stringify(data)}`);
      console.log("Template WhatsApp enviado:", JSON.stringify({ name, to: to.slice(-4), messageId: data?.messages?.[0]?.id || null }));
      results.push({ to, data });
    } catch (error) {
      failures.push({ to: to.slice(-4), error: error.message });
      console.error("Falha ao enviar template para destinatário:", JSON.stringify(failures.at(-1)));
    }
  }
  if (failures.length === config.recipients.length) throw new Error(`Falha para todos os destinatários: ${JSON.stringify(failures)}`);
  return results;
}
