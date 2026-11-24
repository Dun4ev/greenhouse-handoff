// Synthetic, frozen snapshots. No equipment connection or implied API contract.
const zone1 = { id: 1, name: 'Зона 1', outlets: 3, stale: false, status: 'idle', statusLabel: 'Ожидание', lastSeen: '14:31:50', ageLabel: '10 с назад', flow: 'Нет потока', activeOutlet: null, elapsed: null };
const zone2 = { id: 2, name: 'Зона 2', outlets: 6, stale: false, status: 'idle', statusLabel: 'Ожидание', lastSeen: '14:31:45', ageLabel: '15 с назад', flow: 'Нет потока', activeOutlet: null, elapsed: null };
export const scenarios = {
  normal: {
    id: 'normal', nowLabel: '14:32', zones: [{ ...zone1 }, { ...zone2 }],
    events: [
      { time: '14:20', zone: 1, text: 'Полив завершен', kind: 'info' },
      { time: '14:10', zone: 2, text: 'Полив завершен', kind: 'info' },
      { time: '14:04', zone: 1, text: 'Начат полив участка 1', kind: 'info' }
    ]
  },
  incident: {
    id: 'incident', nowLabel: '14:32',
    zones: [
      { ...zone1, status: 'watering', statusLabel: 'Идет полив', flow: 'Есть поток', activeOutlet: 2, elapsed: '8 мин' },
      { ...zone2, stale: true, status: 'unknown', statusLabel: 'Нет связи', lastSeen: '14:10:00', ageLabel: '22 мин назад', flow: 'Неизвестно' }
    ],
    events: [
      { time: '14:24', zone: 1, text: 'Начат полив участка 2', kind: 'info' },
      { time: '14:12', zone: 2, text: 'Новые данные не поступают', kind: 'warning' },
      { time: '14:10', zone: 2, text: 'Получен последний пакет данных', kind: 'info' }
    ]
  }
};
