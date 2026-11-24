// Вариант 3: «Карманный журнал: "На ходу" + Инспектор достоверности» (Glance Deck).
// Ботаническая шапка-иллюстрация, плавная волна полива, режимы плотности и 4-ячеечная матрица достоверности.

import { el, svgEl } from '../ui/dom.js';

function makeWaterWaveSvg() {
  const svg = svgEl('svg', {
    class: 'gj-wave',
    viewBox: '0 0 240 12',
    preserveAspectRatio: 'none',
    'aria-hidden': 'true',
    focusable: 'false'
  });
  svg.appendChild(
    svgEl('path', {
      class: 'gj-wave__path',
      d: 'M0 6 Q 15 1, 30 6 T 60 6 T 90 6 T 120 6 T 150 6 T 180 6 T 210 6 T 240 6'
    })
  );
  return svg;
}

function renderTruthMatrix(zone) {
  const cells = [
    {
      num: '01',
      label: 'Канал связи',
      value: zone.connection.label,
      sub: `Сигнал ${zone.connection.lastLinkAt}`,
      tone: zone.connection.state === 'online' ? 'ok' : 'danger'
    },
    {
      num: '02',
      label: 'Свежесть пакета',
      value: zone.telemetry.label,
      sub: `${zone.telemetry.packetId} · ${zone.telemetry.ageLabel}`,
      tone: zone.telemetry.freshness === 'fresh' ? 'ok' : 'warn'
    },
    {
      num: '03',
      label: 'Поток FS1',
      value: zone.flow.label,
      sub: 'Только наличие, не расход',
      tone: zone.flow.state === 'present' ? 'water' : zone.flow.state === 'absent' ? 'neutral' : 'danger'
    },
    {
      num: '04',
      label: 'Полив и контур',
      value: zone.watering.shortLabel,
      sub:
        zone.watering.state === 'watering'
          ? `${zone.watering.activeOutletLabel} (${zone.watering.activeOutlet}/${zone.outletsTotal}) · ${zone.watering.elapsedLabel}`
          : zone.watering.state === 'idle'
            ? `${zone.outletsTotal} выходов закрыты`
            : 'Не подтвержден',
      tone: zone.watering.state === 'watering' ? 'water' : zone.watering.state === 'idle' ? 'neutral' : 'danger'
    }
  ];

  const dedupBanner =
    zone.telemetry.ignoredDuplicates > 0 || zone.telemetry.ignoredOutOfOrder > 0
      ? el(
          'p',
          { className: 'gj-dedup' },
          `Фильтр пакетов: учтен запоздалый (${zone.telemetry.ignoredOutOfOrder}), отброшен повтор (${zone.telemetry.ignoredDuplicates}). Текущее состояние удержано по ${zone.telemetry.packetId} (${zone.telemetry.deviceTime}).`
        )
      : null;

  const localBox = el(
    'div',
    { className: 'gj-local' },
    el('span', { className: 'gj-local__title' }, 'Локально на объекте (не в телеметрии):'),
    el(
      'ul',
      { className: 'gj-local__list', role: 'list' },
      zone.localInstruments.map((item) =>
        el('li', null, el('strong', null, `${item.label}: `), item.note)
      )
    )
  );

  return el(
    'div',
    { className: 'gj-inspector' },
    el(
      'div',
      { className: 'gj-matrix' },
      cells.map((cell) =>
        el(
          'div',
          { className: `gj-cell gj-cell--${cell.tone}` },
          el(
            'div',
            { className: 'gj-cell__head' },
            el('span', { className: 'gj-cell__num' }, cell.num),
            el('span', { className: 'gj-cell__label' }, cell.label)
          ),
          el('strong', { className: 'gj-cell__val' }, cell.value),
          el('span', { className: 'gj-cell__sub' }, cell.sub)
        )
      )
    ),
    dedupBanner,
    localBox
  );
}

function renderZoneTicket(zone, density, headingTag) {
  const isWatering = zone.watering.state === 'watering';
  const isUnknown = !zone.telemetryReliable;
  const ticketMod =
    zone.trustLevel === 'danger'
      ? 'gj-ticket--danger'
      : zone.trustLevel === 'warn'
        ? 'gj-ticket--warn'
        : isWatering
          ? 'gj-ticket--water'
          : 'gj-ticket--idle';

  const bigStatus = isWatering
    ? `Полив · ${zone.watering.activeOutletLabel}`
    : isUnknown
      ? 'Состояние неизвестно'
      : 'Ожидание';

  const bigMetric = isWatering
    ? zone.watering.elapsedLabel || 'Идет'
    : isUnknown
      ? 'Нет свежих данных'
      : 'Полив не идет';

  const freshnessLine =
    zone.connection.state === 'offline'
      ? `Связь: потеряна · Пакет ${zone.telemetry.packetId} (${zone.telemetry.ageLabel})`
      : zone.telemetry.freshness !== 'fresh'
        ? `Связь: есть (${zone.connection.lastLinkAt}) · Пакет устарел (${zone.telemetry.ageLabel})`
        : `Связь: есть · Пакет ${zone.telemetry.packetId} (${zone.telemetry.ageLabel})`;

  const inspectorBlock =
    density === 'details'
      ? renderTruthMatrix(zone)
      : el(
          'details',
          { className: 'gj-details' },
          el('summary', { className: 'gj-details__summary' }, 'Инспектор достоверности (4 статуса)'),
          el('div', { className: 'gj-details__body' }, renderTruthMatrix(zone))
        );

  return el(
    'article',
    { className: `gj-ticket ${ticketMod}` },
    el('div', { className: 'gj-spine', 'aria-hidden': 'true' }),
    el(
      'div',
      { className: 'gj-ticket__content' },
      el(
        'header',
        { className: 'gj-ticket__head' },
        el(headingTag, { className: 'gj-ticket__title' }, zone.name),
        el('span', { className: 'gj-ticket__cap' }, `${zone.outletsTotal} вых.`)
      ),
      el(
        'div',
        { className: 'gj-glance' },
        el('p', { className: 'gj-glance__status' }, bigStatus),
        el('p', { className: 'gj-glance__metric' }, bigMetric)
      ),
      isWatering ? makeWaterWaveSvg() : null,
      el(
        'div',
        { className: 'gj-answers' },
        el(
          'span',
          { className: `gj-flow-tag gj-flow-tag--${zone.flow.state}` },
          `FS1: ${zone.flow.label}`
        ),
        isWatering
          ? el(
              'span',
              { className: 'gj-outlet-tag' },
              `Участок ${zone.watering.activeOutlet} из ${zone.outletsTotal}`
            )
          : null
      ),
      el(
        'p',
        { className: `gj-freshline ${isUnknown ? 'gj-freshline--alert' : ''}` },
        freshnessLine
      ),
      inspectorBlock
    )
  );
}

export function renderGlanceJournal(snapshot, state, handlers, { sites = [], headingLevel = 2 } = {}) {
  const zoneHeadingTag = `h${Math.min(headingLevel + 1, 6)}`;
  const density = state.journalDensity ?? 'glance';

  const heroCard = el(
    'div',
    { className: 'gj-hero' },
    el('img', {
      className: 'gj-hero__img',
      src: 'assets/img/hero-journal.jpg',
      alt: '',
      decoding: 'async',
      width: '840',
      height: '472'
    }),
    el('div', { className: 'gj-hero__scrim', 'aria-hidden': 'true' }),
    el(
      'div',
      { className: 'gj-hero__overlay' },
      el(
        'div',
        null,
        el('span', { className: 'gj-hero__kicker' }, 'Полевой журнал · иллюстрация'),
        el('p', { className: 'gj-hero__title' }, snapshot.siteName)
      ),
      el('strong', { className: 'gj-hero__clock' }, snapshot.nowLabel)
    )
  );

  const siteStrip =
    sites.length > 1
      ? el(
          'div',
          { className: 'gj-sites', role: 'group', 'aria-label': 'Выбор объекта пилота' },
          sites.map((site) =>
            el(
              'button',
              {
                type: 'button',
                className: 'gj-site-btn',
                'aria-pressed': String(site.id === snapshot.siteId),
                onClick: () => handlers.setSiteId(site.id)
              },
              site.name
            )
          )
        )
      : null;

  const topControls = el(
    'div',
    { className: 'gj-topbar' },
    el(
      'div',
      { className: 'gj-topbar__info' },
      el('span', { className: 'gj-topbar__kicker' }, 'Плотность'),
      el('strong', { className: 'gj-topbar__clock' }, density === 'details' ? '4 статуса' : '2-сек взгляд')
    ),
    el(
      'div',
      { className: 'gj-density', role: 'group', 'aria-label': 'Плотность журнала' },
      el(
        'button',
        {
          type: 'button',
          className: 'gj-density__btn',
          'aria-pressed': String(density === 'glance'),
          onClick: () => handlers.setJournalDensity('glance')
        },
        'На ходу'
      ),
      el(
        'button',
        {
          type: 'button',
          className: 'gj-density__btn',
          'aria-pressed': String(density === 'details'),
          onClick: () => handlers.setJournalDensity('details')
        },
        'Детали'
      )
    )
  );

  const latestEvent = snapshot.events[0];
  const digest = latestEvent
    ? el(
        'div',
        { className: `gj-digest gj-digest--${latestEvent.kind}` },
        el('span', { className: 'gj-digest__tag' }, `Последняя запись · ${latestEvent.time}`),
        el('p', { className: 'gj-digest__text' }, latestEvent.text)
      )
    : null;

  return el(
    'div',
    { className: 'v-glancejournal' },
    heroCard,
    siteStrip,
    topControls,
    el(
      'div',
      { className: 'gj-tickets' },
      snapshot.zones.map((zone) => renderZoneTicket(zone, density, zoneHeadingTag))
    ),
    digest
  );
}
