const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

function dateValue(...values) {
  const value = first(...values);
  if (!value) return null;
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(" ", "T") + "-03:00"
    : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

export function normalizeWebhook(body) {
  const event = text(body?.event);
  const payload = body?.payload ?? {};
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
    driver: text(first(agent.name, entity.driver?.name, payload.driver?.name, entity.driver_name)),
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
    raw: body
  };
}

export function searchableText(service) {
  return [service.title, service.code, service.notes, service.origin, service.destination]
    .filter(Boolean)
    .join(" | ")
    .toUpperCase();
}
