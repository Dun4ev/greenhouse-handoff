// Внутренний формат фронтенда. Источник явно сообщает доступные операции и сигналы.
export function isScheduleTime(time) {
  return typeof time === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time);
}

export function normalizePumpControl(raw, reliable, wateringState) {
  if (!raw || typeof raw !== 'object') return null;
  const contactor = reliable && ['on', 'off'].includes(raw.contactor) ? raw.contactor : 'unknown';
  const fault = reliable && ['clear', 'active'].includes(raw.fault) ? raw.fault : 'unknown';
  const permit = reliable && ['granted', 'blocked'].includes(raw.permit) ? raw.permit : 'unknown';
  const phase = reliable ? (raw.phase === 'switching' ? 'switching' : wateringState) : 'unknown';
  const pending = raw.pending === true;
  return {
    scheduleTime: isScheduleTime(raw.scheduleTime) ? raw.scheduleTime : null,
    contactor, fault, permit, phase, pending,
    canStart: !pending && raw.canStart === true && phase === 'idle' && contactor === 'off'
      && fault === 'clear' && permit === 'granted',
    canStop: !pending && raw.canStop === true && reliable && (phase === 'watering' || phase === 'switching' || contactor === 'on'),
    canSchedule: !pending && raw.canSchedule === true && reliable
  };
}
