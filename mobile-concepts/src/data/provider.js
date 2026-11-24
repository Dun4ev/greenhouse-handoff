// Единая точка сборки источника данных приложения (AGENTS.md).
// Смена тестового адаптера на реальный HTTP-адаптер выполняется только здесь,
// без изменений в экранных компонентах.

import { createMockAdapter } from './adapters/mockAdapter.js';
import { createHttpAdapter } from './adapters/httpAdapter.js';

export function createDataProvider(config = {}) {
  const mode = config.mode ?? 'mock';

  if (mode === 'http') {
    return createHttpAdapter({ baseUrl: config.baseUrl, fetchImpl: config.fetchImpl });
  }

  if (config.customAdapter) {
    return config.customAdapter;
  }

  return createMockAdapter({ label: config.label });
}
