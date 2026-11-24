---
version: 1
slug: "mobile-concepts-wayfinding-html"
primary_target: "mobile-concepts/wayfinding.html"
related_targets: []
---

# Surface Brief: mobile-concepts/wayfinding.html

## Context
- **Mode:** Operate
- **Scope:** Multi-site mobile monitoring (`2–5` greenhouse sites, `2–4` zones each, strictly read-only).

## Direction contract
- **THESIS:** Мониторинг нескольких тепличных объектов как система аэропортовой навигации (Schiphol Yellow): сигнальный желтый ведет взгляд прямо к проблемному объекту, а каждая площадка и зона читаются с первого взгляда за счет черных квадратов с пиктограммами, 1px границ и монументальных табличных цифр времени.
- **OWN-WORLD:** Палитра `wayfinding-cartography-signage-terminal-yellow-wayfinding`: сигнальный желтый `#FFCC00` (только для полосы приоритетных сбоев и активного пункта нижней панели), знак-черный `#0B0B0B` для верхней шапки, квадратов пиктограмм и нижней панели, чистый светло-серый лист `#F2F4F7` и белые карточки `#FFFFFF` с четкими границами; кобальт `#1D4ED8` для подтвержденного полива и терракота `#B83216` + штриховка для обрыва/неизвестности.
- **STORY:** Владелец/сервис открывает телефон на ходу, за 3 секунды видит по желтой полосе, какой объект требует внимания, проваливается в конкретную площадку, проверяет 4 независимых статуса зон (`связь`, `свежесть`, `FS1`, `полив`) и при необходимости смотрит общий 60-минутный график поливов.
- **FIRST VIEWPORT:** На `390x844` темная шапка (`Greenhouse` + `14:32`), желтая полоса маршрута к сбоям (`2 объекта требуют внимания`), карточки 4 объектов с черным квадратом пиктограммы и сводкой зон, и темная нижняя панель навигации (`Площадки`, `Тревоги`, `График`) с желтой активной вкладкой.
- **FORM:** `wayfinding-cartography-signage-terminal-yellow-wayfinding` (challenger, выбран пользователем), `seed:3fbd067d9cbfc748`.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
