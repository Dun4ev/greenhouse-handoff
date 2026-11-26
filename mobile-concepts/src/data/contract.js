// Единый формат снимка мониторинга и возможностей управления.
// Экранные компоненты работают только с нормализованным снимком из этого модуля.

import { normalizePumpControl } from './pumpControl.js';

const ALLOWED_CONNECTION = new Set(['online', 'offline']);
const ALLOWED_FRESHNESS = new Set(['fresh', 'stale', 'missing']);
const ALLOWED_FLOW = new Set(['present', 'absent', 'unknown']);
const ALLOWED_WATERING = new Set(['watering', 'idle', 'unknown']);
const ALLOWED_EVENT_KIND = new Set(['info', 'warning', 'gap', 'late']);
const ALLOWED_SLOT_STATE = new Set(['watering', 'idle', 'gap']);

function normalizePulseStrip(rawStrip, telemetryReliable, gapMinutes, wateringState, closedIntervals) {
  const defaultLen = 30;
  const rawSlots = Array.isArray(rawStrip?.slots) && rawStrip.slots.length > 0
    ? rawStrip.slots.map((s) => (ALLOWED_SLOT_STATE.has(s) ? s : 'idle'))
    : Array.from({ length: defaultLen }, () => (wateringState === 'watering' ? 'watering' : 'idle'));

  // Для внешнего снимка с непроверенной историей скрываем неподтвержденный хвост.
  // Симулятор сам учитывает разрывы по границам завершенных интервалов.
  const slots = [...rawSlots];
  if (!closedIntervals && !telemetryReliable) {
    const gapSlots = Math.max(1, Math.min(slots.length, Math.round((gapMinutes || 20) / 2)));
    for (let i = slots.length - gapSlots; i < slots.length; i += 1) {
      slots[i] = 'gap';
    }
  }

  const wateringSlots = slots.filter((s) => s === 'watering').length;
  const gapSlotsCount = slots.filter((s) => s === 'gap').length;

  let summary = rawStrip?.summary ? asText(rawStrip.summary) : '';
  if (!summary) {
    if (gapSlotsCount > 0) {
      summary = `Нет данных ${gapMinutes || gapSlotsCount * 2} мин`;
    } else if (wateringSlots > 0) {
      summary = `Полив ~${wateringSlots * 2} мин за час`;
    } else {
      summary = 'За час полива не было';
    }
  }

  return {
    windowStart: asText(rawStrip?.windowStart, '13:32'),
    windowEnd: asText(rawStrip?.windowEnd, '14:32'),
    slots,
    hasGap: gapSlotsCount > 0,
    wateringCount: wateringSlots,
    gapCount: gapSlotsCount,
    summary
  };
}

function asText(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function asPositiveInt(value, fallback = null) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : fallback;
}

function parseIsoMs(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Применяет поток входящих пакетов с дедупликацией по packetId и защитой от
 * устаревших пакетов, пришедших не по порядку (например, A-101 после A-103).
 *
 * Возвращает обновленное состояние зоны и очищенную историю событий без повторов.
 */
export function reduceZonePackets(baseZone, incomingPackets = []) {
  const seenPacketIds = new Set();
  const history = [];
  let latestTelemetry = baseZone.telemetry?.deviceIso
    ? {
        packetId: baseZone.telemetry.packetId,
        deviceIso: baseZone.telemetry.deviceIso,
        deviceTime: baseZone.telemetry.deviceTime,
        receivedAt: baseZone.telemetry.receivedAt,
        ageLabel: baseZone.telemetry.ageLabel,
        freshness: baseZone.telemetry.freshness,
        flow: baseZone.flow?.state ?? 'unknown',
        wateringState: baseZone.watering?.state ?? 'unknown',
        activeOutlet: baseZone.watering?.activeOutlet ?? null,
        elapsedLabel: baseZone.watering?.elapsedLabel ?? null
      }
    : null;

  let connection = baseZone.connection?.state ?? 'offline';
  let lastLinkAt = baseZone.connection?.lastLinkAt ?? null;
  let linkNote = baseZone.connection?.note ?? '';
  let ignoredDuplicates = 0;
  let ignoredOutOfOrder = 0;

  for (const raw of incomingPackets) {
    if (!raw || typeof raw !== 'object') continue;
    const packetId = asText(raw.packetId);
    if (packetId && seenPacketIds.has(packetId)) {
      ignoredDuplicates += 1;
      continue;
    }
    if (packetId) seenPacketIds.add(packetId);

    // Сигнал наличия связи (heartbeat) обновляет только канал связи, но не свежесть телеметрии.
    if (raw.type === 'heartbeat') {
      connection = 'online';
      lastLinkAt = asText(raw.receivedAt, lastLinkAt);
      linkNote = asText(raw.note, 'Получен только сигнал связи без новых показаний');
      history.push({
        id: `evt-${packetId || history.length}`,
        packetId,
        time: asText(raw.receivedAt),
        zoneId: baseZone.id,
        text: asText(raw.eventText, 'Сигнал связи получен, телеметрия не обновлялась'),
        kind: 'warning',
        meta: 'Только канал связи'
      });
      continue;
    }

    const packetMs = parseIsoMs(raw.deviceIso);
    const currentMs = latestTelemetry ? parseIsoMs(latestTelemetry.deviceIso) : null;
    const isOutOfOrder = currentMs !== null && packetMs !== null && packetMs < currentMs;

    if (isOutOfOrder) {
      ignoredOutOfOrder += 1;
      history.push({
        id: `evt-${packetId || history.length}`,
        packetId,
        time: asText(raw.deviceTime),
        zoneId: baseZone.id,
        text: asText(raw.eventText, `Запоздалый пакет ${packetId} учтен в истории`),
        kind: 'late',
        meta: `Принят в ${asText(raw.receivedAt)}, текущее состояние не изменено`
      });
      continue;
    }

    connection = 'online';
    lastLinkAt = asText(raw.receivedAt, lastLinkAt);
    latestTelemetry = {
      packetId,
      deviceIso: asText(raw.deviceIso),
      deviceTime: asText(raw.deviceTime),
      receivedAt: asText(raw.receivedAt),
      ageLabel: asText(raw.ageLabel, 'Только что'),
      freshness: ALLOWED_FRESHNESS.has(raw.freshness) ? raw.freshness : 'fresh',
      flow: ALLOWED_FLOW.has(raw.flow) ? raw.flow : 'unknown',
      wateringState: ALLOWED_WATERING.has(raw.wateringState) ? raw.wateringState : 'unknown',
      activeOutlet: asPositiveInt(raw.activeOutlet, null),
      elapsedLabel: raw.elapsedLabel ? asText(raw.elapsedLabel) : null
    };

    if (raw.eventText) {
      history.push({
        id: `evt-${packetId || history.length}`,
        packetId,
        time: asText(raw.deviceTime),
        zoneId: baseZone.id,
        text: asText(raw.eventText),
        kind: ALLOWED_EVENT_KIND.has(raw.eventKind) ? raw.eventKind : 'info',
        meta: packetId ? `Пакет ${packetId}` : ''
      });
    }
  }

  const merged = {
    ...baseZone,
    connection: {
      state: connection,
      lastLinkAt,
      note: linkNote
    },
    telemetry: latestTelemetry
      ? {
          freshness: latestTelemetry.freshness,
          packetId: latestTelemetry.packetId,
          deviceTime: latestTelemetry.deviceTime,
          receivedAt: latestTelemetry.receivedAt,
          ageLabel: latestTelemetry.ageLabel,
          ignoredDuplicates,
          ignoredOutOfOrder
        }
      : {
          ...baseZone.telemetry,
          ignoredDuplicates,
          ignoredOutOfOrder
        },
    flow: {
      state: latestTelemetry ? latestTelemetry.flow : baseZone.flow?.state ?? 'unknown'
    },
    watering: {
      ...baseZone.watering,
      state: latestTelemetry ? latestTelemetry.wateringState : baseZone.watering?.state ?? 'unknown',
      activeOutlet: latestTelemetry ? latestTelemetry.activeOutlet : baseZone.watering?.activeOutlet ?? null,
      elapsedLabel: latestTelemetry ? latestTelemetry.elapsedLabel : baseZone.watering?.elapsedLabel ?? null
    }
  };

  return { zone: merged, derivedEvents: history };
}

function buildFlowLabel(state) {
  if (state === 'present') return 'Есть поток';
  if (state === 'absent') return 'Нет потока';
  return 'Неизвестно';
}

function buildWateringLabel(state, activeOutlet, outletsTotal) {
  if (state === 'watering') {
    return activeOutlet ? `Идет полив · выход ${activeOutlet} из ${outletsTotal}` : 'Идет полив';
  }
  if (state === 'idle') return 'Ожидание';
  return 'Неизвестно';
}

function buildConnectionLabel(state) {
  return state === 'online' ? 'На связи' : 'Нет связи';
}

function buildFreshnessLabel(freshness) {
  if (freshness === 'fresh') return 'Актуальна';
  if (freshness === 'stale') return 'Устарела';
  return 'Нет данных';
}

/**
 * Нормализует и проверяет снимок из любого адаптера (mock или HTTP).
 * Гарантирует главный инвариант безопасности отображения:
 * при потере связи или устаревании телеметрии поток и полив ВСЕГДА становятся 'unknown'.
 */
export function normalizeSnapshot(raw, { allowControl = true, closedPulseIntervals = false } = {}) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Некорректный снимок мониторинга');
  }

  const zones = Array.isArray(raw.zones)
    ? raw.zones.map((z, idx) => {
        const id = asPositiveInt(z.id, idx + 1);
        const outletsTotal = asPositiveInt(z.outletsTotal ?? z.watering?.outletsTotal, id === 1 ? 3 : 6);
        const outletLabels = Array.isArray(z.outletLabels) && z.outletLabels.length === outletsTotal
          ? z.outletLabels.map((label) => asText(label))
          : Array.from({ length: outletsTotal }, (_, i) => `К${i + 4}`);

        const connectionState = ALLOWED_CONNECTION.has(z.connection?.state) ? z.connection.state : 'offline';
        const freshness = ALLOWED_FRESHNESS.has(z.telemetry?.freshness) ? z.telemetry.freshness : 'missing';

        // Инвариант: старые или отсутствующие данные нельзя показывать как текущее состояние.
        const telemetryReliable = freshness === 'fresh' && connectionState === 'online';

        const rawFlow = ALLOWED_FLOW.has(z.flow?.state) ? z.flow.state : 'unknown';
        const rawWatering = ALLOWED_WATERING.has(z.watering?.state) ? z.watering.state : 'unknown';

        const flowState = telemetryReliable ? rawFlow : 'unknown';
        const wateringState = telemetryReliable ? rawWatering : 'unknown';
        const activeOutlet =
          telemetryReliable && wateringState === 'watering'
            ? asPositiveInt(z.watering?.activeOutlet, null)
            : null;
        const elapsedLabel =
          telemetryReliable && wateringState === 'watering' && z.watering?.elapsedLabel
            ? asText(z.watering.elapsedLabel)
            : null;

        let trustSummary = 'Данные свежие';
        let trustLevel = 'ok';
        if (connectionState === 'offline') {
          trustSummary = 'Нет связи с ША-У · текущее состояние неизвестно';
          trustLevel = 'danger';
        } else if (freshness !== 'fresh') {
          trustSummary = 'Связь есть, но телеметрия устарела · полив и поток неизвестны';
          trustLevel = 'warn';
        }

        return {
          id,
          name: asText(z.name, `Зона ${id}`),
          pumpModel: asText(z.pumpModel, id === 1 ? 'Н2 LEO AC550C2 (5,5 кВт)' : 'Н2 LEO AC400C2 (4 кВт)'),
          outletsTotal,
          outletLabels,
          telemetryReliable,
          control: allowControl ? normalizePumpControl(z.control, telemetryReliable, wateringState) : null,
          trustLevel,
          trustSummary,
          connection: {
            state: connectionState,
            label: buildConnectionLabel(connectionState),
            lastLinkAt: asText(z.connection?.lastLinkAt, '—'),
            note: asText(z.connection?.note, '')
          },
          telemetry: {
            freshness,
            label: buildFreshnessLabel(freshness),
            packetId: asText(z.telemetry?.packetId, '—'),
            deviceTime: asText(z.telemetry?.deviceTime, '—'),
            receivedAt: asText(z.telemetry?.receivedAt, '—'),
            ageLabel: asText(z.telemetry?.ageLabel, '—'),
            gapMinutes: Number.isFinite(Number(z.telemetry?.gapMinutes)) ? Number(z.telemetry.gapMinutes) : 0,
            ignoredDuplicates: Number(z.telemetry?.ignoredDuplicates || 0),
            ignoredOutOfOrder: Number(z.telemetry?.ignoredOutOfOrder || 0)
          },
          flow: {
            state: flowState,
            label: buildFlowLabel(flowState),
            sensorNote: 'FS1 фиксирует только наличие потока, не расход'
          },
          watering: {
            state: wateringState,
            label: buildWateringLabel(wateringState, activeOutlet, outletsTotal),
            shortLabel: wateringState === 'watering' ? 'Идет полив' : wateringState === 'idle' ? 'Ожидание' : 'Неизвестно',
            activeOutlet,
            activeOutletLabel: activeOutlet ? outletLabels[activeOutlet - 1] ?? `Выход ${activeOutlet}` : null,
            elapsedLabel
          },
          localInstruments: Array.isArray(z.localInstruments)
            ? z.localInstruments.map((item) => ({
                label: asText(item.label),
                note: asText(item.note)
              }))
            : [
                { label: 'pH / EC (HM-100)', note: 'Только локальное табло, в телеметрию не передается' },
                { label: 'Уровень Е4', note: 'Датчик не входит в базовый состав' }
              ],
          pulseStrip: normalizePulseStrip(
            z.pulseStrip,
            telemetryReliable,
            Number.isFinite(Number(z.telemetry?.gapMinutes)) ? Number(z.telemetry?.gapMinutes) : 0,
            wateringState,
            closedPulseIntervals
          )
        };
      })
    : [];

  const events = Array.isArray(raw.events)
    ? raw.events.map((evt, index) => ({
        id: asText(evt.id, `event-${index}`),
        packetId: asText(evt.packetId, ''),
        time: asText(evt.time, '—'),
        zoneId: asPositiveInt(evt.zoneId ?? evt.zone, 1),
        text: asText(evt.text, ''),
        kind: ALLOWED_EVENT_KIND.has(evt.kind) ? evt.kind : 'info',
        meta: asText(evt.meta, ''),
        controlEvent: asText(evt.controlEvent, ''),
        controlValue: asText(evt.controlValue, ''),
        gapLabel: asText(evt.gapLabel, '')
      }))
    : [];

  return {
    sourceLabel: asText(raw.sourceLabel, 'Синтетический адаптер'),
    siteId: asText(raw.siteId, 'srb-pilot-1'),
    siteName: asText(raw.siteName, 'Теплица · Пилот (Сербия)'),
    scenarioId: asText(raw.scenarioId, 'incident'),
    scenarioTitle: asText(raw.scenarioTitle, 'Снимок мониторинга'),
    nowLabel: asText(raw.nowLabel, '—'),
    timezoneLabel: asText(raw.timezoneLabel, 'Локальное время примера'),
    isSynthetic: Boolean(raw.isSynthetic ?? true),
    zones,
    events
  };
}
