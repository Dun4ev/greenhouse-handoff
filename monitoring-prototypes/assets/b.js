function renderZone(zone) {
  const stale = zone.stale;
  const status = stale ? 'Статус полива неизвестен' : zone.statusLabel;
  const activeOutlet = stale ? 'Неизвестно' : zone.activeOutlet ?? 'Нет';
  const elapsed = stale ? 'Неизвестно' : zone.elapsed ?? 'Нет';
  const flow = stale ? 'Неизвестно' : zone.flow;
  const state = stale ? 'stale' : zone.status;

  return `
    <section class="b-zone b-zone--${state}" aria-labelledby="b-zone-${zone.id}">
      <header class="b-zone-head">
        <h2 id="b-zone-${zone.id}">${zone.name}</h2>
        <span class="b-capacity">${zone.outlets} ${zone.outlets === 3 ? 'выхода' : 'выходов'}</span>
      </header>
      <p class="b-zone-status">${status}</p>
      <dl class="b-metrics">
        <div>
          <dt>Поток</dt>
          <dd>${flow}</dd>
        </div>
        <div>
          <dt>Активный выход</dt>
          <dd>${activeOutlet}</dd>
        </div>
        <div>
          <dt>Длительность</dt>
          <dd>${elapsed}</dd>
        </div>
      </dl>
      <p class="b-freshness">
        <span>Последний пакет <time datetime="${zone.lastSeen}">${zone.lastSeen}</time></span>
        <span>${zone.ageLabel}</span>
      </p>
    </section>
  `;
}

export function render(scenario) {
  return `
    <div class="b-zones">
      ${scenario.zones.map(renderZone).join('')}
    </div>
  `;
}
