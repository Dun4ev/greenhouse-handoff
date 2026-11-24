// Двуязычная локализация интерфейса: сербский (латиница, по умолчанию) и русский.
// Переводит все строки UI и текстовые поля снимка телеметрии, не нарушая контракт адаптеров.

export const LANG_STORAGE_KEY = 'greenhouse_hybrid_lang';
export const VALID_LANGS = new Set(['sr', 'ru']);

export function loadSavedLang() {
  try {
    const val = window.localStorage.getItem(LANG_STORAGE_KEY);
    return VALID_LANGS.has(val) ? val : 'sr';
  } catch {
    return 'sr';
  }
}

export function saveLang(lang) {
  const safe = VALID_LANGS.has(lang) ? lang : 'sr';
  try {
    window.localStorage.setItem(LANG_STORAGE_KEY, safe);
  } catch {
    // localStorage недоступен в приватном режиме
  }
  return safe;
}

const DICT = {
  sr: {
    pageTitle: 'Greenhouse · Nadzor zalivanja',
    srHeading: 'Greenhouse — nadzor zalivanja',
    skipToApp: 'Pređi na ekran aplikacije',
    liveOn: 'Live',
    liveOff: 'Pauza',
    livePauseTitle: 'Pauziraj simulaciju',
    liveResumeTitle: 'Nastavi simulaciju',
    statusWatering: (n) => `Zalivanje ${n}`,
    statusIdle: 'Mirovanje',
    statusOffline: (n) => `Nema veze ${n}`,
    statusStale: (n) => `Zastarelo ${n}`,
    statusOnline: (on, total) => `Onlajn ${on}/${total}`,
    zonesAria: 'Zone plastenika',
    badgeOffline: 'Nema veze',
    badgeStale: 'Zastarelo',
    badgeWater: 'Zalivanje',
    badgeIdle: 'Mirovanje',
    primaryWaterFallback: 'U toku',
    primaryIdle: 'Čekanje',
    secFlowPresent: (a, t) => `FS1: Ima protoka · ${a}/${t}`,
    secOffline: 'FS1: Nepoznato · Prekid',
    secStale: 'Veza postoji · FS1 nep.',
    secFlowAbsent: (age) => `FS1: Nema protoka · ${age}`,
    allOutletsTitle: 'Sva mesta zalivanja',
    allOutletsSub: (total, active, unknown) =>
      `Ukupno tačaka: ${total} · aktivnih: ${active}${unknown > 0 ? ` · zona bez telemetrije: ${unknown}` : ''}`,
    outletsZoneAria: (name) => `Mesta zalivanja ${name}`,
    outletUnknown: 'Nepoz.',
    outletWater: 'Zalivanje',
    outletClosed: 'Zatvoren',
    flowPrefix: (label) => `FS1: ${label}`,
    flowUnknownPrefix: (conn) => `${conn} · FS1: Nepoznato`,
    pulseTitle: 'Grafik zalivanja · 60 min',
    pulseCloseAria: 'Sakrij grafik zalivanja',
    legendWater: 'Zalivanje',
    legendIdle: 'Pauza',
    legendGap: 'Nema podataka',
    legendHint: 'Prevuci po skali za vreme',
    slotWater: 'Zalivanje (FS1)',
    slotGap: 'Nema podataka',
    slotIdle: 'Pauza',
    inspectorAria: (name) => `Detalji ${name}`,
    inspectorTitle: (name) => `${name} · pasoš pouzdanosti`,
    allZonesBtn: 'Sve zone',
    cellConn: 'Kanal veze',
    cellFresh: 'Svežina paketa',
    cellFlow: 'Protok FS1',
    cellFlowSub: 'Samo prisustvo',
    cellWater: 'Zalivanje',
    waterUnconfirmed: 'Nije potvrđeno',
    outletsClosed: (n) => `${n} izl. zatvoreno`,
    valvesAria: (name) => `Izlazi ${name}`,
    valveWater: 'Zaliv.',
    dedupText: (ooo, dup, pid, time) =>
      `Redosled paketa: zakasneli (${ooo}) upisan 1 put, duplikati odbačeni (${dup}). Zadržan paket ${pid} (${time}).`,
    recoveryOffline: 'Šta proveriti: napajanje ormana ŠA-U i nivo LTE signala.',
    recoveryStale: 'Šta proveriti: kanal veze radi, proveriti slanje telemetrije na Raspberry Pi / OVEN.',
    hwNote: 'FS1 detektuje samo prisustvo protoka, ne i protok u l/min. pH/EC (HM-100) i nivo E4 proveravaju se lokalno.',
    callBtn: (label) => `Pozovi · ${label}`,
    callSetupBtn: 'Unesi telefon dežurnog',
    topCallAria: (label) => `Pozovi: ${label}`,
    topCallSetupAria: 'Unesi telefon za poziv',
    topCallSetupTitle: 'Telefon za poziv',
    settingsAria: 'Podešavanja jezika, teme i telefona',
    settingsTitle: 'Podešavanja',
    settingsCloseAria: 'Zatvori podešavanja',
    langGroupLabel: 'Jezik interfejsa',
    themeGroupLabel: 'Tema prikaza',
    themeSystem: 'Sistem',
    themeLight: 'Svetla',
    themeDark: 'Tamna',
    phoneGroupLabel: 'Telefon za hitan poziv',
    phoneLabelField: 'Naziv (koga zovemo)',
    phoneLabelPlaceholder: 'Dežurni na objektu',
    phoneNumberField: 'Broj telefona',
    phoneError: 'Unesite ispravan broj (najmanje 3 cifre).',
    btnSave: 'Sačuvaj',
    btnClear: 'Obriši',
    settingsNote: 'Čuva se lokalno u pregledaču. Dugme za poziv pokreće telefonski poziv (tel:).',
    demoSummary: 'Demo scenario i broj zona',
    motionPause: 'Pauza animacija',
    motionResume: 'Uključi animacije',
    tabsAria: 'Filter zona i događaja',
    tabAll: 'Sve',
    tabAlerts: 'Alarmi',
    feedTitle: 'Tok smene',
    feedCount: (n) => `${n} zap.`,
    gotoZone: 'Na zonu →',
    feedEmpty: 'Za ovaj filter još nema događaja.',
    sheetExpand: 'Podigni panel',
    sheetCollapse: 'Spusti do kartica zona',
    dockAria: 'Donji panel sekcija',
    dockOverview: 'Pregled',
    dockOutlets: 'Tačke',
    dockAlerts: 'Alarmi',
    dockChart: 'Grafik',
    siteLabels: {
      'srb-pilot-1': '2 zone (pilot)',
      'srb-scale-4': '4 zone (provera skale)'
    },
    scenarioShort: {
      normal: 'Normalno',
      incident: 'Zalivanje + prekid',
      'stale-online': 'Veza / stari paket'
    },
    annAllZones: 'Prikazane su sve zone',
    annZoneSelected: (name) => `Izabrana ${name}: otvoren pasoš pouzdanosti`,
    annJumpZone: (name) => `Prelaz na ${name}: otvoren pasoš pouzdanosti`,
    annEvents: 'Otvoreni alarmi i tok smene',
    annOutlets: 'Otvorena sva mesta zalivanja',
    annOverview: 'Otvoren pregled radara',
    annPulseOpen: 'Otvoren grafik zalivanja za 60 minuta',
    annPulseClose: 'Grafik zalivanja sakriven',
    annSheetUp: 'Donji panel je podignut',
    annSheetDown: 'Panel je spušten do kartica zona',
    annMotionPaused: 'Animacije su pauzirane',
    annMotionOn: 'Animacije su uključene',
    annSettingsOpen: 'Otvorena podešavanja',
    annSettingsClose: 'Podešavanja zatvorena',
    annLiveOn: 'Simulacija u realnom vremenu uključena',
    annLiveOff: 'Simulacija pauzirana',
    annPhoneSaved: 'Telefon za poziv je sačuvan',
    annPhoneCleared: 'Telefon za poziv je obrisan',
    annLangChanged: 'Jezik interfejsa: srpski'
  },
  ru: {
    pageTitle: 'Greenhouse · Мониторинг полива',
    srHeading: 'Greenhouse — мониторинг полива',
    skipToApp: 'Перейти к экрану приложения',
    liveOn: 'Live',
    liveOff: 'Пауза',
    livePauseTitle: 'Поставить симуляцию на паузу',
    liveResumeTitle: 'Возобновить симуляцию',
    statusWatering: (n) => `Полив ${n}`,
    statusIdle: 'Ожидание',
    statusOffline: (n) => `Нет связи ${n}`,
    statusStale: (n) => `Устарел ${n}`,
    statusOnline: (on, total) => `Онлайн ${on}/${total}`,
    zonesAria: 'Зоны теплицы',
    badgeOffline: 'Нет связи',
    badgeStale: 'Устарел',
    badgeWater: 'Полив',
    badgeIdle: 'Простой',
    primaryWaterFallback: 'Идет',
    primaryIdle: 'Ожидание',
    secFlowPresent: (a, t) => `FS1: Есть поток · ${a}/${t}`,
    secOffline: 'FS1: Неизвестно · Обрыв',
    secStale: 'Связь есть · FS1 неизв.',
    secFlowAbsent: (age) => `FS1: Нет потока · ${age}`,
    allOutletsTitle: 'Все точки полива',
    allOutletsSub: (total, active, unknown) =>
      `Всего точек: ${total} · активных: ${active}${unknown > 0 ? ` · без телеметрии зон: ${unknown}` : ''}`,
    outletsZoneAria: (name) => `Точки полива ${name}`,
    outletUnknown: 'Неизв.',
    outletWater: 'Полив',
    outletClosed: 'Закрыт',
    flowPrefix: (label) => `FS1: ${label}`,
    flowUnknownPrefix: (conn) => `${conn} · FS1: Неизвестно`,
    pulseTitle: 'График полива · 60 мин',
    pulseCloseAria: 'Скрыть график полива',
    legendWater: 'Полив',
    legendIdle: 'Пауза',
    legendGap: 'Нет данных',
    legendHint: 'Ведите по шкале для времени',
    slotWater: 'Полив (FS1)',
    slotGap: 'Нет данных',
    slotIdle: 'Пауза',
    inspectorAria: (name) => `Детали ${name}`,
    inspectorTitle: (name) => `${name} · паспорт достоверности`,
    allZonesBtn: 'Все зоны',
    cellConn: 'Канал связи',
    cellFresh: 'Свежесть пакета',
    cellFlow: 'Поток FS1',
    cellFlowSub: 'Только наличие',
    cellWater: 'Полив',
    waterUnconfirmed: 'Не подтвержден',
    outletsClosed: (n) => `${n} вых. закрыты`,
    valvesAria: (name) => `Выходы ${name}`,
    valveWater: 'Полив',
    dedupText: (ooo, dup, pid, time) =>
      `Порядок пакетов: запоздалый (${ooo}) записан 1 раз, повторов отброшено (${dup}). Удержан пакет ${pid} (${time}).`,
    recoveryOffline: 'Что проверить: питание шкафа ША-У и уровень сигнала LTE.',
    recoveryStale: 'Что проверить: канал связи жив, проверить отправку телеметрии на Raspberry Pi / ОВЕН.',
    hwNote: 'FS1 фиксирует только наличие потока, не расход. pH/EC (HM-100) и уровень Е4 проверяются локально.',
    callBtn: (label) => `Позвонить · ${label}`,
    callSetupBtn: 'Указать телефон вызова',
    topCallAria: (label) => `Позвонить: ${label}`,
    topCallSetupAria: 'Указать телефон для вызова',
    topCallSetupTitle: 'Телефон вызова',
    settingsAria: 'Настройки языка, темы и телефона',
    settingsTitle: 'Настройки',
    settingsCloseAria: 'Закрыть настройки',
    langGroupLabel: 'Язык интерфейса',
    themeGroupLabel: 'Тема оформления',
    themeSystem: 'Система',
    themeLight: 'Светлая',
    themeDark: 'Темная',
    phoneGroupLabel: 'Телефон для экстренного вызова',
    phoneLabelField: 'Подпись (кому звоним)',
    phoneLabelPlaceholder: 'Дежурный на объекте',
    phoneNumberField: 'Номер телефона',
    phoneError: 'Введите корректный номер (минимум 3 цифры).',
    btnSave: 'Сохранить',
    btnClear: 'Очистить',
    settingsNote: 'Сохраняется локально в браузере. Кнопка вызова открывает звонок с телефона (tel:).',
    demoSummary: 'Сценарий демо и масштаб зон',
    motionPause: 'Пауза анимаций',
    motionResume: 'Включить анимации',
    tabsAria: 'Фильтр зон и событий',
    tabAll: 'Все',
    tabAlerts: 'Тревоги',
    feedTitle: 'Лента смены',
    feedCount: (n) => `${n} запис.`,
    gotoZone: 'К зоне →',
    feedEmpty: 'По этому фильтру событий пока нет.',
    sheetExpand: 'Поднять панель',
    sheetCollapse: 'Опустить к карточкам зон',
    dockAria: 'Нижняя панель разделов',
    dockOverview: 'Обзор',
    dockOutlets: 'Точки',
    dockAlerts: 'Тревоги',
    dockChart: 'График',
    siteLabels: {
      'srb-pilot-1': '2 зоны (пилот)',
      'srb-scale-4': '4 зоны (проверка масштаба)'
    },
    scenarioShort: {
      normal: 'Норма',
      incident: 'Полив + обрыв',
      'stale-online': 'Связь / старый пакет'
    },
    annAllZones: 'Показаны все зоны',
    annZoneSelected: (name) => `Выбрана ${name}: открыт паспорт достоверности`,
    annJumpZone: (name) => `Переход в ${name}: открыт паспорт достоверности`,
    annEvents: 'Открыты тревоги и события смены',
    annOutlets: 'Открыты все точки полива',
    annOverview: 'Открыт обзор радара',
    annPulseOpen: 'Открыт график полива за 60 минут',
    annPulseClose: 'График полива скрыт',
    annSheetUp: 'Нижняя панель поднята',
    annSheetDown: 'Панель опущена к карточкам зон',
    annMotionPaused: 'Анимации поставлены на паузу',
    annMotionOn: 'Анимации включены',
    annSettingsOpen: 'Открыты настройки',
    annSettingsClose: 'Настройки закрыты',
    annLiveOn: 'Симуляция в реальном времени включена',
    annLiveOff: 'Симуляция поставлена на паузу',
    annPhoneSaved: 'Телефон для вызова сохранен',
    annPhoneCleared: 'Телефон для вызова удален',
    annLangChanged: 'Язык интерфейса: русский'
  }
};

export function getDict(lang) {
  return DICT[lang === 'ru' ? 'ru' : 'sr'];
}

function srText(str) {
  if (!str) return str;
  let out = String(str);

  const replacements = [
    // 1. Полные фразы и длинные шаблоны (до токенных замен!)
    [/Масштаб · 4 зоны \(демо\)/g, 'Plastenik · 4 zone'],
    [/Теплица · Пилот \(2 зоны\)/g, 'Plastenik · Pilot (2 zone)'],
    [/Теплица · Пилот \(Сербия\)/g, 'Plastenik · Pilot (Srbija)'],
    [/Участок Б · Резерв \(2 зоны\)/g, 'Parcela B · Rezerva (2 zone)'],
    [/Последнее известное состояние скрыто, показано «Неизвестно»/g, 'Poslednje poznato stanje je sakriveno, prikazano „Nepoznato“'],
    [/Последнее известное состояние скрыто/g, 'Poslednje poznato stanje je sakriveno'],
    [/Поток FS1 и полив удерживаются в статусе «Неизвестно»/g, 'Protok FS1 i zalivanje ostaju u statusu „Nepoznato“'],
    [/Нет пакетов от ША-У (\d+) (?:минуты|минуту|минут)/g, 'Nema paketa od ŠA-U $1 min'],
    [/Нет новых пакетов телеметрии (\d+) мин при живом канале связи/g, 'Nema novih paketa telemetrije $1 min uz aktivnu vezu'],
    [/Новые данные не поступают, канал связи потерян/g, 'Novi podaci ne stižu, veza je izgubljena'],
    [/Получен последний пакет данных до потери связи/g, 'Primljen poslednji paket pre prekida veze'],
    [/Связь восстановлена \(heartbeat\), телеметрия остается устаревшей/g, 'Veza uspostavljena (heartbeat), telemetrija je i dalje zastarela'],
    [/Сигнал связи получен, телеметрия не обновлялась/g, 'Signal veze primljen, telemetrija nije ažurirana'],
    [/Запоздалый пакет ([A-Z0-9-]+) \(([\d:]+), без потока\) записан 1 раз/g, 'Zakasneli paket $1 ($2, bez protoka) upisan 1 put'],
    [/Запоздалый пакет ([A-Z0-9-]+) учтен в истории/g, 'Zakasneli paket $1 upisan u istoriju'],
    [/Пакет ([A-Z0-9-]+): идет полив К(\d+), FS1 подтверждает поток/g, 'Paket $1: zalivanje K$2 u toku, FS1 potvrđuje protok'],
    [/Пакет ([A-Z0-9-]+): идет полив K(\d+), FS1 подтверждает поток/g, 'Paket $1: zalivanje K$2 u toku, FS1 potvrđuje protok'],
    [/Канал ША-У стабилен/g, 'Kanal ŠA-U stabilan'],
    [/Шкаф ША-У не отвечает по каналу/g, 'Orman ŠA-U ne odgovara'],
    [/Простой · ожидание следующего цикла/g, 'Mirovanje · čekanje sledećeg ciklusa'],
    [/За последний час не поливалась/g, 'Bez zalivanja u poslednjih sat vremena'],
    [/Не поливалась за последний час/g, 'Bez zalivanja u poslednjih sat vremena'],
    [/За час полива не было/g, 'Bez zalivanja u poslednjem satu'],
    [/Полив ~(\d+) мин за час/g, 'Zalivanje ~$1 min u satu'],
    [/Разрыв связи · состояние скрыто/g, 'Prekid veze · stanje sakriveno'],
    [/Нет данных (\d+) мин · ранее без полива/g, 'Nema podataka $1 min · ranije bez zalivanja'],
    [/Нет данных (\d+) мин/g, 'Nema podataka $1 min'],
    [/Нет свежей телеметрии (\d+) мин \(канал жив\)/g, 'Nema sveže telemetrije $1 min (veza radi)'],
    [/Свежий полив К(\d+) с ([\d:]+) \(после паузы связи\)/g, 'Sveže zalivanje K$1 od $2 (posle prekida veze)'],
    [/Свежий полив K(\d+) с ([\d:]+) \(после паузы связи\)/g, 'Sveže zalivanje K$1 od $2 (posle prekida veze)'],
    [/Разрыв связи · сейчас/g, 'Prekid veze · sada'],
    [/Разрыв связи и телеметрии · (\d+) мин/g, 'Prekid veze i telemetrije · $1 min'],
    [/Разрыв телеметрии · (\d+) мин/g, 'Prekid telemetrije · $1 min'],
    [/Выход из простоя: начат полив К(\d+)/g, 'Izlazak iz mirovanja: počelo zalivanje K$1'],
    [/Переход полива на выход К(\d+)/g, 'Prelazak zalivanja na izlaz K$1'],
    [/Переход на участок (\d+) \(К(\d+)\)/g, 'Prelazak na sekciju $1 (K$2)'],
    [/Запущен полив участка (\d+) \(К(\d+)\)/g, 'Pokrenuto zalivanje sekcije $1 (K$2)'],
    [/Начат полив участка (\d+) \(К(\d+)\)/g, 'Počelo zalivanje sekcije $1 (K$2)'],
    [/Полив К(\d+) завершен, переход в простой/g, 'Zalivanje K$1 završeno, prelazak u mirovanje'],
    [/Полив К(\d+) завершен, режим простоя/g, 'Zalivanje K$1 završeno, režim mirovanja'],
    [/Полив К(\d+) завершен, простой/g, 'Zalivanje K$1 završeno, mirovanje'],
    [/Полив завершен, переход в простой \(ожидание\)/g, 'Zalivanje završeno, prelazak u mirovanje'],
    [/Полив завершен, переход в простой/g, 'Zalivanje završeno, prelazak u mirovanje'],
    [/Полив завершен, простой/g, 'Zalivanje završeno, mirovanje'],
    [/Полив завершен, реле FS1: нет потока/g, 'Zalivanje završeno, relej FS1: nema protoka'],
    [/Цикл завершен, зона в простое/g, 'Ciklus završen, zona u mirovanju'],
    [/Цикл завершен, простой/g, 'Ciklus završen, mirovanje'],
    [/Связь с ША-У восстановлена, простой/g, 'Veza sa ŠA-U uspostavljena, mirovanje'],
    [/Потеря связи с ША-У, данные переведены в «Неизвестно»/g, 'Prekid veze sa ŠA-U, status prebačen u „Nepoznato“'],
    [/Потеря связи \(статус скрыт\)/g, 'Prekid veze (status sakriven)'],
    [/Полив ([\d:–-]+) \(К(\d+)\)/g, 'Zalivanje $1 (K$2)'],
    [/ранее К(\d+)/g, 'ranije K$1'],
    [/FS1 подтвердил наличие потока/g, 'FS1 je potvrdio prisustvo protoka'],
    [/FS1 подтвердил поток/g, 'FS1 je potvrdio protok'],
    [/Реле FS1: нет потока/g, 'Relej FS1: nema protoka'],
    [/Превышен порог ожидания пакета/g, 'Prekoračeno vreme čekanja paketa'],
    [/Только канал связи/g, 'Samo kanal veze'],
    [/Принят в ([\d:]+), текущее состояние не изменено/g, 'Primljen u $1, trenutno stanje nije promenjeno'],
    [/Переход в простой/g, 'Prelazak u mirovanje'],

    // 2. Имена, единицы и базовые статусы
    [/Зона Б-(\d+)/g, 'Zona B-$1'],
    [/Зона (\d+)/g, 'Zona $1'],
    [/К(\d+)/g, 'K$1'],
    [/Н2 LEO/g, 'N2 LEO'],
    [/кВт/g, 'kW'],
    [/\(демо\)/g, '(demo)'],
    [/(\d+)\s*с назад/g, 'pre $1 s'],
    [/(\d+)\s*мин назад/g, 'pre $1 min'],
    [/(\d+)\s*мин/g, '$1 min'],
    [/Только что/g, 'Upravo sada'],
    [/На связи/g, 'Na vezi'],
    [/Онлайн/g, 'Onlajn'],
    [/Нет связи/g, 'Nema veze'],
    [/Нет данных/g, 'Nema podataka'],
    [/Актуальна/g, 'Aktuelna'],
    [/Свежий/g, 'Svež'],
    [/Устарела?/g, 'Zastarela'],
    [/Устарел(о|и)?/g, 'Zastarelo'],
    [/Есть поток/g, 'Ima protoka'],
    [/Нет потока/g, 'Nema protoka'],
    [/Неизвестно/g, 'Nepoznato'],
    [/Идет полив/gi, 'Zalivanje u toku'],
    [/Ожидание/g, 'Mirovanje'],
    [/Выход (K\d+)/g, 'Izlaz $1'],
    [/Выход (\d+)/g, 'Izlaz $1'],
    [/Пакет ([A-Z0-9-]+)/g, 'Paket $1'],
    [/Полив (K\d+)/g, 'Zalivanje $1']
  ];

  for (const [pattern, repl] of replacements) {
    out = out.replace(pattern, repl);
  }
  return out;
}

export function formatShortAge(ageLabel, lang) {
  if (lang === 'ru') return String(ageLabel || '').replace(/\s*назад$/, '');
  return srText(ageLabel).replace(/^pre\s+/, '');
}

export function localizeSnapshot(snapshot, lang) {
  if (!snapshot || lang === 'ru') return snapshot;
  return {
    ...snapshot,
    siteName: srText(snapshot.siteName),
    zones: snapshot.zones.map((z) => ({
      ...z,
      name: srText(z.name),
      pumpModel: srText(z.pumpModel),
      outletLabels: z.outletLabels.map((lbl) => srText(lbl)),
      connection: {
        ...z.connection,
        label: srText(z.connection.label),
        note: srText(z.connection.note)
      },
      telemetry: {
        ...z.telemetry,
        label: srText(z.telemetry.label),
        ageLabel: srText(z.telemetry.ageLabel)
      },
      flow: {
        ...z.flow,
        label: srText(z.flow.label)
      },
      watering: {
        ...z.watering,
        shortLabel: srText(z.watering.shortLabel),
        activeOutletLabel: z.watering.activeOutletLabel ? srText(z.watering.activeOutletLabel) : null,
        elapsedLabel: z.watering.elapsedLabel ? srText(z.watering.elapsedLabel) : null
      },
      pulseStrip: {
        ...z.pulseStrip,
        summary: srText(z.pulseStrip.summary)
      }
    })),
    events: snapshot.events.map((e) => ({
      ...e,
      text: srText(e.text),
      meta: e.meta ? srText(e.meta) : null,
      gapLabel: e.gapLabel ? srText(e.gapLabel) : null
    }))
  };
}

export function localizeLiveNotice(notice, lang) {
  if (!notice || lang === 'ru') return notice;
  return {
    ...notice,
    text: srText(notice.text)
  };
}
