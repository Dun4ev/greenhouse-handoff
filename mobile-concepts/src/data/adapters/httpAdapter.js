// Заготовка реального HTTP-адаптера с тем же интерфейсом, что и mockAdapter.
// Не используется на этапе 1 до согласования API; демонстрирует взаимозаменяемость
// источника данных без правок экранных компонентов.

import { normalizeSnapshot } from '../contract.js?v=9';

export function createHttpAdapter({ baseUrl = '/api/v1', fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('Для HTTP-адаптера требуется реализация fetch');
  }

  return {
    id: 'http',
    label: 'HTTP API (read-only)',
    async getSites() {
      const res = await fetchImpl(`${baseUrl}/sites`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке списка объектов`);
      return res.json();
    },
    getScenarios() {
      return [{ id: 'live', label: 'Текущий снимок', shortLabel: 'Live' }];
    },
    async getSnapshot({ siteId } = {}) {
      const url = `${baseUrl}/sites/${encodeURIComponent(siteId)}/snapshot`;
      const res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status} при загрузке снимка`);
      const payload = await res.json();
      return normalizeSnapshot({ ...payload, isSynthetic: false, sourceLabel: 'HTTP API' }, { allowControl: false });
    },
    async getFleetSnapshots() {
      const sites = await this.getSites();
      return Promise.all(sites.map((site) => this.getSnapshot({ siteId: site.id })));
    },
    subscribe({ siteId, intervalMs = 5000, onUpdate } = {}) {
      let stopped = false;
      const poll = async () => {
        if (stopped || typeof onUpdate !== 'function') return;
        try {
          const snapshot = await this.getSnapshot({ siteId });
          if (!stopped) onUpdate({ snapshot, liveEvent: null, changedZoneIds: [] });
        } catch {
          // Ошибки сети обрабатываются при следующем цикле опроса
        }
      };
      const timer = setInterval(poll, intervalMs);
      return () => {
        stopped = true;
        clearInterval(timer);
      };
    }
  };
}
