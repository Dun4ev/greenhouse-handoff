import { isScheduleTime, normalizePumpControl } from '../pumpControl.js';

export function controlError(code) {
  return Object.assign(new Error(code), { code });
}

// У каждой зоны свой ключ: изменение одной зоны не перезаписывает расписание соседней.
export function createDemoSchedules(storage) {
  const key = (siteId, zoneId) => `greenhouse.n2.schedule.v1.${siteId}.${zoneId}`;
  const getStorage = () => storage ?? globalThis.window?.localStorage;
  return {
    read(siteId, zoneId) {
      try {
        const value = getStorage()?.getItem(key(siteId, zoneId));
        return isScheduleTime(value) ? value : null;
      } catch {
        return null;
      }
    },
    write(siteId, zoneId, time) {
      if (time !== null && !isScheduleTime(time)) throw controlError('invalidTime');
      try {
        const target = getStorage();
        if (time === null) target.removeItem(key(siteId, zoneId));
        else target.setItem(key(siteId, zoneId), time);
      } catch {
        throw controlError('storage');
      }
    }
  };
}

export function assertDemoCommand(zone, action) {
  if (zone.connection.state !== 'online') throw controlError('offline');
  if (zone.telemetry.freshness !== 'fresh') throw controlError('stale');
  const control = normalizePumpControl(zone.control, true, zone.watering.state);
  const allowed = { start: control.canStart, stop: control.canStop, schedule: control.canSchedule };
  if (allowed[action] !== true) throw controlError('unavailable');
}

// Сжатое время для демонстрации последовательного цикла: 60 с на участок и один
// тик с выключенным Н2 при смене выхода. Это не уставки полевого контроллера.
const OUTLET_SECONDS = 60;

export function createDemoPumpController({ siteId, zones, schedules, seconds, water, idle, record }) {
  const runtime = new Map();
  for (const zone of zones) {
    zone.control = {
      canStart: true, canStop: true, canSchedule: true,
      contactor: zone.watering.state === 'watering' ? 'on' : 'off',
      fault: 'clear', permit: 'granted', phase: zone.watering.state, scheduleTime: null
    };
    runtime.set(zone.id, { managed: false, nextTransition: null, nextOutlet: null });
  }

  function takeControl(zone) {
    const state = runtime.get(zone.id);
    if (!state.managed && zone.connection.state === 'online' && zone.telemetry.freshness === 'fresh'
      && zone.watering.state === 'watering') state.nextTransition = seconds() + OUTLET_SECONDS;
    state.managed = true;
    return state;
  }

  function syncSchedule(zone) {
    zone.control.scheduleTime = schedules.read(siteId, zone.id);
    if (zone.control.scheduleTime !== null) takeControl(zone);
  }

  function startOutlet(zone, outlet, code, text) {
    const state = takeControl(zone);
    state.nextTransition = seconds() + OUTLET_SECONDS;
    state.nextOutlet = null;
    return water(zone, outlet, text, code, zone.outletLabels[outlet - 1]);
  }

  async function command(zoneId, action, time, notifyPending) {
    const zone = zones.find((item) => item.id === zoneId);
    if (!zone) throw controlError('unavailable');
    const state = runtime.get(zoneId);
    if (zone.control.pending) throw controlError('busy');
    assertDemoCommand(zone, action);
    if (action === 'schedule') {
      schedules.write(siteId, zoneId, time);
      takeControl(zone);
      syncSchedule(zone);
      record(zone, time === null ? 'unscheduled' : 'scheduled',
        time === null ? 'Расписание отключено' : `Ежедневный пуск в ${time}`, time);
      return;
    }
    zone.control.pending = true;
    try {
      record(zone, action === 'start' ? 'startRequested' : 'stopRequested',
        action === 'start' ? 'Запрошен пуск цикла Н2' : 'Запрошен останов цикла Н2');
      notifyPending();
      // Отдельная доставка синтетического пакета ША-У. До нее снимок сохраняет показания.
      await new Promise((resolve) => setTimeout(resolve, 240));
      zone.control.pending = false;
      assertDemoCommand(zone, action);
      if (action === 'start') {
        startOutlet(zone, 1, 'started', 'Начат ручной цикл Н2');
      } else {
        takeControl(zone);
        state.nextTransition = null;
        state.nextOutlet = null;
        idle(zone, 'Цикл Н2 остановлен', 'stopped');
      }
    } catch (error) {
      record(zone, 'commandInterrupted', 'Подтверждение команды Н2 не получено');
      throw error;
    } finally {
      zone.control.pending = false;
    }
  }

  function step(zone, clock) {
    syncSchedule(zone);
    const state = runtime.get(zone.id);
    const reliable = zone.connection.state === 'online' && zone.telemetry.freshness === 'fresh';
    const control = normalizePumpControl(zone.control, reliable, zone.watering.state);
    const due = seconds() % 60 === 0 && zone.control.scheduleTime === clock;
    if (due && control.canStart) {
      return startOutlet(zone, 1, 'scheduleStart', 'Цикл Н2 запущен по расписанию');
    }
    const skipped = due ? record(zone, 'scheduleSkipped', 'Пуск по расписанию пропущен') : null;
    if (zone.control.pending || !reliable || state.nextTransition === null || seconds() < state.nextTransition) return skipped;
    if (state.nextOutlet !== null) {
      return startOutlet(zone, state.nextOutlet, 'outletStart', `Начат полив ${zone.outletLabels[state.nextOutlet - 1]}`);
    }
    const outlet = zone.watering.activeOutlet;
    if (outlet >= zone.outletsTotal) {
      state.nextTransition = null;
      return idle(zone, 'Цикл Н2 завершен', 'cycleComplete');
    }
    state.nextOutlet = outlet + 1;
    state.nextTransition = seconds() + 1;
    const label = zone.outletLabels[state.nextOutlet - 1];
    const event = idle(zone, `Н2 отключен для перехода на ${label}`, 'outletChange', label);
    zone.control.phase = 'switching';
    return event;
  }

  function interrupt(zone) {
    const state = runtime.get(zone.id);
    state.nextTransition = null;
    state.nextOutlet = null;
  }

  function allowsScript(zone) {
    const state = runtime.get(zone.id);
    return !state.managed && !zone.control.pending;
  }

  return { command, step, allowsScript, interrupt, syncSchedule };
}
