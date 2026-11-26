import assert from 'node:assert/strict';
import test from 'node:test';
import { createDataProvider } from '../src/data/provider.js';
import { normalizePumpControl } from '../src/data/pumpControl.js';

const context = { siteId: 'srb-pilot-1', scenarioId: 'normal' };
function demoStorage() {
  const entries = new Map();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key)
  };
}

test('manual requests, feedback, duplicate submission, stop and resume subscription', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const provider = createDataProvider({ storage: demoStorage() });
  const request = (action) => provider.commandZone({ ...context, zoneId: 2, action });
  const start = request('start');
  const pending = await provider.getSnapshot(context);
  assert.equal(pending.zones[1].control.pending, true);
  assert.equal(pending.zones[1].control.contactor, 'off');
  assert.equal(pending.zones[1].flow.state, 'absent');
  assert.equal(pending.events[0].controlEvent, 'startRequested');
  await assert.rejects(request('start'), { code: 'busy' });
  t.mock.timers.tick(240);
  const started = await start;
  assert.equal(started.events[0].controlEvent, 'started');
  assert.equal(started.zones[1].flow.state, 'present');
  assert.equal(started.zones[1].control.contactor, 'on');
  assert.equal(started.zones[1].watering.activeOutlet, 1);
  assert.equal(started.zones[0].watering.state, 'idle');
  await assert.rejects(request('start'), { code: 'unavailable' });
  let payload;
  const subscribe = () => provider.subscribe({ ...context, onUpdate: (p) => { payload = p; } });
  let unsubscribe = subscribe();
  t.mock.timers.tick(1000);
  assert.equal(payload.tickOnly, true);
  const stop = request('stop');
  assert.equal(payload.snapshot.zones[1].control.pending, true);
  t.mock.timers.tick(240);
  const stopped = await stop;
  assert.equal(stopped.events[0].controlEvent, 'stopped');
  unsubscribe();
  unsubscribe = subscribe();
  t.mock.timers.tick(18000);
  assert.equal(payload.snapshot.zones[1].watering.state, 'idle');
  assert.equal(payload.snapshot.zones[1].flow.state, 'absent');
  assert.equal(payload.snapshot.zones[1].control.contactor, 'off');
  unsubscribe();
});

test('daily time survives reload by site and zone, triggers once and completes outlets in order', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const storage = demoStorage();
  const provider = createDataProvider({ storage });
  const setTime = (time) => provider.commandZone({ ...context, zoneId: 1, action: 'schedule', time });
  await assert.rejects(setTime('24:00'), { code: 'invalidTime' });
  await assert.rejects(setTime('9:00'), { code: 'invalidTime' });
  const saved = await setTime('14:33');
  assert.equal(saved.events[0].controlValue, '14:33');
  const reload = createDataProvider({ storage });
  const initial = await reload.getSnapshot(context);
  assert.equal(initial.zones[0].control.scheduleTime, '14:33');
  assert.equal(initial.zones[1].control.scheduleTime, null);
  const other = await reload.getSnapshot({ ...context, siteId: 'srb-pilot-2' });
  assert.equal(other.zones[0].control.scheduleTime, null);
  let zone;
  const events = new Set();
  const unsub = reload.subscribe({ ...context, onUpdate: ({ snapshot }) => {
    zone = snapshot.zones[0];
    for (const event of snapshot.events) if (event.controlEvent === 'scheduleStart') events.add(event.id);
  } });
  t.mock.timers.tick(60000);
  assert.equal(zone.watering.activeOutlet, 1);
  t.mock.timers.tick(60000);
  assert.equal(zone.control.phase, 'switching');
  assert.equal(zone.control.contactor, 'off');
  assert.equal(zone.control.canStart, false);
  assert.equal(zone.control.canStop, true);
  t.mock.timers.tick(1000);
  assert.equal(zone.watering.activeOutlet, 2);
  t.mock.timers.tick(61000);
  assert.equal(zone.watering.activeOutlet, 3);
  t.mock.timers.tick(60000);
  assert.equal(zone.control.phase, 'idle');
  assert.equal(events.size, 1);
  unsub();
  await setTime(null);
  assert.equal((await reload.getSnapshot(context)).zones[0].control.scheduleTime, null);
});

test('offline and stale states reject all commands, a missed schedule is never replayed on reconnect', async (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] });
  const provider = createDataProvider({ storage: demoStorage() });
  for (const [scenarioId, code] of [['incident', 'offline'], ['stale-online', 'stale']]) {
    const params = { ...context, scenarioId, zoneId: 2 };
    const zone = (await provider.getSnapshot(params)).zones[1];
    assert.equal(zone.control.contactor, 'unknown');
    assert.equal(zone.control.permit, 'unknown');
    for (const action of ['start', 'stop', 'schedule']) {
      await assert.rejects(provider.commandZone({ ...params, action, time: '14:33' }), { code });
    }
  }
  // В демосценарии на две зоны связь пропадает в 14:32:54 и возвращается после 14:33.
  await provider.commandZone({ ...context, zoneId: 2, action: 'schedule', time: '14:33' });
  const incident = { ...context, scenarioId: 'incident' };
  const unsub = provider.subscribe({ ...incident, onUpdate() {} });
  t.mock.timers.tick(90000);
  const snapshot = await provider.getSnapshot(incident);
  assert.ok(snapshot.events.some((e) => e.controlEvent === 'scheduleSkipped'));
  assert.ok(!snapshot.events.some((e) => e.controlEvent === 'scheduleStart'));
  assert.equal(snapshot.zones[1].control.phase, 'idle');
  unsub();
});

test('start interlocks, stop availability, missing persistence and replaceable adapters', async () => {
  const running = { canStart: true, canStop: true, canSchedule: true, contactor: 'on', fault: 'active', permit: 'blocked' };
  assert.equal(normalizePumpControl(running, true, 'watering').canStop, true);
  const ready = { ...running, contactor: 'off', fault: 'clear', permit: 'granted' };
  for (const lock of [{ contactor: 'on' }, { fault: 'active' }, { permit: 'blocked' }, { permit: 'unknown' }]) {
    assert.equal(normalizePumpControl({ ...ready, ...lock }, true, 'idle').canStart, false);
  }
  const readOnlyStorage = { getItem: () => null, setItem() { throw Error(); } };
  const demo = createDataProvider({ storage: readOnlyStorage });
  await assert.rejects(demo.commandZone({ ...context, zoneId: 1, action: 'schedule', time: '14:33' }), { code: 'storage' });
  assert.equal((await demo.getSnapshot(context)).zones[0].control.scheduleTime, null);
  const raw = await demo.getSnapshot(context);
  const http = createDataProvider({ mode: 'http', fetchImpl: async () => ({ ok: true, json: async () => raw }) });
  assert.equal(http.commandZone, undefined);
  assert.equal((await http.getSnapshot(context)).zones[0].control, null);
  const custom = { getSnapshot: async () => raw };
  assert.equal(createDataProvider({ customAdapter: custom }), custom);
});

test('brief start and stop preserve history until a two-minute interval closes', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const provider = createDataProvider({ storage: demoStorage() });
  const { pulseStrip: initial } = (await provider.getSnapshot(context)).zones[0];
  for (const action of ['start', 'stop', 'start', 'stop']) {
    const pending = provider.commandZone({ ...context, zoneId: 1, action });
    t.mock.timers.tick(240);
    const { pulseStrip } = (await pending).zones[0];
    assert.deepEqual(pulseStrip.slots, initial.slots);
    assert.equal(pulseStrip.windowEnd, initial.windowEnd);
  }
  let payload;
  const unsub = provider.subscribe({ ...context, onUpdate(update) { payload = update; } });
  t.mock.timers.tick(119000);
  assert.deepEqual(payload.snapshot.zones[0].pulseStrip.slots, initial.slots);
  t.mock.timers.tick(1000);
  const completed = payload.snapshot.zones[0].pulseStrip;
  assert.equal(payload.tickOnly, false);
  assert.equal(completed.windowStart, '13:34');
  assert.equal(completed.windowEnd, '14:34');
  assert.deepEqual(completed.slots, [...initial.slots.slice(1), 'watering']);
  t.mock.timers.tick(120000);
  assert.deepEqual(payload.snapshot.zones[0].pulseStrip.slots, [...initial.slots.slice(2), 'watering', 'idle']);
  unsub();
});

test('loss of connection between acceptance and feedback interrupts a start and marks a gap', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval'] });
  const provider = createDataProvider({ storage: demoStorage() });
  const incident = { ...context, scenarioId: 'incident' };
  let snapshot;
  const unsub = provider.subscribe({ ...incident, onUpdate(update) { snapshot = update.snapshot; } });
  t.mock.timers.tick(53900);
  assert.equal(snapshot.zones[1].control.canStart, true);
  const pending = provider.commandZone({ ...incident, zoneId: 2, action: 'start' });
  t.mock.timers.tick(240);
  await assert.rejects(pending, { code: 'offline' });
  assert.equal(snapshot.zones[1].control.contactor, 'unknown');
  assert.equal(snapshot.events[0].controlEvent, 'commandInterrupted');
  t.mock.timers.tick(66000);
  assert.equal(snapshot.zones[1].pulseStrip.windowEnd, '14:34');
  assert.equal(snapshot.zones[1].pulseStrip.slots.at(-1), 'gap');
  unsub();
});
