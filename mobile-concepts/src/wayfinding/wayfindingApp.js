// Мультиобъектный мобильный мониторинг Greenhouse в стиле Schiphol Yellow Wayfinding.
// Использует единую точку сборки createDataProvider() и безопасный DOM-рендер.

import { createDataProvider } from '../data/provider.js';
import { clear, el, svgEl } from '../ui/dom.js';

function makePictogram(kind, size = 20) {
  const svg = svgEl('svg', {
    class: 'wf-svg',
    viewBox: '0 0 24 24',
    width: String(size),
    height: String(size),
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  if (kind === 'arrow-right') {
    svg.appendChild(svgEl('path', { d: 'M5 12h14' }));
    svg.appendChild(svgEl('path', { d: 'M13 6l6 6-6 6' }));
  } else if (kind === 'arrow-left') {
    svg.appendChild(svgEl('path', { d: 'M19 12H5' }));
    svg.appendChild(svgEl('path', { d: 'M11 6l-6 6 6 6' }));
  } else if (kind === 'alert') {
    svg.appendChild(svgEl('path', { d: 'M12 4L3.5 19h17L12 4z' }));
    svg.appendChild(svgEl('path', { d: 'M12 10v4' }));
    svg.appendChild(svgEl('circle', { cx: '12', cy: '16.5', r: '0.6', fill: 'currentColor' }));
  } else if (kind === 'water') {
    svg.appendChild(svgEl('path', { d: 'M12 3.5C12 3.5 6.5 9.8 6.5 14a5.5 5.5 0 0 0 11 0c0-4.2-5.5-10.5-5.5-10.5Z' }));
  } else if (kind === 'ok') {
    svg.appendChild(svgEl('path', { d: 'M5 12.5l4.5 4.5L19 7.5' }));
  } else if (kind === 'sites') {
    svg.appendChild(svgEl('rect', { x: '3', y: '4', width: '7.5', height: '7', rx: '1.2' }));
    svg.appendChild(svgEl('rect', { x: '13.5', y: '4', width: '7.5', height: '7', rx: '1.2' }));
    svg.appendChild(svgEl('rect', { x: '3', y: '13.5', width: '7.5', height: '6.5', rx: '1.2' }));
    svg.appendChild(svgEl('rect', { x: '13.5', y: '13.5', width: '7.5', height: '6.5', rx: '1.2' }));
  } else if (kind === 'chart') {
    svg.appendChild(svgEl('rect', { x: '4', y: '11', width: '3.5', height: '9', rx: '0.8' }));
    svg.appendChild(svgEl('rect', { x: '10.25', y: '5', width: '3.5', height: '15', rx: '0.8' }));
    svg.appendChild(svgEl('rect', { x: '16.5', y: '8.5', width: '3.5', height: '11.5', rx: '0.8' }));
  } else if (kind === 'clock') {
    svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '8.5' }));
    svg.appendChild(svgEl('path', { d: 'M12 7.5V12l3 2' }));
  }
  return svg;
}

function summarizeSite(snapshot) {
  const offlineZones = snapshot.zones.filter((z) => z.connection.state === 'offline');
  const staleOnlineZones = snapshot.zones.filter(
    (z) => z.connection.state === 'online' && z.telemetry.freshness !== 'fresh'
  );
  const wateringZones = snapshot.zones.filter((z) => z.watering.state === 'watering');

  let severity = 'ok';
  let statusText = 'В норме';
  let iconKind = 'ok';
  let detailLine = `${snapshot.zones.length} зоны · Ожидание · FS1: Нет потока`;

  if (offlineZones.length > 0) {
    severity = 'danger';
    iconKind = 'alert';
    const first = offlineZones[0];
    statusText = `Нет связи З${first.id}`;
    const waterNote = wateringZones.length > 0
      ? `З${wateringZones[0].id}: полив ${wateringZones[0].watering.activeOutletLabel} (${wateringZones[0].watering.elapsedLabel}) · `
      : '';
    detailLine = `${waterNote}З${first.id}: пакет ${first.telemetry.ageLabel}`;
  } else if (staleOnlineZones.length > 0) {
    severity = 'warn';
    iconKind = 'clock';
    const first = staleOnlineZones[0];
    statusText = 'Пакет устарел';
    detailLine = `Связь онлайн · телеметрия ${first.telemetry.ageLabel}`;
  } else if (wateringZones.length > 0) {
    severity = 'water';
    iconKind = 'water';
    const first = wateringZones[0];
    statusText = `Полив · ${first.watering.elapsedLabel || 'Идет'}`;
    detailLine = `З${first.id}: ${first.watering.activeOutletLabel} (${first.watering.activeOutlet}/${first.outletsTotal}) · FS1: Есть поток`;
  }

  return { severity, statusText, iconKind, detailLine, offlineZones, staleOnlineZones, wateringZones };
}

function renderPulseBars(pulseStrip, compact = false) {
  return el(
    'div',
    {
      className: `wf-ticks ${compact ? 'wf-ticks--compact' : ''}`,
      role: 'img',
      'aria-label': pulseStrip.summary
    },
    pulseStrip.slots.map((slotState, idx) =>
      el('span', {
        className: `wf-tick wf-tick--${slotState} ${idx === pulseStrip.slots.length - 1 ? 'wf-tick--latest' : ''}`
      })
    )
  );
}

/**
 * Экран 1: Сводка всех объектов (Wayfinding Sign System)
 */
function renderFleetScreen(fleet, onOpenSite) {
  const summaries = fleet.map((snap) => ({ snap, info: summarizeSite(snap) }));
  const attentionList = summaries.filter((s) => s.info.severity === 'danger' || s.info.severity === 'warn');
  const wateringCount = summaries.filter((s) => s.info.wateringZones.length > 0).length;

  // Желтая полоса маршрута — фирменный прием Schiphol Yellow Wayfinding
  const wayfindingBand =
    attentionList.length > 0
      ? el(
          'section',
          { className: 'wf-band wf-band--yellow', 'aria-label': 'Приоритетный маршрут к сбоям' },
          el(
            'div',
            { className: 'wf-band__head' },
            el('span', { className: 'wf-sq wf-sq--sm' }, makePictogram('arrow-right', 18)),
            el(
              'div',
              null,
              el('p', { className: 'wf-band__kicker' }, 'Маршрут внимания'),
              el(
                'h2',
                { className: 'wf-band__title' },
                `${attentionList.length} ${attentionList.length === 1 ? 'объект требует' : 'объекта требуют'} проверки`
              )
            )
          ),
          el(
            'div',
            { className: 'wf-band__links' },
            attentionList.map(({ snap, info }) =>
              el(
                'button',
                {
                  type: 'button',
                  className: 'wf-jump-btn',
                  onClick: () => onOpenSite(snap.siteId)
                },
                el('span', { className: 'wf-jump-btn__name' }, snap.siteName),
                el('span', { className: 'wf-jump-btn__stat' }, info.statusText),
                makePictogram('arrow-right', 16)
              )
            )
          )
        )
      : el(
          'section',
          { className: 'wf-band wf-band--calm', 'aria-label': 'Сводка площадки' },
          el('span', { className: 'wf-sq wf-sq--sm' }, makePictogram('ok', 18)),
          el(
            'div',
            null,
            el('h2', { className: 'wf-band__title' }, `Все ${fleet.length} объекта на связи`),
            el(
              'p',
              { className: 'wf-band__sub' },
              wateringCount > 0 ? `Идет полив на объектах: ${wateringCount}` : 'Все зоны в режиме ожидания'
            )
          )
        );

  const siteCards = el(
    'section',
    { className: 'wf-sites', 'aria-labelledby': 'wf-sites-heading' },
    el(
      'div',
      { className: 'wf-section-head' },
      el('h2', { id: 'wf-sites-heading', className: 'wf-section-title' }, 'Площадки'),
      el('span', { className: 'wf-section-count' }, `${fleet.length} объектов`)
    ),
    el(
      'ul',
      { className: 'wf-site-list', role: 'list' },
      summaries.map(({ snap, info }) =>
        el(
          'li',
          null,
          el(
            'button',
            {
              type: 'button',
              className: `wf-site-card wf-site-card--${info.severity}`,
              onClick: () => onOpenSite(snap.siteId)
            },
            el('span', { className: `wf-sq wf-sq--${info.severity}` }, makePictogram(info.iconKind, 20)),
            el(
              'span',
              { className: 'wf-site-card__body' },
              el(
                'span',
                { className: 'wf-site-card__top' },
                el('strong', { className: 'wf-site-card__name' }, snap.siteName),
                el('span', { className: `wf-tag wf-tag--${info.severity}` }, info.statusText)
              ),
              el('span', { className: 'wf-site-card__detail' }, info.detailLine),
              el(
                'span',
                { className: 'wf-zone-blocks', 'aria-hidden': 'true' },
                snap.zones.map((z) => {
                  const zTone = !z.telemetryReliable
                    ? z.connection.state === 'offline'
                      ? 'danger'
                      : 'warn'
                    : z.watering.state === 'watering'
                      ? 'water'
                      : 'idle';
                  return el('span', { className: `wf-zblock wf-zblock--${zTone}` }, `З${z.id}`);
                })
              )
            ),
            el('span', { className: 'wf-site-card__chevron', 'aria-hidden': 'true' }, makePictogram('arrow-right', 18))
          )
        )
      )
    )
  );

  return el('div', { className: 'wf-view' }, wayfindingBand, siteCards);
}

/**
 * Экран 2: Детали выбранного объекта (проваливание)
 */
function renderSiteDetail(snapshot, onBack) {
  const info = summarizeSite(snapshot);

  return el(
    'div',
    { className: 'wf-view' },
    el(
      'div',
      { className: 'wf-detail-nav' },
      el(
        'button',
        { type: 'button', className: 'wf-back-btn', onClick: onBack },
        makePictogram('arrow-left', 18),
        el('span', null, 'Все площадки')
      ),
      el('span', { className: `wf-tag wf-tag--${info.severity}` }, info.statusText)
    ),
    el(
      'div',
      { className: 'wf-detail-hero' },
      el('h2', { className: 'wf-detail-title' }, snapshot.siteName),
      el('p', { className: 'wf-detail-sub' }, `${snapshot.zones.length} зоны · снимок ${snapshot.nowLabel}`)
    ),
    el(
      'div',
      { className: 'wf-zones-stack' },
      snapshot.zones.map((zone) => {
        const isWatering = zone.watering.state === 'watering';
        const isUnknown = !zone.telemetryReliable;
        const zTone =
          zone.trustLevel === 'danger'
            ? 'danger'
            : zone.trustLevel === 'warn'
              ? 'warn'
              : isWatering
                ? 'water'
                : 'ok';

        const metricText = isWatering
          ? `${zone.watering.elapsedLabel || 'Идет'} · ${zone.watering.activeOutletLabel}`
          : isUnknown
            ? 'Состояние неизвестно'
            : 'Ожидание';

        return el(
          'article',
          { className: `wf-zone-card wf-zone-card--${zTone}` },
          el(
            'header',
            { className: 'wf-zone-card__head' },
            el(
              'div',
              null,
              el('h3', { className: 'wf-zone-card__name' }, zone.name),
              el('p', { className: 'wf-zone-card__pump' }, zone.pumpModel)
            ),
            el(
              'span',
              { className: `wf-tag wf-tag--${zTone}` },
              zone.connection.state === 'offline'
                ? 'Нет связи'
                : zone.telemetry.freshness !== 'fresh'
                  ? 'Пакет устарел'
                  : isWatering
                    ? 'Идет полив'
                    : 'Норма'
            )
          ),
          el('p', { className: `wf-zone-card__metric wf-zone-card__metric--${zTone}` }, metricText),
          el(
            'div',
            { className: 'wf-matrix' },
            el(
              'div',
              { className: 'wf-mcell' },
              el('span', { className: 'wf-mcell__k' }, 'Канал связи'),
              el('strong', { className: 'wf-mcell__v' }, zone.connection.label),
              el('span', { className: 'wf-mcell__s' }, zone.connection.lastLinkAt)
            ),
            el(
              'div',
              { className: 'wf-mcell' },
              el('span', { className: 'wf-mcell__k' }, 'Свежесть пакета'),
              el('strong', { className: 'wf-mcell__v' }, `${zone.telemetry.packetId} · ${zone.telemetry.label}`),
              el('span', { className: 'wf-mcell__s' }, zone.telemetry.ageLabel)
            ),
            el(
              'div',
              { className: 'wf-mcell' },
              el('span', { className: 'wf-mcell__k' }, 'Поток FS1'),
              el('strong', { className: 'wf-mcell__v' }, zone.flow.label),
              el('span', { className: 'wf-mcell__s' }, 'Только наличие')
            ),
            el(
              'div',
              { className: 'wf-mcell' },
              el('span', { className: 'wf-mcell__k' }, 'Выходы полива'),
              el('strong', { className: 'wf-mcell__v' }, isWatering ? `${zone.watering.activeOutlet} из ${zone.outletsTotal}` : isUnknown ? 'Неизвестно' : `0 из ${zone.outletsTotal}`),
              el('span', { className: 'wf-mcell__s' }, zone.outletLabels.join(' '))
            )
          ),
          el(
            'ul',
            { className: `wf-valves wf-valves--n${zone.outletsTotal}`, role: 'list', 'aria-label': `Клапаны ${zone.name}` },
            zone.outletLabels.map((lbl, idx) => {
              const active = isWatering && zone.watering.activeOutlet === idx + 1;
              return el(
                'li',
                { className: `wf-valve ${isUnknown ? 'wf-valve--unknown' : active ? 'wf-valve--active' : ''}` },
                el('span', { className: 'wf-valve__k' }, lbl),
                el('span', { className: 'wf-valve__s' }, isUnknown ? '?' : active ? 'Полив' : '—')
              );
            })
          ),
          el(
            'div',
            { className: 'wf-zone-pulse' },
            el(
              'div',
              { className: 'wf-zone-pulse__head' },
              el('span', null, `60 мин (${zone.pulseStrip.windowStart}–${zone.pulseStrip.windowEnd})`),
              el('span', null, zone.pulseStrip.summary)
            ),
            renderPulseBars(zone.pulseStrip, true)
          ),
          isUnknown
            ? el(
                'p',
                { className: 'wf-check-tip' },
                zone.connection.state === 'offline'
                  ? 'Что проверить: питание шкафа ША-У и сигнал LTE.'
                  : 'Что проверить: канал связи жив, проверить передачу телеметрии на Raspberry Pi / ОВЕН.'
              )
            : null,
          zone.telemetry.ignoredDuplicates > 0 || zone.telemetry.ignoredOutOfOrder > 0
            ? el(
                'p',
                { className: 'wf-dedup' },
                `Порядок пакетов: запоздалый (${zone.telemetry.ignoredOutOfOrder}) учтен 1 раз, дублей отброшено (${zone.telemetry.ignoredDuplicates}).`
              )
            : null
        );
      })
    ),
    el(
      'p',
      { className: 'wf-local-note' },
      'pH/EC (HM-100) и уровень Е4 проверяются локально на объекте и в телеметрию не передаются.'
    )
  );
}

/**
 * Вкладка «Тревоги»: все инциденты со всех площадок
 */
function renderAlertsView(fleet, onOpenSite) {
  const items = [];
  for (const snap of fleet) {
    const zoneMap = new Map(snap.zones.map((z) => [z.id, z.name]));
    for (const evt of snap.events) {
      if (evt.kind === 'warning' || evt.kind === 'gap' || evt.kind === 'late') {
        items.push({ snap, evt, zoneName: zoneMap.get(evt.zoneId) ?? `Зона ${evt.zoneId}` });
      }
    }
  }

  return el(
    'div',
    { className: 'wf-view' },
    el(
      'div',
      { className: 'wf-section-head' },
      el('h2', { className: 'wf-section-title' }, 'Сводка тревог и разрывов'),
      el('span', { className: 'wf-section-count' }, `${items.length} запис.`)
    ),
    items.length > 0
      ? el(
          'ul',
          { className: 'wf-alert-list', role: 'list' },
          items.map(({ snap, evt, zoneName }) =>
            el(
              'li',
              null,
              el(
                'button',
                {
                  type: 'button',
                  className: `wf-alert-card wf-alert-card--${evt.kind}`,
                  onClick: () => onOpenSite(snap.siteId)
                },
                el(
                  'div',
                  { className: 'wf-alert-card__top' },
                  el('strong', null, `${snap.siteName} · ${zoneName}`),
                  el('time', null, evt.time)
                ),
                evt.gapLabel ? el('p', { className: 'wf-alert-card__gap' }, evt.gapLabel) : null,
                el('p', { className: 'wf-alert-card__text' }, evt.text),
                evt.meta ? el('p', { className: 'wf-alert-card__meta' }, evt.meta) : null
              )
            )
          )
        )
      : el(
          'div',
          { className: 'wf-empty-box' },
          el('strong', null, 'Тревог и разрывов телеметрии нет'),
          el('p', null, 'Все объекты передают свежие пакеты в штатном режиме.')
        )
  );
}

/**
 * Вкладка «График»: 60-минутный пульс полива по всем объектам сразу
 */
function renderFleetChartView(fleet, onOpenSite) {
  return el(
    'div',
    { className: 'wf-view' },
    el(
      'div',
      { className: 'wf-section-head' },
      el('h2', { className: 'wf-section-title' }, 'График поливов · 60 мин'),
      el('span', { className: 'wf-section-count' }, 'Все объекты')
    ),
    el(
      'div',
      { className: 'wf-legend', 'aria-hidden': 'true' },
      el('span', null, el('i', { className: 'wf-ldot wf-ldot--water' }), 'Полив (FS1)'),
      el('span', null, el('i', { className: 'wf-ldot wf-ldot--idle' }), 'Пауза / не поливалась'),
      el('span', null, el('i', { className: 'wf-ldot wf-ldot--gap' }), 'Нет данных')
    ),
    el(
      'div',
      { className: 'wf-chart-groups' },
      fleet.map((snap) =>
        el(
          'article',
          { className: 'wf-chart-card' },
          el(
            'header',
            { className: 'wf-chart-card__head' },
            el(
              'button',
              { type: 'button', className: 'wf-chart-card__btn', onClick: () => onOpenSite(snap.siteId) },
              snap.siteName,
              makePictogram('arrow-right', 15)
            ),
            el('span', { className: 'wf-chart-card__win' }, `${snap.zones[0]?.pulseStrip.windowStart ?? '13:32'}–${snap.nowLabel}`)
          ),
          el(
            'div',
            { className: 'wf-chart-zones' },
            snap.zones.map((z) =>
              el(
                'div',
                { className: 'wf-chart-zone' },
                el(
                  'div',
                  { className: 'wf-chart-zone__meta' },
                  el('strong', null, z.name),
                  el('span', { className: !z.telemetryReliable ? 'is-gap' : '' }, z.pulseStrip.summary)
                ),
                renderPulseBars(z.pulseStrip, false)
              )
            )
          )
        )
      )
    )
  );
}

export async function mountWayfindingApp(root, providerConfig = { mode: 'mock' }) {
  const provider = createDataProvider(providerConfig);
  const scenarios = provider.getScenarios();
  const params = new URLSearchParams(window.location.search);

  const state = {
    scenarioId: scenarios.some((s) => s.id === params.get('scenario')) ? params.get('scenario') : 'incident',
    tab: 'sites', // 'sites' | 'alerts' | 'chart'
    selectedSiteId: null,
    demoOpen: window.innerWidth >= 820
  };

  let fleet = [];
  const announcer = el('p', { className: 'visually-hidden', 'aria-live': 'polite' });

  function announce(msg) {
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = msg;
    });
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('scenario', state.scenarioId);
    if (state.selectedSiteId) {
      url.searchParams.set('site', state.selectedSiteId);
    } else {
      url.searchParams.delete('site');
    }
    window.history.replaceState(null, '', url);
  }

  async function loadFleet() {
    fleet = await provider.getFleetSnapshots({ scenarioId: state.scenarioId });
    if (state.selectedSiteId && !fleet.some((s) => s.siteId === state.selectedSiteId)) {
      state.selectedSiteId = null;
    }
    render();
  }

  function openSite(siteId) {
    state.selectedSiteId = siteId;
    state.tab = 'sites';
    syncUrl();
    render();
    const found = fleet.find((s) => s.siteId === siteId);
    if (found) announce(`Открыт объект: ${found.siteName}`);
  }

  function closeSite() {
    state.selectedSiteId = null;
    syncUrl();
    render();
    announce('Возврат к списку площадок');
  }

  function setTab(tabId) {
    state.tab = tabId;
    if (tabId !== 'sites') {
      state.selectedSiteId = null;
    }
    syncUrl();
    render();
  }

  function buildDemoBar() {
    const activeLabel = scenarios.find((s) => s.id === state.scenarioId)?.shortLabel ?? state.scenarioId;

    return el(
      'header',
      { className: 'demo-toolbar' },
      el(
        'div',
        { className: 'demo-toolbar__top' },
        el(
          'div',
          null,
          el('h1', { className: 'demo-title' }, 'Greenhouse · Wayfinding'),
          el('p', { className: 'demo-sub' }, `Мультиобъектный стенд (read-only) · ${activeLabel}`)
        ),
        el('a', { href: 'hybrid.html', className: 'demo-link' }, '← Прошлый гибрид')
      ),
      el(
        'details',
        {
          className: 'demo-details',
          open: state.demoOpen,
          onToggle: (e) => {
            state.demoOpen = e.currentTarget.open;
          }
        },
        el('summary', { className: 'demo-details__summary' }, 'Сценарий телеметрии (синтетика)'),
        el(
          'div',
          { className: 'demo-btn-row' },
          scenarios.map((s) =>
            el(
              'button',
              {
                type: 'button',
                className: 'demo-btn',
                'aria-pressed': String(state.scenarioId === s.id),
                onClick: async () => {
                  state.scenarioId = s.id;
                  syncUrl();
                  await loadFleet();
                  announce(`Сценарий: ${s.label}`);
                }
              },
              s.shortLabel
            )
          )
        )
      )
    );
  }

  function render() {
    if (!fleet.length) return;
    const nowLabel = fleet[0].nowLabel;
    const selectedSnap = state.selectedSiteId
      ? fleet.find((s) => s.siteId === state.selectedSiteId) ?? null
      : null;

    const totalAlerts = fleet.reduce(
      (acc, snap) =>
        acc + snap.events.filter((e) => e.kind === 'warning' || e.kind === 'gap' || e.kind === 'late').length,
      0
    );

    const appTopBar = el(
      'div',
      { className: 'wf-topbar' },
      el(
        'div',
        { className: 'wf-topbar__left' },
        el('span', { className: 'wf-topbar__brand' }, 'GREENHOUSE'),
        el('span', { className: 'wf-topbar__sub' }, `${fleet.length} площадки`)
      ),
      el('time', { className: 'wf-topbar__clock' }, nowLabel)
    );

    let mainContent;
    if (state.tab === 'alerts') {
      mainContent = renderAlertsView(fleet, openSite);
    } else if (state.tab === 'chart') {
      mainContent = renderFleetChartView(fleet, openSite);
    } else if (selectedSnap) {
      mainContent = renderSiteDetail(selectedSnap, closeSite);
    } else {
      mainContent = renderFleetScreen(fleet, openSite);
    }

    const navItems = [
      { id: 'sites', icon: 'sites', label: 'Площадки', badge: null },
      { id: 'alerts', icon: 'alert', label: 'Тревоги', badge: totalAlerts > 0 ? totalAlerts : null },
      { id: 'chart', icon: 'chart', label: 'График', badge: null }
    ];

    const bottomNav = el(
      'nav',
      { className: 'wf-nav', 'aria-label': 'Разделы мониторинга' },
      navItems.map((item) =>
        el(
          'button',
          {
            type: 'button',
            className: 'wf-nav__btn',
            'aria-pressed': String(state.tab === item.id),
            onClick: () => setTab(item.id)
          },
          makePictogram(item.icon, 19),
          el('span', { className: 'wf-nav__label' }, item.label),
          item.badge ? el('span', { className: 'wf-nav__badge' }, ` ${item.badge}`) : null
        )
      )
    );

    const phoneFrame = el(
      'main',
      { id: 'main-content', className: 'wf-phone-stage', tabindex: '-1' },
      el(
        'div',
        { className: 'wf-device' },
        el(
          'div',
          { className: 'wf-device__bar', 'aria-hidden': 'true' },
          el('span', null, nowLabel),
          el('span', { className: 'wf-device__notch' }),
          el('span', null, 'LTE · 390px')
        ),
        el(
          'div',
          { className: 'wf-screen' },
          appTopBar,
          el('div', { className: 'wf-screen__body' }, mainContent),
          bottomNav
        )
      )
    );

    const footer = el(
      'footer',
      { className: 'demo-footer' },
      el('strong', null, 'Демо-прототип Wayfinding (только мониторинг, синтетические данные).'),
      el(
        'span',
        null,
        'Источник данных: provider.js (заменяемый mock/HTTP-адаптер). Названия объектов (Белград, Панчево, Нови-Сад, Суботица) условны.'
      )
    );

    clear(root);
    root.appendChild(
      el(
        'div',
        { className: 'wf-page' },
        el('a', { href: '#main-content', className: 'skip-link visually-hidden' }, 'Перейти к мониторингу'),
        buildDemoBar(),
        phoneFrame,
        footer,
        announcer
      )
    );
  }

  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.selectedSiteId) {
      closeSite();
    }
  });

  await loadFleet();
}

const appRoot = document.getElementById('app');
if (appRoot) {
  mountWayfindingApp(appRoot);
}
