import { config } from "./config.js";
import { normalizeWebhook, searchableText } from "./normalize.js";
import { sendWhatsApp, sendWhatsAppTemplate } from "./whatsapp.js";

const services = new Map();
const timers = new Map();
const seenEvents = new Set();

const minutesBetween = (start, end) => Math.round((end - start) / 60000);
const formatTime = (date) => date ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(date) : "não registrado";

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword.toUpperCase()));
}

function isArrivalChecklist(service) {
  return /ChecklistFilledEvent$/.test(service.event)
    && /chegada\s+(?:na|à|a)\s+coleta/i.test(service.checklistName || "");
}

export function classify(service) {
  const haystack = searchableText(service);
  if (containsAny(haystack, config.ignoreKeywords)) return "ignored";
  if (containsAny(haystack, config.urgencyKeywords)) return "urgency";
  return service.routeId ? "route" : "unknown";
}

function label(service) {
  const route = service.title || [service.origin, service.destination].filter(Boolean).join(" → ");
  return [service.driver || "condutor não informado", route || service.code || `serviço ${service.id}`].join(" | ");
}

function clearTimers(id, kinds = ["arrival", "sla"]) {
  for (const kind of kinds) {
    const key = `${id}:${kind}`;
    const timer = timers.get(key);
    if (timer) clearTimeout(timer);
    timers.delete(key);
  }
}

const checklistRequirements = [
  { name: "foto do termômetro", terms: ["TERMOMETRO", "TERMÔMETRO"] },
  { name: "foto do lacre", terms: ["LACRE"] },
  { name: "caixa higienizada", terms: ["HIGIENIZ"] },
  { name: "foto do rótulo", terms: ["ROTULO", "RÓTULO"] },
  { name: "assinatura", terms: ["ASSINATURA"] },
  { name: "temperatura registrada", terms: ["TEMPERATURA"] }
];

function missingChecklistItems(answers = []) {
  if (!answers.length) return [];
  return checklistRequirements.filter((required) => {
    const answer = answers.find((item) => containsAny(String(item.label || "").toUpperCase(), required.terms));
    if (!answer) return true;
    const value = answer.value;
    if (value === false || value === 0 || value == null || value === "") return true;
    return /^(NAO|NÃO|NO|FALSE|INCOMPLETO)$/i.test(String(value).trim());
  }).map((item) => item.name);
}

function schedule(id, kind, when, fn) {
  const delay = when.getTime() - Date.now();
  if (delay <= 0) return void fn();
  const key = `${id}:${kind}`;
  const timer = setTimeout(async () => {
    timers.delete(key);
    await fn();
  }, delay);
  timer.unref?.();
  timers.set(key, timer);
}

async function notify(text) {
  try {
    await sendWhatsApp(text);
  } catch (error) {
    console.error("Falha ao enviar WhatsApp:", error.message);
  }
}

function eventKey(body) {
  const normalized = normalizeWebhook(body);
  return `${normalized.event}|${normalized.id}|${normalized.checklistFilledAt?.toISOString() || normalized.completedAt?.toISOString() || normalized.arrivedAt?.toISOString() || normalized.startedAt?.toISOString() || normalized.createdAt?.toISOString() || ""}`;
}

export async function processVuuptWebhook(body) {
  const key = eventKey(body);
  if (seenEvents.has(key)) return { duplicate: true };
  seenEvents.add(key);
  if (seenEvents.size > 10000) seenEvents.delete(seenEvents.values().next().value);

  const incoming = normalizeWebhook(body);
  if (!incoming.id) return { ignored: true, reason: "sem identificador do serviço" };
  const previous = services.get(incoming.id) ?? {};
  const service = { ...previous, ...Object.fromEntries(Object.entries(incoming).filter(([, value]) => value !== null && value !== "")) };
  service.kind = classify(service);
  services.set(service.id, service);

  if (service.kind === "ignored") return { ignored: true, reason: "sem material" };

  // No aplicativo do Vuupt, o motorista informa a chegada por meio da
  // ocorrência/formulário "Chegada na Coleta". Esse preenchimento é o registro
  // oficial de chegada e precisa cancelar imediatamente o alerta de 40 minutos.
  if (isArrivalChecklist(service)) {
    service.arrivedAt = service.checklistFilledAt ?? new Date();
    services.set(service.id, service);
    clearTimers(service.id, ["arrival"]);
  }

  if (service.kind === "urgency" && /ServiceCreatedEvent$/.test(service.event)) {
    const start = service.createdAt ?? new Date();
    // O Vuupt normalmente cria o serviço e o atribui ao agente logo em seguida.
    // A pequena espera permite incorporar o ServiceAssignedEvent antes do alerta.
    schedule(service.id, "initial", new Date(Date.now() + 3000), async () => {
      const current = services.get(service.id) || service;
      try {
        const route = current.title || [current.origin, current.destination].filter(Boolean).join(" → ") || current.code || `serviço ${current.id}`;
        await sendWhatsAppTemplate("alerta_urgencia_nemlog", [
          current.driver || "Condutor não informado",
          route,
          formatTime(current.createdAt || start)
        ]);
      } catch (error) {
        console.error("Falha ao enviar modelo de urgência:", error.message);
      }
    });
    schedule(service.id, "arrival", new Date(start.getTime() + config.urgencyArrivalLimitMinutes * 60000), async () => {
      const current = services.get(service.id);
      if (current && !current.arrivedAt && !current.completedAt) {
        await notify(`🟠 CONDUTOR NÃO CHEGOU À COLETA EM 40 MIN\n${label(current)}\nAcionamento: ${formatTime(current.createdAt)}\nApós ${config.urgencyArrivalLimitMinutes} minutos, a chegada à unidade ainda não foi registrada.`);
      }
    });
    schedule(service.id, "sla", new Date(start.getTime() + config.urgencySlaMinutes * 60000), async () => {
      const current = services.get(service.id);
      if (!current?.completedAt) await notify(`🔴 SLA DE URGÊNCIA ATINGIDO\n${label(current)}\nMais de ${config.urgencySlaMinutes} minutos desde o acionamento e ainda não concluída.`);
    });
  }

  if (/ServiceArrivedEvent$/.test(service.event) || service.arrivedAt) {
    service.arrivedAt ??= new Date();
    services.set(service.id, service);
    clearTimers(service.id, ["arrival"]);
  }

  if (service.kind === "urgency" && /ChecklistFilledEvent$/.test(service.event) && !isArrivalChecklist(service)) {
    const stage = /coleta/i.test(service.checklistName) ? "coleta" : /entrega/i.test(service.checklistName) ? "entrega" : "outro";
    if (stage !== "outro") {
      service.checklists = { ...(service.checklists || {}), [stage]: true };
      const missing = missingChecklistItems(service.checklistAnswers);
      if (missing.length) {
        await notify(`⚠️ CHECKLIST DE ${stage.toUpperCase()} INCOMPLETO\n${label(service)}\nItens ausentes ou não conformes: ${missing.join(", ")}.`);
      }
    }
  }

  if (service.kind === "urgency" && /ChecklistFilledEvent$/.test(service.event) && /coleta/i.test(service.checklistName) && !isArrivalChecklist(service)) {
    const pickupDone = service.checklistFilledAt ?? new Date();
    service.pickupDoneAt = pickupDone;
    services.set(service.id, service);
    if (!service.arrivedAt) {
      await notify(`⚠️ CHEGADA NA COLETA NÃO REGISTRADA\n${label(service)}\nChecklist da coleta finalizado em ${formatTime(pickupDone)}.`);
    } else {
      const wait = minutesBetween(service.arrivedAt, pickupDone);
      if (wait > config.unitWaitLimitMinutes) {
        await notify(`🟠 ESPERA DA UNIDADE ACIMA DE 10 MIN\n${label(service)}\nChegada: ${formatTime(service.arrivedAt)}\nLiberação/coleta: ${formatTime(pickupDone)}\nEspera: ${wait} minutos.`);
      }
    }
  }

  if (/ServiceDoneEvent$/.test(service.event) || service.completedAt) {
    service.completedAt ??= new Date();
    services.set(service.id, service);
    clearTimers(service.id);
    if (service.kind === "urgency" && service.createdAt) {
      const total = minutesBetween(service.createdAt, service.completedAt);
      if (total > config.urgencySlaMinutes) {
        await notify(`🔴 URGÊNCIA CONCLUÍDA FORA DO SLA\n${label(service)}\nAcionamento: ${formatTime(service.createdAt)}\nEntrega: ${formatTime(service.completedAt)}\nTempo total: ${total} minutos.`);
      }
      const missingStages = ["coleta", "entrega"].filter((stage) => !service.checklists?.[stage]);
      if (missingStages.length) {
        await notify(`⚠️ CHECKLIST OBRIGATÓRIO NÃO LOCALIZADO\n${label(service)}\nSem checklist registrado de: ${missingStages.join(" e ")}.`);
      }
    }
  }

  return { accepted: true, id: service.id, kind: service.kind };
}

export function getService(id) {
  return services.get(String(id));
}
