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
  assert.equal(item.arrivedAt.toISOString(), "2026-10-19T13:04:00.000Z");
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
  assert.equal(service.createdAt.toISOString(), "2026-10-19T15:43:19.000Z");
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

test("normaliza formulário de chegada aninhado no checklist", () => {
  const item = normalizeWebhook({
    event: "Vuupt\\Events\\Checklist\\ChecklistFilledEvent",
    payload: {
      entity_id: 457,
      checklist: {
        filled_at: "2026-11-03 14:27:00",
        form: { name: "Chegada na Coleta" }
      },
      entity: { id: 457, title: "Urgência -HAC/HJXXIII" }
    }
  });
  assert.equal(item.checklistName, "Chegada na Coleta");
  assert.equal(item.checklistFilledAt.toISOString(), "2026-11-03T14:27:00.000Z");
});

test("normaliza agente atribuído em formatos alternativos do Vuupt", () => {
  const item = normalizeWebhook({
    event: "Vuupt\\Events\\Service\\ServiceAssignedEvent",
    payload: {
      entity_id: 789,
      assigned_agent: { name: "Heliara Sales Agente" },
      entity: { id: 789, title: "URGÊNCIA" }
    }
  });
  assert.equal(item.driver, "Heliara Sales Agente");
});

test("prioriza o ID do serviço quando a entidade é uma ocorrência", () => {
  const item = normalizeWebhook({
    event: "Vuupt\\Events\\Checklist\\ChecklistFilledEvent",
    payload: {
      entity_id: 9988,
      entity: {
        id: 4455,
        service_id: 9988,
        checklist_form: { name: "Chegada na Coleta" }
      }
    }
  });

  assert.equal(item.id, "9988");
});

test("extrai anexos usados como resposta de checklist", () => {
  const item = normalizeWebhook({
    event: "Vuupt\\Events\\Checklist\\ChecklistFilledEvent",
    payload: {
      service_id: 1234,
      answers: [{ label: "Foto do lacre", attachments: [{ url: "https://exemplo/foto.jpg" }] }]
    }
  });

  assert.equal(item.checklistAnswers[0].value.length, 1);
});
