// Вариант 2: «Полевой радар и лента смены» (Shift Ops & Incident Radar).
// Атмосферная шапка-радар с сонаром, 2 зоны рядом без скролла и лента смены с разрывами телеметрии.

import { el } from '../ui/dom.js';

const FILTERS = [
  { id: 'all', label: 'Все' },
  { id: 'z1', label: 'Зона 1' },
  { id: 'z2', label: 'Зона 2' },
  { id: 'alerts', label: 'Тревоги' }
];

function buildVerdict(snapshot) {
  const offline = snapshot.zones.filter((z) => z.connection.state === 'offline');
  const staleOnline = snapshot.zones.filter(
    (z) => z.connection.state === 'online' && z.telemetry.freshness !== 'fresh'
  );
  const watering = snapshot.zones.filter((z) => z.watering.state === 'watering');

  if (offline.length > 0) {
    const names = offline.map((z) => `${z.name} (${z.telemetry.ageLabel})`).join(', ');
    const activeNote = watering.length > 0 ? `${watering[0].name} поливает · ` : '';
    return {
      level: 'danger',
      headline: `${activeNote}Нет связи: ${names}`,
      linkBadge: `Связь ${snapshot.zones.length - offline.length}/${snapshot.zones.length}`,
      freshBadge: `Свежих ${snapshot.zones.filter((z) => z.telemetryReliable).length}/${snapshot.zones.length}`
    };
  }

  if (staleOnline.length > 0) {
    const names = staleOnline.map((z) => `${z.name} (${z.telemetry.ageLabel})`).join(', ');
    const activeNote = watering.length > 0 ? `${watering[0].name} поливает (${watering[0].telemetry.packetId}) · ` : '';
    return {
      level: 'warn',
      headline: `${activeNote}Связь есть, но устарела телеметрия: ${names}`,
      linkBadge: `Связь ${snapshot.zones.length}/${snapshot.zones.length}`,
      freshBadge: `Устарело: ${staleOnline.length}`
    };
  }

  if (watering.length > 0) {
    return {
      level: 'water',
      headline: `Штатный полив: ${watering.map((z) => `${z.name} (${z.watering.activeOutletLabel})`).join(', ')}`,
      linkBadge: `Связь ${snapshot.zones.length}/${snapshot.zones.length}`,
      freshBadge: 'Телеметрия свежая'
    };
  }

  return {
    level: 'ok',
    headline: 'Обе зоны на связи, полив в ожидании',
    linkBadge: `Связь ${snapshot.zones.length}/${snapshot.zones.length}`,
    freshBadge: 'Телеметрия свежая'
  };
}

function renderZoneTile(zone, headingTag) {
  const isWatering = zone.watering.state === 'watering';
  const isUnknown = !zone.telemetryReliable;
  const tileMod =
    zone.trustLevel === 'danger'
      ? 'sr-tile--danger'
      : zone.trustLevel === 'warn'
        ? 'sr-tile--warn'
        : isWatering
          ? 'sr-tile--water'
          : 'sr-tile--idle';

  const bigValue = isWatering
    ? zone.watering.elapsedLabel || 'Полив'
    : isUnknown
      ? '?'
      : 'Пауза';

  const bigSub = isWatering
    ? `Выход ${zone.watering.activeOutlet} из ${zone.outletsTotal} (${zone.watering.activeOutletLabel})`
    : isUnknown
      ? 'Полив неизвестен'
      : `0 из ${zone.outletsTotal} активны`;

  const bar = el(
    'div',
    { className: 'sr-segbar', 'aria-hidden': 'true' },
    zone.outletLabels.map((_, idx) => {
      const num = idx + 1;
      const segCls = isUnknown
        ? 'sr-seg sr-seg--unknown'
        : isWatering && zone.watering.activeOutlet === num
          ? 'sr-seg sr-seg--active'
          : 'sr-seg';
      return el('span', { className: segCls });
    })
  );

  return el(
    'article',
    { className: `sr-tile ${tileMod}` },
    el(
      'header',
      { className: 'sr-tile__head' },
      el(headingTag, { className: 'sr-tile__name' }, zone.name),
      el(
        'span',
        { className: `sr-badge sr-badge--${zone.trustLevel === 'ok' && isWatering ? 'water' : zone.trustLevel}` },
        zone.connection.state === 'offline'
          ? 'Обрыв'
          : zone.telemetry.freshness !== 'fresh'
            ? 'Устарел'
            : zone.watering.shortLabel
      )
    ),
    el('div', { className: 'sr-tile__metric' }, bigValue),
    el('p', { className: 'sr-tile__sub' }, bigSub),
    bar,
    el(
      'div',
      { className: 'sr-tile__meta' },
      el('div', null, el('span', { className: 'sr-meta-k' }, 'FS1: '), el('strong', null, zone.flow.label)),
      el('div', null, el('span', { className: 'sr-meta-k' }, 'Связь: '), el('strong', null, zone.connection.label)),
      el('div', null, el('span', { className: 'sr-meta-k' }, 'Пакет: '), el('strong', null, `${zone.telemetry.packetId} · ${zone.telemetry.ageLabel}`))
    )
  );
}

function filterEvents(events, filterId) {
  if (filterId === 'z1') return events.filter((e) => e.zoneId === 1);
  if (filterId === 'z2') return events.filter((e) => e.zoneId === 2);
  if (filterId === 'alerts') return events.filter((e) => e.kind === 'warning' || e.kind === 'gap' || e.kind === 'late');
  return events;
}

export function renderShiftRadar(snapshot, state, handlers, { headingLevel = 2 } = {}) {
  const sectionHeadingTag = `h${Math.min(headingLevel, 6)}`;
  const tileHeadingTag = `h${Math.min(headingLevel + 1, 6)}`;
  const activeFilter = state.radarFilter ?? 'all';
  const verdict = buildVerdict(snapshot);
  const zoneNames = new Map(snapshot.zones.map((z) => [z.id, z.name]));
  const visibleEvents = filterEvents(snapshot.events, activeFilter);

  const radarHeader = el(
    'section',
    { className: `sr-radar sr-radar--${verdict.level}`, 'aria-label': 'Сводка площадки' },
    el(
      'div',
      { className: 'sr-radar-scene', 'aria-hidden': 'true' },
      el('img', {
        className: 'sr-radar-scene__img',
        src: 'assets/img/hero-radar.jpg',
        alt: '',
        decoding: 'async',
        width: '840',
        height: '472'
      }),
      el('div', { className: 'sr-radar-scene__scrim' })
    ),
    el(
      'div',
      { className: 'sr-radar__body' },
      el(
        'div',
        { className: 'sr-radar__top' },
        el(
          'div',
          { className: 'sr-radar__pills' },
          el(
            'span',
            { className: `sr-beacon sr-beacon--${verdict.level}`, 'aria-hidden': 'true' },
            el('span', { className: 'sr-beacon__ring' }),
            el('span', { className: 'sr-beacon__core' })
          ),
          el('span', { className: 'sr-radar-pill' }, verdict.linkBadge),
          el('span', { className: `sr-radar-pill sr-radar-pill--${verdict.level}` }, verdict.freshBadge)
        ),
        el('time', { className: 'sr-radar__time' }, snapshot.nowLabel)
      ),
      el('p', { className: 'sr-radar__verdict' }, verdict.headline),
      el(
        'div',
        { className: 'sr-tiles' },
        snapshot.zones.map((zone) => renderZoneTile(zone, tileHeadingTag))
      )
    )
  );

  const filterBar = el(
    'div',
    { className: 'sr-filters', role: 'group', 'aria-label': 'Фильтр ленты смены' },
    FILTERS.map((f) =>
      el(
        'button',
        {
          type: 'button',
          className: 'sr-filter-btn',
          'aria-pressed': String(activeFilter === f.id),
          onClick: () => handlers.setRadarFilter(f.id)
        },
        f.label
      )
    )
  );

  const timelineList =
    visibleEvents.length > 0
      ? el(
          'ol',
          { className: 'sr-timeline', role: 'list' },
          visibleEvents.map((evt, idx) => {
            const zName = zoneNames.get(evt.zoneId) ?? `Зона ${evt.zoneId}`;
            const isGap = evt.kind === 'gap';
            return el(
              'li',
              {
                className: `sr-event sr-event--${evt.kind}`,
                style: `--stagger: ${idx}`
              },
              el('span', { className: 'sr-event__dot', 'aria-hidden': 'true' }),
              el(
                'div',
                { className: 'sr-event__card' },
                el(
                  'div',
                  { className: 'sr-event__head' },
                  el('time', { className: 'sr-event__time' }, evt.time),
                  el('span', { className: 'sr-event__zone' }, zName),
                  evt.packetId ? el('span', { className: 'sr-event__pid' }, evt.packetId) : null
                ),
                isGap && evt.gapLabel
                  ? el('p', { className: 'sr-event__gap-tag' }, evt.gapLabel)
                  : null,
                el('p', { className: 'sr-event__text' }, evt.text),
                evt.meta ? el('p', { className: 'sr-event__meta' }, evt.meta) : null
              )
            );
          })
        )
      : el('p', { className: 'sr-empty' }, 'По выбранному фильтру событий нет.');

  const timelineSection = el(
    'section',
    { className: 'sr-shift' },
    el(
      'div',
      { className: 'sr-shift__head' },
      el(sectionHeadingTag, { className: 'sr-shift__title' }, 'Лента смены'),
      el('span', { className: 'sr-shift__count' }, `${visibleEvents.length} запис.`)
    ),
    filterBar,
    timelineList
  );

  return el('div', { className: 'v-shiftradar' }, radarHeader, timelineSection);
}
