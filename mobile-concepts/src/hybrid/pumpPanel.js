import { el, svgEl } from '../ui/dom.js';

const COPY = {
  ru: {
    title: 'Управление поливом', demo: 'Демо', modelClock: 'Время модели', siteClock: 'Время площадки',
    close: 'Закрыть', zones: 'Зона полива', pump: 'Насос Н2', signals: 'Сигналы шкафа',
    contactor: 'Контактор', flow: 'Поток', fault: 'Исправность', permit: 'Дистанционный режим',
    on: 'Включен', off: 'Отключен', clear: 'Исправен', active: 'Блокировка', granted: 'Разрешен',
    blocked: 'Запрещен', unknown: 'Нет данных', idle: 'Ожидание', watering: 'Идет полив',
    switching: 'Смена участка', switchingNote: 'Цикл продолжается. Н2 отключен на время смены участка.',
    faultNote: 'Пуск заблокирован сигналом исправности DI4.',
    permitNote: 'Шкаф не разрешает дистанционный пуск (DI5).',
    unconfirmed: 'Пуск заблокирован. Проверьте обратные сигналы шкафа.',
    start: 'Запустить полив', stop: 'Остановить полив', pending: 'Выполняется…',
    schedule: 'Расписание', daily: 'Ежедневно', lastSchedule: 'Сохраненное время', disabled: 'Отключено', edit: 'Изменить', add: 'Настроить',
    time: 'Время запуска', enable: 'Запускать ежедневно', save: 'Сохранить', cancel: 'Отмена',
    simulation: 'Расписание работает, пока приложение открыто и модель запущена.',
    paused: 'Модель на паузе. Запуск по времени приостановлен.',
    saved: 'Расписание сохранено.', removed: 'Запуск по расписанию отключен.',
    startSent: 'Запрос пуска принят.', stopSent: 'Запрос останова принят.',
    errors: {
      offline: 'Шкаф вне связи. Дождитесь подключения.',
      stale: 'Связь есть, но показания устарели. Дождитесь нового пакета.',
      unavailable: 'Управление этой зоной сейчас недоступно.',
      invalidTime: 'Укажите время от 00:00 до 23:59.',
      storage: 'Браузер не сохранил расписание. Проверьте доступ к локальному хранилищу.',
      busy: 'Уже выполняется другая команда.', failed: 'Ошибка команды. Проверьте состояние зоны.'
    }
  },
  sr: {
    title: 'Upravljanje zalivanjem', demo: 'Demo', modelClock: 'Vreme modela', siteClock: 'Vreme na lokaciji',
    close: 'Zatvori', zones: 'Zona zalivanja', pump: 'Pumpa N2', signals: 'Signali ormara',
    contactor: 'Kontaktor', flow: 'Protok', fault: 'Ispravnost', permit: 'Daljinski režim',
    on: 'Uključen', off: 'Isključen', clear: 'Ispravna', active: 'Blokada', granted: 'Dozvoljen',
    blocked: 'Zabranjen', unknown: 'Nema podataka', idle: 'Mirovanje', watering: 'Zalivanje u toku',
    switching: 'Promena sekcije', switchingNote: 'Ciklus se nastavlja. N2 je isključena tokom promene sekcije.',
    faultNote: 'Signal ispravnosti DI4 blokira pokretanje.',
    permitNote: 'Ormar ne dozvoljava daljinsko pokretanje (DI5).',
    unconfirmed: 'Pokretanje je blokirano. Proverite povratne signale ormara.',
    start: 'Pokreni zalivanje', stop: 'Zaustavi zalivanje', pending: 'U toku…',
    schedule: 'Raspored', daily: 'Svakog dana', lastSchedule: 'Sačuvano vreme', disabled: 'Isključen', edit: 'Izmeni', add: 'Podesi',
    time: 'Vreme pokretanja', enable: 'Pokreni svakog dana', save: 'Sačuvaj', cancel: 'Otkaži',
    simulation: 'Raspored radi dok je aplikacija otvorena i simulacija aktivna.',
    paused: 'Simulacija je pauzirana. Zakazano pokretanje je na pauzi.',
    saved: 'Raspored je sačuvan.', removed: 'Zakazano pokretanje je isključeno.',
    startSent: 'Zahtev za pokretanje je prihvaćen.', stopSent: 'Zahtev za zaustavljanje je prihvaćen.',
    errors: {
      offline: 'Nema veze sa ormarom. Sačekajte povezivanje.',
      stale: 'Veza postoji, ali su podaci zastareli. Sačekajte novi paket.',
      unavailable: 'Upravljanje ovom zonom trenutno nije dostupno.',
      invalidTime: 'Unesite vreme između 00:00 i 23:59.',
      storage: 'Pregledač nije sačuvao raspored. Proverite pristup lokalnom skladištu.',
      busy: 'Druga komanda je već u toku.', failed: 'Greška pri izvršavanju komande. Proverite stanje zone.'
    }
  }
};

function icon(path) {
  return svgEl('svg', {
    viewBox: '0 0 24 24', width: 20, height: 20, fill: 'none', stroke: 'currentColor',
    'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true'
  }, svgEl('path', { d: path }));
}

function button(className, text, onClick) {
  return el('button', { className, type: 'button', onClick }, text);
}

function setText(node, value) {
  if (node.textContent !== value) node.textContent = value;
}

function signal(label, channel) {
  const value = el('dd');
  const row = el('div', { className: 'pp-signal' },
    el('dt', null, label, el('small', null, channel)), value);
  return {
    row,
    update(text, tone) {
      setText(value, text);
      row.dataset.tone = tone;
    }
  };
}

export function openPumpPanel({ snapshot, zoneId, lang, liveEnabled, onCommand, onClose }) {
  const t = COPY[lang] ?? COPY.sr;
  const dialog = el('dialog', { className: 'pump-panel', 'aria-labelledby': 'pp-title', lang });
  let current = snapshot;
  let selected = current.zones.find(z => z.id === zoneId)?.id ?? current.zones[0]?.id;
  let pending = null;
  let editing = false;

  const close = button('pp-close', icon('m6 6 12 12M18 6 6 18'), () => dialog.close());
  close.setAttribute('aria-label', t.close);
  const demo = el('span', { className: 'pp-demo' }, t.demo);
  const clockLabel = el('span');
  const clock = el('time');
  const site = el('p', { className: 'pp-site' });
  const zoneNav = el('div', { className: 'pp-zones', role: 'group', 'aria-label': t.zones });
  const zoneButtons = new Map();
  const status = el('span', { className: 'pp-status' });
  const progress = el('span', { className: 'pp-progress' });
  const start = button('pp-action pp-start', [icon('m8 4 11 8-11 8z'), t.start], () => run('start'));
  const stop = button('pp-action pp-stop', [icon('M6 6h12v12H6z'), t.stop], () => run('stop'));
  const notice = el('p', { className: 'pp-hint pp-warning' });
  const contactor = signal(t.contactor, 'DI3');
  const flow = signal(t.flow, 'FS1 · DI6');
  const fault = signal(t.fault, 'DI4');
  const permit = signal(t.permit, 'DI5');
  const message = el('p', { className: 'pp-result', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true' });
  const cadence = el('span', { className: 'pp-cadence' });
  const savedTime = el('strong', { className: 'pp-saved-time' });
  const edit = button('pp-secondary', '', () => {
    const saved = selectedZone()?.control?.scheduleTime;
    enable.checked = true;
    timeInput.value = saved ?? '';
    editing = true;
    setText(message, '');
    refresh();
    timeInput.focus();
  });
  const scheduleView = el('div', { className: 'pp-summary' },
    el('div', { className: 'pp-schedule-value' }, cadence, savedTime), edit);
  const enable = el('input', { type: 'checkbox', onChange: () => refresh() });
  const timeInput = el('input', { type: 'time', step: 60, required: true, onInput: () => {
    setText(message, '');
  } });
  const timeRow = el('label', { className: 'pp-time-field' }, t.time, timeInput);
  const save = el('button', { type: 'submit', className: 'pp-save' }, t.save);
  const cancel = button('pp-secondary', t.cancel, () => {
    editing = false;
    setText(message, '');
    refresh();
    edit.focus();
  });
  const form = el('form', { className: 'pp-form', onSubmit: event => {
    event.preventDefault();
    run('schedule');
  } }, el('label', { className: 'pp-check' }, enable, t.enable), timeRow,
  el('div', { className: 'pp-form-actions' }, save, cancel));
  const simNote = el('p', { className: 'pp-hint' });

  dialog.append(
    el('header', { className: 'pp-head' },
      el('div', { className: 'pp-head-copy' },
        el('div', { className: 'pp-clock-line' }, demo, clockLabel, clock),
        el('h2', { id: 'pp-title' }, t.title), site), close),
    el('div', { className: 'pp-body' }, zoneNav,
      el('section', { className: 'pp-card' },
        el('div', { className: 'pp-card-title' }, el('h3', null, t.pump),
          el('div', { className: 'pp-state' }, status, progress)),
        el('div', { className: 'pp-command' }, start, stop), notice,
        el('dl', { className: 'pp-signals', 'aria-label': t.signals },
          contactor.row, flow.row, fault.row, permit.row)),
      el('section', { className: 'pp-card pp-schedule' },
        el('h3', null, icon('M12 4a8 8 0 1 1-8 8 8 8 0 0 1 8-8Zm0 3v5l3 2'), t.schedule),
        scheduleView, form, simNote), message)
  );

  function selectedZone() {
    return current.zones.find(z => z.id === selected);
  }

  function refreshZones() {
    for (const [id, control] of zoneButtons) {
      if (!current.zones.some(z => z.id === id)) {
        control.remove();
        zoneButtons.delete(id);
      }
    }
    for (const z of current.zones) {
      let control = zoneButtons.get(z.id);
      if (!control) {
        control = button('pp-zone', z.name, () => {
          if (pending || selected === z.id) return;
          selected = z.id;
          editing = false;
          setText(message, '');
          refresh();
        });
        zoneButtons.set(z.id, control);
        zoneNav.append(control);
      }
      setText(control, z.name);
      control.setAttribute('aria-pressed', String(z.id === selected));
      control.disabled = Boolean(pending);
    }
  }

  function refresh() {
    const z = selectedZone();
    const c = z?.control;
    const offline = z?.connection.state === 'offline';
    const reliable = !offline && z?.telemetry.freshness === 'fresh';
    const watering = reliable ? c?.phase ?? z.watering.state : 'unknown';
    refreshZones();
    setText(clockLabel, current.isSynthetic ? t.modelClock : t.siteClock);
    setText(clock, current.nowLabel);
    setText(site, current.siteName);
    demo.hidden = !current.isSynthetic;
    setText(status, t[watering] ?? t.unknown);
    status.dataset.tone = watering;
    const outletInfo = watering === 'watering'
      ? [z.watering.activeOutletLabel, z.watering.elapsedLabel].filter(Boolean).join(' · ')
      : '';
    setText(progress, outletInfo);
    progress.hidden = !outletInfo;

    const stopping = watering === 'watering' || watering === 'switching' || c?.contactor === 'on' || c?.canStop;
    const showStop = Boolean(stopping || watering === 'unknown');
    start.hidden = Boolean(stopping);
    stop.hidden = !showStop;
    start.disabled = Boolean(pending || !reliable || !c?.canStart);
    stop.disabled = Boolean(pending || !reliable || !c?.canStop);
    let reason = '';
    if (offline) reason = t.errors.offline;
    else if (z && !reliable) reason = t.errors.stale;
    else if (!c) reason = t.errors.unavailable;
    else if (c.pending || pending) reason = c.pending && !pending ? t.errors.busy : '';
    else if (watering === 'switching' && c.contactor === 'off') reason = t.switchingNote;
    else if (!c.canStart && !c.canStop) {
      if (c.fault === 'active') reason = t.faultNote;
      else if (c.permit === 'blocked') reason = t.permitNote;
      else reason = stopping ? t.errors.unavailable : t.unconfirmed;
    }
    setText(notice, reason);
    notice.hidden = !reason;

    const currentSignals = reliable ? c : null;
    const contact = currentSignals?.contactor;
    const health = currentSignals?.fault;
    const remote = currentSignals?.permit;
    contactor.update(t[contact] ?? t.unknown, contact === 'on' ? 'on' : 'neutral');
    flow.update(reliable ? z.flow.label : t.unknown, reliable && z.flow.state === 'present' ? 'water' : 'neutral');
    fault.update(t[health] ?? t.unknown, health === 'active' ? 'warning' : 'neutral');
    permit.update(t[remote] ?? t.unknown, remote === 'blocked' ? 'warning' : 'neutral');

    const schedule = c?.scheduleTime;
    setText(cadence, reliable && c?.canSchedule ? t.daily : t.lastSchedule);
    cadence.hidden = !schedule;
    setText(savedTime, schedule || (reliable && c ? t.disabled : t.unknown));
    savedTime.classList.toggle('pp-saved-time--empty', !schedule);
    setText(edit, schedule ? t.edit : t.add);
    edit.disabled = Boolean(pending || !reliable || !c?.canSchedule);
    scheduleView.hidden = editing;
    form.hidden = !editing;
    enable.disabled = edit.disabled;
    timeInput.disabled = edit.disabled || !enable.checked;
    timeRow.hidden = !enable.checked;
    save.disabled = edit.disabled;
    cancel.disabled = Boolean(pending);
    setText(simNote, liveEnabled ? t.simulation : t.paused);
    simNote.hidden = !current.isSynthetic;
  }

  async function run(action) {
    if (pending) return;
    const command = { zoneId: selected, action };
    if (action === 'schedule') {
      if (!editing || save.disabled) return;
      if (enable.checked && !timeInput.reportValidity()) return;
      command.time = enable.checked ? timeInput.value : null;
    } else if ((action === 'start' ? start : stop).disabled) {
      return;
    }
    pending = action;
    message.dataset.tone = 'neutral';
    setText(message, t.pending);
    refresh();
    try {
      await onCommand(command);
      if (!dialog.open) return;
      const zoneName = selectedZone()?.name ?? '';
      if (action === 'schedule') editing = false;
      const note = action === 'schedule' ? (command.time ? t.saved : t.removed)
        : action === 'start' ? t.startSent : t.stopSent;
      setText(message, zoneName + ' · ' + note);
      message.dataset.tone = 'success';
    } catch (error) {
      if (!dialog.open) return;
      setText(message, t.errors[error?.code] ?? t.errors.failed);
      message.dataset.tone = 'error';
    } finally {
      pending = null;
      if (dialog.open) {
        refresh();
        if (action === 'schedule') {
          (editing ? save : edit).focus();
        } else if (!dialog.contains(document.activeElement) || document.activeElement === dialog) {
          const activeAction = start.hidden ? stop : start;
          (activeAction.disabled ? close : activeAction).focus();
        }
      }
    }
  }

  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  }, { once: true });
  refresh();
  document.body.append(dialog);
  dialog.showModal();
  return {
    update(nextSnapshot) {
      if (!dialog.open) return;
      current = nextSnapshot;
      if (!selectedZone()) {
        selected = current.zones[0]?.id;
        editing = false;
        setText(message, '');
      }
      refresh();
    }
  };
}
