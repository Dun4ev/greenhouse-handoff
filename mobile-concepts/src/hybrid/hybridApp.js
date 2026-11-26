// Интерактивный мобильный прототип-гибрид 2B (Стекло и ботаника) + 2C (График поливов и счетчики)
// + нижний плавающий док в стиле Cultiveq с просмотром всех точек полива и выезжающим компактным графиком.

import { createDataProvider } from '../data/provider.js?v=9';
import {
  formatShortAge,
  getDict,
  loadSavedLang,
  localizeLiveNotice,
  localizeSnapshot,
  saveLang
} from './i18n.js?v=9';
import { openPumpPanel } from './pumpPanel.js?v=9';
import { clear, el, svgEl } from '../ui/dom.js';

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
  } else if (kind === 'pump') {
    svg.appendChild(svgEl('path', { d: 'M2 13h4m12 0h4V6h-4v3M7 21h10M9 18v3m6-3v3' }));
    svg.appendChild(svgEl('circle', { cx: '12', cy: '13', r: '6' }));
    svg.appendChild(svgEl('path', { d: 'm10 10 5 3-5 3z', fill: 'currentColor', 'stroke-width': '1' }));
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

function summarizeHeaderStatus(snapshot, d) {
  const wateringCount = snapshot.zones.filter((z) => z.watering.state === 'watering').length;
  const offlineCount = snapshot.zones.filter((z) => z.connection.state === 'offline').length;
  const staleOnlineCount = snapshot.zones.filter(
    (z) => z.connection.state === 'online' && z.telemetry.freshness !== 'fresh'
  ).length;
  const onlineCount = snapshot.zones.length - offlineCount;

  const pills = [];
  if (wateringCount > 0) {
    pills.push({ text: d.statusWatering(wateringCount), tone: 'water' });
  } else if (snapshot.zones.some((zone) => zone.control?.phase === 'switching')) {
    pills.push({ text: d.outletSwitch, tone: 'warn' });
  } else if (snapshot.zones.every((zone) => zone.watering.state === 'idle')) {
    pills.push({ text: d.statusIdle, tone: 'ok' });
  }

  if (offlineCount > 0) {
    pills.push({ text: d.statusOffline(offlineCount), tone: 'danger' });
  } else if (staleOnlineCount > 0) {
    pills.push({ text: d.statusStale(staleOnlineCount), tone: 'warn' });
  } else {
    pills.push({ text: d.statusOnline(onlineCount, snapshot.zones.length), tone: 'ok' });
  }

  const beaconTone =
    offlineCount > 0 ? 'danger' : staleOnlineCount > 0 ? 'warn' : wateringCount > 0 ? 'water' : 'ok';

  return { pills, beaconTone };
}

function zoneCardReadings(zone, lang, d) {
  const age = formatShortAge(zone.telemetry.ageLabel, lang);
  const watering = zone.watering;
  const primary = zone.control?.phase === 'switching' ? d.outletSwitch : watering.state === 'unknown'
    ? `? · ${age}`
    : watering.state === 'watering'
      ? [watering.elapsedLabel || d.primaryWaterFallback, watering.activeOutletLabel].filter(Boolean).join(' · ')
      : d.primaryIdle;
  if (zone.connection.state === 'offline') return [primary, d.secOffline];
  if (!zone.telemetryReliable) return [primary, d.secStale];
  const detail = watering.activeOutlet ? `${watering.activeOutlet}/${zone.outletsTotal}` : age;
  return [primary, `${d.flowPrefix(zone.flow.label)} · ${detail}`];
}

function renderCompactZoneCard(zone, isSelected, isJumpFocus, isUpdated, lang, d, onSelect) {
  const isWatering = zone.watering.state === 'watering';
  const isUnknown = zone.watering.state === 'unknown';

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
      ? d.badgeOffline
      : zone.telemetry.freshness !== 'fresh'
        ? d.badgeStale
        : isWatering
          ? d.badgeWater
          : zone.control?.phase === 'switching' ? d.outletSwitch : isUnknown ? d.waterUnconfirmed : d.badgeIdle;

  const [primaryLine, secondaryLine] = zoneCardReadings(zone, lang, d);

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
      className: `hb-zcard ${toneClass} ${isSelected ? 'hb-zcard--selected' : ''} ${isJumpFocus ? 'hb-zcard--jump-focus' : ''} ${isUpdated ? 'hb-zcard--updated' : ''}`,
      dataset: { zoneCardId: zone.id },
      'aria-pressed': String(isSelected),
      onClick: () => onSelect(zone.id)
    },
    el(
      'span',
      { className: 'hb-zcard__top' },
      el('span', { className: 'hb-zcard__name' }, zone.name),
      el(
        'span',
        { className: `hb-zcard__badge hb-zcard__badge--${zone.trustLevel === 'ok' && isWatering ? 'water' : zone.trustLevel}` },
        el('i', { className: 'hb-zcard__dot', 'aria-hidden': 'true' }),
        statusText
      )
    ),
    el('span', { className: 'hb-zcard__main' }, primaryLine),
    el('span', { className: 'hb-zcard__sub' }, secondaryLine),
    bar
  );
}

/**
 * Экран 2-й кнопки дока: сразу все точки полива (все зоны и все выходы К4..К9).
 */
function renderAllOutletsView(snapshot, d, onSelectZone) {
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
        el('h2', { id: 'hb-outlets-title', className: 'hb-section-title' }, d.allOutletsTitle),
        el(
          'p',
          { className: 'hb-outlets-view__sub' },
          d.allOutletsSub(totalOutlets, activeCount, unknownZones)
        )
      )
    ),
    el(
      'div',
      { className: 'hb-outlets-groups' },
      snapshot.zones.map((zone) => {
        const isWatering = zone.watering.state === 'watering';
        const isUnknown = zone.watering.state === 'unknown';

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
              !zone.telemetryReliable
                ? d.flowUnknownPrefix(zone.connection.label)
                : d.flowPrefix(zone.flow.label)
            )
          ),
          el(
            'ul',
            {
              className: `hb-ogrid hb-ogrid--n${zone.outletsTotal}`,
              role: 'list',
              'aria-label': d.outletsZoneAria(zone.name)
            },
            zone.outletLabels.map((lbl, idx) => {
              const num = idx + 1;
              const isActive = isWatering && zone.watering.activeOutlet === num;
              return el(
                'li',
                {
                  className: `hb-opoint ${isUnknown ? 'hb-opoint--unknown' : isActive ? 'hb-opoint--active' : 'hb-opoint--idle'}`,
                  dataset: isActive ? { activeOutletZone: zone.id } : null
                },
                el('span', { className: 'hb-opoint__code' }, lbl),
                el(
                  'span',
                  { className: 'hb-opoint__state' },
                  isUnknown ? d.outletUnknown : isActive ? (zone.watering.elapsedLabel || d.outletWater) : d.outletInactive
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

function slotStateLabel(slotState, d) {
  if (slotState === 'watering') return d.slotWater;
  if (slotState === 'gap') return d.slotGap;
  return d.slotIdle;
}

/**
 * Компактный выезжающий график поливов за 60 минут в стеклянном стиле с интерактивным просмотром (scrub).
 */
function renderFloatingPulseDrawer(snapshot, selectedZoneId, animateBars, d, onSelectZone, onClose) {
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
        el('h2', { id: 'hb-drawer-title', className: 'hb-pulse-drawer__title' }, d.pulseTitle),
        el('span', { className: 'hb-pulse-drawer__win' }, `${winStart}–${winEnd}`)
      ),
      el(
        'button',
        {
          type: 'button',
          className: 'hb-pulse-drawer__close',
          'aria-label': d.pulseCloseAria,
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
          tipEl.textContent = `${formatSlotRange(strip.windowStart ?? winStart, idx)} · ${slotStateLabel(slotState, d)}`;
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
                className: `hb-dtrack__sum ${strip.hasGap ? 'is-gap' : noWateringAtAll ? 'is-dry' : ''}`,
                dataset: { drawerSumZone: zone.id }
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
      el('span', null, el('i', { className: 'hb-dot hb-dot--water' }), d.legendWater),
      el('span', null, el('i', { className: 'hb-dot hb-dot--idle' }), d.legendIdle),
      el('span', null, el('i', { className: 'hb-dot hb-dot--gap' }), d.legendGap),
      el('span', { className: 'hb-dlegend__hint' }, d.legendHint)
    )
  );
}

function renderCallAction(callContact, d, onOpenCallSetup) {
  const telHref = sanitizeTelHref(callContact?.phone);
  if (telHref) {
    const caption = d.callBtn(callContact.label || callContact.phone);
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
    el('span', null, d.callSetupBtn)
  );
}

function renderSettingsOverlay(lang, theme, callContact, demoCtx, d, onSelectLang, onSelectTheme, onSaveContact, onClearContact, onClose) {
  const langs = [
    { id: 'sr', label: 'Srpski' },
    { id: 'ru', label: 'Русский' }
  ];

  const themes = [
    { id: 'system', label: d.themeSystem },
    { id: 'light', label: d.themeLight },
    { id: 'dark', label: d.themeDark }
  ];

  const labelInput = el('input', {
    id: 'hb-call-label',
    type: 'text',
    className: 'hb-field__input',
    maxlength: '40',
    placeholder: d.phoneLabelPlaceholder,
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
        el('h2', { id: 'hb-settings-title', className: 'hb-settings-drawer__title' }, d.settingsTitle),
        el(
          'button',
          {
            type: 'button',
            className: 'hb-pulse-drawer__close',
            'aria-label': d.settingsCloseAria,
            onClick: onClose
          },
          '×'
        )
      ),
      el(
        'div',
        { className: 'hb-settings-group' },
        el('span', { className: 'hb-settings-group__label' }, d.langGroupLabel),
        el(
          'div',
          { className: 'hb-theme-seg hb-theme-seg--2', role: 'group', 'aria-label': d.langGroupLabel },
          langs.map((item) =>
            el(
              'button',
              {
                type: 'button',
                className: 'hb-theme-seg__btn',
                'aria-pressed': String(lang === item.id),
                onClick: () => onSelectLang(item.id)
              },
              item.label
            )
          )
        )
      ),
      el(
        'div',
        { className: 'hb-settings-group' },
        el('span', { className: 'hb-settings-group__label' }, d.themeGroupLabel),
        el(
          'div',
          { className: 'hb-theme-seg', role: 'group', 'aria-label': d.themeGroupLabel },
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
              feedbackEl.textContent = d.phoneError;
              feedbackEl.dataset.tone = 'warn';
              phoneInput.focus();
              return;
            }
            onSaveContact({ label: labelInput.value, phone: phoneVal });
          }
        },
        el('span', { className: 'hb-settings-group__label' }, d.phoneGroupLabel),
        el(
          'label',
          { className: 'hb-field', htmlFor: 'hb-call-label' },
          el('span', { className: 'hb-field__k' }, d.phoneLabelField),
          labelInput
        ),
        el(
          'label',
          { className: 'hb-field', htmlFor: 'hb-call-phone' },
          el('span', { className: 'hb-field__k' }, d.phoneNumberField),
          phoneInput
        ),
        feedbackEl,
        el(
          'div',
          { className: 'hb-settings-actions' },
          el('button', { type: 'submit', className: 'hb-settings-save' }, d.btnSave),
          callContact.phone
            ? el(
                'button',
                {
                  type: 'button',
                  className: 'hb-settings-clear',
                  onClick: onClearContact
                },
                d.btnClear
              )
            : null
        )
      ),
      el(
        'p',
        { className: 'hb-settings-note' },
        d.settingsNote
      ),
      el(
        'details',
        { className: 'hb-settings-demo' },
        el('summary', { className: 'hb-settings-demo__summary' }, d.demoSummary),
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
                d.scenarioShort[s.id] ?? s.shortLabel
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
                d.siteLabels[s.id] ?? s.shortName ?? s.name
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
            demoCtx.motionPaused ? d.motionResume : d.motionPause
          )
        )
      )
    )
  );
}

function renderZoneDetailCard(zone, callContact, d, onOpenCallSetup, onClose, onOpenPumps) {
  const isWatering = zone.watering.state === 'watering';
  const isUnknown = zone.watering.state === 'unknown';

  const cells = [
    {
      label: d.cellConn,
      val: zone.connection.label,
      sub: zone.connection.lastLinkAt,
      tone: zone.connection.state === 'online' ? 'ok' : 'danger'
    },
    {
      label: d.cellFresh,
      val: zone.telemetry.label,
      sub: `${zone.telemetry.packetId} · ${zone.telemetry.ageLabel}`,
      tone: zone.telemetry.freshness === 'fresh' ? 'ok' : 'warn'
    },
    {
      label: d.cellFlow,
      val: zone.flow.label,
      sub: d.cellFlowSub,
      tone: zone.flow.state === 'present' ? 'water' : zone.flow.state === 'absent' ? 'neutral' : 'danger'
    },
    {
      label: d.cellWater,
      val: zone.control?.phase === 'switching' ? d.outletSwitch : zone.watering.shortLabel,
      sub: isWatering
        ? `${zone.watering.activeOutletLabel} (${zone.watering.activeOutlet}/${zone.outletsTotal}) · ${zone.watering.elapsedLabel}`
        : isUnknown
          ? d.waterUnconfirmed
          : d.outletsIdle(zone.outletsTotal),
      tone: isWatering ? 'water' : isUnknown ? 'danger' : 'neutral'
    }
  ];

  return el(
    'section',
    { className: 'hb-inspector', dataset: { inspectorZone: zone.id }, 'aria-label': d.inspectorAria(zone.name) },
    el(
      'div',
      { className: 'hb-inspector__head' },
      el(
        'div',
        null,
        el('h3', { className: 'hb-inspector__title' }, d.inspectorTitle(zone.name)),
        el('p', { className: 'hb-inspector__sub' }, zone.pumpModel)
      ),
      el(
        'button',
        { type: 'button', className: 'hb-close-btn', onClick: onClose },
        d.allZonesBtn
      )
    ),
    el(
      'div',
      { className: 'hb-matrix' },
      cells.map((c, idx) =>
        el(
          'div',
          { className: `hb-mcell hb-mcell--${c.tone}` },
          el('span', { className: 'hb-mcell__k' }, c.label),
          el('strong', { className: 'hb-mcell__v' }, c.val),
          el('span', { className: 'hb-mcell__s', dataset: { mcellSub: idx } }, c.sub)
        )
      )
    ),
    el(
      'ul',
      {
        className: `hb-valves hb-valves--n${zone.outletsTotal}`,
        role: 'list',
        'aria-label': d.valvesAria(zone.name)
      },
      zone.outletLabels.map((lbl, idx) => {
        const active = isWatering && zone.watering.activeOutlet === idx + 1;
        return el(
          'li',
          {
            className: `hb-valve ${isUnknown ? 'hb-valve--unknown' : active ? 'hb-valve--active' : ''}`
          },
          el('span', { className: 'hb-valve__k' }, lbl),
          el('span', { className: 'hb-valve__s' }, isUnknown ? '?' : active ? d.valveWater : '—')
        );
      })
    ),
    zone.telemetry.ignoredDuplicates > 0 || zone.telemetry.ignoredOutOfOrder > 0
      ? el(
          'p',
          { className: 'hb-dedup' },
          d.dedupText(zone.telemetry.ignoredOutOfOrder, zone.telemetry.ignoredDuplicates, zone.telemetry.packetId, zone.telemetry.deviceTime)
        )
      : null,
    !zone.telemetryReliable
      ? el(
          'div',
          { className: 'hb-recovery-box' },
          el(
            'p',
            { className: 'hb-recovery-tip' },
            zone.connection.state === 'offline' ? d.recoveryOffline : d.recoveryStale
          ),
          renderCallAction(callContact, d, onOpenCallSetup)
        )
      : null,
    onOpenPumps && zone.control
      ? el('button', {
          type: 'button', className: 'hb-zone-pump-btn', 'aria-haspopup': 'dialog',
          dataset: { pumpZone: zone.id }, onClick: () => onOpenPumps(zone.id)
        }, makeIcon('pump'), d.pumpControls, el('span', { 'aria-hidden': 'true' }, '→'))
      : null,
    el('p', { className: 'hb-hw-note' }, d.hwNote)
  );
}

function renderTimeline(snapshot, activeTab, callContact, d, onOpenCallSetup, onSelectTab, onJumpToZone) {
  const zoneNames = new Map(snapshot.zones.map((z) => [z.id, z.name]));

  const alertEvents = snapshot.events.filter(
    (e) => e.kind === 'warning' || e.kind === 'gap' || e.kind === 'late'
  );

  // Ограничиваем видимые вкладки до <= 4 (правило рабочей памяти)
  const tabs = [{ id: 'all', label: d.tabAll, count: snapshot.events.length, alert: false }];
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
  tabs.push({ id: 'alerts', label: d.tabAlerts, count: alertEvents.length, alert: alertEvents.length > 0 });

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
      { className: 'hb-tabs', role: 'group', 'aria-label': d.tabsAria },
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
      el('h2', { id: 'hb-feed-title', className: 'hb-section-title' }, d.feedTitle),
      el('span', { className: 'hb-feed__meta' }, d.feedCount(filtered.length))
    ),
    activeTab === 'alerts' && alertEvents.length > 0
      ? el('div', { className: 'hb-alerts-call-bar' }, renderCallAction(callContact, d, onOpenCallSetup))
      : null,
    filtered.length > 0
      ? el(
          'ol',
          { className: 'hb-events', role: 'list' },
          filtered.map((evt, idx) => {
            const zName = zoneNames.get(evt.zoneId) ?? `${stateZoneWord(d)} ${evt.zoneId}`;
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
                  el('span', { className: 'hb-event__goto', 'aria-hidden': 'true' }, d.gotoZone)
                ),
                evt.gapLabel ? el('span', { className: 'hb-event__gap' }, evt.gapLabel) : null,
                el('span', { className: 'hb-event__text' }, evt.text),
                evt.meta ? el('span', { className: 'hb-event__meta' }, evt.meta) : null
              )
            );
          })
        )
      : el('p', { className: 'hb-empty' }, d.feedEmpty)
  );
}

function stateZoneWord(d) {
  return d.tabAll === 'Sve' ? 'Zona' : 'Зона';
}

export async function mountHybridApp(root, providerConfig = { mode: 'mock' }) {
  const provider = createDataProvider(providerConfig);
  const [sites, scenarios] = await Promise.all([provider.getSites(), provider.getScenarios()]);
  if (!sites.length || !scenarios.length) throw new Error('No monitoring context available');
  const requested = (list, value, fallback) =>
    list.find((item) => item.id === value)?.id ?? list.find((item) => item.id === fallback)?.id ?? list[0].id;

  const params = new URLSearchParams(window.location.search);
  const state = {
    siteId: requested(sites, params.get('site'), 'srb-scale-4'),
    scenarioId: requested(scenarios, params.get('scenario'), 'incident'),
    selectedZoneId: null,
    activeTab: 'all',
    dockView: 'overview', // 'overview' | 'outlets' | 'events'
    pulseDrawerOpen: false,
    settingsOpen: false,
    sheetExpanded: false,
    motionPaused: false,
    liveEnabled: true,
    lang: loadSavedLang(),
    theme: loadSavedTheme(),
    callContact: loadCallContact()
  };

  applyTheme(state.theme);
  document.documentElement.lang = state.lang;
  document.title = getDict(state.lang).pageTitle;

  let snapshot = null;
  let pumpPanel = null;
  let contextVersion = 0;
  let loadedVersion = -1;
  let prevDockRect = null;
  let prevTabRect = null;
  let prevAlertCount = null;
  let justOpenedPulse = false;
  let justJumpedZoneId = null;
  let pendingSheetFromTop = null;
  let sheetAnimatingZones = false;
  let unsubscribeLive = null;
  let liveNotice = null;
  let liveNoticeTimer = null;
  let updatedZoneIds = new Set();
  let isInteracting = false;
  let pendingLivePayload = null;
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
    const d = getDict(state.lang);
    if (state.selectedZoneId === zoneId) {
      state.selectedZoneId = null;
      state.activeTab = 'all';
      announce(d.annAllZones);
    } else {
      state.selectedZoneId = zoneId;
      state.activeTab = `z${zoneId}`;
      const viewSnap = localizeSnapshot(snapshot, state.lang);
      const z = viewSnap.zones.find((item) => item.id === zoneId);
      if (z) announce(d.annZoneSelected(z.name));
    }
    render();
  }

  function jumpToZone(zoneId) {
    const d = getDict(state.lang);
    state.dockView = 'overview';
    state.sheetExpanded = false;
    state.selectedZoneId = zoneId;
    state.activeTab = `z${zoneId}`;
    justJumpedZoneId = zoneId;
    render();
    const viewSnap = localizeSnapshot(snapshot, state.lang);
    const z = viewSnap.zones.find((item) => item.id === zoneId);
    if (z) announce(d.annJumpZone(z.name));
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
    const d = getDict(state.lang);
    state.dockView = view;
    if (view === 'events') {
      state.activeTab = 'alerts';
      state.selectedZoneId = null;
      announce(d.annEvents);
    } else if (view === 'outlets') {
      state.sheetExpanded = false;
      announce(d.annOutlets);
    } else {
      state.activeTab = 'all';
      announce(d.annOverview);
    }
    render();
  }

  function togglePulseDrawer() {
    const d = getDict(state.lang);
    state.pulseDrawerOpen = !state.pulseDrawerOpen;
    justOpenedPulse = state.pulseDrawerOpen;
    render();
    announce(state.pulseDrawerOpen ? d.annPulseOpen : d.annPulseClose);
  }

  function toggleSheet(forceExpanded = null) {
    const d = getDict(state.lang);
    const nextExpanded = typeof forceExpanded === 'boolean' ? forceExpanded : !state.sheetExpanded;
    if (nextExpanded === state.sheetExpanded) return;
    pendingSheetFromTop = root.querySelector('.hb-sheet')?.getBoundingClientRect().top ?? null;
    state.sheetExpanded = nextExpanded;
    if (!state.sheetExpanded) {
      sheetAnimatingZones = true;
    }
    render();
    announce(state.sheetExpanded ? d.annSheetUp : d.annSheetDown);
  }

  function toggleMotion() {
    const d = getDict(state.lang);
    state.motionPaused = !state.motionPaused;
    if (state.motionPaused) {
      document.documentElement.dataset.motion = 'paused';
    } else {
      delete document.documentElement.dataset.motion;
    }
    render();
    announce(state.motionPaused ? d.annMotionPaused : d.annMotionOn);
  }

  function openSettings(focusPhone = false) {
    const d = getDict(state.lang);
    state.settingsOpen = true;
    state.pulseDrawerOpen = false;
    render();
    announce(d.annSettingsOpen);
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
    const d = getDict(state.lang);
    state.settingsOpen = false;
    if (pendingLivePayload) {
      const payload = pendingLivePayload;
      pendingLivePayload = null;
      applyLivePayload({ ...payload, tickOnly: false });
    } else {
      render();
    }
    announce(d.annSettingsClose);
    requestAnimationFrame(() => {
      root.querySelector('.hb-settings-btn')?.focus();
    });
  }

  function patchLiveTick(nextSnap) {
    snapshot = nextSnap;
    const d = getDict(state.lang);
    const viewSnap = localizeSnapshot(nextSnap, state.lang);
    const clockEl = root.querySelector('.hb-clock');
    if (clockEl && clockEl.textContent !== viewSnap.nowLabel) {
      clockEl.textContent = viewSnap.nowLabel;
    }
    const deviceClock = root.querySelector('.hb-device__bar > span:first-child');
    if (deviceClock && deviceClock.textContent !== viewSnap.nowLabel) {
      deviceClock.textContent = viewSnap.nowLabel;
    }

    pumpPanel?.update(viewSnap);
    for (const zone of viewSnap.zones) {
      const isWatering = zone.watering.state === 'watering';
      const card = root.querySelector(`[data-zone-card-id="${zone.id}"]`);
      if (card) {
        const mainEl = card.querySelector('.hb-zcard__main');
        const subEl = card.querySelector('.hb-zcard__sub');
        const [primaryLine, secondaryLine] = zoneCardReadings(zone, state.lang, d);
        if (mainEl && mainEl.textContent !== primaryLine) mainEl.textContent = primaryLine;
        if (subEl && subEl.textContent !== secondaryLine) subEl.textContent = secondaryLine;
      }

      const drawerSum = root.querySelector(`[data-drawer-sum-zone="${zone.id}"]`);
      if (drawerSum && drawerSum.textContent !== zone.pulseStrip.summary) {
        drawerSum.textContent = zone.pulseStrip.summary;
      }

      const activeOutlet = root.querySelector(`[data-active-outlet-zone="${zone.id}"] .hb-opoint__state`);
      if (activeOutlet && isWatering) {
        const lbl = zone.watering.elapsedLabel || d.outletWater;
        if (activeOutlet.textContent !== lbl) activeOutlet.textContent = lbl;
      }

      const inspector = root.querySelector(`[data-inspector-zone="${zone.id}"]`);
      if (inspector) {
        const freshSub = inspector.querySelector('[data-mcell-sub="1"]');
        const freshText = `${zone.telemetry.packetId} · ${zone.telemetry.ageLabel}`;
        if (freshSub && freshSub.textContent !== freshText) freshSub.textContent = freshText;
        const waterSub = inspector.querySelector('[data-mcell-sub="3"]');
        if (waterSub && isWatering) {
          const waterText = `${zone.watering.activeOutletLabel} (${zone.watering.activeOutlet}/${zone.outletsTotal}) · ${zone.watering.elapsedLabel}`;
          if (waterSub.textContent !== waterText) waterSub.textContent = waterText;
        }
      }
    }
  }

  function applyLivePayload(payload) {
    if (!payload?.snapshot) return;
    // Only the mock explicitly identifies timer-only packets. A full polling
    // snapshot from a different adapter may change any status or capability.
    const hasStructuralChange = Boolean(payload.liveEvent) || payload.changedZoneIds?.length || !payload.tickOnly;
    if (!hasStructuralChange) {
      patchLiveTick(payload.snapshot);
      return;
    }

    snapshot = payload.snapshot;
    updatedZoneIds = new Set(payload.changedZoneIds || []);
    if (payload.liveEvent) {
      liveNotice = payload.liveEvent;
      if (liveNoticeTimer) clearTimeout(liveNoticeTimer);
      liveNoticeTimer = setTimeout(() => {
        liveNotice = null;
        root.querySelector('.hb-live-toast')?.remove();
        root.querySelector('.hb-sheet-top')?.classList.remove('has-toast');
      }, 4200);
    }
    render({ isLiveTick: true });
  }

  function stopLiveSubscription() {
    if (typeof unsubscribeLive === 'function') {
      unsubscribeLive();
      unsubscribeLive = null;
    }
  }

  function startLiveSubscription() {
    stopLiveSubscription();
    if (!state.liveEnabled || typeof provider.subscribe !== 'function') return;
    const version = contextVersion;
    unsubscribeLive = provider.subscribe({
      siteId: state.siteId,
      scenarioId: state.scenarioId,
      intervalMs: 1000,
      onUpdate: (payload) => {
        if (version !== contextVersion) return;
        if (state.settingsOpen || isInteracting) {
          pendingLivePayload = payload;
          return;
        }
        pendingLivePayload = null;
        applyLivePayload(payload);
      }
    });
  }

  function toggleLive() {
    const d = getDict(state.lang);
    state.liveEnabled = !state.liveEnabled;
    if (state.liveEnabled) {
      startLiveSubscription();
      announce(d.annLiveOn);
    } else {
      stopLiveSubscription();
      liveNotice = null;
      announce(d.annLiveOff);
    }
    render({ isLiveTick: true });
  }

  function setLang(lang) {
    state.lang = saveLang(lang);
    document.documentElement.lang = state.lang;
    const d = getDict(state.lang);
    document.title = d.pageTitle;
    render();
    announce(d.annLangChanged);
  }

  function setTheme(theme) {
    state.theme = theme;
    applyTheme(theme);
    render();
    const d = getDict(state.lang);
    const label = theme === 'dark' ? d.themeDark : theme === 'light' ? d.themeLight : d.themeSystem;
    announce(label);
  }

  function updateCallContact(contact) {
    state.callContact = saveCallContact(contact);
    state.settingsOpen = false;
    render();
    announce(getDict(state.lang).annPhoneSaved);
  }

  function clearCallContact() {
    state.callContact = saveCallContact({ label: '', phone: '' });
    render();
    announce(getDict(state.lang).annPhoneCleared);
  }

  async function loadSnapshot() {
    const version = ++contextVersion;
    stopLiveSubscription();
    liveNotice = null;
    pendingLivePayload = null;
    const next = await provider.getSnapshot({
      siteId: state.siteId,
      scenarioId: state.scenarioId
    });
    if (version !== contextVersion) return;
    snapshot = next;
    loadedVersion = version;
    if (state.selectedZoneId && !snapshot.zones.some((z) => z.id === state.selectedZoneId)) {
      state.selectedZoneId = null;
      state.activeTab = 'all';
    }
    render();
    startLiveSubscription();
  }

  function hasPumpControl() {
    return loadedVersion === contextVersion && snapshot?.siteId === state.siteId
      && typeof provider.commandZone === 'function' && snapshot.zones.some((zone) => zone.control);
  }

  function openPumps(zoneId = state.selectedZoneId, returnToZone = false) {
    if (pumpPanel || !hasPumpControl()) return;
    const context = { siteId: state.siteId, scenarioId: state.scenarioId };
    const version = contextVersion;
    pumpPanel = openPumpPanel({
      snapshot: localizeSnapshot(snapshot, state.lang),
      zoneId,
      lang: state.lang,
      liveEnabled: state.liveEnabled,
      onCommand: async (command) => {
        if (version !== contextVersion || !hasPumpControl()) {
          throw Object.assign(new Error('Zone context changed'), { code: 'unavailable' });
        }
        const next = await provider.commandZone({ ...command, ...context });
        if (version !== contextVersion || next === snapshot) return;
        applyLivePayload({ snapshot: next, changedZoneIds: [command.zoneId] });
      },
      onClose: () => {
        pumpPanel = null;
        const selector = returnToZone ? `[data-pump-zone="${zoneId}"]` : '[data-dock="pumps"]';
        (root.querySelector(selector) ?? root.querySelector('[data-dock="pumps"]'))?.focus({ preventScroll: true });
      }
    });
  }

  function render({ isLiveTick = false } = {}) {
    if (!snapshot) return;
    const d = getDict(state.lang);
    const viewSnap = localizeSnapshot(snapshot, state.lang);
    pumpPanel?.update(viewSnap);
    const supportsPumps = hasPumpControl();
    const viewNotice = localizeLiveNotice(liveNotice, state.lang);
    const prevScreenScrollTop = root.querySelector('.hb-screen')?.scrollTop ?? 0;
    prevDockRect = captureActiveBox('.hb-dock', '.hb-dock__btn[aria-pressed="true"]') ?? prevDockRect;
    prevTabRect = captureActiveBox('.hb-tabs', '.hb-tab[aria-pressed="true"]') ?? prevTabRect;

    const { pills, beaconTone } = summarizeHeaderStatus(viewSnap, d);
    const selectedZone = state.selectedZoneId
      ? viewSnap.zones.find((z) => z.id === state.selectedZoneId) ?? null
      : null;

    const alertCount = viewSnap.events.filter(
      (e) => e.kind === 'warning' || e.kind === 'gap' || e.kind === 'late'
    ).length;
    const badgePop = prevAlertCount !== null && alertCount > 0 && alertCount !== prevAlertCount;
    prevAlertCount = alertCount;

    const jumpFocusId = justJumpedZoneId;
    justJumpedZoneId = null;
    const animatePulseBars = justOpenedPulse;
    justOpenedPulse = false;
    const currentUpdatedIds = updatedZoneIds;
    updatedZoneIds = new Set();

    const topTelHref = sanitizeTelHref(state.callContact.phone);
    const topCallControl = topTelHref
      ? el(
          'a',
          {
            href: topTelHref,
            className: 'hb-top-icon-btn hb-top-icon-btn--call',
            'aria-label': d.topCallAria(state.callContact.label || state.callContact.phone),
            title: d.topCallAria(state.callContact.label || state.callContact.phone)
          },
          makeIcon('phone')
        )
      : el(
          'button',
          {
            type: 'button',
            className: 'hb-top-icon-btn',
            'aria-label': d.topCallSetupAria,
            title: d.topCallSetupTitle,
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
        'aria-label': d.settingsAria,
        title: d.settingsTitle,
        onClick: () => (state.settingsOpen ? closeSettings() : openSettings(false))
      },
      makeIcon('settings')
    );

    const liveToggleBtn = el(
      'button',
      {
        type: 'button',
        className: `hb-live-toggle ${state.liveEnabled ? 'is-live' : 'is-paused'}`,
        'aria-pressed': String(state.liveEnabled),
        title: state.liveEnabled ? d.livePauseTitle : d.liveResumeTitle,
        onClick: toggleLive
      },
      el(
        'span',
        { className: `hb-beacon hb-beacon--${state.liveEnabled ? beaconTone : 'paused'}`, 'aria-hidden': 'true' },
        state.liveEnabled ? el('span', { className: 'hb-beacon__ring' }) : null,
        el('span', { className: 'hb-beacon__dot' })
      ),
      el('span', null, state.liveEnabled ? d.liveOn : d.liveOff)
    );

    const appHeader = el(
      'div',
      { className: 'hb-topbar' },
      el(
        'div',
        { className: 'hb-clock-block' },
        el('time', { className: 'hb-clock' }, viewSnap.nowLabel),
        el('span', { className: 'hb-site-caption' }, viewSnap.siteName)
      ),
      el(
        'div',
        { className: 'hb-status-cluster' },
        viewSnap.isSynthetic ? liveToggleBtn : null,
        pills.map((p) => el('span', { className: `hb-pill hb-pill--${p.tone}` }, p.text)),
        el('div', { className: 'hb-top-actions' }, topCallControl, settingsBtn)
      )
    );

    const zonesGrid = el(
      'div',
      {
        className: `hb-zones-grid ${viewSnap.zones.length > 2 ? 'hb-zones-grid--multi' : ''}`,
        role: 'group',
        'aria-label': d.zonesAria
      },
      viewSnap.zones.map((z) =>
        renderCompactZoneCard(z, state.selectedZoneId === z.id, jumpFocusId === z.id, currentUpdatedIds.has(z.id), state.lang, d, selectZone)
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
      isInteracting = false;
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
          isInteracting = true;
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
        state.sheetExpanded ? d.sheetCollapse : d.sheetExpand
      )
    );

    const sheetBody =
      state.dockView === 'outlets'
        ? el(
            'div',
            { className: 'hb-sheet__content' },
            selectedZone
              ? renderZoneDetailCard(selectedZone, state.callContact, d, () => openSettings(true), () => selectZone(selectedZone.id), supportsPumps ? (id) => openPumps(id, true) : null)
              : null,
            renderAllOutletsView(viewSnap, d, selectZone)
          )
        : el(
            'div',
            { className: 'hb-sheet__content' },
            selectedZone
              ? renderZoneDetailCard(selectedZone, state.callContact, d, () => openSettings(true), () => selectZone(selectedZone.id), supportsPumps ? (id) => openPumps(id, true) : null)
              : null,
            renderTimeline(viewSnap, state.activeTab, state.callContact, d, () => openSettings(true), selectTab, jumpToZone)
          );

    const liveToastEl = viewNotice
      ? el(
          'button',
          {
            type: 'button',
            className: `hb-live-toast hb-live-toast--${viewNotice.tone}`,
            onClick: () => {
              const targetZoneId = viewNotice.zoneId;
              liveNotice = null;
              jumpToZone(targetZoneId);
            }
          },
          el('span', { className: 'hb-live-toast__dot', 'aria-hidden': 'true' }),
          el('span', { className: 'hb-live-toast__text' }, viewNotice.text),
          el('span', { className: 'hb-live-toast__arrow', 'aria-hidden': 'true' }, '→')
        )
      : null;

    const sheetTop = el(
      'div',
      { className: `hb-sheet-top ${liveToastEl ? 'has-toast' : ''}` },
      sheetHandle,
      liveToastEl
    );

    const whiteSheet = el(
      'div',
      { className: `hb-sheet ${state.sheetExpanded ? 'hb-sheet--expanded' : ''}` },
      sheetTop,
      sheetBody
    );

    const navButtons = [
      {
        id: 'overview',
        icon: 'home',
        shortLabel: d.dockOverview,
        pressed: state.dockView === 'overview',
        onClick: () => setDockView('overview')
      },
      {
        id: 'outlets',
        icon: 'outlets',
        shortLabel: d.dockOutlets,
        pressed: state.dockView === 'outlets',
        onClick: () => setDockView('outlets')
      },
      ...(supportsPumps ? [{
        id: 'pumps',
        icon: 'pump',
        shortLabel: d.dockPumps,
        onClick: () => openPumps()
      }] : []),
      {
        id: 'events',
        icon: 'events',
        shortLabel: d.dockAlerts,
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
      el('span', { className: 'hb-dock__label' }, d.dockChart)
    );

    const bottomOverlay = el(
      'div',
      { className: 'hb-bottom-dock-wrap' },
      state.pulseDrawerOpen
        ? renderFloatingPulseDrawer(viewSnap, state.selectedZoneId, animatePulseBars, d, selectZone, togglePulseDrawer)
        : null,
      el(
        'div',
        { className: `hb-dock-row ${supportsPumps ? 'hb-dock-row--pumps' : ''}` },
        el(
          'nav',
          { className: 'hb-dock', 'aria-label': d.dockAria },
          el('span', { className: 'hb-dock__indicator', 'aria-hidden': 'true' }),
          navButtons.map((btn) =>
            el(
              'button',
              {
                type: 'button',
                className: 'hb-dock__btn',
                dataset: { dock: btn.id },
                'aria-pressed': btn.id === 'pumps' ? null : String(btn.pressed),
                'aria-haspopup': btn.id === 'pumps' ? 'dialog' : null,
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
          el('span', null, viewSnap.nowLabel),
          el('span', { className: 'hb-device__notch' }),
          el('span', null, 'LTE · 390px')
        ),
        el(
          'div',
          {
            className: `hb-screen ${state.pulseDrawerOpen ? 'hb-screen--drawer-open' : ''} ${isLiveTick ? 'hb-screen--live-tick' : ''}`
          },
          heroTop,
          whiteSheet,
          bottomOverlay,
          state.settingsOpen
            ? renderSettingsOverlay(
                state.lang,
                state.theme,
                state.callContact,
                {
                  scenarios,
                  scenarioId: state.scenarioId,
                  sites,
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
                d,
                setLang,
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
        el('a', { href: '#main-content', className: 'skip-link visually-hidden' }, d.skipToApp),
        el('h1', { className: 'visually-hidden' }, d.srHeading),
        phoneStage,
        announcer
      )
    );

    if (prevScreenScrollTop > 0) {
      const nextScreen = root.querySelector('.hb-screen');
      if (nextScreen) nextScreen.scrollTop = prevScreenScrollTop;
    }

    prevDockRect = syncSlidingIndicator('.hb-dock', '.hb-dock__indicator', '.hb-dock__btn[aria-pressed="true"]', isLiveTick ? null : prevDockRect);
    prevTabRect = syncSlidingIndicator('.hb-tabs', '.hb-tabs__indicator', '.hb-tab[aria-pressed="true"]', isLiveTick ? null : prevTabRect);

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
    const d = getDict(state.lang);
    if (state.settingsOpen) {
      closeSettings();
    } else if (state.pulseDrawerOpen) {
      state.pulseDrawerOpen = false;
      render();
      announce(d.annPulseClose);
      root.querySelector('.hb-dock-chart-btn')?.focus();
    } else if (state.selectedZoneId) {
      state.selectedZoneId = null;
      state.activeTab = 'all';
      render();
      announce(d.annAllZones);
    }
  });

  await loadSnapshot();
}

const appRoot = document.getElementById('app');
if (appRoot) {
  mountHybridApp(appRoot);
}
