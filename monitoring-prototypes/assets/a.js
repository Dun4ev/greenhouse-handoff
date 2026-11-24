function packetTime(zone) {
  return `<time datetime="${zone.lastSeen}">${zone.lastSeen}</time>`;
}

function renderOverview(zones) {
  const staleZone = zones.find((zone) => zone.stale);

  if (staleZone) {
    return `
      <section class="a-overview a-overview--stale" aria-labelledby="a-overview-title">
        <h2 id="a-overview-title">Нет связи с зоной ${staleZone.id}</h2>
        <p class="a-overview__packet">Последний пакет ${packetTime(staleZone)} · ${staleZone.ageLabel}</p>
      </section>
    `;
  }

  return `
    <section class="a-overview" aria-labelledby="a-overview-title">
      <h2 id="a-overview-title">Обе зоны на связи</h2>
    </section>
  `;
}

function renderZone(zone) {
  const watering = !zone.stale && zone.status === 'watering';
  const stateClass = zone.stale ? 'a-zone--stale' : watering ? 'a-zone--watering' : '';
  const status = zone.stale ? 'Полив неизвестен' : zone.statusLabel;
  const flow = zone.stale ? 'Поток неизвестен' : zone.flow;
  const reading = watering
    ? `<div class="a-zone__reading">
        <strong class="a-zone__elapsed">${zone.elapsed}</strong>
        <div class="a-zone__detail">
          <p>Участок ${zone.activeOutlet} из ${zone.outlets}</p>
          <p>${flow}</p>
        </div>
      </div>`
    : `<p class="a-zone__flow">${flow}</p>`;

  return `
    <li class="a-zone ${stateClass}">
      <div class="a-zone__heading">
        <h3>${zone.name}</h3>
        <span class="a-zone__status">${status}</span>
      </div>
      ${reading}
      <p class="a-zone__packet">Пакет ${packetTime(zone)} · ${zone.ageLabel}</p>
    </li>
  `;
}

export function render(scenario) {
  const { zones } = scenario;
  return `
    <div class="a-monitor">
      ${renderOverview(zones)}
      <section aria-labelledby="a-zones-title">
        <h2 id="a-zones-title" class="a-monitor__heading">Состояние зон</h2>
        <ul class="a-monitor__zones">
          ${zones.map(renderZone).join('')}
        </ul>
      </section>
    </div>
  `;
}
