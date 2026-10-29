const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

function dateValue(...values) {
  const value = first(...values);
  if (!value) return null;
  // O webhook do Vuupt envia os horários sem indicar o fuso, mas os valores
  // são UTC. Marcar como UTC permite exibi-los corretamente em São Paulo.
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(" ", "T") + "Z"
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function checklistAnswers(payload) {
  const source = first(
    payload?.answers,
    payload?.checklist_answers,
    payload?.checklist?.answers,
    payload?.checklist_form?.answers,
    payload?.form?.answers
  );
  if (!Array.isArray(source)) return [];
  return source.map((item) => ({
    label: text(first(item?.label, item?.name, item?.question, item?.field?.name)),
    value: first(item?.value, item?.answer, item?.response, item?.file, item?.url)
  }));
}

export function normalizeWebhook(body) {
  const event = text(body?.event);
  // The Vuupt delivery log shows the entity itself as the request body.
  // Keep supporting the documented envelope as well as this production shape.
  const payload = body?.payload ?? body ?? {};
  const entity = payload.entity ?? payload.service ?? payload.order ?? payload;
  const agent = entity.agent ?? payload.agent ?? {};
  const title = text(first(entity.title, entity.name, payload.title));
  const code = text(first(entity.code, entity.tracking_code, payload.code));
  const notes = text(first(entity.note, entity.notes, payload.note));
  const origin = text(first(entity.origin?.name, entity.sender?.name, entity.customer?.name, payload.origin));
  const destination = text(first(entity.destination?.name, entity.contact?.name, payload.destination, entity.address));

  return {
    event,
    id: String(first(entity.id, payload.entity_id, payload.service_id, payload.id, "")),
    title,
    code,
    notes,
    driver: text(first(
      agent.name,
      entity.agent_name,
      payload.agent?.name,
      payload.agent_name,
      entity.assigned_agent?.name,
      payload.assigned_agent?.name,
      entity.assignee?.name,
      payload.assignee?.name,
      entity.driver?.name,
      payload.driver?.name,
      entity.driver_name,
      payload.driver_name
    )),
    origin,
    destination,
    routeId: first(entity.route_id, payload.route_id),
    status: text(first(entity.status, payload.status)),
    statusDone: text(first(entity.status_done, payload.status_done)),
    createdAt: dateValue(entity.created_at, payload.created_at),
    startedAt: dateValue(entity.started_at, payload.started_at),
    arrivedAt: dateValue(entity.arrived_at, payload.arrived_at),
    completedAt: dateValue(entity.completed_at, payload.completed_at),
    checklistName: text(first(payload.checklist_form?.name, payload.form?.name)),
    checklistFilledAt: dateValue(payload.filled_at, payload.created_at),
    checklistAnswers: checklistAnswers(payload),
    raw: body
  };
}

export function searchableText(service) {
  return [service.title, service.code, service.notes, service.origin, service.destination]
    .filter(Boolean)
    .join(" | ")
    .toUpperCase();
}
