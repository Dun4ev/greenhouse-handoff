// Вариант 1: «Гидравлическая лента» (Инженерная микро-схема тракта).
// Получает только нормализованный snapshot из единого контракта.

import { el, svgEl } from '../ui/dom.js';

function makePipeSvg(flowState) {
  const cls =
    flowState === 'present'
      ? 'fs-pipe-svg fs-pipe-svg--active'
      : flowState === 'absent'
        ? 'fs-pipe-svg fs-pipe-svg--idle'
        : 'fs-pipe-svg fs-pipe-svg--broken';

  const svg = svgEl('svg', {
    class: cls,
    viewBox: '0 0 64 20',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  if (flowState === 'unknown') {
    svg.appendChild(svgEl('line', { x1: '2', y1: '10', x2: '22', y2: '10', class: 'fs-pipe-dash' }));
    svg.appendChild(svgEl('line', { x1: '42', y1: '10', x2: '62', y2: '10', class: 'fs-pipe-dash' }));
    svg.appendChild(svgEl('path', { d: 'M27 5 L37 15 M37 5 L27 15', class: 'fs-pipe-break' }));
  } else {
    svg.appendChild(svgEl('line', { x1: '2', y1: '10', x2: '56', y2: '10', class: 'fs-pipe-track' }));
    if (flowState === 'present') {
      svg.appendChild(svgEl('line', { x1: '2', y1: '10', x2: '56', y2: '10', class: 'fs-pipe-flow' }));
      svg.appendChild(svgEl('circle', { cx: '10', cy: '10', r: '3', class: 'fs-pipe-droplet' }));
    }
    svg.appendChild(svgEl('path', { d: 'M51 5 L59 10 L51 15', class: 'fs-pipe-arrow' }));
  }
  return svg;
}

function renderZoneCircuit(zone, zoneEvents, headingTag) {
  const isWatering = zone.watering.state === 'watering';
  const isUnknown = !zone.telemetryReliable;
  const cardMod =
    zone.trustLevel === 'danger'
      ? 'fs-circuit--offline'
      : zone.trustLevel === 'warn'
        ? 'fs-circuit--stale'
        : isWatering
          ? 'fs-circuit--watering'
          : 'fs-circuit--idle';

  const statusTagText =
    zone.connection.state === 'offline'
      ? 'Нет связи'
      : zone.telemetry.freshness !== 'fresh'
        ? 'Пакет устарел'
        : zone.watering.shortLabel;

  const statusTagClass =
    zone.trustLevel === 'danger'
      ? 'fs-pill fs-pill--danger'
      : zone.trustLevel === 'warn'
        ? 'fs-pill fs-pill--warn'
        : isWatering
          ? 'fs-pill fs-pill--water'
          : 'fs-pill fs-pill--ok';

  const pumpStateText = isUnknown ? 'Неизвестно' : isWatering ? 'Подача' : 'Остановлен';
  const fs1Class =
    zone.flow.state === 'present'
      ? 'fs-node fs-node--water fs-node--pulse'
      : zone.flow.state === 'unknown'
        ? 'fs-node fs-node--broken'
        : 'fs-node';

  const outputNodeMain = isWatering
    ? zone.watering.elapsedLabel || 'Активен'
    : 'Полив';

  const outputNodeSub = isWatering
    ? `${zone.watering.activeOutletLabel} (${zone.watering.activeOutlet}/${zone.outletsTotal})`
    : isUnknown
      ? 'Неизвестно'
      : 'Ожидание';

  const schematic = el(
    'div',
    { className: 'fs-schematic', 'aria-label': `Схема тракта ${zone.name}` },
    el(
      'div',
      { className: `fs-node ${isUnknown ? 'fs-node--broken' : isWatering ? 'fs-node--water' : ''}` },
      el('span', { className: 'fs-node__code' }, 'Н2'),
      el('span', { className: 'fs-node__val' }, pumpStateText)
    ),
    makePipeSvg(zone.flow.state),
    el(
      'div',
      { className: fs1Class },
      el('span', { className: 'fs-node__code' }, 'FS1'),
      el('span', { className: 'fs-node__val' }, zone.flow.label)
    ),
    makePipeSvg(zone.flow.state),
    el(
      'div',
      { className: `fs-node fs-node--out ${isUnknown ? 'fs-node--broken' : isWatering ? 'fs-node--water' : ''}` },
      el('span', { className: 'fs-node__code' }, outputNodeMain),
      el('span', { className: 'fs-node__val' }, outputNodeSub)
    )
  );

  const valveList = el(
    'ul',
    {
      className: `fs-valves fs-valves--n${zone.outletsTotal}`,
      role: 'list',
      'aria-label': `Клапаны полива ${zone.name}`
    },
    zone.outletLabels.map((label, index) => {
      const num = index + 1;
      const active = isWatering && zone.watering.activeOutlet === num;
      const cls = isUnknown
        ? 'fs-valve fs-valve--unknown'
        : active
          ? 'fs-valve fs-valve--active'
          : 'fs-valve';
      return el(
        'li',
        { className: cls },
        el('span', { className: 'fs-valve__code' }, label),
        el('span', { className: 'fs-valve__state' }, isUnknown ? '?' : active ? 'Полив' : '—')
      );
    })
  );

  const trustLine = el(
    'div',
    { className: 'fs-trust-row' },
    el(
      'span',
      {
        className: `fs-chip ${zone.connection.state === 'online' ? 'fs-chip--online' : 'fs-chip--offline'}`
      },
      `Связь: ${zone.connection.label}`
    ),
    el(
      'span',
      {
        className: `fs-chip ${zone.telemetry.freshness === 'fresh' ? 'fs-chip--fresh' : 'fs-chip--stale'}`
      },
      `Пакет ${zone.telemetry.packetId}: ${zone.telemetry.ageLabel}`
    )
  );

  const cautionNote = isUnknown
    ? el('p', { className: `fs-caution fs-caution--${zone.trustLevel}` }, zone.trustSummary)
    : null;

  const dedupInfo =
    zone.telemetry.ignoredDuplicates > 0 || zone.telemetry.ignoredOutOfOrder > 0
      ? `Запоздалых: ${zone.telemetry.ignoredOutOfOrder}, отброшено дублей: ${zone.telemetry.ignoredDuplicates}`
      : 'Нарушений порядка нет';

  const passport = el(
    'details',
    { className: 'fs-passport' },
    el(
      'summary',
      { className: 'fs-passport__summary' },
      `Паспорт пакета ${zone.telemetry.packetId} и события (${zoneEvents.length})`
    ),
    el(
      'div',
      { className: 'fs-passport__body' },
      el(
        'dl',
        { className: 'fs-dl' },
        el('div', null, el('dt', null, 'Время контроллера'), el('dd', null, zone.telemetry.deviceTime)),
        el('div', null, el('dt', null, 'Принято сервером'), el('dd', null, zone.telemetry.receivedAt)),
        el('div', null, el('dt', null, 'Канал связи'), el('dd', null, `${zone.connection.label} (${zone.connection.lastLinkAt})`)),
        el('div', null, el('dt', null, 'Оборудование'), el('dd', null, zone.pumpModel)),
        el('div', null, el('dt', null, 'Порядок пакетов'), el('dd', null, dedupInfo))
      ),
      zoneEvents.length > 0
        ? el(
            'ol',
            { className: 'fs-mini-log', role: 'list' },
            zoneEvents.slice(0, 3).map((evt) =>
              el(
                'li',
                { className: `fs-mini-log__item fs-mini-log__item--${evt.kind}` },
                el('time', { className: 'fs-mini-log__time' }, evt.time),
                el('span', { className: 'fs-mini-log__text' }, evt.text)
              )
            )
          )
        : null,
      el(
        'p',
        { className: 'fs-hw-note' },
        'FS1 контролирует только наличие потока, не расход. pH/EC (HM-100) и уровень Е4 проверяются локально.'
      )
    )
  );

  const outletsWord =
    zone.outletsTotal === 1
      ? 'поливной контур'
      : zone.outletsTotal <= 4
        ? 'поливных контура'
        : 'поливных контуров';

  return el(
    'article',
    { className: `fs-circuit ${cardMod}` },
    el(
      'header',
      { className: 'fs-circuit__head' },
      el(
        'div',
        null,
        el(headingTag, { className: 'fs-circuit__title' }, zone.name),
        el('p', { className: 'fs-circuit__sub' }, `${zone.outletsTotal} ${outletsWord}`)
      ),
      el('span', { className: statusTagClass }, statusTagText)
    ),
    trustLine,
    cautionNote,
    schematic,
    valveList,
    passport
  );
}

export function renderFlowStrip(snapshot, { headingLevel = 2 } = {}) {
  const zoneHeadingTag = `h${Math.min(headingLevel + 1, 6)}`;
  const onlineCount = snapshot.zones.filter((z) => z.connection.state === 'online').length;
  const freshCount = snapshot.zones.filter((z) => z.telemetryReliable).length;
  const total = snapshot.zones.length;

  const tickerMod =
    freshCount === total
      ? 'fs-ticker--ok'
      : onlineCount < total
        ? 'fs-ticker--danger'
        : 'fs-ticker--warn';

  const tickerText =
    freshCount === total
      ? `Все ${total} тракта актуальны`
      : onlineCount < total
        ? `На связи ${onlineCount} из ${total} · актуально ${freshCount}`
        : `Связь ${onlineCount}/${total}, но свежая телеметрия у ${freshCount} из ${total}`;

  const heroBanner = el(
    'div',
    { className: `fs-hero ${tickerMod}` },
    el('img', {
      className: 'fs-hero__img',
      src: 'assets/img/hero-flow.jpg',
      alt: '',
      decoding: 'async',
      width: '840',
      height: '472'
    }),
    el('div', { className: 'fs-hero__scrim', 'aria-hidden': 'true' }),
    el(
      'div',
      { className: 'fs-hero__overlay' },
      el(
        'div',
        { className: 'fs-ticker__left' },
        el('span', { className: 'fs-hero__kicker' }, `${snapshot.siteName} · иллюстрация`),
        el('p', { className: 'fs-hero__summary' }, tickerText)
      ),
      el(
        'div',
        { className: 'fs-hero__clock' },
        el('strong', null, snapshot.nowLabel),
        el('span', null, 'Снимок')
      )
    )
  );

  return el(
    'div',
    { className: 'v-flowstrip' },
    heroBanner,
    el(
      'div',
      { className: 'fs-circuits' },
      snapshot.zones.map((zone) => {
        const zEvents = snapshot.events.filter((e) => e.zoneId === zone.id);
        return renderZoneCircuit(zone, zEvents, zoneHeadingTag);
      })
    )
  );
}
