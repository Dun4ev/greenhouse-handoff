import { scenarios } from './data.js';

const variant = document.body.dataset.variant;
const titles = { a: 'Сначала внимание', b: 'Две зоны рядом по смыслу', c: 'Сводка и события' };
const { render } = await import(`./${variant}.js`);
let scenarioId = new URLSearchParams(location.search).get('scenario') === 'normal' ? 'normal' : 'incident';
const root = document.querySelector('#root');
root.innerHTML = `
  <div class="app-shell">
    <div class="prototype-bar">
      <span class="prototype-label">Прототип ${variant.toUpperCase()} · сравнение</span>
      <nav class="variant-nav" aria-label="Вариант главного экрана">
        ${['a','b','c'].map(v=>`<a href="${v}.html?scenario=${scenarioId}" ${v===variant?'aria-current="page"':''} aria-label="Вариант ${v.toUpperCase()}">${v.toUpperCase()}</a>`).join('')}
      </nav>
    </div>
    <header class="masthead">
      <div><p class="brand-kicker">Greenhouse / мониторинг</p><h1>Две зоны.<br>Один взгляд.</h1></div>
      <div class="demo-clock"><strong>14:32</strong><span>Время примера</span></div>
    </header>
    <fieldset class="scenario-panel"><legend>Посмотреть ситуацию</legend><div class="scenario-buttons">
      <button type="button" data-scenario="normal">Обе в норме</button>
      <button type="button" data-scenario="incident">Полив + нет связи</button>
    </div></fieldset>
    <main id="monitoring" aria-label="${titles[variant]}"></main>
    <p class="sr-only" id="announcement" aria-live="polite"></p>
    <footer class="demo-footer"><strong>Демо · оборудование не подключено.</strong><br>Данные и события вымышлены. Время зафиксировано для сравнения вариантов. FS1 показывает наличие потока, не расход.</footer>
  </div>`;

function update() {
  document.querySelector('#monitoring').innerHTML = render(scenarios[scenarioId]);
  document.querySelectorAll('[data-scenario]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scenario===scenarioId)));
  document.querySelectorAll('.variant-nav a').forEach(link=>{
    const url = new URL(link.href);url.searchParams.set('scenario',scenarioId);link.href=url.href;
  });
}
root.addEventListener('click',event=>{
  const button=event.target.closest('[data-scenario]');
  if(!button)return;
  scenarioId=button.dataset.scenario;
  const url=new URL(location.href);url.searchParams.set('scenario',scenarioId);history.replaceState(null,'',url);
  update();
  document.querySelector('#announcement').textContent=scenarioId==='normal'?'Обе зоны в норме. Свежие данные.':'Зона 1: идет полив. Зона 2: нет связи, последнее обновление 22 минуты назад.';
});
update();
