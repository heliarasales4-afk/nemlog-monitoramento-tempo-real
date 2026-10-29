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
