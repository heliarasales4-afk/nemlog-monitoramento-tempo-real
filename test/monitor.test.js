import test from "node:test";
import assert from "node:assert/strict";
import { processVuuptWebhook, getService } from "../src/monitor.js";

test("trata a ocorrência Chegada na Coleta como chegada oficial", async () => {
  await processVuuptWebhook({
    event: "Vuupt\\Events\\Checklist\\ChecklistFilledEvent",
    payload: {
      entity_id: 987654,
      filled_at: "2026-10-29 14:15:00",
      checklist_form: { name: "Chegada na Coleta" },
      entity: { id: 987654, title: "Urgência -CSSI/HJK" }
    }
  });

  const service = getService("987654");
  assert.equal(service.kind, "urgency");
  assert.equal(service.arrivedAt.toISOString(), "2026-10-29T14:15:00.000Z");
  assert.equal(service.pickupDoneAt, undefined);
});

test("reconhece chegada em formato aninhado usado pelo Vuupt", async () => {
  await processVuuptWebhook({
    event: "Vuupt\\Events\\Checklist\\ChecklistFilledEvent",
    payload: {
      entity_id: 987655,
      checklist: {
        filled_at: "2026-11-03 14:27:00",
        form: { name: "Chegada na Coleta" }
      },
      entity: { id: 987655, title: "Urgência -HAC/HJXXIII" }
    }
  });

  const service = getService("987655");
  assert.equal(service.arrivedAt.toISOString(), "2026-11-03T14:27:00.000Z");
});
