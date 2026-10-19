import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWebhook } from "../src/normalize.js";

test("normaliza webhook oficial de serviço do Vuupt", () => {
  const item = normalizeWebhook({
    event: "Vuupt\\Events\\Service\\ServiceArrivedEvent",
    payload: {
      id: 123,
      title: "URGÊNCIA HEMOMINAS/HJK",
      arrived_at: "2026-10-19 13:04:00",
      agent: { name: "Wagner" }
    }
  });
  assert.equal(item.id, "123");
  assert.equal(item.driver, "Wagner");
  assert.equal(item.arrivedAt.toISOString(), "2026-10-19T16:04:00.000Z");
});

test("normaliza entidade enviada diretamente pelo webhook do Vuupt", () => {
  const service = normalizeWebhook({
    id: 54230037,
    title: "Urgência - TESTE - NEMLOG",
    type: "pickup",
    created_at: "2026-10-19 15:43:19"
  });

  assert.equal(service.id, "54230037");
  assert.equal(service.title, "Urgência - TESTE - NEMLOG");
  assert.equal(service.createdAt.toISOString(), "2026-10-19T18:43:19.000Z");
});

test("normaliza checklist vinculado a um serviço", () => {
  const item = normalizeWebhook({
    event: "Vuupt\\Events\\Checklist\\ChecklistFilledEvent",
    payload: {
      entity_id: 456,
      filled_at: "2026-10-19 13:20:00",
      checklist_form: { name: "Comprovação sucesso Coleta" },
      entity: { id: 456, title: "URGÊNCIA" }
    }
  });
  assert.equal(item.id, "456");
  assert.match(item.checklistName, /Coleta/);
});
