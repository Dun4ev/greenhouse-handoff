// Интерактивный мобильный прототип-гибрид 2B (Стекло и ботаника) + 2C (График поливов и счетчики)
// + нижний плавающий док в стиле Cultiveq с просмотром всех точек полива и выезжающим компактным графиком.

import { createDataProvider } from '../data/provider.js';
import { clear, el, svgEl } from '../ui/dom.js';

const DEMO_SITES = [
  { id: 'srb-pilot-1', label: '2 зоны (пилот)' },
  { id: 'srb-scale-4', label: '4 зоны (проверка масштаба)' }
];

const THEME_STORAGE_KEY = 'greenhouse_hybrid_theme';
const CALL_STORAGE_KEY = 'greenhouse_hybrid_call_contact';
const VALID_THEMES = new Set(['system', 'light', 'dark']);

function loadSavedTheme() {
  try {
    const val = window.localStorage.getItem(THEME_STORAGE_KEY);
    return VALID_THEMES.has(val) ? val : 'system';
  } catch {
    return 'system';
  }
}

function applyTheme(theme) {
  const safe = VALID_THEMES.has(theme) ? theme : 'system';
  document.documentElement.dataset.theme = safe;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, safe);
  } catch {
    // localStorage недоступен в приватном режиме
  }
}

function loadCallContact() {
  try {
    const raw = window.localStorage.getItem(CALL_STORAGE_KEY);
    if (!raw) return { label: '', phone: '' };
    const parsed = JSON.parse(raw);
    return {
      label: typeof parsed?.label === 'string' ? parsed.label.trim() : '',
      phone: typeof parsed?.phone === 'string' ? parsed.phone.trim() : ''
    };
  } catch {
    return { label: '', phone: '' };
  }
}

function saveCallContact(contact) {
  const clean = {
    label: String(contact?.label ?? '').trim().slice(0, 40),
    phone: String(contact?.phone ?? '').trim().slice(0, 32)
  };
  try {
    window.localStorage.setItem(CALL_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Игнорируем ошибку записи localStorage
  }
  return clean;
}

function sanitizeTelHref(phone) {
  const raw = String(phone || '').trim();
  const hasPlus = raw.startsWith('+');
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 3) return '';
  return `tel:${hasPlus ? '+' : ''}${digits}`;
}

function capturePointerSafe(target, pointerId) {
  try {
    target.setPointerCapture?.(pointerId);
  } catch {
    // Игнорируем NotFoundError при синтетических или отмененных событиях указателя
  }
}

function makeIcon(kind) {
  const svg = svgEl('svg', {
    class: 'hb-dock__svg',
    viewBox: '0 0 24 24',
    width: '20',
    height: '20',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
    focusable: 'false'
  });

  if (kind === 'home') {
    svg.appendChild(svgEl('path', { d: 'M3 10.5L12 3l9 7.5' }));
    svg.appendChild(svgEl('path', { d: 'M5 9.5V20h5v-6h4v6h5V9.5' }));
  } else if (kind === 'outlets') {
    svg.appendChild(svgEl('path', { d: 'M12 3.5C12 3.5 6.5 9.8 6.5 14a5.5 5.5 0 0 0 11 0c0-4.2-5.5-10.5-5.5-10.5Z' }));
    svg.appendChild(svgEl('path', { d: 'M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5' }));
  } else if (kind === 'chart') {
    svg.appendChild(svgEl('rect', { x: '4', y: '11', width: '3.5', height: '9', rx: '1.2' }));
    svg.appendChild(svgEl('rect', { x: '10.25', y: '5', width: '3.5', height: '15', rx: '1.2' }));
    svg.appendChild(svgEl('rect', { x: '16.5', y: '8.5', width: '3.5', height: '11.5', rx: '1.2' }));
  } else if (kind === 'events') {
    svg.appendChild(svgEl('path', { d: 'M12 4a5.5 5.5 0 0 0-5.5 5.5v3.2L5 15.5h14l-1.5-2.8V9.5A5.5 5.5 0 0 0 12 4Z' }));
    svg.appendChild(svgEl('path', { d: 'M9.5 18.5a2.5 2.5 0 0 0 5 0' }));
  } else if (kind === 'phone') {
    svg.appendChild(
      svgEl('path', {
        d: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92Z'
      })
    );
  } else if (kind === 'settings') {
    svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '3' }));
    svg.appendChild(
      svgEl('path', {
        d: 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z'
      })
    );
  }
  return svg;
}

function summarizeHeaderStatus(snapshot) {
  const wateringCount = snapshot.zones.filter((z) => z.watering.state === 'watering').length;
  const offlineCount = snapshot.zones.filter((z) => z.connection.state === 'offline').length;
  const staleOnlineCount = snapshot.zones.filter(
    (z) => z.connection.state === 'online' && z.telemetry.freshness !== 'fresh'
  ).length;
  const onlineCount = snapshot.zones.length - offlineCount;

  const pills = [];
  if (wateringCount > 0) {
    pills.push({ text: `Полив ${wateringCount}`, tone: 'water' });
  } else if (offlineCount === 0 && staleOnlineCount === 0) {
    pills.push({ text: 'Ожидание', tone: 'ok' });
  }

  if (offlineCount > 0) {
    pills.push({ text: `Нет связи ${offlineCount}`, tone: 'danger' });
  } else if (staleOnlineCount > 0) {
    pills.push({ text: `Устарел ${staleOnlineCount}`, tone: 'warn' });
  } else {
    pills.push({ text: `Онлайн ${onlineCount}/${snapshot.zones.length}`, tone: 'ok' });
  }

  const beaconTone =
    offlineCount > 0 ? 'danger' : staleOnlineCount > 0 ? 'warn' : wateringCount > 0 ? 'water' : 'ok';

  return { pills, beaconTone };
}

function renderCompactZoneCard(zone, isSelected, isJumpFocus, onSelect) {
  const isWatering = zone.watering.state === 'watering';
  const isUnknown = !zone.telemetryReliable;

  const toneClass =
    zone.trustLevel === 'danger'
      ? 'hb-zcard--danger'
      : zone.trustLevel === 'warn'
        ? 'hb-zcard--warn'
        : isWatering
          ? 'hb-zcard--water'
          : 'hb-zcard--idle';

  const statusText =
    zone.connection.state === 'offline'
      ? 'Нет связи'
      : zone.telemetry.freshness !== 'fresh'
        ? 'Устарел'
        : isWatering
          ? 'Полив'
          : 'Норма';

  const shortAge = zone.telemetry.ageLabel.replace(/\s*назад$/, '');

  const primaryLine = isWatering
    ? `${zone.watering.elapsedLabel || 'Идет'} · ${zone.watering.activeOutletLabel}`
    : isUnknown
      ? `? · ${shortAge}`
      : 'Ожидание';

  const secondaryLine = isWatering
    ? `FS1: Есть поток · ${zone.watering.activeOutlet}/${zone.outletsTotal}`
    : zone.connection.state === 'offline'
      ? 'FS1: Неизвестно · Обрыв'
      : zone.telemetry.freshness !== 'fresh'
        ? 'Связь есть · FS1 неизв.'
        : `FS1: Нет потока · ${shortAge}`;

  const bar = el(
    'span',
    { className: 'hb-zcard__bar', 'aria-hidden': 'true' },
    zone.outletLabels.map((_, idx) => {
      const segCls = isUnknown
        ? 'hb-zseg hb-zseg--unknown'
        : isWatering && zone.watering.activeOutlet === idx + 1
          ? 'hb-zseg hb-zseg--active'
          : 'hb-zseg';
      return el('span', { className: segCls });
    })
  );

  return el(
    'button',
    {
      type: 'button',
      className: `hb-zcard ${toneClass} ${isSelected ? 'hb-zcard--selected' : ''} ${isJumpFocus ? 'hb-zcard--jump-focus' : ''}`,
      'aria-pressed': String(isSelected),
      onClick: () => onSelect(zone.id)
    },
    el(
      'span',
      { className: 'hb-zcard__top' },
      el('span', { className: 'hb-zcard__name' }, zone.name),
      el('span', { className: `hb-zcard__badge hb-zcard__badge--${zone.trustLevel === 'ok' && isWatering ? 'water' : zone.trustLevel}` }, statusText)
    ),
    el('span', { className: 'hb-zcard__main' }, primaryLine),
    el('span', { className: 'hb-zcard__sub' }, secondaryLine),
    bar
  );
}

/**
 * Экран 2-й кнопки дока: сразу все точки полива (все зоны и все выходы К4..К9).
 */
function renderAllOutletsView(snapshot, onSelectZone) {
  const totalOutlets = snapshot.zones.reduce((acc, z) => acc + z.outletsTotal, 0);
  const activeCount = snapshot.zones.filter((z) => z.watering.state === 'watering').length;
  const unknownZones = snapshot.zones.filter((z) => !z.telemetryReliable).length;

  return el(
    'section',
    { className: 'hb-outlets-view', 'aria-labelledby': 'hb-outlets-title' },
    el(
      'div',
      { className: 'hb-outlets-view__head' },
      el(
        'div',
        null,
        el('h2', { id: 'hb-outlets-title', className: 'hb-section-title' }, 'Все точки полива'),
        el(
          'p',
          { className: 'hb-outlets-view__sub' },
          `Всего точек: ${totalOutlets} · активных: ${activeCount}${unknownZones > 0 ? ` · без телеметрии зон: ${unknownZones}` : ''}`
        )
      )
    ),
    el(
      'div',
      { className: 'hb-outlets-groups' },
      snapshot.zones.map((zone) => {
        const isWatering = zone.watering.state === 'watering';
        const isUnknown = !zone.telemetryReliable;

        return el(
          'article',
          { className: `hb-ogroup ${isUnknown ? 'hb-ogroup--unknown' : isWatering ? 'hb-ogroup--water' : ''}` },
          el(
            'header',
            { className: 'hb-ogroup__head' },
            el(
              'button',
              {
                type: 'button',
                className: 'hb-ogroup__zbtn',
                onClick: () => onSelectZone(zone.id)
              },
              zone.name
            ),
            el(
              'span',
              { className: 'hb-ogroup__fs' },
              isUnknown
                ? `${zone.connection.label} · FS1: Неизвестно`
                : `FS1: ${zone.flow.label}`
            )
          ),
          el(
            'ul',
            {
              className: `hb-ogrid hb-ogrid--n${zone.outletsTotal}`,
              role: 'list',
              'aria-label': `Точки полива ${zone.name}`
            },
            zone.outletLabels.map((lbl, idx) => {
              const num = idx + 1;
              const isActive = isWatering && zone.watering.activeOutlet === num;
              return el(
                'li',
                {
                  className: `hb-opoint ${isUnknown ? 'hb-opoint--unknown' : isActive ? 'hb-opoint--active' : 'hb-opoint--idle'}`
                },
                el('span', { className: 'hb-opoint__code' }, lbl),
                el(
                  'span',
                  { className: 'hb-opoint__state' },
                  isUnknown ? 'Неизв.' : isActive ? (zone.watering.elapsedLabel || 'Полив') : 'Закрыт'
                )
              );
            })
          )
        );
      })
    )
  );
}

function formatSlotRange(windowStart, idx) {
  const parts = String(windowStart || '13:32').split(':').map(Number);
  const baseMin = (Number.isFinite(parts[0]) ? parts[0] : 13) * 60 + (Number.isFinite(parts[1]) ? parts[1] : 32);
  const fmt = (total) => {
    const wrapped = ((total % 1440) + 1440) % 1440;
    const h = String(Math.floor(wrapped / 60)).padStart(2, '0');
    const m = String(wrapped % 60).padStart(2, '0');
    return `${h}:${m}`;
  };
  return `${fmt(baseMin + idx * 2)}–${fmt(baseMin + (idx + 1) * 2)}`;
}

function slotStateLabel(slotState) {
  if (slotState === 'watering') return 'Полив (FS1)';
  if (slotState === 'gap') return 'Нет данных';
  return 'Пауза';
}

/**
 * Компактный выезжающий график поливов за 60 минут в стеклянном стиле с интерактивным просмотром (scrub).
 */
function renderFloatingPulseDrawer(snapshot, selectedZoneId, animateBars, onSelectZone, onClose) {
  const visibleZones = selectedZoneId
    ? snapshot.zones.filter((z) => z.id === selectedZoneId)
    : snapshot.zones;

  const firstStrip = visibleZones[0]?.pulseStrip;
  const winStart = firstStrip?.windowStart ?? '13:32';
  const winEnd = firstStrip?.windowEnd ?? snapshot.nowLabel;

  return el(
    'section',
    {
      className: `hb-pulse-drawer ${animateBars ? 'hb-pulse-drawer--animate' : ''}`,
      'aria-labelledby': 'hb-drawer-title'
    },
    el(
      'div',
      { className: 'hb-pulse-drawer__head' },
      el(
        'div',
        { className: 'hb-pulse-drawer__titles' },
        el('h2', { id: 'hb-drawer-title', className: 'hb-pulse-drawer__title' }, 'График полива · 60 мин'),
        el('span', { className: 'hb-pulse-drawer__win' }, `${winStart}–${winEnd}`)
      ),
      el(
        'button',
        {
          type: 'button',
          className: 'hb-pulse-drawer__close',
          'aria-label': 'Скрыть график полива',
          onClick: onClose
        },
        '×'
      )
    ),
    el(
      'div',
      { className: 'hb-pulse-drawer__tracks' },
      visibleZones.map((zone) => {
        const strip = zone.pulseStrip;
        const noWateringAtAll = !strip.hasGap && strip.wateringCount === 0;
        const tipEl = el('div', { className: 'hb-scrub-tip', 'aria-hidden': 'true' });
        const ruleEl = el('span', { className: 'hb-scrub-rule', 'aria-hidden': 'true' });
        const tickEls = strip.slots.map((slotState, idx) =>
          el('span', {
            className: `hb-dtick hb-dtick--${slotState} ${idx === strip.slots.length - 1 ? 'hb-dtick--latest' : ''}`,
            style: `--i: ${idx}`
          })
        );

        let activeIdx = -1;
        const clearScrub = () => {
          if (activeIdx >= 0 && tickEls[activeIdx]) {
            tickEls[activeIdx].classList.remove('is-scrubbed');
          }
          activeIdx = -1;
          tipEl.classList.remove('is-visible');
          ruleEl.classList.remove('is-visible');
        };

        const updateScrub = (clientX, container) => {
          const rect = container.getBoundingClientRect();
          if (rect.width <= 0) return;
          const ratio = Math.max(0, Math.min(0.9999, (clientX - rect.left) / rect.width));
          const idx = Math.floor(ratio * strip.slots.length);
          if (idx === activeIdx) return;
          if (activeIdx >= 0 && tickEls[activeIdx]) {
            tickEls[activeIdx].classList.remove('is-scrubbed');
          }
          activeIdx = idx;
          const slotState = strip.slots[idx];
          tickEls[idx]?.classList.add('is-scrubbed');

          const pct = ((idx + 0.5) / strip.slots.length) * 100;
          const clampedPct = Math.max(18, Math.min(82, pct));
          tipEl.textContent = `${formatSlotRange(strip.windowStart ?? winStart, idx)} · ${slotStateLabel(slotState)}`;
          tipEl.dataset.tone = slotState;
          tipEl.style.left = `${clampedPct}%`;
          tipEl.classList.add('is-visible');

          ruleEl.style.left = `${pct}%`;
          ruleEl.classList.add('is-visible');
        };

        const ticksWrap = el(
          'div',
          {
            className: 'hb-dticks',
            role: 'img',
            'aria-label': `${zone.name}: ${strip.summary}`,
            onPointerdown: (e) => {
              capturePointerSafe(e.currentTarget, e.pointerId);
              updateScrub(e.clientX, e.currentTarget);
            },
            onPointermove: (e) => {
              if (e.buttons > 0 || e.pointerType === 'mouse') {
                updateScrub(e.clientX, e.currentTarget);
              }
            },
            onPointerup: clearScrub,
            onPointercancel: clearScrub,
            onPointerleave: clearScrub
          },
          tickEls,
          ruleEl,
          tipEl
        );

        return el(
          'div',
          { className: 'hb-dtrack' },
          el(
            'div',
            { className: 'hb-dtrack__meta' },
            el(
              'button',
              {
                type: 'button',
                className: 'hb-dtrack__zbtn',
                onClick: () => onSelectZone(zone.id)
              },
              zone.name
            ),
            el(
              'span',
              {
                className: `hb-dtrack__sum ${strip.hasGap ? 'is-gap' : noWateringAtAll ? 'is-dry' : ''}`
              },
              strip.summary
            )
          ),
          ticksWrap
        );
      })
    ),
    el(
      'div',
      { className: 'hb-dlegend', 'aria-hidden': 'true' },
      el('span', null, el('i', { className: 'hb-dot hb-dot--water' }), 'Полив'),
      el('span', null, el('i', { className: 'hb-dot hb-dot--idle' }), 'Пауза'),
      el('span', null, el('i', { className: 'hb-dot hb-dot--gap' }), 'Нет данных'),
      el('span', { className: 'hb-dlegend__hint' }, 'Ведите по шкале для времени')
    )
  );
}

function renderCallAction(callContact, onOpenCallSetup) {
  const telHref = sanitizeTelHref(callContact?.phone);
  if (telHref) {
    const caption = callContact.label ? `Позвонить · ${callContact.label}` : `Позвонить · ${callContact.phone}`;
    return el(
      'a',
      { href: telHref, className: 'hb-call-btn' },
      makeIcon('phone'),
      el('span', null, caption)
    );
  }
  return el(
    'button',
    { type: 'button', className: 'hb-call-btn hb-call-btn--setup', onClick: onOpenCallSetup },
    makeIcon('phone'),
    el('span', null, 'Указать телефон вызова')
  );
}

function renderSettingsOverlay(theme, callContact, demoCtx, onSelectTheme, onSaveContact, onClearContact, onClose) {
  const themes = [
    { id: 'system', label: 'Система' },
    { id: 'light', label: 'Светлая' },
    { id: 'dark', label: 'Темная' }
  ];

  const labelInput = el('input', {
    id: 'hb-call-label',
    type: 'text',
    className: 'hb-field__input',
    maxlength: '40',
    placeholder: 'Дежурный на объекте',
    value: callContact.label || ''
  });

  const phoneInput = el('input', {
    id: 'hb-call-phone',
    type: 'tel',
    inputmode: 'tel',
    autocomplete: 'tel',
    className: 'hb-field__input',
    maxlength: '32',
    placeholder: '+381 60 123-45-67',
    value: callContact.phone || ''
  });

  const feedbackEl = el('p', { className: 'hb-settings__status', role: 'status' });

  return el(
    'div',
    {
      className: 'hb-settings-backdrop',
      onClick: (e) => {
        if (e.target === e.currentTarget) onClose();
      }
    },
    el(
      'section',
      {
        className: 'hb-settings-drawer',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': 'hb-settings-title'
      },
      el(
        'div',
        { className: 'hb-settings-drawer__head' },
        el('h2', { id: 'hb-settings-title', className: 'hb-settings-drawer__title' }, 'Настройки'),
        el(
          'button',
          {
            type: 'button',
            className: 'hb-pulse-drawer__close',
            'aria-label': 'Закрыть настройки',
            onClick: onClose
          },
          '×'
        )
      ),
      el(
        'div',
        { className: 'hb-settings-group' },
        el('span', { className: 'hb-settings-group__label' }, 'Тема оформления'),
        el(
          'div',
          { className: 'hb-theme-seg', role: 'group', 'aria-label': 'Выбор темы' },
          themes.map((t) =>
            el(
              'button',
              {
                type: 'button',
                className: 'hb-theme-seg__btn',
                'aria-pressed': String(theme === t.id),
                onClick: () => onSelectTheme(t.id)
              },
              t.label
            )
          )
        )
      ),
      el(
        'form',
        {
          className: 'hb-settings-group',
          onSubmit: (e) => {
            e.preventDefault();
            const phoneVal = phoneInput.value.trim();
            if (!sanitizeTelHref(phoneVal)) {
              feedbackEl.textContent = 'Введите корректный номер (минимум 3 цифры).';
              feedbackEl.dataset.tone = 'warn';
              phoneInput.focus();
              return;
            }
            onSaveContact({ label: labelInput.value, phone: phoneVal });
          }
        },
        el('span', { className: 'hb-settings-group__label' }, 'Телефон для экстренного вызова'),
        el(
          'label',
          { className: 'hb-field', htmlFor: 'hb-call-label' },
          el('span', { className: 'hb-field__k' }, 'Подпись (кому звоним)'),
          labelInput
        ),
        el(
          'label',
          { className: 'hb-field', htmlFor: 'hb-call-phone' },
          el('span', { className: 'hb-field__k' }, 'Номер телефона'),
          phoneInput
        ),
        feedbackEl,
        el(
          'div',
          { className: 'hb-settings-actions' },
          el('button', { type: 'submit', className: 'hb-settings-save' }, 'Сохранить'),
          callContact.phone
            ? el(
                'button',
                {
                  type: 'button',
                  className: 'hb-settings-clear',
                  onClick: onClearContact
                },
                'Очистить'
              )
            : null
        )
      ),
      el(
        'p',
        { className: 'hb-settings-note' },
        'Сохраняется локально в браузере. Кнопка вызова открывает звонок с телефона (tel:).'
      ),
      el(
        'details',
        { className: 'hb-settings-demo' },
        el('summary', { className: 'hb-settings-demo__summary' }, 'Сценарий демо и масштаб зон'),
        el(
          'div',
          { className: 'hb-settings-demo__body' },
          el(
            'div',
            { className: 'hb-settings-demo__row' },
            demoCtx.scenarios.map((s) =>
              el(
                'button',
                {
                  type: 'button',
                  className: 'hb-settings-demo__btn',
                  'aria-pressed': String(demoCtx.scenarioId === s.id),
                  onClick: () => demoCtx.onSelectScenario(s.id)
                },
                s.shortLabel
              )
            )
          ),
          el(
            'div',
            { className: 'hb-settings-demo__row hb-settings-demo__row--2' },
            demoCtx.sites.map((s) =>
              el(
                'button',
                {
                  type: 'button',
                  className: 'hb-settings-demo__btn',
                  'aria-pressed': String(demoCtx.siteId === s.id),
                  onClick: () => demoCtx.onSelectSite(s.id)
                },
                s.label
              )
            )
          ),
          el(
            'button',
            {
              type: 'button',
              className: 'hb-settings-demo__btn',
              'aria-pressed': String(demoCtx.motionPaused),
              onClick: demoCtx.onToggleMotion
            },
            demoCtx.motionPaused ? 'Включить анимации' : 'Пауза анимаций'
          )
        )
      )
    )
  );
}

function renderZoneDetailCard(zone, callContact, onOpenCallSetup, onClose) {
  const isWatering = zone.watering.state === 'watering';
  const isUnknown = !zone.telemetryReliable;

  const cells = [
    {
      label: 'Канал связи',
      val: zone.connection.label,
      sub: zone.connection.lastLinkAt,
      tone: zone.connection.state === 'online' ? 'ok' : 'danger'
    },
    {
      label: 'Свежесть пакета',
      val: zone.telemetry.label,
      sub: `${zone.telemetry.packetId} · ${zone.telemetry.ageLabel}`,
      tone: zone.telemetry.freshness === 'fresh' ? 'ok' : 'warn'
    },
    {
      label: 'Поток FS1',
      val: zone.flow.label,
      sub: 'Только наличие',
      tone: zone.flow.state === 'present' ? 'water' : zone.flow.state === 'absent' ? 'neutral' : 'danger'
    },
    {
      label: 'Полив',
      val: zone.watering.shortLabel,
      sub: isWatering
        ? `${zone.watering.activeOutletLabel} (${zone.watering.activeOutlet}/${zone.outletsTotal}) · ${zone.watering.elapsedLabel}`
        : isUnknown
          ? 'Не подтвержден'
          : `${zone.outletsTotal} вых. закрыты`,
      tone: isWatering ? 'water' : isUnknown ? 'danger' : 'neutral'
    }
  ];

  return el(
    'section',
    { className: 'hb-inspector', 'aria-label': `Детали ${zone.name}` },
    el(
      'div',
      { className: 'hb-inspector__head' },
      el(
        'div',
        null,
        el('h3', { className: 'hb-inspector__title' }, `${zone.name} · паспорт достоверности`),
        el('p', { className: 'hb-inspector__sub' }, zone.pumpModel)
      ),
      el(
        'button',
        { type: 'button', className: 'hb-close-btn', onClick: onClose },
        'Все зоны'
      )
    ),
    el(
      'div',
      { className: 'hb-matrix' },
      cells.map((c) =>
        el(
          'div',
          { className: `hb-mcell hb-mcell--${c.tone}` },
          el('span', { className: 'hb-mcell__k' }, c.label),
          el('strong', { className: 'hb-mcell__v' }, c.val),
          el('span', { className: 'hb-mcell__s' }, c.sub)
        )
      )
    ),
    el(
      'ul',
      {
        className: `hb-valves hb-valves--n${zone.outletsTotal}`,
        role: 'list',
        'aria-label': `Выходы ${zone.name}`
      },
      zone.outletLabels.map((lbl, idx) => {
        const active = isWatering && zone.watering.activeOutlet === idx + 1;
        return el(
          'li',
          {
            className: `hb-valve ${isUnknown ? 'hb-valve--unknown' : active ? 'hb-valve--active' : ''}`
          },
          el('span', { className: 'hb-valve__k' }, lbl),
          el('span', { className: 'hb-valve__s' }, isUnknown ? '?' : active ? 'Полив' : '—')
        );
      })
    ),
    zone.telemetry.ignoredDuplicates > 0 || zone.telemetry.ignoredOutOfOrder > 0
      ? el(
          'p',
          { className: 'hb-dedup' },
          `Порядок пакетов: запоздалый (${zone.telemetry.ignoredOutOfOrder}) записан 1 раз, повторов отброшено (${zone.telemetry.ignoredDuplicates}). Удержан пакет ${zone.telemetry.packetId} (${zone.telemetry.deviceTime}).`
        )
      : null,
    !zone.telemetryReliable
      ? el(
          'div',
          { className: 'hb-recovery-box' },
          el(
            'p',
            { className: 'hb-recovery-tip' },
            zone.connection.state === 'offline'
              ? 'Что проверить: питание шкафа ША-У и уровень сигнала LTE.'
              : 'Что проверить: канал связи жив, проверить отправку телеметрии на Raspberry Pi / ОВЕН.'
          ),
          renderCallAction(callContact, onOpenCallSetup)
        )
      : null,
    el(
      'p',
      { className: 'hb-hw-note' },
      'FS1 фиксирует только наличие потока, не расход. pH/EC (HM-100) и уровень Е4 проверяются локально.'
    )
  );
}

function renderTimeline(snapshot, activeTab, callContact, onOpenCallSetup, onSelectTab, onJumpToZone) {
  const zoneNames = new Map(snapshot.zones.map((z) => [z.id, z.name]));

  const alertEvents = snapshot.events.filter(
    (e) => e.kind === 'warning' || e.kind === 'gap' || e.kind === 'late'
  );

  // Ограничиваем видимые вкладки до <= 4 (правило рабочей памяти):
  // при <=2 зонах: Все, Зона 1, Зона 2, Тревоги; при >2 зонах: Все, Тревоги + активный чип выбранной зоны.
  const tabs = [{ id: 'all', label: 'Все', count: snapshot.events.length, alert: false }];
  if (snapshot.zones.length <= 2) {
    for (const z of snapshot.zones) {
      const zCount = snapshot.events.filter((e) => e.zoneId === z.id).length;
      if (zCount > 0 || activeTab === `z${z.id}`) {
        tabs.push({
          id: `z${z.id}`,
          label: z.name,
          count: zCount,
          alert: !z.telemetryReliable
        });
      }
    }
  } else if (activeTab.startsWith('z')) {
    const zId = Number(activeTab.slice(1));
    const z = snapshot.zones.find((item) => item.id === zId);
    if (z) {
      tabs.push({
        id: activeTab,
        label: `${z.name} ×`,
        count: snapshot.events.filter((e) => e.zoneId === z.id).length,
        alert: !z.telemetryReliable,
        clearOnClick: true
      });
    }
  }
  tabs.push({ id: 'alerts', label: 'Тревоги', count: alertEvents.length, alert: alertEvents.length > 0 });

  const filtered =
    activeTab === 'all'
      ? snapshot.events
      : activeTab === 'alerts'
        ? alertEvents
        : snapshot.events.filter((e) => `z${e.zoneId}` === activeTab);

  return el(
    'section',
    { className: 'hb-feed', 'aria-labelledby': 'hb-feed-title' },
    el(
      'div',
      { className: 'hb-tabs', role: 'group', 'aria-label': 'Фильтр зон и событий' },
      el('span', { className: 'hb-tabs__indicator', 'aria-hidden': 'true' }),
      tabs.map((t) =>
        el(
          'button',
          {
            type: 'button',
            className: `hb-tab ${t.alert ? 'hb-tab--alert' : ''}`,
            'aria-pressed': String(activeTab === t.id),
            onClick: () => onSelectTab(t.clearOnClick ? 'all' : t.id)
          },
          el('span', { className: 'hb-tab__label' }, t.label),
          el('span', { className: 'hb-tab__count' }, String(t.count))
        )
      )
    ),
    el(
      'div',
      { className: 'hb-feed__head' },
      el('h2', { id: 'hb-feed-title', className: 'hb-section-title' }, 'Лента смены'),
      el('span', { className: 'hb-feed__meta' }, `${filtered.length} запис.`)
    ),
    activeTab === 'alerts' && alertEvents.length > 0
      ? el('div', { className: 'hb-alerts-call-bar' }, renderCallAction(callContact, onOpenCallSetup))
      : null,
    filtered.length > 0
      ? el(
          'ol',
          { className: 'hb-events', role: 'list' },
          filtered.map((evt, idx) => {
            const zName = zoneNames.get(evt.zoneId) ?? `Зона ${evt.zoneId}`;
            return el(
              'li',
              {
                className: `hb-event hb-event--${evt.kind}`,
                style: `--stagger: ${idx}`
              },
              el('span', { className: 'hb-event__dot', 'aria-hidden': 'true' }),
              el(
                'button',
                {
                  type: 'button',
                  className: 'hb-event__body hb-event__btn',
                  onClick: () => onJumpToZone(evt.zoneId)
                },
                el(
                  'span',
                  { className: 'hb-event__top' },
                  el('time', { className: 'hb-event__time' }, evt.time),
                  el('span', { className: 'hb-event__zone' }, zName),
                  evt.packetId ? el('span', { className: 'hb-event__pid' }, evt.packetId) : null,
                  el('span', { className: 'hb-event__goto', 'aria-hidden': 'true' }, 'К зоне →')
                ),
                evt.gapLabel ? el('span', { className: 'hb-event__gap' }, evt.gapLabel) : null,
                el('span', { className: 'hb-event__text' }, evt.text),
                evt.meta ? el('span', { className: 'hb-event__meta' }, evt.meta) : null
              )
            );
          })
        )
      : el('p', { className: 'hb-empty' }, 'По этому фильтру событий пока нет.')
  );
}

export async function mountHybridApp(root, providerConfig = { mode: 'mock' }) {
  const provider = createDataProvider(providerConfig);
  const scenarios = provider.getScenarios();

  const params = new URLSearchParams(window.location.search);
  const state = {
    siteId: DEMO_SITES.some((s) => s.id === params.get('site')) ? params.get('site') : 'srb-scale-4',
    scenarioId: scenarios.some((s) => s.id === params.get('scenario')) ? params.get('scenario') : 'incident',
    selectedZoneId: null,
    activeTab: 'all',
    dockView: 'overview', // 'overview' | 'outlets' | 'events'
    pulseDrawerOpen: false,
    settingsOpen: false,
    sheetExpanded: false,
    motionPaused: false,
    theme: loadSavedTheme(),
    callContact: loadCallContact()
  };

  applyTheme(state.theme);

  let snapshot = null;
  let demoDrawerOpen = window.innerWidth >= 820;
  let prevDockRect = null;
  let prevTabRect = null;
  let prevAlertCount = null;
  let justOpenedPulse = false;
  let justJumpedZoneId = null;
  let pendingSheetFromTop = null;
  let sheetAnimatingZones = false;
  const announcer = el('p', { className: 'visually-hidden', 'aria-live': 'polite' });

  function isMotionAllowed() {
    if (state.motionPaused) return false;
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  function captureActiveBox(containerSelector, activeSelector) {
    const container = root.querySelector(containerSelector);
    const active = container?.querySelector(activeSelector);
    if (!container || !active) return null;
    return {
      x: active.offsetLeft,
      y: active.offsetTop,
      w: active.offsetWidth,
      h: active.offsetHeight
    };
  }

  function syncSlidingIndicator(containerSelector, indicatorSelector, activeSelector, prevRect) {
    const container = root.querySelector(containerSelector);
    const indicator = container?.querySelector(indicatorSelector);
    const active = container?.querySelector(activeSelector);
    if (!container || !indicator || !active) return null;

    const next = {
      x: active.offsetLeft,
      y: active.offsetTop,
      w: active.offsetWidth,
      h: active.offsetHeight
    };

    indicator.style.left = `${next.x}px`;
    indicator.style.top = `${next.y}px`;
    indicator.style.width = `${next.w}px`;
    indicator.style.height = `${next.h}px`;
    indicator.classList.add('is-ready');

    if (
      prevRect &&
      isMotionAllowed() &&
      next.w > 0 &&
      (Math.abs(prevRect.x - next.x) > 1 || Math.abs(prevRect.y - next.y) > 1 || Math.abs(prevRect.w - next.w) > 1)
    ) {
      const dx = prevRect.x - next.x;
      const dy = prevRect.y - next.y;
      const sx = prevRect.w / next.w;
      const sy = next.h > 0 ? prevRect.h / next.h : 1;
      indicator.animate(
        [
          { transform: `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy})` },
          { transform: 'translate3d(0, 0, 0) scale(1, 1)' }
        ],
        {
          duration: 280,
          easing: 'cubic-bezier(0.22, 1.18, 0.36, 1)'
        }
      );
    }
    return next;
  }

  function announce(msg) {
    announcer.textContent = '';
    requestAnimationFrame(() => {
      announcer.textContent = msg;
    });
  }

  function syncUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('site', state.siteId);
    url.searchParams.set('scenario', state.scenarioId);
    window.history.replaceState(null, '', url);
  }

  function selectZone(zoneId) {
    if (state.selectedZoneId === zoneId) {
      state.selectedZoneId = null;
      state.activeTab = 'all';
      announce('Показаны все зоны');
    } else {
      state.selectedZoneId = zoneId;
      state.activeTab = `z${zoneId}`;
      const z = snapshot.zones.find((item) => item.id === zoneId);
      if (z) announce(`Выбрана ${z.name}: открыт паспорт достоверности`);
    }
    render();
  }

  function jumpToZone(zoneId) {
    state.dockView = 'overview';
    state.sheetExpanded = false;
    state.selectedZoneId = zoneId;
    state.activeTab = `z${zoneId}`;
    justJumpedZoneId = zoneId;
    render();
    const z = snapshot.zones.find((item) => item.id === zoneId);
    if (z) announce(`Переход в ${z.name}: открыт паспорт достоверности`);
    requestAnimationFrame(() => {
      root.querySelector('.hb-hero')?.scrollIntoView({
        behavior: isMotionAllowed() ? 'smooth' : 'auto',
        block: 'start'
      });
    });
  }

  function selectTab(tabId) {
    state.activeTab = tabId;
    if (tabId.startsWith('z')) {
      state.selectedZoneId = Number(tabId.slice(1));
    } else {
      state.selectedZoneId = null;
    }
    render();
  }

  function setDockView(view) {
    state.dockView = view;
    if (view === 'events') {
      state.activeTab = 'alerts';
      state.selectedZoneId = null;
      announce('Открыты тревоги и события смены');
    } else if (view === 'outlets') {
      state.sheetExpanded = false;
      announce('Открыты все точки полива');
    } else {
      state.activeTab = 'all';
      announce('Открыт обзор радара');
    }
    render();
  }

  function togglePulseDrawer() {
    state.pulseDrawerOpen = !state.pulseDrawerOpen;
    justOpenedPulse = state.pulseDrawerOpen;
    render();
    announce(state.pulseDrawerOpen ? 'Открыт график полива за 60 минут' : 'График полива скрыт');
  }

  function toggleSheet(forceExpanded = null) {
    const nextExpanded = typeof forceExpanded === 'boolean' ? forceExpanded : !state.sheetExpanded;
    if (nextExpanded === state.sheetExpanded) return;
    pendingSheetFromTop = root.querySelector('.hb-sheet')?.getBoundingClientRect().top ?? null;
    state.sheetExpanded = nextExpanded;
    if (!state.sheetExpanded) {
      sheetAnimatingZones = true;
    }
    render();
    announce(state.sheetExpanded ? 'Нижняя панель поднята' : 'Панель опущена к карточкам зон');
  }

  function toggleMotion() {
    state.motionPaused = !state.motionPaused;
    if (state.motionPaused) {
      document.documentElement.dataset.motion = 'paused';
    } else {
      delete document.documentElement.dataset.motion;
    }
    render();
    announce(state.motionPaused ? 'Анимации поставлены на паузу' : 'Анимации включены');
  }

  function openSettings(focusPhone = false) {
    state.settingsOpen = true;
    state.pulseDrawerOpen = false;
    render();
    announce('Открыты настройки темы и телефона');
    requestAnimationFrame(() => {
      if (focusPhone) {
        root.querySelector('#hb-call-phone')?.focus();
      } else {
        root.querySelector('.hb-settings-drawer .hb-pulse-drawer__close')?.focus();
      }
    });
  }

  function closeSettings() {
    if (!state.settingsOpen) return;
    state.settingsOpen = false;
    render();
    announce('Настройки закрыты');
    requestAnimationFrame(() => {
      root.querySelector('.hb-settings-btn')?.focus();
    });
  }

  function setTheme(theme) {
    state.theme = theme;
    applyTheme(theme);
    render();
    const label = theme === 'dark' ? 'Темная тема' : theme === 'light' ? 'Светлая тема' : 'Системная тема';
    announce(label);
  }

  function updateCallContact(contact) {
    state.callContact = saveCallContact(contact);
    state.settingsOpen = false;
    render();
    announce('Телефон для вызова сохранен');
  }

  function clearCallContact() {
    state.callContact = saveCallContact({ label: '', phone: '' });
    render();
    announce('Телефон для вызова удален');
  }

  async function loadSnapshot() {
    snapshot = await provider.getSnapshot({
      siteId: state.siteId,
      scenarioId: state.scenarioId
    });
    if (state.selectedZoneId && !snapshot.zones.some((z) => z.id === state.selectedZoneId)) {
      state.selectedZoneId = null;
      state.activeTab = 'all';
    }
    render();
  }

  function buildDemoBar() {
    const activeScen = scenarios.find((s) => s.id === state.scenarioId)?.shortLabel ?? state.scenarioId;
    const activeSite = DEMO_SITES.find((s) => s.id === state.siteId)?.label ?? state.siteId;

    return el(
      'header',
      { className: 'demo-toolbar' },
      el(
        'div',
        { className: 'demo-toolbar__top' },
        el(
          'div',
          null,
          el('h1', { className: 'demo-title' }, 'Ботанический радар и пульс полива'),
          el('p', { className: 'demo-sub' }, `Стенд (read-only) · ${activeScen} · ${activeSite}`)
        ),
        el(
          'div',
          { className: 'demo-actions' },
          el('a', { href: 'index.html', className: 'demo-link' }, '← 3 концепции'),
          el(
            'button',
            { type: 'button', className: 'demo-motion-btn', onClick: toggleMotion },
            state.motionPaused ? 'Включить анимации' : 'Пауза анимаций'
          )
        )
      ),
      el(
        'details',
        {
          className: 'demo-details',
          open: demoDrawerOpen,
          onToggle: (e) => {
            demoDrawerOpen = e.currentTarget.open;
          }
        },
        el('summary', { className: 'demo-details__summary' }, 'Параметры стенда (сценарий и масштаб)'),
        el(
          'div',
          { className: 'demo-controls' },
          el(
            'fieldset',
            { className: 'demo-group' },
            el('legend', null, 'Сценарий телеметрии'),
            el(
              'div',
              { className: 'demo-btn-row demo-btn-row--3' },
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
                      await loadSnapshot();
                      announce(`Сценарий: ${s.label}`);
                    }
                  },
                  s.shortLabel
                )
              )
            )
          ),
          el(
            'fieldset',
            { className: 'demo-group' },
            el('legend', null, 'Проверка масштаба зон'),
            el(
              'div',
              { className: 'demo-btn-row demo-btn-row--2' },
              DEMO_SITES.map((s) =>
                el(
                  'button',
                  {
                    type: 'button',
                    className: 'demo-btn demo-btn--scale',
                    'aria-pressed': String(state.siteId === s.id),
                    onClick: async () => {
                      state.siteId = s.id;
                      syncUrl();
                      await loadSnapshot();
                      announce(`Масштаб: ${s.label}`);
                    }
                  },
                  s.label
                )
              )
            )
          )
        )
      )
    );
  }

  function render() {
    if (!snapshot) return;
    prevDockRect = captureActiveBox('.hb-dock', '.hb-dock__btn[aria-pressed="true"]') ?? prevDockRect;
    prevTabRect = captureActiveBox('.hb-tabs', '.hb-tab[aria-pressed="true"]') ?? prevTabRect;

    const { pills, beaconTone } = summarizeHeaderStatus(snapshot);
    const selectedZone = state.selectedZoneId
      ? snapshot.zones.find((z) => z.id === state.selectedZoneId) ?? null
      : null;

    const alertCount = snapshot.events.filter(
      (e) => e.kind === 'warning' || e.kind === 'gap' || e.kind === 'late'
    ).length;
    const badgePop = prevAlertCount !== null && alertCount > 0 && alertCount !== prevAlertCount;
    prevAlertCount = alertCount;

    const jumpFocusId = justJumpedZoneId;
    justJumpedZoneId = null;
    const animatePulseBars = justOpenedPulse;
    justOpenedPulse = false;

    const topTelHref = sanitizeTelHref(state.callContact.phone);
    const topCallControl = topTelHref
      ? el(
          'a',
          {
            href: topTelHref,
            className: 'hb-top-icon-btn hb-top-icon-btn--call',
            'aria-label': `Позвонить: ${state.callContact.label || state.callContact.phone}`,
            title: `Позвонить: ${state.callContact.label || state.callContact.phone}`
          },
          makeIcon('phone')
        )
      : el(
          'button',
          {
            type: 'button',
            className: 'hb-top-icon-btn',
            'aria-label': 'Указать телефон для вызова',
            title: 'Телефон вызова',
            onClick: () => openSettings(true)
          },
          makeIcon('phone')
        );

    const settingsBtn = el(
      'button',
      {
        type: 'button',
        className: 'hb-top-icon-btn hb-settings-btn',
        'aria-pressed': String(state.settingsOpen),
        'aria-label': 'Настройки темы и телефона',
        title: 'Настройки',
        onClick: () => (state.settingsOpen ? closeSettings() : openSettings(false))
      },
      makeIcon('settings')
    );

    const appHeader = el(
      'div',
      { className: 'hb-topbar' },
      el(
        'div',
        { className: 'hb-clock-block' },
        el('time', { className: 'hb-clock' }, snapshot.nowLabel),
        el('span', { className: 'hb-site-caption' }, snapshot.siteName)
      ),
      el(
        'div',
        { className: 'hb-status-cluster' },
        el(
          'span',
          { className: `hb-beacon hb-beacon--${beaconTone}`, 'aria-hidden': 'true' },
          el('span', { className: 'hb-beacon__ring' }),
          el('span', { className: 'hb-beacon__dot' })
        ),
        pills.map((p) => el('span', { className: `hb-pill hb-pill--${p.tone}` }, p.text)),
        el('div', { className: 'hb-top-actions' }, topCallControl, settingsBtn)
      )
    );

    const zonesGrid = el(
      'div',
      {
        className: `hb-zones-grid ${snapshot.zones.length > 2 ? 'hb-zones-grid--multi' : ''}`,
        role: 'group',
        'aria-label': 'Зоны теплицы'
      },
      snapshot.zones.map((z) =>
        renderCompactZoneCard(z, state.selectedZoneId === z.id, jumpFocusId === z.id, selectZone)
      )
    );

    const heroTop = el(
      'div',
      { className: `hb-hero ${state.sheetExpanded ? 'hb-hero--compact' : ''}` },
      el(
        'div',
        { className: 'hb-backdrop', 'aria-hidden': 'true' },
        el('img', {
          className: 'hb-backdrop__img',
          src: 'assets/img/hero-botany-glass.jpg',
          alt: '',
          decoding: 'async',
          width: '840',
          height: '1120'
        }),
        el('div', { className: 'hb-backdrop__scrim' })
      ),
      el(
        'div',
        { className: 'hb-hero__inner' },
        appHeader,
        !state.sheetExpanded ? zonesGrid : null
      )
    );

    let sheetDragging = false;
    let sheetStartY = 0;
    let sheetLastDy = 0;
    let sheetLastOffset = 0;
    let sheetMoved = false;
    let sheetSuppressClick = false;

    const finishSheetDrag = (commit) => {
      if (!sheetDragging) return;
      sheetDragging = false;
      const sheetEl = root.querySelector('.hb-sheet');
      const zonesEl = root.querySelector('.hb-zones-grid');

      if (sheetMoved) {
        sheetSuppressClick = true;
        setTimeout(() => {
          sheetSuppressClick = false;
        }, 0);
      }

      if (commit && !state.sheetExpanded && sheetLastDy <= -38) {
        toggleSheet(true);
        return;
      }
      if (commit && state.sheetExpanded && sheetLastDy >= 38) {
        toggleSheet(false);
        return;
      }

      if (sheetEl) {
        sheetEl.classList.remove('is-dragging');
        sheetEl.style.transform = '';
        if (isMotionAllowed() && Math.abs(sheetLastOffset) > 1) {
          sheetEl.animate(
            [
              { transform: `translate3d(0, ${sheetLastOffset}px, 0)` },
              { transform: 'translate3d(0, 0, 0)' }
            ],
            { duration: 240, easing: 'cubic-bezier(0.22, 1.15, 0.36, 1)' }
          );
        }
      }
      if (zonesEl) {
        zonesEl.style.opacity = '';
        zonesEl.style.transform = '';
      }
    };

    const sheetHandle = el(
      'button',
      {
        type: 'button',
        className: 'hb-sheet-handle',
        'aria-expanded': String(state.sheetExpanded),
        onPointerdown: (e) => {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          sheetDragging = true;
          sheetStartY = e.clientY;
          sheetLastDy = 0;
          sheetLastOffset = 0;
          sheetMoved = false;
          capturePointerSafe(e.currentTarget, e.pointerId);
        },
        onPointermove: (e) => {
          if (!sheetDragging) return;
          const dy = e.clientY - sheetStartY;
          sheetLastDy = dy;
          if (Math.abs(dy) > 5) sheetMoved = true;

          const offset = !state.sheetExpanded
            ? dy < 0
              ? Math.max(-140, dy)
              : Math.min(32, dy * 0.24)
            : dy > 0
              ? Math.min(140, dy)
              : Math.max(-28, dy * 0.22);
          sheetLastOffset = offset;

          const sheetEl = root.querySelector('.hb-sheet');
          if (sheetEl) {
            sheetEl.classList.add('is-dragging');
            sheetEl.style.transform = `translate3d(0, ${offset}px, 0)`;
          }
          if (!state.sheetExpanded && offset < 0) {
            const zonesEl = root.querySelector('.hb-zones-grid');
            if (zonesEl) {
              zonesEl.style.opacity = String(Math.max(0.15, 1 + offset / 130));
              zonesEl.style.transform = `scale(${Math.max(0.95, 1 + offset / 2200)})`;
            }
          }
        },
        onPointerup: () => finishSheetDrag(true),
        onPointercancel: () => finishSheetDrag(false),
        onClick: () => {
          if (sheetSuppressClick) {
            sheetSuppressClick = false;
            return;
          }
          toggleSheet();
        }
      },
      el('span', { className: 'hb-sheet-handle__pill', 'aria-hidden': 'true' }),
      el(
        'span',
        { className: 'hb-sheet-handle__text' },
        state.sheetExpanded ? 'Опустить к карточкам зон' : 'Поднять панель'
      )
    );

    const sheetBody =
      state.dockView === 'outlets'
        ? el(
            'div',
            { className: 'hb-sheet__content' },
            selectedZone
              ? renderZoneDetailCard(selectedZone, state.callContact, () => openSettings(true), () => selectZone(selectedZone.id))
              : null,
            renderAllOutletsView(snapshot, selectZone)
          )
        : el(
            'div',
            { className: 'hb-sheet__content' },
            selectedZone
              ? renderZoneDetailCard(selectedZone, state.callContact, () => openSettings(true), () => selectZone(selectedZone.id))
              : null,
            renderTimeline(snapshot, state.activeTab, state.callContact, () => openSettings(true), selectTab, jumpToZone)
          );

    const whiteSheet = el(
      'div',
      { className: `hb-sheet ${state.sheetExpanded ? 'hb-sheet--expanded' : ''}` },
      sheetHandle,
      sheetBody
    );

    // Разделяем 3 вкладки экранов (слева в капсуле) и отдельную кнопку графика полива (справа)
    const navButtons = [
      {
        id: 'overview',
        icon: 'home',
        shortLabel: 'Обзор',
        label: 'Обзор зон',
        pressed: state.dockView === 'overview',
        onClick: () => setDockView('overview')
      },
      {
        id: 'outlets',
        icon: 'outlets',
        shortLabel: 'Точки',
        label: 'Все точки полива',
        pressed: state.dockView === 'outlets',
        onClick: () => setDockView('outlets')
      },
      {
        id: 'events',
        icon: 'events',
        shortLabel: 'Тревоги',
        label: alertCount > 0 ? `Тревоги ${alertCount}` : 'Тревоги',
        badge: alertCount > 0 ? alertCount : null,
        pressed: state.dockView === 'events',
        onClick: () => setDockView('events')
      }
    ];

    const chartToggleBtn = el(
      'button',
      {
        type: 'button',
        className: 'hb-dock-chart-btn',
        'aria-pressed': String(state.pulseDrawerOpen),
        onClick: togglePulseDrawer
      },
      makeIcon('chart'),
      el('span', { className: 'hb-dock__label' }, 'График')
    );

    const bottomOverlay = el(
      'div',
      { className: 'hb-bottom-dock-wrap' },
      state.pulseDrawerOpen
        ? renderFloatingPulseDrawer(snapshot, state.selectedZoneId, animatePulseBars, selectZone, togglePulseDrawer)
        : null,
      el(
        'div',
        { className: 'hb-dock-row' },
        el(
          'nav',
          { className: 'hb-dock', 'aria-label': 'Нижняя панель разделов' },
          el('span', { className: 'hb-dock__indicator', 'aria-hidden': 'true' }),
          navButtons.map((btn) =>
            el(
              'button',
              {
                type: 'button',
                className: 'hb-dock__btn',
                'aria-pressed': String(btn.pressed),
                onClick: btn.onClick
              },
              makeIcon(btn.icon),
              el('span', { className: 'hb-dock__label' }, btn.shortLabel),
              btn.badge
                ? el('span', { className: `hb-dock__badge ${badgePop ? 'hb-dock__badge--pop' : ''}` }, ` ${btn.badge}`)
                : null
            )
          )
        ),
        chartToggleBtn
      )
    );

    const phoneStage = el(
      'main',
      { id: 'main-content', className: 'hb-phone-stage', tabindex: '-1' },
      el(
        'div',
        { className: 'hb-device' },
        el(
          'div',
          { className: 'hb-device__bar', 'aria-hidden': 'true' },
          el('span', null, snapshot.nowLabel),
          el('span', { className: 'hb-device__notch' }),
          el('span', null, 'LTE · 390px')
        ),
        el(
          'div',
          { className: `hb-screen ${state.pulseDrawerOpen ? 'hb-screen--drawer-open' : ''}` },
          heroTop,
          whiteSheet,
          bottomOverlay,
          state.settingsOpen
            ? renderSettingsOverlay(
                state.theme,
                state.callContact,
                {
                  scenarios,
                  scenarioId: state.scenarioId,
                  sites: DEMO_SITES,
                  siteId: state.siteId,
                  motionPaused: state.motionPaused,
                  onSelectScenario: async (id) => {
                    state.scenarioId = id;
                    syncUrl();
                    await loadSnapshot();
                  },
                  onSelectSite: async (id) => {
                    state.siteId = id;
                    syncUrl();
                    await loadSnapshot();
                  },
                  onToggleMotion: toggleMotion
                },
                setTheme,
                updateCallContact,
                clearCallContact,
                closeSettings
              )
            : null
        )
      )
    );

    clear(root);
    root.appendChild(
      el(
        'div',
        { className: 'hybrid-page' },
        el('a', { href: '#main-content', className: 'skip-link visually-hidden' }, 'Перейти к экрану приложения'),
        el('h1', { className: 'visually-hidden' }, 'Greenhouse — мониторинг полива'),
        phoneStage,
        announcer
      )
    );

    prevDockRect = syncSlidingIndicator('.hb-dock', '.hb-dock__indicator', '.hb-dock__btn[aria-pressed="true"]', prevDockRect);
    prevTabRect = syncSlidingIndicator('.hb-tabs', '.hb-tabs__indicator', '.hb-tab[aria-pressed="true"]', prevTabRect);

    if (pendingSheetFromTop !== null) {
      const fromTop = pendingSheetFromTop;
      pendingSheetFromTop = null;
      const sheetEl = root.querySelector('.hb-sheet');
      if (sheetEl && isMotionAllowed()) {
        const deltaY = fromTop - sheetEl.getBoundingClientRect().top;
        if (Math.abs(deltaY) > 1) {
          sheetEl.animate(
            [
              { transform: `translate3d(0, ${deltaY}px, 0)` },
              { transform: 'translate3d(0, 0, 0)' }
            ],
            { duration: 320, easing: 'cubic-bezier(0.22, 1.08, 0.36, 1)' }
          );
        }
      }
    }

    if (sheetAnimatingZones) {
      sheetAnimatingZones = false;
      const zonesEl = root.querySelector('.hb-zones-grid');
      if (zonesEl && isMotionAllowed()) {
        zonesEl.animate(
          [
            { opacity: 0, transform: 'translateY(-8px) scale(0.97)' },
            { opacity: 1, transform: 'none' }
          ],
          { duration: 260, easing: 'cubic-bezier(0.22, 1.08, 0.36, 1)' }
        );
      }
    }
  }

  window.addEventListener('resize', () => {
    prevDockRect = syncSlidingIndicator('.hb-dock', '.hb-dock__indicator', '.hb-dock__btn[aria-pressed="true"]', null);
    prevTabRect = syncSlidingIndicator('.hb-tabs', '.hb-tabs__indicator', '.hb-tab[aria-pressed="true"]', null);
  });

  // Закрытие настроек, выезжающего графика или паспорта зоны по клавише Escape с возвратом фокуса
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state.settingsOpen) {
      closeSettings();
    } else if (state.pulseDrawerOpen) {
      state.pulseDrawerOpen = false;
      render();
      announce('График полива скрыт');
      root.querySelector('.hb-dock-chart-btn')?.focus();
    } else if (state.selectedZoneId) {
      state.selectedZoneId = null;
      state.activeTab = 'all';
      render();
      announce('Показаны все зоны');
    }
  });

  await loadSnapshot();
}

const appRoot = document.getElementById('app');
if (appRoot) {
  mountHybridApp(appRoot);
}
