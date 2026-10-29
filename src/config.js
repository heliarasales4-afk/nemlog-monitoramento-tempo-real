function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function listEnv(name, fallback = "") {
  return (process.env[name] ?? fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const config = {
  port: numberEnv("PORT", 10000),
  graphVersion: process.env.META_GRAPH_VERSION || "v26.0",
  metaToken: process.env.META_ACCESS_TOKEN || "",
  phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
  recipients: listEnv("WHATSAPP_RECIPIENTS"),
  webhookSecret: process.env.VUUPT_WEBHOOK_SECRET || "",
  urgencySlaMinutes: numberEnv("URGENCY_SLA_MINUTES", 60),
  urgencyArrivalLimitMinutes: numberEnv("URGENCY_ARRIVAL_LIMIT_MINUTES", 40),
  unitWaitLimitMinutes: numberEnv("UNIT_WAIT_LIMIT_MINUTES", 10),
  urgencyKeywords: listEnv("URGENCY_KEYWORDS", "URGENCIA,URGÊNCIA"),
  ignoreKeywords: listEnv("IGNORE_KEYWORDS", "SEM MATERIAL")
};
