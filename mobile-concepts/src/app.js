// Главный контроллер интерактивного сравнения 3 мобильных концепций.
// На экранах >= 980 px по умолчанию показывает все 3 мобильные концепции рядом в 3 колонки.

import { createDataProvider } from './data/provider.js';
import { clear, el } from './ui/dom.js';
import { renderFlowStrip } from './variants/flowStrip.js';
import { renderShiftRadar } from './variants/shiftRadar.js';
import { renderGlanceJournal } from './variants/glanceJournal.js';

const COMPARE_BREAKPOINT = 980;

const CONCEPTS = [
  {
    id: 'flow',
    short: '1 · Тракт',
    title: '1. Гидравлическая лента',
    tag: 'Схема Н2 -> FS1 -> К4..К9',
    render: (snapshot, state, handlers, meta) => renderFlowStrip(snapshot, meta)
  },
  {
    id: 'radar',
    short: '2 · Радар',
    title: '2. Полевой радар и смена',
    tag: '2 зоны рядом + ось разрывов',
    render: (snapshot, state, handlers, meta) => renderShiftRadar(snapshot, state, handlers, meta)
  },
  {
    id: 'journal',
    short: '3 · Журнал',
    title: '3. Карманный журнал',
    tag: 'На ходу / 4 статуса',
    render: (snapshot, state, handlers, meta) => renderGlanceJournal(snapshot, state, handlers, meta)
  }
];

function readInitialState(sites, scenarios) {
  const params = new URLSearchParams(window.location.search);
  const vParam = params.get('variant');
  const sParam = params.get('scenario');
  const mParam = params.get('mode');
  const siteParam = params.get('site');

  const validConcept = CONCEPTS.some((c) => c.id === vParam) ? vParam : 'flow';
  const validScenario = scenarios.some((s) => s.id === sParam) ? sParam : 'incident';
  const validSite = sites.some((s) => s.id === siteParam) ? siteParam : sites[0].id;

  // По умолчанию на десктопе (>= 980 px) сразу открываем 3 колонки рядом,
  // если явно не передан ?mode=single или ?variant=... без ?mode=compare.
  const canCompare = window.innerWidth >= COMPARE_BREAKPOINT;
  const compareMode =
    canCompare && mParam !== 'single' && (!vParam || mParam === 'compare');

  return {
    variant: validConcept,
    scenarioId: validScenario,
    siteId: validSite,
    compareMode,
    motionPaused: false,
    radarFilter: 'all',
    journalDensity: 'glance'
  };
}

function syncUrl(state) {
  const url = new URL(window.location.href);
  url.searchParams.set('scenario', state.scenarioId);
  url.searchParams.set('site', state.siteId);
  if (state.compareMode) {
    url.searchParams.set('mode', 'compare');
    url.searchParams.delete('variant');
  } else {
    url.searchParams.set('mode', 'single');
    url.searchParams.set('variant', state.variant);
  }
  window.history.replaceState(null, '', url);
}

export async function mountApp(root, providerConfig = { mode: 'mock' }) {
  const provider = createDataProvider(providerConfig);
  const sites = await provider.getSites();
  const scenarios = provider.getScenarios();
  const state = readInitialState(sites, scenarios);

  let currentSnapshot = null;

  const announcer = el('p', { className: 'visually-hidden', 'aria-live': 'polite' });
  const stageNode = el('main', { id: 'main-content', className: 'stage', tabindex: '-1' });
  const frameNode = el('div', { className: 'page-frame' });

  function announce(message) {
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }

  const handlers = {
    setVariant(id) {
      state.variant = id;
      state.compareMode = false;
      syncUrl(state);
      renderAll();
      const found = CONCEPTS.find((c) => c.id === id);
      if (found) announce(`Выбран вариант: ${found.title}`);
    },
    async setScenario(id) {
      state.scenarioId = id;
      syncUrl(state);
      await loadAndRender();
      const found = scenarios.find((s) => s.id === id);
      if (found) announce(`Сценарий: ${found.label}`);
    },
    async setSiteId(siteId) {
      state.siteId = siteId;
      syncUrl(state);
      await loadAndRender();
      const found = sites.find((s) => s.id === siteId);
      if (found) announce(`Объект: ${found.name}`);
    },
    setCompareMode(enabled) {
      state.compareMode = enabled;
      syncUrl(state);
      renderAll();
      announce(enabled ? 'Режим 3 колонок рядом' : 'Режим одного экрана 390 пикселей');
    },
    toggleMotion() {
      state.motionPaused = !state.motionPaused;
      if (state.motionPaused) {
        document.documentElement.dataset.motion = 'paused';
      } else {
        delete document.documentElement.dataset.motion;
      }
      renderAll();
      announce(state.motionPaused ? 'Постоянные анимации поставлены на паузу' : 'Анимации возобновлены');
    },
    setRadarFilter(filterId) {
      state.radarFilter = filterId;
      renderStage();
    },
    setJournalDensity(density) {
      state.journalDensity = density;
      renderStage();
      announce(density === 'details' ? 'Режим деталей: открыта матрица достоверности' : 'Режим на ходу');
    }
  };

  function buildHeader() {
    // Кнопка паузы анимаций с меняющимся текстом (без aria-pressed по WCAG 2.2.2)
    const motionBtn = el(
      'button',
      {
        type: 'button',
        className: 'motion-btn',
        onClick: () => handlers.toggleMotion()
      },
      state.motionPaused ? 'Включить анимации' : 'Пауза анимаций'
    );

    const layoutToggle = el(
      'div',
      { className: 'layout-toggle', role: 'group', 'aria-label': 'Режим просмотра' },
      el(
        'button',
        {
          type: 'button',
          'aria-pressed': String(state.compareMode),
          onClick: () => handlers.setCompareMode(true)
        },
        '3 колонки рядом'
      ),
      el(
        'button',
        {
          type: 'button',
          'aria-pressed': String(!state.compareMode),
          onClick: () => handlers.setCompareMode(false)
        },
        'Фокус 390 px'
      )
    );

    const variantGroup = !state.compareMode
      ? el(
          'fieldset',
          { className: 'control-group' },
          el('legend', null, 'Концепция интерфейса'),
          el(
            'div',
            { className: 'btn-row' },
            CONCEPTS.map((c) =>
              el(
                'button',
                {
                  type: 'button',
                  className: 'seg-btn',
                  'aria-pressed': String(state.variant === c.id),
                  onClick: () => handlers.setVariant(c.id)
                },
                c.short
              )
            )
          )
        )
      : null;

    const scenarioGroup = el(
      'fieldset',
      { className: 'control-group' },
      el('legend', null, 'Тестовый сценарий телеметрии'),
      el(
        'div',
        { className: 'btn-row' },
        scenarios.map((s) =>
          el(
            'button',
            {
              type: 'button',
              className: 'seg-btn seg-btn--scenario',
              'aria-pressed': String(state.scenarioId === s.id),
              onClick: () => handlers.setScenario(s.id)
            },
            s.shortLabel
          )
        )
      )
    );

    return el(
      'header',
      { className: 'studio-header' },
      el(
        'div',
        { className: 'studio-header__top' },
        el(
          'div',
          null,
          el('p', { className: 'studio-kicker' }, 'Greenhouse · этап мониторинга (read-only)'),
          el('h1', { className: 'studio-title' }, 'Сравнение 3 мобильных концепций')
        ),
        el('div', { className: 'header-actions' }, motionBtn, layoutToggle)
      ),
      el('div', { className: 'controls-block' }, variantGroup, scenarioGroup)
    );
  }

  function renderStage() {
    clear(stageNode);
    stageNode.className = state.compareMode ? 'stage stage--compare' : 'stage';

    if (!currentSnapshot) return;

    const listToRender = state.compareMode
      ? CONCEPTS
      : [CONCEPTS.find((c) => c.id === state.variant) ?? CONCEPTS[0]];

    for (const concept of listToRender) {
      const deviceFrame = el(
        'div',
        { className: 'device-frame' },
        el(
          'div',
          { className: 'device-statusbar', 'aria-hidden': 'true' },
          el('span', null, currentSnapshot.nowLabel),
          el('span', { className: 'device-notch' }),
          el('span', null, 'LTE · 390px')
        ),
        el(
          'div',
          { className: 'device-screen' },
          concept.render(currentSnapshot, state, handlers, { sites, headingLevel: 2 })
        )
      );

      const slot = el(
        'section',
        { className: 'concept-slot', 'aria-labelledby': `concept-title-${concept.id}` },
        el(
          'div',
          { className: 'concept-meta' },
          el('h2', { id: `concept-title-${concept.id}`, className: 'concept-meta__title' }, concept.title),
          el('span', { className: 'concept-meta__tag' }, concept.tag)
        ),
        deviceFrame
      );
      stageNode.appendChild(slot);
    }
  }

  function buildFooter() {
    const sourceText = currentSnapshot
      ? `${currentSnapshot.sourceLabel} · ${currentSnapshot.timezoneLabel}`
      : provider.label;

    return el(
      'footer',
      { className: 'studio-footer' },
      el('strong', null, 'Демо-мониторинг · только чтение, оборудование не подключено.'),
      el(
        'span',
        null,
        'Источник данных: ',
        el('code', null, sourceText),
        '. Замена адаптера (mock -> HTTP) выполняется в одной точке (provider.js) без правок UI. Иллюстрации в шапках концепций носят демонстрационный характер (не видеопоток камер).'
      ),
      el(
        'span',
        null,
        'FS1 фиксирует наличие потока, не расход. При потере связи или устаревании пакета полив и поток всегда скрываются как «Неизвестно».'
      )
    );
  }

  function renderAll() {
    const activeConcept = CONCEPTS.find((c) => c.id === state.variant) ?? CONCEPTS[0];
    document.title = state.compareMode
      ? '3 концепции рядом | Greenhouse Мониторинг'
      : `${activeConcept.title} | Greenhouse Мониторинг`;

    frameNode.className = state.compareMode ? 'page-frame page-frame--compare' : 'page-frame';
    clear(frameNode);
    frameNode.appendChild(el('a', { href: '#main-content', className: 'skip-link visually-hidden' }, 'Перейти к мониторингу'));
    frameNode.appendChild(buildHeader());
    renderStage();
    frameNode.appendChild(stageNode);
    frameNode.appendChild(buildFooter());
    frameNode.appendChild(announcer);
  }

  async function loadAndRender() {
    currentSnapshot = await provider.getSnapshot({
      siteId: state.siteId,
      scenarioId: state.scenarioId
    });
    renderAll();
  }

  clear(root);
  root.appendChild(frameNode);
  await loadAndRender();

  window.addEventListener('resize', () => {
    if (state.compareMode && window.innerWidth < COMPARE_BREAKPOINT) {
      state.compareMode = false;
      renderAll();
    }
  });
}

const appRoot = document.getElementById('app');
if (appRoot) {
  mountApp(appRoot);
}
