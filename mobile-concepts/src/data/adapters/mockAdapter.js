// Тестовый адаптер мониторинга и управления на синтетических данных.
// Поддерживает 2-зонный пилот (по умолчанию) и демо-объект на 4 зоны для проверки масштабирования UI.

import { normalizeSnapshot, reduceZonePackets } from '../contract.js?v=9';
import { controlError, createDemoPumpController, createDemoSchedules } from './mockPumpControl.js';

const SITES = [
  { id: 'srb-pilot-1', name: 'Теплица · Пилот (2 зоны)', shortName: '2 зоны (пилот)', region: 'Сербия · стенд' },
  { id: 'srb-pilot-2', name: 'Участок Б · Резерв (2 зоны)', shortName: 'Участок Б (2 зоны)', region: 'Демо-объект #2' },
  { id: 'srb-scale-4', name: 'Масштаб · 4 зоны (демо)', shortName: '4 зоны (масштаб)', region: 'Проверка сетки' }
];

const SCENARIOS_META = [
  { id: 'normal', label: 'Обе в норме', shortLabel: 'Норма' },
  { id: 'incident', label: 'Полив + нет связи', shortLabel: 'Полив + обрыв' },
  { id: 'stale-online', label: 'Связь есть, пакет старый', shortLabel: 'Связь / старый пакет' }
];

// Строит 30 слотов по 2 минуты (итого 60 минут истории)
function makeSlots(patternRuns) {
  const slots = [];
  for (const [state, count] of patternRuns) {
    for (let i = 0; i < count; i += 1) slots.push(state);
  }
  while (slots.length < 30) slots.push('idle');
  return slots.slice(0, 30);
}

function createBaseZones(siteId) {
  const isSecondSite = siteId === 'srb-pilot-2';
  const isFourZones = siteId === 'srb-scale-4';

  const baseTwo = [
    {
      id: 1,
      name: isSecondSite ? 'Зона Б-1' : 'Зона 1',
      pumpModel: 'Н2 LEO AC550C2 · 5,5 кВт',
      outletsTotal: 3,
      outletLabels: ['К4', 'К5', 'К6'],
      connection: { state: 'online', lastLinkAt: '14:31:50', note: 'Канал ША-У стабилен' },
      telemetry: {
        freshness: 'fresh',
        packetId: 'P-410',
        deviceTime: '14:31:50',
        receivedAt: '14:31:52',
        ageLabel: '10 с назад',
        gapMinutes: 0
      },
      flow: { state: 'absent' },
      watering: { state: 'idle', activeOutlet: null, elapsedLabel: null },
      pulseStrip: {
        windowStart: '13:32',
        windowEnd: '14:32',
        slots: makeSlots([['idle', 16], ['watering', 8], ['idle', 6]]),
        summary: 'Полив 14:04–14:20 (К4)'
      }
    },
    {
      id: 2,
      name: isSecondSite ? 'Зона Б-2' : 'Зона 2',
      pumpModel: 'Н2 LEO AC400C2 · 4 кВт',
      outletsTotal: 6,
      outletLabels: ['К4', 'К5', 'К6', 'К7', 'К8', 'К9'],
      connection: { state: 'online', lastLinkAt: '14:31:45', note: 'Канал ША-У стабилен' },
      telemetry: {
        freshness: 'fresh',
        packetId: 'P-409',
        deviceTime: '14:31:45',
        receivedAt: '14:31:47',
        ageLabel: '15 с назад',
        gapMinutes: 0
      },
      flow: { state: 'absent' },
      watering: { state: 'idle', activeOutlet: null, elapsedLabel: null },
      pulseStrip: {
        windowStart: '13:32',
        windowEnd: '14:32',
        slots: makeSlots([['idle', 11], ['watering', 8], ['idle', 11]]),
        summary: 'Полив 13:54–14:10 (К6)'
      }
    }
  ];

  if (!isFourZones) return baseTwo;

  return [
    ...baseTwo,
    {
      id: 3,
      name: 'Зона 3',
      pumpModel: 'Н2 LEO AC400C2 · 4 кВт (демо)',
      outletsTotal: 4,
      outletLabels: ['К4', 'К5', 'К6', 'К7'],
      connection: { state: 'online', lastLinkAt: '14:31:48', note: 'Канал ША-У стабилен' },
      telemetry: {
        freshness: 'fresh',
        packetId: 'P-412',
        deviceTime: '14:31:48',
        receivedAt: '14:31:50',
        ageLabel: '12 с назад',
        gapMinutes: 0
      },
      flow: { state: 'absent' },
      watering: { state: 'idle', activeOutlet: null, elapsedLabel: null },
      pulseStrip: {
        windowStart: '13:32',
        windowEnd: '14:32',
        slots: makeSlots([['idle', 30]]),
        summary: 'За последний час не поливалась'
      }
    },
    {
      id: 4,
      name: 'Зона 4',
      pumpModel: 'Н2 LEO AC550C2 · 5,5 кВт (демо)',
      outletsTotal: 6,
      outletLabels: ['К4', 'К5', 'К6', 'К7', 'К8', 'К9'],
      connection: { state: 'online', lastLinkAt: '14:31:40', note: 'Канал ША-У стабилен' },
      telemetry: {
        freshness: 'fresh',
        packetId: 'P-411',
        deviceTime: '14:31:40',
        receivedAt: '14:31:42',
        ageLabel: '20 с назад',
        gapMinutes: 0
      },
      flow: { state: 'absent' },
      watering: { state: 'idle', activeOutlet: null, elapsedLabel: null },
      pulseStrip: {
        windowStart: '13:32',
        windowEnd: '14:32',
        slots: makeSlots([['idle', 4], ['watering', 9], ['idle', 17]]),
        summary: 'Полив 13:40–13:58 (К5)'
      }
    }
  ];
}

function buildScenarioRaw(siteId, scenarioId, adapterTag) {
  const site = SITES.find((s) => s.id === siteId) ?? SITES[0];
  const zones = createBaseZones(site.id);
  const [z1, z2, z3, z4] = zones;

  if (scenarioId === 'normal') {
    if (site.id === 'srb-pilot-2') {
      z1.telemetry.ageLabel = '18 с назад';
      z2.telemetry.ageLabel = '24 с назад';
    }
    return {
      sourceLabel: adapterTag,
      siteId: site.id,
      siteName: site.name,
      scenarioId: 'normal',
      scenarioTitle: 'Все зоны в норме',
      nowLabel: '14:32',
      timezoneLabel: 'Фиксированное время примера',
      isSynthetic: true,
      zones,
      events: [
        { id: 'n-1', packetId: 'P-404', time: '14:20', zoneId: 1, text: 'Полив завершен, реле FS1: нет потока', kind: 'info', meta: 'Выход К4' },
        { id: 'n-2', packetId: 'P-398', time: '14:10', zoneId: 2, text: 'Полив завершен, реле FS1: нет потока', kind: 'info', meta: 'Выход К6' },
        { id: 'n-3', packetId: 'P-391', time: '14:04', zoneId: 1, text: 'Начат полив участка 1 (К4)', kind: 'info', meta: 'FS1 подтвердил поток' }
      ]
    };
  }

  if (scenarioId === 'stale-online') {
    const z1Initial = {
      ...z1,
      connection: { state: 'offline', lastLinkAt: '11:40:00', note: 'Ожидание пакета' },
      telemetry: { freshness: 'stale', packetId: 'A-099', deviceTime: '11:40:00', receivedAt: '11:40:03', ageLabel: '26 мин назад', gapMinutes: 26 },
      flow: { state: 'unknown' },
      watering: { state: 'unknown', activeOutlet: null, elapsedLabel: null }
    };
    const z2Initial = {
      ...z2,
      connection: { state: 'offline', lastLinkAt: '11:38:00', note: 'Ожидание телеметрии' },
      telemetry: { freshness: 'stale', packetId: 'B-204', deviceTime: '11:38:00', receivedAt: '11:38:04', ageLabel: '28 мин назад', gapMinutes: 28 },
      flow: { state: 'unknown' },
      watering: { state: 'unknown', activeOutlet: null, elapsedLabel: null }
    };

    const r1 = reduceZonePackets(z1Initial, [
      {
        packetId: 'A-103',
        deviceIso: '2026-11-22T12:05:00Z',
        deviceTime: '12:05:00',
        receivedAt: '12:05:02',
        ageLabel: '1 мин назад',
        freshness: 'fresh',
        flow: 'present',
        wateringState: 'watering',
        activeOutlet: 1,
        elapsedLabel: '4 мин',
        eventText: 'Пакет A-103: идет полив К4, FS1 подтверждает поток',
        eventKind: 'info'
      },
      {
        packetId: 'A-101',
        deviceIso: '2026-11-22T12:01:00Z',
        deviceTime: '12:01:00',
        receivedAt: '12:05:40',
        freshness: 'stale',
        flow: 'absent',
        wateringState: 'idle',
        eventText: 'Запоздалый пакет A-101 (12:01, без потока) записан 1 раз',
        eventKind: 'late'
      },
      {
        packetId: 'A-101',
        deviceIso: '2026-11-22T12:01:00Z',
        deviceTime: '12:01:00',
        receivedAt: '12:05:55',
        freshness: 'stale',
        flow: 'absent',
        wateringState: 'idle',
        eventText: 'ДУБЛИКАТ НЕ ДОЛЖЕН ПОПАСТЬ В ИСТОРИЮ'
      }
    ]);

    const r2 = reduceZonePackets(z2Initial, [
      {
        type: 'heartbeat',
        packetId: 'HB-901',
        receivedAt: '12:06:00',
        note: 'Сигнал связи получен в 12:06, но свежей телеметрии нет с 11:38',
        eventText: 'Связь восстановлена (heartbeat), телеметрия остается устаревшей'
      }
    ]);

    r1.zone.pulseStrip = {
      windowStart: '11:06',
      windowEnd: '12:06',
      slots: makeSlots([['idle', 10], ['gap', 16], ['idle', 2], ['watering', 2]]),
      summary: 'Свежий полив К4 с 12:02 (после паузы связи)'
    };
    r2.zone.pulseStrip = {
      windowStart: '11:06',
      windowEnd: '12:06',
      slots: makeSlots([['idle', 6], ['watering', 6], ['idle', 4], ['gap', 14]]),
      summary: 'Нет свежей телеметрии 28 мин (канал жив)'
    };

    const extraZones = [];
    if (z3) {
      extraZones.push({
        ...z3,
        telemetry: { ...z3.telemetry, deviceTime: '12:05:20', receivedAt: '12:05:22', ageLabel: '40 с назад' },
        pulseStrip: {
          windowStart: '11:06',
          windowEnd: '12:06',
          slots: makeSlots([['idle', 30]]),
          summary: 'За последний час не поливалась'
        }
      });
    }
    if (z4) {
      extraZones.push({
        ...z4,
        telemetry: { ...z4.telemetry, deviceTime: '12:05:10', receivedAt: '12:05:12', ageLabel: '50 с назад' },
        pulseStrip: {
          windowStart: '11:06',
          windowEnd: '12:06',
          slots: makeSlots([['idle', 8], ['watering', 7], ['idle', 15]]),
          summary: 'Полив 11:22–11:36 (К5)'
        }
      });
    }

    return {
      sourceLabel: adapterTag,
      siteId: site.id,
      siteName: site.name,
      scenarioId: 'stale-online',
      scenarioTitle: 'Связь есть, но пакет старый + порядок пакетов',
      nowLabel: '12:06',
      timezoneLabel: 'UTC · сценарий приемки из аудита',
      isSynthetic: true,
      zones: [r1.zone, r2.zone, ...extraZones],
      events: [
        r2.derivedEvents[0],
        {
          id: 'gap-z2-audit',
          time: '11:38–12:06',
          zoneId: 2,
          text: 'Нет новых пакетов телеметрии 28 мин при живом канале связи',
          kind: 'gap',
          gapLabel: 'Разрыв телеметрии · 28 мин',
          meta: 'Поток FS1 и полив удерживаются в статусе «Неизвестно»'
        },
        r1.derivedEvents[0],
        r1.derivedEvents[1]
      ]
    };
  }

  // Базовый сценарий incident ("Полив + нет связи")
  const z1Active = {
    ...z1,
    telemetry: {
      freshness: 'fresh',
      packetId: 'P-418',
      deviceTime: '14:31:50',
      receivedAt: '14:31:52',
      ageLabel: '10 с назад',
      gapMinutes: 0
    },
    flow: { state: 'present' },
    watering: {
      state: 'watering',
      activeOutlet: site.id === 'srb-pilot-2' ? 3 : 2,
      elapsedLabel: site.id === 'srb-pilot-2' ? '12 мин' : '8 мин'
    },
    pulseStrip: {
      windowStart: '13:32',
      windowEnd: '14:32',
      slots: makeSlots([['idle', 12], ['watering', 7], ['idle', 7], ['watering', 4]]),
      summary: 'Идет полив К5 (8 мин) · ранее К4'
    }
  };

  const z2Lost = {
    ...z2,
    connection: { state: 'offline', lastLinkAt: '14:10:00', note: 'Шкаф ША-У не отвечает по каналу' },
    telemetry: {
      freshness: 'stale',
      packetId: 'P-399',
      deviceTime: '14:10:00',
      receivedAt: '14:10:02',
      ageLabel: '22 мин назад',
      gapMinutes: 22
    },
    flow: { state: 'present' },
    watering: { state: 'watering', activeOutlet: 4, elapsedLabel: '3 мин' },
    pulseStrip: {
      windowStart: '13:32',
      windowEnd: '14:32',
      slots: makeSlots([['idle', 19], ['gap', 11]]),
      summary: 'Нет данных 22 мин · ранее без полива'
    }
  };

  const outZones = [z1Active, z2Lost];
  const outEvents = [
    {
      id: 'i-gap',
      time: '14:10–14:32',
      zoneId: 2,
      text: 'Нет пакетов от ША-У 22 минуты',
      kind: 'gap',
      gapLabel: 'Разрыв связи и телеметрии · 22 мин',
      meta: 'Последнее известное состояние скрыто, показано «Неизвестно»'
    },
    {
      id: 'i-1',
      packetId: 'P-415',
      time: '14:24',
      zoneId: 1,
      text: `Начат полив участка ${z1Active.watering.activeOutlet} (${z1Active.outletLabels[z1Active.watering.activeOutlet - 1]})`,
      kind: 'info',
      meta: 'FS1 подтвердил наличие потока'
    },
    {
      id: 'i-2',
      time: '14:12',
      zoneId: 2,
      text: 'Новые данные не поступают, канал связи потерян',
      kind: 'warning',
      meta: 'Превышен порог ожидания пакета'
    },
    {
      id: 'i-3',
      packetId: 'P-399',
      time: '14:10',
      zoneId: 2,
      text: 'Получен последний пакет данных до потери связи',
      kind: 'info',
      meta: 'Пакет P-399'
    }
  ];

  if (z3 && z4) {
    outZones.push(
      {
        ...z3,
        pulseStrip: {
          windowStart: '13:32',
          windowEnd: '14:32',
          slots: makeSlots([['idle', 30]]),
          summary: 'Не поливалась за последний час'
        }
      },
      {
        ...z4,
        flow: { state: 'present' },
        watering: { state: 'watering', activeOutlet: 3, elapsedLabel: '5 мин' },
        pulseStrip: {
          windowStart: '13:32',
          windowEnd: '14:32',
          slots: makeSlots([['idle', 27], ['watering', 3]]),
          summary: 'Идет полив К6 (5 мин)'
        }
      }
    );
    outEvents.splice(1, 0, {
      id: 'i-z4',
      packetId: 'P-416',
      time: '14:27',
      zoneId: 4,
      text: 'Начат полив участка 3 (К6)',
      kind: 'info',
      meta: 'FS1 подтвердил наличие потока'
    });
  }

  return {
    sourceLabel: adapterTag,
    siteId: site.id,
    siteName: site.name,
    scenarioId: 'incident',
    scenarioTitle: 'Полив в Зоне 1 + потеря связи с Зоной 2',
    nowLabel: '14:32',
    timezoneLabel: 'Фиксированное время примера',
    isSynthetic: true,
    zones: outZones,
    events: outEvents
  };
}

function formatClockHM(totalSeconds) {
  const wrapped = ((totalSeconds % 86400) + 86400) % 86400;
  const h = String(Math.floor(wrapped / 3600)).padStart(2, '0');
  const m = String(Math.floor((wrapped % 3600) / 60)).padStart(2, '0');
  return `${h}:${m}`;
}

function formatClockHMS(totalSeconds) {
  const wrapped = ((totalSeconds % 86400) + 86400) % 86400;
  const h = String(Math.floor(wrapped / 3600)).padStart(2, '0');
  const m = String(Math.floor((wrapped % 3600) / 60)).padStart(2, '0');
  const s = String(wrapped % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatElapsedTimer(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function parseMinutesFromLabel(label, fallback = 5) {
  const match = String(label || '').match(/(\d+)/);
  return match ? Number(match[1]) : fallback;
}

function pulseState(zone) {
  if (zone.connection.state !== 'online' || zone.telemetry.freshness !== 'fresh') return 'gap';
  return zone.watering.state === 'unknown' ? 'gap' : zone.watering.state;
}

function createLiveSimulator(siteId, scenarioId, adapterTag, schedules) {
  const raw = buildScenarioRaw(siteId, scenarioId, adapterTag);
  const [hh, mm] = String(raw.nowLabel || '14:32').split(':').map(Number);
  let simSeconds = (Number.isFinite(hh) ? hh : 14) * 3600 + (Number.isFinite(mm) ? mm : 32) * 60;
  let packetSeq = 420;
  let eventSeq = 1;
  let tickCount = 0;
  let scriptStep = 0;

  // Храним живые секундные счетчики поверх raw.zones
  const zoneMeta = new Map(
    raw.zones.map((z) => {
      const isWater = z.watering?.state === 'watering' && z.connection?.state === 'online' && z.telemetry?.freshness === 'fresh';
      const isFresh = z.connection?.state === 'online' && z.telemetry?.freshness === 'fresh';
      return [
        z.id,
        {
          ageSec: isFresh ? parseMinutesFromLabel(z.telemetry?.ageLabel, 12) : (z.telemetry?.gapMinutes ?? 22) * 60,
          elapsedSec: isWater ? parseMinutesFromLabel(z.watering?.elapsedLabel, 6) * 60 : 0,
          currentSlot: pulseState(z)
        }
      ];
    })
  );

  function observeSlot(zone) {
    const meta = zoneMeta.get(zone.id);
    const sample = pulseState(zone);
    if (meta.currentSlot === null || sample === 'gap' || (sample === 'watering' && meta.currentSlot !== 'gap')) {
      meta.currentSlot = sample;
    }
  }

  function closeSlots() {
    for (const zone of raw.zones) {
      const meta = zoneMeta.get(zone.id);
      const strip = zone.pulseStrip;
      strip.slots = [...strip.slots.slice(1), meta.currentSlot];
      strip.windowEnd = formatClockHM(simSeconds);
      strip.windowStart = formatClockHM(simSeconds - 3600);
      meta.currentSlot = null;
    }
  }

  function prependEvent(evt) {
    raw.events = [evt, ...raw.events].slice(0, 14);
  }

  function record(zone, controlEvent, text, controlValue = '') {
    const warning = ['scheduleSkipped', 'commandInterrupted'].includes(controlEvent);
    const event = {
      id: `command-${eventSeq++}`, zoneId: zone.id, time: formatClockHM(simSeconds),
      controlEvent, controlValue, text, kind: warning ? 'warning' : 'info'
    };
    prependEvent(event);
    return { ...event, tone: warning ? 'warn' : 'ok' };
  }

  const pumps = createDemoPumpController({
    siteId, zones: raw.zones, schedules, seconds: () => simSeconds,
    water: setZoneWatering, idle: setZoneIdle, record
  });

  function setZoneWatering(zone, outletIdx, reasonText, controlEvent, controlValue) {
    const meta = zoneMeta.get(zone.id);
    const outletLabel = zone.outletLabels[outletIdx - 1] ?? `К${outletIdx + 3}`;
    const pid = `P-${packetSeq++}`;
    const hms = formatClockHMS(simSeconds);
    const hm = formatClockHM(simSeconds);
    zone.connection = { state: 'online', lastLinkAt: hms, note: 'Канал ША-У стабилен' };
    zone.telemetry = {
      freshness: 'fresh',
      packetId: pid,
      deviceTime: hms,
      receivedAt: hms,
      ageLabel: '1 с назад',
      gapMinutes: 0
    };
    zone.flow = { state: 'present' };
    zone.control.contactor = 'on';
    zone.control.phase = 'watering';
    zone.watering = { state: 'watering', activeOutlet: outletIdx, elapsedLabel: '0:01' };
    if (meta) {
      meta.ageSec = 1;
      meta.elapsedSec = 1;
    }
    observeSlot(zone);
    zone.pulseStrip.summary = `Идет полив ${outletLabel} (0:01)`;
    prependEvent({
      id: `live-${eventSeq++}`,
      packetId: pid,
      time: hm,
      zoneId: zone.id,
      text: reasonText || `Начат полив участка ${outletIdx} (${outletLabel})`,
      controlEvent, controlValue,
      kind: 'info',
      meta: 'FS1 подтвердил наличие потока'
    });
    return {
      zoneId: zone.id,
      controlEvent, controlValue,
      tone: 'water',
      text: `${zone.name} · ${reasonText || `Полив ${outletLabel}`} (FS1)`
    };
  }

  function setZoneIdle(zone, reasonText, controlEvent, controlValue) {
    const meta = zoneMeta.get(zone.id);
    const pid = `P-${packetSeq++}`;
    const hms = formatClockHMS(simSeconds);
    const hm = formatClockHM(simSeconds);
    zone.connection = { state: 'online', lastLinkAt: hms, note: 'Канал ША-У стабилен' };
    zone.telemetry = {
      freshness: 'fresh',
      packetId: pid,
      deviceTime: hms,
      receivedAt: hms,
      ageLabel: '1 с назад',
      gapMinutes: 0
    };
    zone.flow = { state: 'absent' };
    zone.control.contactor = 'off';
    zone.control.phase = 'idle';
    zone.watering = { state: 'idle', activeOutlet: null, elapsedLabel: null };
    if (meta) {
      meta.ageSec = 1;
      meta.elapsedSec = 0;
    }
    observeSlot(zone);
    zone.pulseStrip.summary = 'Простой · ожидание следующего цикла';
    prependEvent({
      id: `live-${eventSeq++}`,
      packetId: pid,
      time: hm,
      zoneId: zone.id,
      text: reasonText || 'Полив завершен, переход в простой (ожидание)',
      controlEvent, controlValue,
      kind: 'info',
      meta: 'Реле FS1: нет потока'
    });
    return {
      zoneId: zone.id,
      controlEvent, controlValue,
      tone: 'ok',
      text: `${zone.name} · ${reasonText || 'Переход в простой'}`
    };
  }

  function setZoneOffline(zone) {
    pumps.interrupt(zone);
    const meta = zoneMeta.get(zone.id);
    const hm = formatClockHM(simSeconds);
    const hms = formatClockHMS(simSeconds);
    zone.connection = { state: 'offline', lastLinkAt: hms, note: 'Шкаф ША-У не отвечает по каналу' };
    zone.telemetry = {
      ...zone.telemetry,
      freshness: 'stale',
      ageLabel: '1 мин назад',
      gapMinutes: 1
    };
    zone.flow = { state: 'unknown' };
    zone.watering = { state: 'unknown', activeOutlet: null, elapsedLabel: null };
    if (meta) {
      meta.ageSec = 60;
      meta.elapsedSec = 0;
    }
    observeSlot(zone);
    zone.pulseStrip.summary = 'Разрыв связи · состояние скрыто';
    prependEvent({
      id: `live-${eventSeq++}`,
      time: hm,
      zoneId: zone.id,
      text: 'Потеря связи с ША-У, данные переведены в «Неизвестно»',
      kind: 'gap',
      gapLabel: 'Разрыв связи · сейчас',
      meta: 'Последнее известное состояние скрыто'
    });
    return {
      zoneId: zone.id,
      tone: 'danger',
      text: `${zone.name} · Потеря связи (статус скрыт)`
    };
  }

  function scenarioWater(zone, outlet, text) {
    return pumps.allowsScript(zone) ? setZoneWatering(zone, outlet, text) : null;
  }

  function scenarioIdle(zone, text, restoreLink = false) {
    const recovering = restoreLink && (zone.connection.state !== 'online' || zone.telemetry.freshness !== 'fresh');
    return pumps.allowsScript(zone) || recovering ? setZoneIdle(zone, text) : null;
  }

  function step() {
    tickCount += 1;
    simSeconds += 1;
    raw.nowLabel = formatClockHM(simSeconds);
    const changedZoneIds = [];
    let liveEvent = null;
    if (simSeconds % 120 === 0) {
      closeSlots();
      changedZoneIds.push(...raw.zones.map((z) => z.id));
    }

    // 1. Обновляем живые таймеры каждой зоны
    for (const z of raw.zones) {
      const meta = zoneMeta.get(z.id);
      if (!meta) continue;
      const isReliable = z.connection.state === 'online' && z.telemetry.freshness === 'fresh';
      if (isReliable) {
        meta.ageSec += 1;
        // Периодический свежий heartbeat каждые 12 с
        if (meta.ageSec >= 12) {
          meta.ageSec = 1;
          z.telemetry.packetId = `P-${packetSeq++}`;
          z.telemetry.deviceTime = formatClockHMS(simSeconds);
          z.telemetry.receivedAt = z.telemetry.deviceTime;
        }
        z.telemetry.ageLabel = `${meta.ageSec} с назад`;

        if (z.watering.state === 'watering') {
          meta.elapsedSec += 1;
          z.watering.elapsedLabel = formatElapsedTimer(meta.elapsedSec);
          const lbl = z.outletLabels[(z.watering.activeOutlet ?? 1) - 1] ?? 'К4';
          z.pulseStrip.summary = `Идет полив ${lbl} (${z.watering.elapsedLabel})`;
        }
      } else {
        meta.ageSec += 1;
        const mins = Math.max(1, Math.floor(meta.ageSec / 60));
        z.telemetry.gapMinutes = mins;
        z.telemetry.ageLabel = `${mins} мин назад`;
      }
      const previousSchedule = z.control.scheduleTime;
      const event = pumps.step(z, raw.nowLabel);
      if (event || previousSchedule !== z.control.scheduleTime) changedZoneIds.push(z.id);
      if (event) liveEvent = event;
    }

    // 2. Каждые 6 секунд генерируем заметное живое событие (полив / смена клапана / простой / связь)
    if (tickCount % 6 === 0) {
      const z1 = raw.zones[0];
      const z2 = raw.zones[1];
      const z3 = raw.zones[2];
      const z4 = raw.zones[3];
      const isNormal = scenarioId === 'normal';

      const actions = isNormal
        ? [
            () => z1 && scenarioWater(z1, 1, 'Запущен полив участка 1 (К4)'),
            () => (z3 ? scenarioWater(z3, 2, 'Запущен полив участка 2 (К5)') : z2 && scenarioWater(z2, 2, 'Запущен полив участка 2 (К5)')),
            () => z1 && scenarioIdle(z1, 'Полив К4 завершен, режим простоя'),
            () => (z4 ? scenarioWater(z4, 4, 'Запущен полив участка 4 (К7)') : z2 && scenarioIdle(z2, 'Полив завершен, простой')),
            () => (z3 ? scenarioIdle(z3, 'Полив К5 завершен, простой') : z1 && scenarioWater(z1, 2, 'Переход на участок 2 (К5)')),
            () => (z4 ? scenarioIdle(z4, 'Полив К7 завершен, простой') : z1 && scenarioIdle(z1, 'Цикл завершен, простой'))
          ]
        : [
            () => (z3 ? scenarioWater(z3, 1, 'Выход из простоя: начат полив К4') : z1 && scenarioWater(z1, 3, 'Переход на участок 3 (К6)')),
            () => z1 && scenarioWater(z1, 3, 'Переход полива на выход К6'),
            () => (z4 ? scenarioIdle(z4, 'Полив К6 завершен, переход в простой') : z1 && scenarioIdle(z1, 'Полив завершен, переход в простой')),
            () => z1 && scenarioIdle(z1, 'Цикл завершен, зона в простое'),
            () => z2 && scenarioIdle(z2, 'Связь с ША-У восстановлена, простой', true),
            () => z2 && scenarioWater(z2, 1, 'Начат полив участка 1 (К4)'),
            () => (z3 ? scenarioIdle(z3, 'Полив К4 завершен, простой') : z2 && scenarioIdle(z2, 'Полив завершен, простой')),
            () => (z4 ? scenarioWater(z4, 4, 'Начат полив участка 4 (К7)') : z1 && scenarioWater(z1, 2, 'Начат полив участка 2 (К5)')),
            () => z2 && setZoneOffline(z2)
          ];

      const fn = actions[scriptStep % actions.length];
      scriptStep += 1;
      const evt = fn?.();
      if (evt) {
        liveEvent = evt;
        changedZoneIds.push(evt.zoneId);
      }
    }

    raw.zones.forEach(observeSlot);
    return {
      snapshot: normalizeSnapshot(raw, { closedPulseIntervals: true }),
      liveEvent,
      changedZoneIds,
      tickOnly: changedZoneIds.length === 0 && !liveEvent
    };
  }

  return {
    getSnapshot() {
      raw.zones.forEach(pumps.syncSchedule);
      return normalizeSnapshot(raw, { closedPulseIntervals: true });
    },
    command: pumps.command,
    step
  };
}

export function createMockAdapter({ label = 'Синтетика (Mock A)', storage } = {}) {
  const schedules = createDemoSchedules(storage);
  const sessions = new Map();

  function sessionFor(siteId, scenarioId) {
    const key = `${siteId}/${scenarioId}`;
    if (!sessions.has(key)) {
      const sim = createLiveSimulator(siteId, scenarioId, label, schedules);
      sessions.set(key, { sim, listeners: new Set(), timer: null });
    }
    return sessions.get(key);
  }

  return {
    id: 'mock',
    label,
    getSites() {
      return SITES.map((s) => ({ ...s }));
    },
    getScenarios() {
      return SCENARIOS_META.map((s) => ({ ...s }));
    },
    async getSnapshot({ siteId = SITES[0].id, scenarioId = 'incident' } = {}) {
      return sessionFor(siteId, scenarioId).sim.getSnapshot();
    },
    async commandZone({ siteId, scenarioId, zoneId, action, time } = {}) {
      if (!SITES.some((s) => s.id === siteId) || !SCENARIOS_META.some((s) => s.id === scenarioId)) {
        throw controlError('unavailable');
      }
      const { sim, listeners } = sessionFor(siteId, scenarioId);
      const publish = () => {
        const snapshot = sim.getSnapshot();
        for (const listener of listeners) listener({ snapshot, changedZoneIds: [zoneId], liveEvent: null });
        return snapshot;
      };
      try {
        await sim.command(zoneId, action, time, publish);
      } catch (error) {
        publish();
        throw error;
      }
      return publish();
    },
    subscribe({ siteId = SITES[0].id, scenarioId = 'incident', intervalMs = 1000, onUpdate } = {}) {
      if (typeof onUpdate !== 'function') return () => {};
      const session = sessionFor(siteId, scenarioId);
      session.listeners.add(onUpdate);
      if (session.timer === null) {
        session.timer = setInterval(() => {
          const payload = session.sim.step();
          for (const listener of session.listeners) listener(payload);
        }, intervalMs);
      }
      return () => {
        session.listeners.delete(onUpdate);
        if (session.listeners.size === 0) {
          clearInterval(session.timer);
          session.timer = null;
        }
      };
    },
    async getFleetSnapshots({ scenarioId = 'incident' } = {}) {
      const fleetSpecs = [
        {
          id: 'belgrade-north',
          name: 'Белград · Север',
          region: 'Площадка 1',
          mode: scenarioId === 'normal' ? 'normal' : scenarioId === 'stale-online' ? 'stale-online' : 'incident-2z'
        },
        {
          id: 'pancevo-east',
          name: 'Панчево · Восток',
          region: 'Площадка 2',
          mode: scenarioId === 'normal' ? 'normal-3z' : 'stale-online-3z'
        },
        {
          id: 'novi-sad-south',
          name: 'Нови-Сад · Юг',
          region: 'Площадка 3',
          mode: scenarioId === 'incident' ? 'watering-2z' : 'normal'
        },
        {
          id: 'subotica-center',
          name: 'Суботица · Центр',
          region: 'Площадка 4',
          mode: 'normal-4z'
        }
      ];

      return fleetSpecs.map((spec) => {
        if (spec.mode === 'incident-2z') {
          const raw = buildScenarioRaw('srb-pilot-1', 'incident', label);
          return normalizeSnapshot({ ...raw, siteId: spec.id, siteName: spec.name });
        }
        if (spec.mode === 'stale-online') {
          const raw = buildScenarioRaw('srb-pilot-1', 'stale-online', label);
          return normalizeSnapshot({ ...raw, siteId: spec.id, siteName: spec.name });
        }
        if (spec.mode === 'stale-online-3z') {
          const raw = buildScenarioRaw('srb-scale-4', 'stale-online', label);
          return normalizeSnapshot({
            ...raw,
            siteId: spec.id,
            siteName: spec.name,
            zones: raw.zones.slice(0, 3)
          });
        }
        if (spec.mode === 'watering-2z') {
          const raw = buildScenarioRaw('srb-pilot-2', 'incident', label);
          // Делаем обе зоны на связи, Зона 1 поливает, Зона 2 в ожидании
          raw.zones[1] = {
            ...createBaseZones('srb-pilot-2')[1],
            pulseStrip: {
              windowStart: '13:32',
              windowEnd: '14:32',
              slots: makeSlots([['idle', 30]]),
              summary: 'Не поливалась за последний час'
            }
          };
          raw.events = [
            { id: 'ns-1', packetId: 'N-212', time: '14:20', zoneId: 1, text: 'Начат полив участка 3 (К6)', kind: 'info', meta: 'FS1 подтвердил поток' }
          ];
          return normalizeSnapshot({ ...raw, siteId: spec.id, siteName: spec.name });
        }
        if (spec.mode === 'normal-3z') {
          const raw = buildScenarioRaw('srb-scale-4', 'normal', label);
          return normalizeSnapshot({ ...raw, siteId: spec.id, siteName: spec.name, zones: raw.zones.slice(0, 3) });
        }
        if (spec.mode === 'normal-4z') {
          const raw = buildScenarioRaw('srb-scale-4', 'normal', label);
          return normalizeSnapshot({ ...raw, siteId: spec.id, siteName: spec.name });
        }
        const raw = buildScenarioRaw('srb-pilot-1', 'normal', label);
        return normalizeSnapshot({ ...raw, siteId: spec.id, siteName: spec.name });
      });
    }
  };
}
