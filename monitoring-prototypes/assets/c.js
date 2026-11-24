function renderZone(zone) {
  const status = zone.stale ? 'unknown' : zone.status;
  const flow = zone.stale ? 'Поток неизвестен' : zone.flow;
  const activeOutlet = status === 'watering' && zone.activeOutlet != null
    ? `${zone.activeOutlet} из ${zone.outlets}`
    : '';

  return `
    <li class="c-zone c-zone--${status}">
      <h3 class="c-zone-name">${zone.name}</h3>
      <p class="c-zone-status">${zone.statusLabel}</p>
      <p class="c-zone-metrics">
        ${zone.stale ? '<span>Полив неизвестен</span>' : ''}
        <span>${flow}</span>
        ${activeOutlet ? `<span>Выход <strong>${activeOutlet}</strong></span>` : ''}
        ${status === 'watering' && zone.elapsed ? `<strong>${zone.elapsed}</strong>` : ''}
      </p>
      <p class="c-zone-time">
        Последний пакет <time datetime="${zone.lastSeen}">${zone.lastSeen}</time>
        <span>· ${zone.ageLabel}</span>
      </p>
    </li>`;
}

export function render(scenario) {
  const zoneNames = new Map(scenario.zones.map(zone => [zone.id, zone.name]));

  return `
    <div class="c-monitoring">
      <section aria-labelledby="c-current-title">
        <h2 id="c-current-title" class="c-heading">Состояние зон</h2>
        <ul class="c-zones" role="list">
          ${scenario.zones.map(renderZone).join('')}
        </ul>
      </section>
      <section class="c-history" aria-labelledby="c-events-title">
        <h2 id="c-events-title" class="c-heading">Недавние события</h2>
        ${scenario.events.length ? `
          <ol class="c-events" role="list">
            ${scenario.events.map(event => `
              <li class="c-event c-event--${event.kind}">
                <time class="c-event-time" datetime="${event.time}">${event.time}</time>
                <div class="c-event-detail">
                  <div class="c-event-zone">${zoneNames.get(event.zone)}</div>
                  <p class="c-event-text">${event.text}</p>
                </div>
              </li>`).join('')}
          </ol>` : '<p class="c-empty">Событий пока нет.</p>'}
      </section>
    </div>`;
}
