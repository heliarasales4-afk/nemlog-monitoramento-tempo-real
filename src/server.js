import express from "express";
import { config } from "./config.js";
import { processVuuptWebhook, getService } from "./monitor.js";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true, service: "nemlog-monitoramento-tempo-real" }));

app.post("/webhooks/vuupt", (req, res) => {
  if (config.webhookSecret && req.get("x-webhook-secret") !== config.webhookSecret && req.query.secret !== config.webhookSecret) {
    return res.status(401).json({ ok: false });
  }

  // O Vuupt exige resposta 2XX; o processamento segue de forma assíncrona.
  res.status(202).json({ ok: true });
  processVuuptWebhook(req.body).catch((error) => console.error("Erro no webhook Vuupt:", error));
});

app.get("/services/:id", (req, res) => {
  const service = getService(req.params.id);
  if (!service) return res.status(404).json({ error: "Serviço não encontrado" });
  const { raw, ...safeService } = service;
  return res.json(safeService);
});

app.listen(config.port, () => console.log(`NemLog monitorando na porta ${config.port}`));
