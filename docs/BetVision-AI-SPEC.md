# BetVision AI — Technical Specification & Development Plan / Especificación Técnica y Plan de Desarrollo

> **Status:** Draft v1.0 — SPEC + DEVELOPMENT PLAN only (no production implementation code).
> **Estado:** Borrador v1.0 — solo SPEC + PLAN DE DESARROLLO (sin código de producción).

> **Responsible Gambling Notice / Aviso de Juego Responsable:** BetVision AI produces **probabilistic recommendations**, never guarantees. Betting carries financial risk. 18+ / 21+ depending on jurisdiction. / BetVision AI produce **recomendaciones probabilísticas**, nunca garantías. Apostar conlleva riesgo financiero. 18+ / 21+ según jurisdicción.

---

## Table of Contents / Índice

1. Executive Summary / Resumen Ejecutivo
2. Product Scope / Alcance del Producto
3. Functional Requirements / Requisitos Funcionales
4. Non-Functional Requirements / Requisitos No Funcionales
5. General Architecture / Arquitectura General
6. Nx Monorepo Architecture / Arquitectura del Monorepo Nx
7. NestJS Backend Architecture with Ports and Adapters / Arquitectura Backend NestJS con Ports and Adapters
8. Frontend Architecture / Arquitectura Frontend
9. Data Model / Modelo de Datos
10. System Modules / Módulos del Sistema
11. Full Match Analysis Flow / Flujo Completo de Análisis de Partido
12. AI System Design / Diseño del Sistema de IA
13. Prediction Engine Design / Diseño del Motor de Predicción
14. Value Betting System Design / Diseño del Sistema de Value Betting
15. Data Sources / Fuentes de Datos
16. REST Endpoints / Endpoints REST
17. Main DTOs / DTOs Principales
18. Background Jobs / Procesos en Segundo Plano
19. Security and Compliance / Seguridad y Cumplimiento
20. Testing Strategy / Estrategia de Testing
21. DevOps Strategy / Estrategia DevOps
22. Development Plan by Phases / Plan de Desarrollo por Fases
23. MVP Roadmap / Roadmap MVP
24. Advanced Version Roadmap / Roadmap Versión Avanzada
25. Technical Risks and Mitigation / Riesgos Técnicos y Mitigación
26. Final Recommendations / Recomendaciones Finales

---

## 1. Executive Summary / Resumen Ejecutivo

### English

**BetVision AI** is an AI-assisted football (soccer) analytics platform that converts raw and historical match data into **transparent, probabilistic betting recommendations**. A user enters a fixture (e.g., *"Real Madrid vs Barcelona"*); the system resolves the teams, competition, and date, ingests historical and live data from licensed providers, engineers football-specific features, runs **statistical and machine-learning models**, compares model probabilities against bookmaker odds to detect **value**, and finally uses a **Large Language Model (LLM)** only to *explain and synthesize* — never to invent the numbers.

The product's core differentiator is **methodological honesty**. Probabilities are produced by calibrated data models (Poisson, Elo, xG-based, gradient boosting) that are continuously **backtested** for ROI, hit-rate, and Closing Line Value (CLV). The LLM layer adds readable reasoning, risk framing, and source attribution. Every output ships with a **confidence level, risk level, suggested conservative stake, transparent reasoning, cited sources, and a responsible-gambling warning**. The platform **never promises guaranteed winnings** and, in v1, **never places bets** on behalf of users.

Technically, BetVision AI is an **Nx monorepo** with a **NestJS** backend built on **Hexagonal Architecture (Ports & Adapters)**, **PostgreSQL + Prisma**, **Redis + BullMQ** for caching and background jobs, and a **Next.js + TailwindCSS** frontend. Provider integrations are abstracted behind **outbound ports** so data sources can be swapped without touching the domain. The design favors REST for v1 while keeping the contracts GraphQL-ready.

The business goal is to become the most **trustworthy** football betting-analytics assistant: defensible math, explainable AI, strict compliance, and a UX that constantly reminds users that betting is risk, not income.

### Español

**BetVision AI** es una plataforma de analítica de fútbol asistida por IA que transforma datos brutos e históricos de partidos en **recomendaciones de apuestas probabilísticas y transparentes**. El usuario introduce un partido (ej., *"Real Madrid vs Barcelona"*); el sistema resuelve equipos, competición y fecha, ingiere datos históricos y en vivo desde proveedores con licencia, construye *features* específicos de fútbol, ejecuta **modelos estadísticos y de machine learning**, compara las probabilidades del modelo contra las cuotas de las casas para detectar **valor**, y finalmente usa un **Modelo de Lenguaje Grande (LLM)** solo para *explicar y sintetizar* — nunca para inventar los números.

El diferenciador central del producto es la **honestidad metodológica**. Las probabilidades provienen de modelos de datos calibrados (Poisson, Elo, basados en xG, gradient boosting) sometidos continuamente a **backtesting** de ROI, tasa de acierto y Closing Line Value (CLV). La capa LLM añade razonamiento legible, encuadre de riesgo y atribución de fuentes. Cada salida incluye **nivel de confianza, nivel de riesgo, stake conservador sugerido, razonamiento transparente, fuentes citadas y un aviso de juego responsable**. La plataforma **nunca promete ganancias garantizadas** y, en la v1, **nunca realiza apuestas** por el usuario.

Técnicamente, BetVision AI es un **monorepo Nx** con backend **NestJS** sobre **Arquitectura Hexagonal (Ports & Adapters)**, **PostgreSQL + Prisma**, **Redis + BullMQ** para caché y trabajos en segundo plano, y un frontend **Next.js + TailwindCSS**. Las integraciones con proveedores se abstraen tras **puertos de salida**, de modo que las fuentes de datos se intercambian sin tocar el dominio. El diseño prioriza REST en la v1 manteniendo los contratos listos para GraphQL.

El objetivo de negocio es convertirse en el asistente de analítica de apuestas de fútbol más **confiable**: matemática defendible, IA explicable, cumplimiento estricto y una UX que recuerde constantemente que apostar es riesgo, no ingreso.

---

## 2. Product Scope / Alcance del Producto

### English

**In scope (v1):**
- Natural-language fixture search and resolution (team/competition/date disambiguation).
- Ingestion and normalization of historical results, team/player stats, lineups, injuries, suspensions, referees, corners, cards, xG, odds, and weather from **licensed/legal** providers.
- Football feature engineering pipeline (form, rolling averages, home/away splits, head-to-head, strength-of-schedule).
- Statistical + ML prediction engine for: **1X2, Double Chance, Draw No Bet, Over/Under goals, BTTS, total/team corners, total/team cards, Asian Handicap, HT/FT, anytime goalscorer, correct score (flagged high-risk)**.
- Odds comparison, implied-vs-model probability, **value/edge detection**, **expected value**, **conservative staking** suggestion, confidence and risk scoring.
- LLM-generated, source-cited natural-language analysis report.
- User accounts, watchlist/favorites, prediction history, subscriptions.
- Admin panel: data-source health, model versions, audit logs, user/role management.
- Responsible-gambling framework and legal disclaimers throughout.

**Out of scope (v1):**
- Placing or brokering real bets / wallet/payments to bookmakers.
- Live in-play second-by-second trading signals.
- Sports other than football (architecture stays extensible).
- Guarantees, "sure bets," or financial-advice positioning.
- Fragile/illegal scraping as a core dependency.

**Target users:** informed recreational bettors, data-curious fans, and analysts who want explainable, risk-framed insights — not a "tipster" black box.

### Español

**Dentro del alcance (v1):**
- Búsqueda y resolución de partidos en lenguaje natural (desambiguación de equipo/competición/fecha).
- Ingesta y normalización de resultados históricos, estadísticas de equipo/jugador, alineaciones, lesiones, sanciones, árbitros, córners, tarjetas, xG, cuotas y clima desde proveedores **legales/con licencia**.
- Pipeline de ingeniería de *features* de fútbol (forma, medias móviles, splits local/visitante, head-to-head, dificultad del calendario).
- Motor de predicción estadístico + ML para: **1X2, Doble Oportunidad, Empate No Apuesta, Más/Menos goles, Ambos Marcan, córners totales/por equipo, tarjetas totales/por equipo, Hándicap Asiático, Primera Parte/Final, goleador en cualquier momento, resultado exacto (marcado alto riesgo)**.
- Comparación de cuotas, probabilidad implícita vs. del modelo, **detección de valor/edge**, **valor esperado**, sugerencia de **stake conservador**, puntuación de confianza y riesgo.
- Informe de análisis en lenguaje natural generado por LLM con fuentes citadas.
- Cuentas de usuario, watchlist/favoritos, historial de predicciones, suscripciones.
- Panel de administración: salud de fuentes de datos, versiones de modelos, registros de auditoría, gestión de usuarios/roles.
- Marco de juego responsable y avisos legales en todo el producto.

**Fuera de alcance (v1):**
- Realizar o intermediar apuestas reales / monedero/pagos a casas de apuestas.
- Señales de trading en vivo segundo a segundo.
- Deportes distintos del fútbol (la arquitectura permanece extensible).
- Garantías, "apuestas seguras" o posicionamiento como asesoría financiera.
- Scraping frágil/ilegal como dependencia central.

**Usuarios objetivo:** apostadores recreativos informados, aficionados curiosos por los datos y analistas que quieren información explicable y enmarcada en riesgo — no una caja negra de "tipster".

---

## 3. Functional Requirements / Requisitos Funcionales

### English

**FR-1 Match resolution.** Given free-text input, resolve to a canonical `Match` (home, away, competition, season, kickoff, venue). Handle ambiguity with ranked candidates and a confirmation step.

**FR-2 Data ingestion.** On demand and on schedule, pull and store: results, team/player stats, lineups, injuries, suspensions, referee assignment & stats, corners, cards, xG, odds snapshots, and weather. Persist provenance (`DataSource`, fetched-at, raw payload hash).

**FR-3 Normalization.** Map heterogeneous provider payloads to canonical entities and units (e.g., consistent team IDs, per-90 normalization, UTC timestamps).

**FR-4 Feature engineering.** Compute form (weighted recent results), rolling averages (goals, xG, corners, cards), home/away splits, head-to-head, strength-of-schedule, rest days, and absence-impact features.

**FR-5 Prediction.** Produce calibrated probabilities per supported market with a model-version reference and input snapshot for reproducibility.

**FR-6 Value detection.** For each market/selection with available odds, compute implied probability, model probability, edge, expected value (EV), Kelly-derived **conservative** stake, confidence and risk levels.

**FR-7 Report generation.** Generate a structured, source-cited, bilingual-capable report: summary, recent form, key data points, risks, key variables, probabilistic predictions, recommended markets, best bet, alternatives, confidence, risk, reasoning, sources, responsible-gambling warning.

**FR-8 History & watchlist.** Persist every report; users browse, filter, and re-open past predictions; users add fixtures/teams to a watchlist.

**FR-9 Accounts & subscriptions.** Register/login, roles (user/analyst/admin), subscription tiers gating depth/volume of analysis.

**FR-10 Admin.** Manage data-source health, trigger syncs, view audit logs, manage users/roles, inspect model versions and backtest metrics.

**FR-11 Backtesting.** Replay historical fixtures through models to compute ROI, hit-rate, calibration (Brier/log-loss), and CLV; expose results to admins.

**FR-12 Compliance gating.** Enforce age confirmation, jurisdiction notice, and disclaimers; never output guarantees; never place bets.

### Español

**FR-1 Resolución de partido.** Dado texto libre, resolver a un `Match` canónico (local, visitante, competición, temporada, hora, sede). Gestionar ambigüedad con candidatos rankeados y paso de confirmación.

**FR-2 Ingesta de datos.** Bajo demanda y por agenda, obtener y almacenar: resultados, estadísticas de equipo/jugador, alineaciones, lesiones, sanciones, designación y estadísticas de árbitro, córners, tarjetas, xG, snapshots de cuotas y clima. Persistir procedencia (`DataSource`, fecha de obtención, hash del payload bruto).

**FR-3 Normalización.** Mapear payloads heterogéneos a entidades y unidades canónicas (IDs de equipo consistentes, normalización por 90', timestamps UTC).

**FR-4 Ingeniería de features.** Calcular forma (resultados recientes ponderados), medias móviles (goles, xG, córners, tarjetas), splits local/visitante, head-to-head, dificultad de calendario, días de descanso y features de impacto de ausencias.

**FR-5 Predicción.** Producir probabilidades calibradas por mercado soportado con referencia a versión del modelo y snapshot de inputs para reproducibilidad.

**FR-6 Detección de valor.** Para cada mercado/selección con cuotas disponibles, calcular probabilidad implícita, probabilidad del modelo, edge, valor esperado (EV), stake **conservador** derivado de Kelly, niveles de confianza y riesgo.

**FR-7 Generación de informe.** Generar un informe estructurado, con fuentes citadas y apto para bilingüe: resumen, forma reciente, datos clave, riesgos, variables clave, predicciones probabilísticas, mercados recomendados, mejor apuesta, alternativas, confianza, riesgo, razonamiento, fuentes, aviso de juego responsable.

**FR-8 Historial y watchlist.** Persistir cada informe; el usuario navega, filtra y reabre predicciones pasadas; el usuario añade partidos/equipos a una watchlist.

**FR-9 Cuentas y suscripciones.** Registro/login, roles (usuario/analista/admin), niveles de suscripción que regulan profundidad/volumen de análisis.

**FR-10 Admin.** Gestionar salud de fuentes de datos, disparar sincronizaciones, ver auditoría, gestionar usuarios/roles, inspeccionar versiones de modelos y métricas de backtest.

**FR-11 Backtesting.** Reproducir partidos históricos por los modelos para calcular ROI, tasa de acierto, calibración (Brier/log-loss) y CLV; exponer resultados a admins.

**FR-12 Gating de cumplimiento.** Forzar confirmación de edad, aviso de jurisdicción y disclaimers; nunca emitir garantías; nunca realizar apuestas.

---

## 4. Non-Functional Requirements / Requisitos No Funcionales

### English

- **Performance:** cached match report returned < 800 ms p95; cold full analysis (with provider fetch + model run) target < 12 s p95 via async job + progressive UI; feature computation cached per fixture/version.
- **Scalability:** stateless API behind a load balancer; workers scale horizontally per BullMQ queue; PostgreSQL read replicas for analytics; time-series-friendly indexing for stats and odds snapshots.
- **Reliability:** target 99.5% API availability; idempotent ingestion jobs; retries with exponential backoff and dead-letter queues; graceful degradation when a provider is down (serve last-known + staleness flag).
- **Consistency & reproducibility:** every prediction stores model version + input snapshot hash; reports are immutable once generated.
- **Security:** OWASP ASVS L2 target, JWT access + rotating refresh, RBAC, rate limiting, secrets in a vault, encrypted at rest and in transit.
- **Privacy/compliance:** GDPR-aligned data handling; data-subject export/delete; jurisdiction-aware gambling disclaimers; age gating.
- **Observability:** structured logs, metrics (RED/USE), distributed tracing, model-quality dashboards (calibration, ROI, CLV), alerting.
- **Maintainability:** hexagonal boundaries enforced by Nx tags + lint rules; >80% domain/application test coverage; contract tests on provider adapters.
- **Internationalization:** all user-facing copy i18n-ready (EN/ES at launch); locale-aware dates/odds formats.
- **Accessibility:** WCAG 2.1 AA for the web app.
- **Cost control:** provider-call budgeting + caching to cap external API spend; LLM token budgets per request tier.

### Español

- **Rendimiento:** informe de partido cacheado < 800 ms p95; análisis completo en frío (fetch a proveedor + ejecución de modelo) objetivo < 12 s p95 mediante job asíncrono + UI progresiva; cómputo de features cacheado por partido/versión.
- **Escalabilidad:** API sin estado tras balanceador; workers escalan horizontalmente por cola BullMQ; réplicas de lectura de PostgreSQL para analítica; indexado apto para series temporales en estadísticas y snapshots de cuotas.
- **Fiabilidad:** objetivo 99,5% de disponibilidad de API; jobs de ingesta idempotentes; reintentos con backoff exponencial y colas dead-letter; degradación elegante si un proveedor cae (servir último conocido + marca de obsolescencia).
- **Consistencia y reproducibilidad:** cada predicción guarda versión de modelo + hash del snapshot de inputs; los informes son inmutables una vez generados.
- **Seguridad:** objetivo OWASP ASVS L2, JWT de acceso + refresh rotatorio, RBAC, rate limiting, secretos en vault, cifrado en reposo y en tránsito.
- **Privacidad/cumplimiento:** manejo de datos alineado con GDPR; exportación/borrado del titular; disclaimers de juego según jurisdicción; gating por edad.
- **Observabilidad:** logs estructurados, métricas (RED/USE), trazas distribuidas, dashboards de calidad de modelo (calibración, ROI, CLV), alertas.
- **Mantenibilidad:** fronteras hexagonales impuestas por tags Nx + reglas de lint; >80% de cobertura en dominio/aplicación; tests de contrato en adaptadores de proveedor.
- **Internacionalización:** todo el texto de cara al usuario listo para i18n (EN/ES al lanzamiento); fechas/formatos de cuota según locale.
- **Accesibilidad:** WCAG 2.1 AA para la web.
- **Control de costes:** presupuesto de llamadas a proveedor + caché para limitar gasto en APIs externas; presupuestos de tokens LLM por nivel de petición.

---

## 5. General Architecture / Arquitectura General

### English

BetVision AI is a **modular, event-aware, layered system** with three runtime processes inside one Nx monorepo:

- **`apps/api` (NestJS):** inbound REST (OpenAPI-documented), authentication, RBAC, request validation, orchestrates use cases. Stateless.
- **`apps/worker` (NestJS standalone):** BullMQ consumers for ingestion, normalization, feature computation, model scoring, backtesting, report generation. CPU/IO-heavy work lives here.
- **`apps/web` (Next.js):** server-rendered + client UI, consumes REST contracts from `libs/contracts`.

**Shared infrastructure:**
- **PostgreSQL** — canonical store (entities, stats, odds snapshots, predictions, reports, audit).
- **Redis** — cache (resolved fixtures, computed features, hot reports) + BullMQ broker.
- **Object storage** (S3-compatible) — large raw provider payloads, backtest artifacts, model files.
- **Vector store** (pgvector or external) — RAG over curated source documents for the explanation layer.

**Cross-cutting:** config (`libs/config`), structured logging, tracing, metrics, error monitoring.

**Data-flow at a glance:**
```
User → web → api (use case) → enqueue job → worker
worker → providers (ports/adapters) → normalize → features → models → value → LLM explain → persist report
web ← api ← report (cached in Redis, stored in Postgres)
```

**Why this shape:** separating `api` from `worker` keeps request latency low and isolates heavy/spiky provider + ML work; hexagonal boundaries keep the **domain pure** and providers **swappable**; Nx enforces dependency direction so UI/infra concerns never leak into the domain.

**Architecture decision records (key choices):**
- **Hexagonal over layered-only MVC:** testability + provider swappability outweigh extra boilerplate.
- **REST-first, GraphQL-ready:** simpler v1, contracts in `libs/contracts` could be re-exposed via GraphQL later without domain changes.
- **Models in TypeScript service first, Python microservice optional later:** start with `simple-statistics`/custom TS for Poisson/Elo; add a Python `model-service` (FastAPI) behind a `PredictionModelPort` when gradient boosting/calibration needs the Python ML stack.

### Español

BetVision AI es un **sistema en capas, modular y consciente de eventos** con tres procesos en ejecución dentro de un monorepo Nx:

- **`apps/api` (NestJS):** REST de entrada (documentado con OpenAPI), autenticación, RBAC, validación de peticiones, orquesta casos de uso. Sin estado.
- **`apps/worker` (NestJS standalone):** consumidores BullMQ para ingesta, normalización, cómputo de features, scoring de modelos, backtesting y generación de informes. El trabajo intensivo de CPU/IO vive aquí.
- **`apps/web` (Next.js):** UI con render en servidor + cliente, consume contratos REST desde `libs/contracts`.

**Infraestructura compartida:**
- **PostgreSQL** — almacén canónico (entidades, estadísticas, snapshots de cuotas, predicciones, informes, auditoría).
- **Redis** — caché (partidos resueltos, features calculados, informes calientes) + broker BullMQ.
- **Almacenamiento de objetos** (compatible S3) — payloads brutos grandes, artefactos de backtest, archivos de modelos.
- **Vector store** (pgvector o externo) — RAG sobre documentos fuente curados para la capa de explicación.

**Transversal:** configuración (`libs/config`), logging estructurado, trazas, métricas, monitoreo de errores.

**Flujo de datos resumido:**
```
Usuario → web → api (caso de uso) → encola job → worker
worker → proveedores (ports/adapters) → normaliza → features → modelos → valor → explica LLM → persiste informe
web ← api ← informe (cacheado en Redis, almacenado en Postgres)
```

**Por qué esta forma:** separar `api` de `worker` mantiene baja la latencia y aísla el trabajo pesado/irregular de proveedores y ML; las fronteras hexagonales mantienen el **dominio puro** y los proveedores **intercambiables**; Nx impone la dirección de dependencias para que lo de UI/infra nunca se filtre al dominio.

**Registros de decisión (elecciones clave):**
- **Hexagonal sobre MVC en capas:** la testeabilidad y la intercambiabilidad de proveedores superan al boilerplate extra.
- **REST primero, listo para GraphQL:** v1 más simple; los contratos en `libs/contracts` podrían reexponerse vía GraphQL después sin cambiar el dominio.
- **Modelos primero en servicio TypeScript, microservicio Python opcional luego:** empezar con `simple-statistics`/TS propio para Poisson/Elo; añadir un `model-service` Python (FastAPI) tras un `PredictionModelPort` cuando gradient boosting/calibración requieran el stack ML de Python.

---

## 6. Nx Monorepo Architecture / Arquitectura del Monorepo Nx

### English

**Goal:** one repo, strict boundaries, shared contracts between FE/BE, zero domain coupling to UI or frameworks.

```
betvision-ai/
├─ apps/
│  ├─ api/                 # NestJS HTTP app (interface/adapters inbound)
│  ├─ worker/              # NestJS standalone (BullMQ consumers)
│  └─ web/                 # Next.js + Tailwind frontend
├─ libs/
│  ├─ domain/              # Entities, Value Objects, Domain Services, Ports (NO framework deps)
│  ├─ application/         # Use Cases, orchestration, DTOs (depends on domain only)
│  ├─ infrastructure/      # Adapters: Prisma repos, provider clients, Redis, BullMQ, LLM
│  ├─ contracts/           # API request/response schemas (zod/OpenAPI types) shared FE+BE
│  ├─ shared/              # Pure utils: Result type, errors, date/units, guard clauses
│  ├─ ui/                  # React component library (Tailwind, design system)
│  ├─ config/              # Env schema, typed config loader, feature flags
│  └─ testing/             # Test builders, fakes, fixtures, mock providers
├─ tools/                  # generators, scripts
├─ nx.json, tsconfig.base.json, package.json
```

**What each folder contains & why it exists:**

| Library | Contains | Reason |
|---|---|---|
| `domain` | Entities (`Match`, `Team`…), Value Objects (`Probability`, `Odds`, `Edge`, `Money`), Domain Services (Elo, Poisson math), **Ports** (in/out interfaces) | The heart; framework-free, unit-testable, stable. |
| `application` | Use cases (`GeneratePredictionReport`), input/output DTOs, transaction orchestration | Coordinates domain + ports; no IO details. |
| `infrastructure` | Prisma repositories, provider adapters, Redis cache, BullMQ producers/consumers, LLM client, mappers | Implements outbound ports; the only place with vendor SDKs. |
| `contracts` | Versioned REST DTO schemas (e.g., zod) + generated TS types + OpenAPI fragments | Single source of truth shared by `api` and `web` **without** exposing domain internals. |
| `shared` | `Result<T,E>`, error taxonomy, units, pure helpers | Reuse without coupling. |
| `ui` | Buttons, cards, charts, report widgets | Consistent design system, Storybook-able. |
| `config` | Typed env (`zod`-validated), flags | Fail-fast on misconfig. |
| `testing` | Object mothers, fake adapters, provider mocks | DRY tests across layers. |

**Dependency rules (allowed direction →):**
```
ui        → contracts, shared
web(app)  → ui, contracts, shared, config
api(app)  → application, infrastructure, contracts, shared, config
worker    → application, infrastructure, shared, config
application → domain, shared, contracts
infrastructure → domain, application, shared, config, contracts
domain    → shared            (ONLY)
contracts → shared            (ONLY)
```
**Forbidden:** `domain → infrastructure`, `domain → application`, anything `→ web/api/worker`, `ui → domain`.

**Enforcing boundaries with Nx tags** (`nx.json` / project `tags`), via `@nx/enforce-module-boundaries`:
```jsonc
// example tag scheme
"type:domain"     // can depend on: type:domain, type:shared
"type:application"// → type:domain, type:contracts, type:shared
"type:infra"      // → type:application, type:domain, type:contracts, type:shared, type:config
"type:contracts"  // → type:shared
"type:ui"         // → type:contracts, type:shared
"type:app"        // → any lib (apps are the composition root)
"scope:web" / "scope:api" / "scope:worker" // prevent web importing api-only infra
```
This makes "domain importing Prisma" a **lint error**, not a code-review hope.

**Sharing contracts without coupling domain to UI:** the FE never imports `domain`. It imports `contracts` (plain DTO types + zod validators). Adapters in `infrastructure` map `domain` ↔ `contracts`. The domain can evolve freely as long as the mapper upholds the contract; the contract is versioned (`/api/v1`).

### Español

**Objetivo:** un repo, fronteras estrictas, contratos compartidos FE/BE, cero acoplamiento del dominio a la UI o frameworks.

```
betvision-ai/
├─ apps/
│  ├─ api/                 # App HTTP NestJS (adaptadores de entrada)
│  ├─ worker/              # NestJS standalone (consumidores BullMQ)
│  └─ web/                 # Frontend Next.js + Tailwind
├─ libs/
│  ├─ domain/              # Entidades, Value Objects, Servicios de Dominio, Ports (SIN deps de framework)
│  ├─ application/         # Casos de uso, orquestación, DTOs (depende solo de domain)
│  ├─ infrastructure/      # Adaptadores: repos Prisma, clientes de proveedor, Redis, BullMQ, LLM
│  ├─ contracts/           # Esquemas request/response (zod/OpenAPI) compartidos FE+BE
│  ├─ shared/              # Utils puros: tipo Result, errores, fechas/unidades, guard clauses
│  ├─ ui/                  # Librería de componentes React (Tailwind, design system)
│  ├─ config/              # Esquema de env, loader tipado, feature flags
│  └─ testing/             # Builders de test, fakes, fixtures, proveedores mock
├─ tools/                  # generadores, scripts
├─ nx.json, tsconfig.base.json, package.json
```

**Qué contiene cada carpeta y por qué existe:**

| Librería | Contiene | Razón |
|---|---|---|
| `domain` | Entidades (`Match`, `Team`…), Value Objects (`Probability`, `Odds`, `Edge`, `Money`), Servicios de Dominio (matemática Elo, Poisson), **Ports** (interfaces in/out) | El corazón; sin framework, testeable, estable. |
| `application` | Casos de uso (`GeneratePredictionReport`), DTOs in/out, orquestación transaccional | Coordina dominio + ports; sin detalles de IO. |
| `infrastructure` | Repositorios Prisma, adaptadores de proveedor, caché Redis, productores/consumidores BullMQ, cliente LLM, mappers | Implementa puertos de salida; único lugar con SDKs de vendor. |
| `contracts` | Esquemas DTO REST versionados (ej. zod) + tipos TS generados + fragmentos OpenAPI | Única fuente de verdad compartida por `api` y `web` **sin** exponer el dominio. |
| `shared` | `Result<T,E>`, taxonomía de errores, unidades, helpers puros | Reuso sin acoplamiento. |
| `ui` | Botones, tarjetas, gráficos, widgets de informe | Design system consistente, apto para Storybook. |
| `config` | Env tipado (validado con `zod`), flags | Fallo rápido ante mala configuración. |
| `testing` | Object mothers, adaptadores fake, mocks de proveedor | Tests DRY entre capas. |

**Reglas de dependencia (dirección permitida →):**
```
ui        → contracts, shared
web(app)  → ui, contracts, shared, config
api(app)  → application, infrastructure, contracts, shared, config
worker    → application, infrastructure, shared, config
application → domain, shared, contracts
infrastructure → domain, application, shared, config, contracts
domain    → shared            (SOLO)
contracts → shared            (SOLO)
```
**Prohibido:** `domain → infrastructure`, `domain → application`, cualquier cosa `→ web/api/worker`, `ui → domain`.

**Imposición de fronteras con tags Nx** (`nx.json` / `tags` de proyecto), vía `@nx/enforce-module-boundaries`:
```jsonc
"type:domain"     // puede depender de: type:domain, type:shared
"type:application"// → type:domain, type:contracts, type:shared
"type:infra"      // → type:application, type:domain, type:contracts, type:shared, type:config
"type:contracts"  // → type:shared
"type:ui"         // → type:contracts, type:shared
"type:app"        // → cualquier lib (las apps son el composition root)
"scope:web" / "scope:api" / "scope:worker"
```
Esto convierte "el dominio importando Prisma" en un **error de lint**, no en una esperanza del code-review.

**Compartir contratos sin acoplar dominio a UI:** el FE nunca importa `domain`. Importa `contracts` (tipos DTO + validadores zod). Los adaptadores en `infrastructure` mapean `domain` ↔ `contracts`. El dominio evoluciona libremente mientras el mapper respete el contrato; el contrato está versionado (`/api/v1`).

---

## 7. NestJS Backend Architecture with Ports and Adapters / Arquitectura Backend NestJS con Ports and Adapters

### English

**The four layers:**

1. **Domain Layer** (`libs/domain`) — pure business model, no NestJS, no Prisma.
   - **Entities:** identity + lifecycle (`Match`, `Team`, `Player`, `Referee`, `Prediction`, `Recommendation`, `AnalysisReport`).
   - **Value Objects:** immutable, validated (`Probability(0..1)`, `Odds(>1)`, `ImpliedProbability`, `Edge`, `ExpectedValue`, `Stake`, `ConfidenceLevel`, `RiskLevel`, `Money`, `DateRange`).
   - **Domain Services:** stateless calculations spanning entities (`PoissonGoalModel`, `EloRatingService`, `ValueCalculator`, `KellyStakeService`).
   - **Ports (interfaces):**
     - *Inbound ports* (use-case interfaces) — e.g., `GeneratePredictionReportPort`.
     - *Outbound ports* — `MatchRepositoryPort`, `OddsRepositoryPort`, `SportsDataProviderPort`, `OddsProviderPort`, `RefereeStatsProviderPort`, `WeatherProviderPort`, `InjuryProviderPort`, `LineupProviderPort`, `LlmExplanationPort`, `CachePort`, `EventBusPort`, `ClockPort`, `IdGeneratorPort`.

2. **Application Layer** (`libs/application`) — **Use Cases** implement inbound ports, orchestrate domain services + outbound ports, manage transactions, emit domain events. No vendor SDKs. Example use cases: `ResolveFixtureUseCase`, `IngestMatchDataUseCase`, `ComputeFeaturesUseCase`, `RunPredictionUseCase`, `DetectValueBetsUseCase`, `GenerateReportUseCase`, `BacktestModelUseCase`.

3. **Infrastructure Layer** (`libs/infrastructure`) — **Adapters** implement outbound ports: Prisma repositories, HTTP provider clients, Redis cache, BullMQ producers/consumers, LLM client, mappers (`domain ↔ persistence`, `domain ↔ contracts`). The only place importing third-party SDKs.

4. **Interface/API Layer** (`apps/api`) — **Controllers** (REST), DTO validation (zod/class-validator), auth guards, RBAC, OpenAPI decorators, exception filters, response envelope. Controllers depend on **inbound ports**, never on adapters directly (DI wires concrete use cases).

**Dependency Injection & wiring.** NestJS modules act as the **composition root**. Ports are injected by token:
```ts
// libs/domain/ports/sports-data-provider.port.ts
export interface SportsDataProviderPort {
  getTeamForm(teamId: TeamId, last: number): Promise<TeamFormDto>;
  getHeadToHead(home: TeamId, away: TeamId): Promise<H2HDto>;
}
export const SPORTS_DATA_PROVIDER = Symbol('SPORTS_DATA_PROVIDER');

// apps/api/src/matches/matches.module.ts (composition root)
@Module({
  providers: [
    GenerateReportUseCase,
    { provide: SPORTS_DATA_PROVIDER, useClass: ApiFootballAdapter }, // swap here
    { provide: MATCH_REPOSITORY,   useClass: PrismaMatchRepository },
  ],
  controllers: [MatchesController],
})
export class MatchesModule {}
```
Swapping `ApiFootballAdapter` → `OptaAdapter` is a one-line change; the domain and use cases never know.

**Mappers & DTOs.** Three DTO families, never mixed:
- **Contract DTOs** (`libs/contracts`) — wire format (FE↔API).
- **Application DTOs** — use-case input/output.
- **Persistence models** — Prisma types.
Mappers live in `infrastructure`; the domain exchanges only entities/VOs.

**Background jobs & events.** Use cases emit domain events (`MatchDataIngested`, `FeaturesComputed`, `PredictionReady`) onto an `EventBusPort`. The infra adapter publishes to BullMQ; `apps/worker` consumers pick up the next stage. This yields an **event-driven pipeline** (ingest → normalize → features → predict → value → report) that is observable, retryable, and idempotent.

**Module template (per bounded context):**
```
libs/domain/<context>/{entities,value-objects,services,ports}
libs/application/<context>/{use-cases,dtos,events}
libs/infrastructure/<context>/{repositories,adapters,mappers,jobs}
apps/api/src/<context>/{controller,module,http-dtos}
```

### Español

**Las cuatro capas:**

1. **Capa de Dominio** (`libs/domain`) — modelo de negocio puro, sin NestJS, sin Prisma.
   - **Entidades:** identidad + ciclo de vida (`Match`, `Team`, `Player`, `Referee`, `Prediction`, `Recommendation`, `AnalysisReport`).
   - **Value Objects:** inmutables, validados (`Probability(0..1)`, `Odds(>1)`, `ImpliedProbability`, `Edge`, `ExpectedValue`, `Stake`, `ConfidenceLevel`, `RiskLevel`, `Money`, `DateRange`).
   - **Servicios de Dominio:** cálculos sin estado entre entidades (`PoissonGoalModel`, `EloRatingService`, `ValueCalculator`, `KellyStakeService`).
   - **Ports (interfaces):**
     - *Puertos de entrada* (interfaces de caso de uso) — ej., `GeneratePredictionReportPort`.
     - *Puertos de salida* — `MatchRepositoryPort`, `OddsRepositoryPort`, `SportsDataProviderPort`, `OddsProviderPort`, `RefereeStatsProviderPort`, `WeatherProviderPort`, `InjuryProviderPort`, `LineupProviderPort`, `LlmExplanationPort`, `CachePort`, `EventBusPort`, `ClockPort`, `IdGeneratorPort`.

2. **Capa de Aplicación** (`libs/application`) — los **Casos de Uso** implementan puertos de entrada, orquestan servicios de dominio + puertos de salida, gestionan transacciones, emiten eventos de dominio. Sin SDKs de vendor. Ejemplos: `ResolveFixtureUseCase`, `IngestMatchDataUseCase`, `ComputeFeaturesUseCase`, `RunPredictionUseCase`, `DetectValueBetsUseCase`, `GenerateReportUseCase`, `BacktestModelUseCase`.

3. **Capa de Infraestructura** (`libs/infrastructure`) — los **Adaptadores** implementan puertos de salida: repositorios Prisma, clientes HTTP de proveedor, caché Redis, productores/consumidores BullMQ, cliente LLM, mappers (`dominio ↔ persistencia`, `dominio ↔ contratos`). Único lugar que importa SDKs de terceros.

4. **Capa de Interfaz/API** (`apps/api`) — **Controladores** (REST), validación de DTO (zod/class-validator), guards de auth, RBAC, decoradores OpenAPI, filtros de excepción, envelope de respuesta. Los controladores dependen de **puertos de entrada**, nunca de adaptadores directamente (la DI conecta casos de uso concretos).

**Inyección de dependencias y cableado.** Los módulos NestJS son el **composition root**. Los puertos se inyectan por token (ver ejemplo arriba). Cambiar `ApiFootballAdapter` → `OptaAdapter` es una línea; el dominio y los casos de uso nunca se enteran.

**Mappers y DTOs.** Tres familias de DTO, nunca mezcladas:
- **DTOs de Contrato** (`libs/contracts`) — formato de transporte (FE↔API).
- **DTOs de Aplicación** — input/output de caso de uso.
- **Modelos de Persistencia** — tipos Prisma.
Los mappers viven en `infrastructure`; el dominio intercambia solo entidades/VOs.

**Jobs y eventos.** Los casos de uso emiten eventos de dominio (`MatchDataIngested`, `FeaturesComputed`, `PredictionReady`) hacia un `EventBusPort`. El adaptador de infra publica en BullMQ; los consumidores de `apps/worker` recogen la siguiente etapa. Esto produce un **pipeline orientado a eventos** (ingesta → normaliza → features → predice → valor → informe) observable, reintentable e idempotente.

**Plantilla de módulo (por contexto acotado):**
```
libs/domain/<contexto>/{entities,value-objects,services,ports}
libs/application/<contexto>/{use-cases,dtos,events}
libs/infrastructure/<contexto>/{repositories,adapters,mappers,jobs}
apps/api/src/<contexto>/{controller,module,http-dtos}
```

---

## 8. Frontend Architecture / Arquitectura Frontend

### English

**Stack:** Next.js (App Router) + TypeScript + TailwindCSS, inside `apps/web`; shared components in `libs/ui`; API access via typed clients generated from `libs/contracts`. State: **TanStack Query** for server state, lightweight client state with Zustand/Context, forms with React Hook Form + zod. i18n via `next-intl` (EN/ES). Charts via Recharts/Chart.js. Auth via httpOnly cookie holding short-lived access token + refresh rotation.

**Patterns:** server components for data-fetching shells; client components for interactivity; optimistic UI where safe; skeleton loaders for async analysis; error boundaries per route; suspense + streaming for the progressive report. Async report generation is surfaced via **polling or SSE** on a `jobId`.

**Screens:**

| Screen | Purpose | Main components | Data consumed | Loading | Error | UX notes |
|---|---|---|---|---|---|---|
| **Landing** | Explain product, compliance-forward CTA | Hero, value props, RG banner | static/CMS | n/a | n/a | Lead with "probabilistic, not guaranteed". |
| **Login** | Authenticate | Form, OAuth buttons | `POST /auth/login` | button spinner | inline field errors, lockout msg | Rate-limit feedback. |
| **Register** | Create account + age gate | Form, age confirm, T&C check | `POST /auth/register` | spinner | duplicate email, weak password | Age gating mandatory. |
| **Dashboard** | Overview, watchlist, recent reports | Stat cards, recent predictions list, upcoming fixtures | `GET /predictions?mine`, `GET /watchlist` | skeleton cards | retry banner | Personalized, RG reminder footer. |
| **Match Search** | Resolve a fixture | Search box, ranked candidates, filters | `GET /matches/search` | typeahead spinner | "no match found" + suggestions | Disambiguation chips (competition/date). |
| **Match Analysis** | Trigger & track analysis | Fixture header, "Analyze" CTA, progress steps | `POST /predictions`, job status | stepper/progress | partial-data warning | Show which providers responded. |
| **Prediction Report** | Full structured report | Summary, form charts, market table, best bet card, risk meter, sources, RG warning | `GET /reports/:id` | progressive sections | stale-data badge | Confidence + risk always visible. |
| **Recommendation Cards** | Compact bets | Edge/EV/stake/confidence/risk chips | embedded | shimmer | "no value found" empty state | Never hype; show downside. |
| **History** | Past predictions | Filterable table, outcome tags | `GET /predictions?mine` | table skeleton | empty state | Outcome shown only as result, not "win rate" hype. |
| **Watchlist/Favorites** | Track teams/fixtures | List, add/remove | `GET/POST/DELETE /watchlist` | skeleton | retry | Notifies on new analysis. |
| **Admin Panel** | Ops & governance | Data-source health, sync triggers, users/roles, model versions, audit | admin endpoints | tables/skeletons | permission errors | RBAC-guarded routes. |
| **Data Source Status** | Provider health | Status grid, latency, last sync, staleness | `GET /admin/data-sources` | skeleton | degraded badges | Transparent freshness. |
| **User Settings** | Profile, locale, limits | Forms, RG self-limits | `GET/PATCH /users/me` | spinner | validation | Self-exclusion controls. |
| **Responsible Gambling** | Help & limits | Resources, self-exclusion, helplines | static + `POST /users/me/self-limit` | n/a | n/a | Always reachable from footer. |

**Design system:** tokens (color/spacing/typography) in `libs/ui`; risk uses a deliberate, non-celebratory palette (no "green = guaranteed win"); confidence as calibrated bars, not hype gauges.

### Español

**Stack:** Next.js (App Router) + TypeScript + TailwindCSS, en `apps/web`; componentes compartidos en `libs/ui`; acceso a API vía clientes tipados generados desde `libs/contracts`. Estado: **TanStack Query** para estado de servidor, estado de cliente ligero con Zustand/Context, formularios con React Hook Form + zod. i18n con `next-intl` (EN/ES). Gráficos con Recharts/Chart.js. Auth con cookie httpOnly (access token corto + rotación de refresh).

**Patrones:** server components para fetching; client components para interactividad; UI optimista donde sea seguro; skeletons para análisis asíncrono; error boundaries por ruta; suspense + streaming para el informe progresivo. La generación asíncrona del informe se muestra vía **polling o SSE** sobre un `jobId`.

**Pantallas:**

| Pantalla | Propósito | Componentes | Datos | Carga | Error | UX |
|---|---|---|---|---|---|---|
| **Landing** | Explicar producto, CTA con cumplimiento | Hero, propuesta de valor, banner JR | estático/CMS | n/a | n/a | Encabezar con "probabilístico, no garantizado". |
| **Login** | Autenticar | Form, OAuth | `POST /auth/login` | spinner | errores en campo, bloqueo | Feedback de rate-limit. |
| **Registro** | Crear cuenta + verificación de edad | Form, confirmación de edad, T&C | `POST /auth/register` | spinner | email duplicado, password débil | Gating de edad obligatorio. |
| **Dashboard** | Resumen, watchlist, informes recientes | Tarjetas, lista de predicciones, próximos partidos | `GET /predictions?mine`, `GET /watchlist` | skeleton | banner reintento | Personalizado, recordatorio JR. |
| **Búsqueda de partido** | Resolver partido | Buscador, candidatos rankeados, filtros | `GET /matches/search` | spinner typeahead | "sin resultados" + sugerencias | Chips de desambiguación. |
| **Análisis de partido** | Disparar y seguir análisis | Cabecera, CTA "Analizar", pasos | `POST /predictions`, estado de job | stepper | aviso datos parciales | Mostrar proveedores que respondieron. |
| **Informe de predicción** | Informe completo | Resumen, gráficos de forma, tabla de mercados, tarjeta de mejor apuesta, medidor de riesgo, fuentes, aviso JR | `GET /reports/:id` | secciones progresivas | badge datos obsoletos | Confianza + riesgo siempre visibles. |
| **Tarjetas de recomendación** | Apuestas compactas | Chips edge/EV/stake/confianza/riesgo | embebido | shimmer | "sin valor" | Sin exageración; mostrar el riesgo. |
| **Historial** | Predicciones pasadas | Tabla filtrable, etiquetas de resultado | `GET /predictions?mine` | skeleton | estado vacío | Resultado como dato, no como "win rate". |
| **Watchlist/Favoritos** | Seguir equipos/partidos | Lista, añadir/quitar | `GET/POST/DELETE /watchlist` | skeleton | reintento | Notifica nuevos análisis. |
| **Panel Admin** | Operaciones y gobierno | Salud de fuentes, sincronizaciones, usuarios/roles, versiones de modelo, auditoría | endpoints admin | skeletons | errores de permiso | Rutas con RBAC. |
| **Estado de fuentes** | Salud de proveedores | Grid de estado, latencia, última sync, obsolescencia | `GET /admin/data-sources` | skeleton | badges degradado | Frescura transparente. |
| **Ajustes** | Perfil, locale, límites | Forms, autolímites JR | `GET/PATCH /users/me` | spinner | validación | Controles de autoexclusión. |
| **Juego Responsable** | Ayuda y límites | Recursos, autoexclusión, líneas de ayuda | estático + `POST /users/me/self-limit` | n/a | n/a | Siempre accesible desde el footer. |

**Design system:** tokens (color/espaciado/tipografía) en `libs/ui`; el riesgo usa una paleta deliberadamente no celebratoria (nada de "verde = victoria garantizada"); la confianza como barras calibradas, no medidores exagerados.

---

## 9. Data Model / Modelo de Datos

### English

Canonical entities (PostgreSQL via Prisma). Key fields, relationships, indexes, history needs, computed data, and scalability notes below.

- **User** — `id, email(unique), passwordHash, roleId, locale, status, ageConfirmedAt, createdAt`. Rel: Role (N:1), Subscription (1:1), Watchlist (1:N), Prediction (1:N as requester). Index: `email`, `roleId`. Privacy: PII; supports export/delete.
- **Role** — `id, name(unique: user|analyst|admin), permissions[]`. Rel: User (1:N). Small, cacheable.
- **Team** — `id, externalIds(jsonb), name, country, crestUrl, eloRating`. Rel: Match (home/away), TeamStats, Player. Index: `name` (trigram for search), `externalIds` GIN. `eloRating` computed/updated by jobs.
- **Player** — `id, externalIds, teamId, name, position, dob`. Rel: Team (N:1), PlayerStats, lineup links. Index: `teamId`, `name` trigram.
- **Competition** — `id, externalIds, name, country, type(league|cup|ucl|friendly), tier`. Rel: Season, Match. 
- **Season** — `id, competitionId, label(e.g. 2025/26), startDate, endDate`. Rel: Match. Index: `competitionId`.
- **Match** — `id, externalIds, competitionId, seasonId, homeTeamId, awayTeamId, kickoffUtc, venue, status, round, importance, weatherId?`. Rel: many. Index: `(kickoffUtc)`, `(homeTeamId,awayTeamId)`, `(seasonId)`, `externalIds` GIN. High-volume; partition by season/date for scale.
- **MatchStats** — `id, matchId(unique), homeGoals, awayGoals, homeXg, awayXg, corners(home/away), cards(home/away yellow/red), shots, shotsOnTarget, possession, fouls, …`. Historical fact table; append-only. Index: `matchId`.
- **TeamStats** — rolling/aggregated per team per scope `id, teamId, seasonId, venue(home/away/all), window, avgGoalsFor, avgGoalsAgainst, avgXgFor, avgXgAgainst, avgCornersFor/Against, avgCardsFor/Against, cleanSheets, form`. Computed; recomputed by jobs; versioned. Index: `(teamId, seasonId, venue, window)`.
- **PlayerStats** — `id, playerId, seasonId, apps, minutes, goals, assists, xg, xa, keyPasses, yellow, red, …`. Computed. Index: `(playerId, seasonId)`.
- **Referee** — `id, externalIds, name, country`. Rel: RefereeStats, Match assignment. 
- **RefereeStats** — `id, refereeId, seasonId, avgYellow, avgRed, avgFouls, avgPenalties, matches, homeBias?`. Computed. Index: `(refereeId, seasonId)`.
- **Odds / OddsSnapshot** — `OddsSnapshot: id, matchId, bookmaker, market, selection, price, capturedAt`. Time-series; **append-only**, the backbone of CLV & odds movement. Index: `(matchId, market, selection, capturedAt)`; consider partitioning by `capturedAt`. Hypertable (Timescale) optional at scale.
- **BettingMarket** — reference/catalog `id, key(e.g. OU_2_5), name, group, riskBaseline`. Static-ish.
- **Prediction** — `id, matchId, modelVersion, inputSnapshotHash, createdAt, requestedBy`. Rel: PredictionInput (1:1), PredictionResult (1:N per market). Immutable. Index: `(matchId)`, `(modelVersion)`.
- **PredictionInput** — `id, predictionId, featuresJsonb` (the exact feature vector). Reproducibility.
- **PredictionResult** — `id, predictionId, market, selection, modelProbability, impliedProbability?, edge?, expectedValue?, suggestedStake?, confidence, risk`. Index: `(predictionId, market)`.
- **Recommendation** — `id, predictionId, market, selection, rationale, confidence, risk, isBestBet`. Derived from results past thresholds.
- **DataSource** — `id, name, type, status, lastSyncAt, latencyMs, errorRate, configRef`. Health/ops.
- **AnalysisReport** — `id, matchId, predictionId, language, contentJsonb, narrative, sources[], createdAt`. Immutable, cacheable. Index: `(matchId)`, `(predictionId)`.
- **AuditLog** — `id, actorId, action, entity, entityId, metadataJsonb, createdAt`. Append-only; index `(entity, entityId)`, `(actorId, createdAt)`.
- **Subscription** — `id, userId(unique), tier, status, currentPeriodEnd, providerRef`. 
- **UserWatchlist** — `id, userId, teamId?|matchId?|competitionId?, createdAt`. Index: `(userId)`.

**Scalability considerations:** separate **hot transactional** tables (User, Subscription) from **append-only time-series** (OddsSnapshot, MatchStats, AuditLog); partition large fact tables by time/season; use materialized views or precomputed `TeamStats` rather than aggregating on read; GIN indexes on `externalIds`/jsonb; trigram indexes for name search; read replicas for analytics/backtests.

### Español

Entidades canónicas (PostgreSQL vía Prisma). Campos clave, relaciones, índices, necesidades históricas, datos computados y notas de escalabilidad:

- **User** — `id, email(único), passwordHash, roleId, locale, status, ageConfirmedAt, createdAt`. Rel: Role (N:1), Subscription (1:1), Watchlist (1:N), Prediction (1:N como solicitante). Índices: `email`, `roleId`. PII; soporta exportar/borrar.
- **Role** — `id, name(único: user|analyst|admin), permissions[]`. Rel: User (1:N). Pequeña, cacheable.
- **Team** — `id, externalIds(jsonb), name, country, crestUrl, eloRating`. Rel: Match (local/visitante), TeamStats, Player. Índices: `name` (trigram), `externalIds` GIN. `eloRating` computado por jobs.
- **Player** — `id, externalIds, teamId, name, position, dob`. Índices: `teamId`, `name` trigram.
- **Competition** — `id, externalIds, name, country, type(league|cup|ucl|friendly), tier`. Rel: Season, Match.
- **Season** — `id, competitionId, label, startDate, endDate`. Índice: `competitionId`.
- **Match** — `id, externalIds, competitionId, seasonId, homeTeamId, awayTeamId, kickoffUtc, venue, status, round, importance, weatherId?`. Índices: `(kickoffUtc)`, `(homeTeamId,awayTeamId)`, `(seasonId)`, `externalIds` GIN. Gran volumen; particionar por temporada/fecha.
- **MatchStats** — hechos históricos, append-only. Índice: `matchId`.
- **TeamStats** — agregados móviles por equipo/ámbito; computados y versionados. Índice: `(teamId, seasonId, venue, window)`.
- **PlayerStats** — computados. Índice: `(playerId, seasonId)`.
- **Referee** — `id, externalIds, name, country`.
- **RefereeStats** — `avgYellow, avgRed, avgFouls, avgPenalties, …`; computados. Índice: `(refereeId, seasonId)`.
- **Odds / OddsSnapshot** — serie temporal append-only; columna vertebral de CLV y movimiento de cuotas. Índice: `(matchId, market, selection, capturedAt)`; particionar por `capturedAt`. Hypertable (Timescale) opcional a escala.
- **BettingMarket** — catálogo de referencia `id, key, name, group, riskBaseline`. Casi estático.
- **Prediction** — `id, matchId, modelVersion, inputSnapshotHash, createdAt, requestedBy`. Inmutable. Índices: `(matchId)`, `(modelVersion)`.
- **PredictionInput** — `featuresJsonb` (vector exacto de features). Reproducibilidad.
- **PredictionResult** — `market, selection, modelProbability, impliedProbability?, edge?, expectedValue?, suggestedStake?, confidence, risk`. Índice: `(predictionId, market)`.
- **Recommendation** — derivada de resultados sobre umbrales; `isBestBet`.
- **DataSource** — salud/ops `status, lastSyncAt, latencyMs, errorRate`.
- **AnalysisReport** — inmutable, cacheable; `language, contentJsonb, narrative, sources[]`. Índices: `(matchId)`, `(predictionId)`.
- **AuditLog** — append-only; índices `(entity, entityId)`, `(actorId, createdAt)`.
- **Subscription** — `userId(único), tier, status, currentPeriodEnd, providerRef`.
- **UserWatchlist** — `userId, teamId?|matchId?|competitionId?`. Índice: `(userId)`.

**Escalabilidad:** separar tablas **transaccionales calientes** (User, Subscription) de **series temporales append-only** (OddsSnapshot, MatchStats, AuditLog); particionar tablas grandes por tiempo/temporada; usar vistas materializadas o `TeamStats` precomputado en vez de agregar en lectura; índices GIN en `externalIds`/jsonb; trigram para búsqueda por nombre; réplicas de lectura para analítica/backtests.

---

## 10. System Modules / Módulos del Sistema

### English

Bounded contexts (each maps to the module template in §7). Refined from the requested list for clearer separation:

| Module | Responsibility | Key ports |
|---|---|---|
| **auth** | Registration, login, JWT issue/refresh, password reset, age gate | `UserRepositoryPort`, `TokenServicePort` |
| **users** | Profile, locale, RG self-limits, data export/delete | `UserRepositoryPort` |
| **subscriptions** | Tiers, entitlements, billing provider | `SubscriptionRepositoryPort`, `BillingProviderPort` |
| **teams** | Team master data, Elo, team stats | `TeamRepositoryPort`, `TeamStatsProviderPort` |
| **players** | Player data, availability, player stats | `PlayerRepositoryPort`, `PlayerStatsProviderPort`, `InjuryProviderPort`, `LineupProviderPort` |
| **competitions** | Competitions, seasons, fixtures catalog | `CompetitionRepositoryPort`, `FixtureProviderPort` |
| **matches** | Fixture resolution, match aggregate, match stats | `MatchRepositoryPort`, `SportsDataProviderPort` |
| **referees** | Referee master data + tendencies | `RefereeRepositoryPort`, `RefereeStatsProviderPort` |
| **odds** | Odds snapshots, movement, implied prob | `OddsRepositoryPort`, `OddsProviderPort` |
| **betting-markets** | Market catalog, rules, risk baselines | `BettingMarketRepositoryPort` |
| **data-sources** | Provider registry, health, sync orchestration | `DataSourcePort`, `EventBusPort` |
| **ingestion** *(new)* | Pull/normalize provider payloads into canonical store | provider ports + repositories |
| **features** *(new)* | Feature engineering pipeline & cache | `FeatureStorePort`, repositories |
| **predictions** | Run statistical/ML models, produce probabilities | `PredictionModelPort`, repositories |
| **value-betting** *(new)* | Edge/EV/stake/risk from model vs odds | domain services + `OddsRepositoryPort` |
| **recommendations** | Threshold logic → best bet + alternatives | repositories |
| **ai-analysis** | LLM explanation + RAG synthesis (no probability invention) | `LlmExplanationPort`, `RagRetrieverPort` |
| **reports** | Assemble, persist, serve immutable reports | `ReportRepositoryPort`, `CachePort` |
| **backtesting** *(new)* | Replay history, compute ROI/CLV/calibration | repositories, `PredictionModelPort` |
| **admin** | Ops dashboards, syncs, model governance | cross-module read ports |
| **audit** | Append-only audit trail | `AuditLogPort` |
| **notifications** | Email/push on report-ready, watchlist events | `NotificationPort` |

**Improvement over requested list:** split the monolithic "data-sources/ai-analysis" responsibilities into explicit **ingestion**, **features**, **value-betting**, and **backtesting** contexts so the prediction pipeline stages are independently testable, deployable, and observable — and so the **LLM stays confined to `ai-analysis`**, structurally preventing it from producing probabilities.

### Español

Contextos acotados (cada uno usa la plantilla de módulo de §7). Refinados desde la lista pedida para una separación más clara:

| Módulo | Responsabilidad | Puertos clave |
|---|---|---|
| **auth** | Registro, login, emisión/refresh JWT, reset, gate de edad | `UserRepositoryPort`, `TokenServicePort` |
| **users** | Perfil, locale, autolímites JR, exportar/borrar datos | `UserRepositoryPort` |
| **subscriptions** | Niveles, derechos, proveedor de pago | `SubscriptionRepositoryPort`, `BillingProviderPort` |
| **teams** | Datos maestros de equipo, Elo, stats | `TeamRepositoryPort`, `TeamStatsProviderPort` |
| **players** | Datos de jugador, disponibilidad, stats | `PlayerRepositoryPort`, `PlayerStatsProviderPort`, `InjuryProviderPort`, `LineupProviderPort` |
| **competitions** | Competiciones, temporadas, catálogo de partidos | `CompetitionRepositoryPort`, `FixtureProviderPort` |
| **matches** | Resolución de partido, agregado de match, stats | `MatchRepositoryPort`, `SportsDataProviderPort` |
| **referees** | Datos maestros + tendencias de árbitro | `RefereeRepositoryPort`, `RefereeStatsProviderPort` |
| **odds** | Snapshots de cuotas, movimiento, prob. implícita | `OddsRepositoryPort`, `OddsProviderPort` |
| **betting-markets** | Catálogo de mercados, reglas, baseline de riesgo | `BettingMarketRepositoryPort` |
| **data-sources** | Registro de proveedores, salud, orquestación de sync | `DataSourcePort`, `EventBusPort` |
| **ingestion** *(nuevo)* | Obtener/normalizar payloads al almacén canónico | puertos de proveedor + repositorios |
| **features** *(nuevo)* | Pipeline y caché de ingeniería de features | `FeatureStorePort`, repositorios |
| **predictions** | Ejecutar modelos estadísticos/ML, producir probabilidades | `PredictionModelPort`, repositorios |
| **value-betting** *(nuevo)* | Edge/EV/stake/riesgo de modelo vs cuotas | servicios de dominio + `OddsRepositoryPort` |
| **recommendations** | Lógica de umbral → mejor apuesta + alternativas | repositorios |
| **ai-analysis** | Explicación LLM + síntesis RAG (sin inventar probabilidad) | `LlmExplanationPort`, `RagRetrieverPort` |
| **reports** | Ensamblar, persistir y servir informes inmutables | `ReportRepositoryPort`, `CachePort` |
| **backtesting** *(nuevo)* | Reproducir historia, calcular ROI/CLV/calibración | repositorios, `PredictionModelPort` |
| **admin** | Dashboards de ops, syncs, gobierno de modelos | puertos de lectura entre módulos |
| **audit** | Traza de auditoría append-only | `AuditLogPort` |
| **notifications** | Email/push en informe-listo, eventos de watchlist | `NotificationPort` |

**Mejora sobre la lista pedida:** dividir las responsabilidades monolíticas de "data-sources/ai-analysis" en contextos explícitos de **ingestion**, **features**, **value-betting** y **backtesting**, para que las etapas del pipeline sean testeables, desplegables y observables de forma independiente — y para que el **LLM quede confinado a `ai-analysis`**, impidiendo estructuralmente que produzca probabilidades.

---

## 11. Full Match Analysis Flow / Flujo Completo de Análisis de Partido

### English

End-to-end pipeline (event-driven, each stage a worker job, each persisted & cacheable):

1. **Input** — user submits free text ("Real Madrid vs Barcelona"); `ResolveFixtureUseCase` parses & disambiguates → candidate fixtures with confidence; user confirms.
2. **Resolution** — canonical `Match` (teams, competition, season, kickoff, venue, referee if assigned).
3. **Provider query** — `IngestMatchDataUseCase` fans out to outbound provider ports (results, team/player stats, lineups, injuries/suspensions, referee, corners, cards, xG, odds, weather) with per-provider timeouts, retries, and **partial-success** tolerance.
4. **Normalization** — map payloads → canonical entities/units; record provenance + staleness; dedupe by `externalIds`.
5. **Feature engineering** — `ComputeFeaturesUseCase` builds the feature vector (form, rolling avgs, home/away splits, H2H, SoS, rest, absence-impact, referee tendencies). Cache by `(matchId, featureVersion)`.
6. **Model execution** — `RunPredictionUseCase` runs statistical + ML models per market → calibrated probabilities; persist `Prediction` + `PredictionInput` (snapshot hash) + `PredictionResult[]`.
7. **Odds comparison** — compute implied probability per selection from `OddsSnapshot`; align markets.
8. **Value detection** — `DetectValueBetsUseCase`: edge = modelProb − impliedProb; EV; conservative Kelly stake; confidence & risk; flag value selections.
9. **Explanation (LLM + RAG)** — `GenerateReportUseCase` passes **only computed numbers + retrieved sources** to `LlmExplanationPort`; LLM writes the narrative, never the probabilities.
10. **Persist** — assemble immutable `AnalysisReport` (EN/ES capable), cache in Redis, store in Postgres, emit `PredictionReady` → notifications.
11. **History** — user retrieves report; appears in history & watchlist feeds; admins see model/version + provider provenance.

**Failure handling:** any provider failure degrades gracefully (mark features as partial, lower confidence, surface staleness). A model failure aborts the report with a clear error, never a fabricated number.

### Español

Pipeline de extremo a extremo (orientado a eventos, cada etapa un job de worker, todo persistido y cacheable):

1. **Entrada** — el usuario envía texto libre ("Real Madrid vs Barcelona"); `ResolveFixtureUseCase` parsea y desambigua → partidos candidatos con confianza; el usuario confirma.
2. **Resolución** — `Match` canónico (equipos, competición, temporada, hora, sede, árbitro si está designado).
3. **Consulta a proveedores** — `IngestMatchDataUseCase` despliega los puertos de salida (resultados, stats de equipo/jugador, alineaciones, lesiones/sanciones, árbitro, córners, tarjetas, xG, cuotas, clima) con timeouts por proveedor, reintentos y tolerancia a **éxito parcial**.
4. **Normalización** — mapear payloads → entidades/unidades canónicas; registrar procedencia + obsolescencia; deduplicar por `externalIds`.
5. **Ingeniería de features** — `ComputeFeaturesUseCase` construye el vector (forma, medias móviles, splits local/visitante, H2H, dificultad de calendario, descanso, impacto de ausencias, tendencias de árbitro). Caché por `(matchId, featureVersion)`.
6. **Ejecución de modelos** — `RunPredictionUseCase` corre modelos estadísticos + ML por mercado → probabilidades calibradas; persiste `Prediction` + `PredictionInput` (hash) + `PredictionResult[]`.
7. **Comparación de cuotas** — calcular probabilidad implícita por selección desde `OddsSnapshot`; alinear mercados.
8. **Detección de valor** — `DetectValueBetsUseCase`: edge = probModelo − probImplícita; EV; stake Kelly conservador; confianza y riesgo; marcar selecciones con valor.
9. **Explicación (LLM + RAG)** — `GenerateReportUseCase` pasa **solo números computados + fuentes recuperadas** a `LlmExplanationPort`; el LLM escribe la narrativa, nunca las probabilidades.
10. **Persistir** — ensamblar `AnalysisReport` inmutable (EN/ES), cachear en Redis, guardar en Postgres, emitir `PredictionReady` → notificaciones.
11. **Historial** — el usuario recupera el informe; aparece en historial y watchlist; los admins ven modelo/versión + procedencia de proveedores.

**Manejo de fallos:** cualquier fallo de proveedor degrada con elegancia (features parciales, menor confianza, mostrar obsolescencia). Un fallo de modelo aborta el informe con error claro, nunca con un número inventado.

---

## 12. AI System Design / Diseño del Sistema de IA

### English

**Principle: data decides, LLM explains.** Probabilities come exclusively from statistical/ML models and backtesting. The LLM is a **synthesis + explanation layer**, structurally unable to alter numbers.

**Layered AI stack:**
- **Statistical model** — Poisson/Dixon-Coles for goals, Elo for strength, rolling/weighted form. Deterministic, interpretable, cheap; strong baseline.
- **Machine-learning model** — gradient boosting (XGBoost/LightGBM) / logistic regression on engineered features for markets where ML beats the baseline; **calibrated** (Platt/isotonic) so probabilities are honest.
- **Ensemble & calibration** — blend statistical + ML with weights tuned by backtest; calibrate final probabilities; report calibration metrics (Brier, log-loss, reliability curves).
- **LLM explanation layer** — receives the *computed* probabilities, edges, key features, and retrieved sources; produces the narrative report (summary, risks, reasoning, market rationale) in EN/ES. Prompted to **cite sources** and **never assert guarantees**; output schema-validated.
- **RAG system** — retrieves curated, licensed source snippets (injury news, form notes, tactical context) from the vector store; grounds the narrative and provides `sources[]`. Retrieval is the only way external text enters the report, reducing hallucination.
- **Provider connectors** — outbound adapters feeding the data pipeline (see §15).
- **Background workers** — orchestrate ingest → features → predict → value → explain.
- **Feature engineering pipeline** — versioned, cached, reproducible feature vectors.
- **Backtesting engine** — validates every model/feature change before it ships (ROI, hit-rate, CLV, calibration).

**Guardrails:** the LLM call passes numbers as read-only context; a post-generation validator checks the narrative does not contradict the computed numbers, contains the responsible-gambling warning, and includes citations. If validation fails, regenerate or fall back to a templated report.

### Español

**Principio: los datos deciden, el LLM explica.** Las probabilidades provienen exclusivamente de modelos estadísticos/ML y backtesting. El LLM es una **capa de síntesis + explicación**, incapaz por diseño de alterar los números.

**Stack de IA en capas:**
- **Modelo estadístico** — Poisson/Dixon-Coles para goles, Elo para fuerza, forma ponderada. Determinista, interpretable, barato; baseline fuerte.
- **Modelo de machine learning** — gradient boosting (XGBoost/LightGBM) / regresión logística sobre features para mercados donde ML supere al baseline; **calibrado** (Platt/isotónica) para que las probabilidades sean honestas.
- **Ensemble y calibración** — combinar estadístico + ML con pesos ajustados por backtest; calibrar la probabilidad final; reportar métricas (Brier, log-loss, curvas de fiabilidad).
- **Capa de explicación LLM** — recibe las probabilidades *computadas*, edges, features clave y fuentes recuperadas; produce el informe narrativo (resumen, riesgos, razonamiento, justificación de mercados) en EN/ES. Instruido para **citar fuentes** y **nunca afirmar garantías**; salida validada por esquema.
- **Sistema RAG** — recupera fragmentos de fuentes curadas y licenciadas (lesiones, notas de forma, contexto táctico) del vector store; fundamenta la narrativa y aporta `sources[]`. La recuperación es la única vía por la que entra texto externo, reduciendo alucinaciones.
- **Conectores de proveedor** — adaptadores de salida que alimentan el pipeline (ver §15).
- **Workers en segundo plano** — orquestan ingesta → features → predicción → valor → explicación.
- **Pipeline de features** — vectores versionados, cacheados, reproducibles.
- **Motor de backtesting** — valida cada cambio de modelo/feature antes de publicarlo (ROI, acierto, CLV, calibración).

**Guardrails:** la llamada al LLM pasa los números como contexto de solo lectura; un validador post-generación comprueba que la narrativa no contradice los números, incluye el aviso de juego responsable y contiene citas. Si falla la validación, se regenera o se usa un informe por plantilla.

---

## 13. Prediction Engine Design / Diseño del Motor de Predicción

### English

The engine is a set of composable models behind `PredictionModelPort`, producing **calibrated probabilities per market**. No fabricated "exact" guarantees — every model is validated by backtesting.

**Per-market approach:**
- **1X2 (match result):** team-strength via **Elo** + recent weighted form → expected goal rates → **Poisson/Dixon-Coles** score matrix → sum cells to P(home/draw/away). Optionally blend with a **multinomial logistic / gradient boosting** classifier on features; ensemble + calibrate.
- **Over/Under goals:** from the Poisson/Dixon-Coles score matrix, sum P(total > line); cross-check with xG-based expected totals and rolling over/under rates.
- **BTTS:** from score matrix, P(home≥1 ∧ away≥1); validate vs historical BTTS rate and defensive/offensive features.
- **Corners:** separate Poisson/negative-binomial on corner rates (for/against, home/away, opponent strength adjusted) → totals & team lines.
- **Cards:** Poisson/negative-binomial on cards driven by team discipline, fixture importance, rivalry, and **referee tendencies** (avg cards/fouls/pens) → totals & team lines.
- **Asian Handicap / DNB / Double Chance:** derived from the 1X2 score matrix.
- **HT/FT, anytime goalscorer, correct score:** correct score directly from the score matrix (flagged **high-risk, low-confidence**); goalscorer from player minutes × team goal expectation × player share; HT/FT from half-split goal models.

**Modeling toolbox (when to use what):**
| Technique | Use | Why |
|---|---|---|
| Poisson / Dixon-Coles | goals, OU, BTTS, corners, cards | natural count model, interpretable, low-data-friendly |
| Elo ratings | team strength, 1X2 prior | adaptive, robust, cheap |
| Rolling / weighted form | recency | captures momentum & fatigue |
| xG-based models | attack/defense quality | better signal than raw goals |
| Logistic regression | calibrated classifiers | interpretable baseline |
| Gradient boosting | non-linear feature interactions | accuracy when data is rich |
| Calibration (Platt/isotonic) | honest probabilities | core to value betting |

**Validation (mandatory before any model ships):** **backtesting** over historical seasons; metrics: **ROI simulation** (flat & conservative-Kelly), **hit rate**, **calibration** (Brier, log-loss, reliability), **Closing Line Value (CLV)**, and **confidence intervals** via bootstrapping. A model that beats market only by overfitting is rejected; CLV ≥ 0 over a large sample is the strongest honest signal.

**Reproducibility:** each prediction stores `modelVersion` + `inputSnapshotHash`; champion/challenger and shadow deployment let new models run silently before promotion.

### Español

El motor es un conjunto de modelos componibles tras `PredictionModelPort`, que producen **probabilidades calibradas por mercado**. Sin "exactitudes" inventadas — cada modelo se valida por backtesting.

**Enfoque por mercado:**
- **1X2:** fuerza vía **Elo** + forma reciente ponderada → tasas de gol esperadas → matriz de marcadores **Poisson/Dixon-Coles** → sumar celdas a P(local/empate/visitante). Opcional combinar con clasificador **logístico multinomial / gradient boosting**; ensemble + calibrar.
- **Más/Menos goles:** desde la matriz, sumar P(total > línea); contrastar con totales esperados por xG y tasas over/under móviles.
- **Ambos marcan (BTTS):** P(local≥1 ∧ visitante≥1); validar vs tasa histórica y features ofensivos/defensivos.
- **Córners:** Poisson/binomial negativa sobre tasas (a favor/en contra, local/visitante, ajustado por rival) → totales y líneas por equipo.
- **Tarjetas:** Poisson/binomial negativa según disciplina, importancia, rivalidad y **tendencias del árbitro** (medias de tarjetas/faltas/penales) → totales y líneas.
- **Hándicap Asiático / DNB / Doble Oportunidad:** derivados de la matriz 1X2.
- **PP/Final, goleador, resultado exacto:** resultado exacto directo de la matriz (marcado **alto riesgo, baja confianza**); goleador desde minutos × expectativa de gol del equipo × cuota del jugador; PP/Final desde modelos por mitad.

**Caja de herramientas (cuándo usar qué):** ver tabla equivalente arriba (Poisson/Dixon-Coles, Elo, forma ponderada, xG, regresión logística, gradient boosting, calibración).

**Validación (obligatoria antes de publicar):** **backtesting** sobre temporadas históricas; métricas: **simulación de ROI** (plano y Kelly conservador), **tasa de acierto**, **calibración** (Brier, log-loss, fiabilidad), **Closing Line Value (CLV)** e **intervalos de confianza** por bootstrap. Un modelo que solo bate al mercado por sobreajuste se rechaza; CLV ≥ 0 en muestra grande es la señal honesta más fuerte.

**Reproducibilidad:** cada predicción guarda `modelVersion` + `inputSnapshotHash`; despliegue champion/challenger y shadow permiten correr nuevos modelos en silencio antes de promover.

---

## 14. Value Betting System Design / Diseño del Sistema de Value Betting

### English

Value betting compares **model probability** against **market-implied probability** to find positive expected value, with a **deliberately conservative** staking posture.

**Computation per selection:**
- **Implied probability** = 1 / decimal_odds; remove bookmaker margin (overround) by normalizing across the market's outcomes for a fair baseline.
- **Model probability** = calibrated output from §13.
- **Edge** = modelProb − impliedProb (margin-adjusted).
- **Expected value (EV)** = modelProb × (odds − 1) − (1 − modelProb).
- **Confidence** = function of model calibration + data completeness + agreement between statistical and ML components + sample size.
- **Risk level** = market volatility (e.g., correct score = high) + confidence + line liquidity.
- **Recommended stake** = **fractional Kelly** (e.g., ¼–½ Kelly), capped at a small % of bankroll, floored to zero below an edge/confidence threshold. Never full Kelly.

**Conservative staking — why:** full Kelly is mathematically optimal only with *perfect* probabilities; real models are imperfect, so full Kelly massively over-bets and risks ruin. Fractional Kelly + hard caps + minimum-edge gating protect users and reflect honest uncertainty. The product **does not chase aggressive recommendations** — it filters out thin/over-confident edges.

**Output gating:** a selection becomes a **Recommendation** only if `edge ≥ minEdge`, `confidence ≥ minConf`, and `risk ≤ tierLimit`. The "best bet" is the highest risk-adjusted EV passing all gates; alternatives are ranked below. If nothing passes, the report honestly says **"no value found"** — a feature, not a failure.

**No bet execution (v1):** the system surfaces analysis only; it never places, brokers, or settles bets. Outputs are informational and risk-framed.

### Español

El value betting compara la **probabilidad del modelo** con la **probabilidad implícita del mercado** para hallar valor esperado positivo, con una postura de stake **deliberadamente conservadora**.

**Cálculo por selección:**
- **Probabilidad implícita** = 1 / cuota_decimal; quitar el margen de la casa (overround) normalizando entre los resultados del mercado para una base justa.
- **Probabilidad del modelo** = salida calibrada de §13.
- **Edge** = probModelo − probImplícita (ajustada por margen).
- **Valor esperado (EV)** = probModelo × (cuota − 1) − (1 − probModelo).
- **Confianza** = función de calibración + completitud de datos + acuerdo entre componente estadístico y ML + tamaño de muestra.
- **Nivel de riesgo** = volatilidad del mercado (ej. resultado exacto = alto) + confianza + liquidez de la línea.
- **Stake recomendado** = **Kelly fraccionado** (ej. ¼–½ Kelly), limitado a un % pequeño del bankroll, a cero bajo un umbral de edge/confianza. Nunca Kelly completo.

**Stake conservador — por qué:** el Kelly completo es óptimo solo con probabilidades *perfectas*; los modelos reales son imperfectos, así que el Kelly completo sobreapuesta y arriesga la ruina. Kelly fraccionado + topes duros + umbral mínimo de edge protegen al usuario y reflejan la incertidumbre real. El producto **no persigue recomendaciones agresivas** — filtra edges finos o sobreconfiados.

**Gating de salida:** una selección se vuelve **Recommendation** solo si `edge ≥ minEdge`, `confianza ≥ minConf` y `riesgo ≤ límiteDelTier`. La "mejor apuesta" es el mayor EV ajustado por riesgo que pase todos los filtros; las alternativas se rankean debajo. Si nada pasa, el informe dice honestamente **"sin valor"** — una característica, no un fallo.

**Sin ejecución de apuestas (v1):** el sistema solo expone análisis; nunca realiza, intermedia ni liquida apuestas. Las salidas son informativas y enmarcadas en riesgo.

---

## 15. Data Sources / Fuentes de Datos

### English

**Principle:** use **legal APIs, licensed providers, or explicitly permitted public sources** only. Do **not** architect the core product around fragile or unauthorized scraping. Always verify each provider's Terms of Service, licensing, and redistribution rights before integrating; football data licensing varies by competition and region.

**Candidate provider categories (verify licensing per use case):**
| Need | Example provider categories *(evaluate licensing)* |
|---|---|
| Fixtures, results, lineups, team/player stats | API-Football (API-Sports), Sportmonks, Opta/Stats Perform (premium), StatsBomb (xG/event data) |
| Odds & odds movement | The Odds API, OddsAPI-style aggregators, licensed bookmaker feeds |
| xG / advanced event data | StatsBomb, Opta, Sportmonks (xG add-ons) |
| Injuries / suspensions / availability | Sportmonks, API-Football injury endpoints, official club/league feeds |
| Referees & assignments | League official sites/APIs where permitted, specialized stats providers |
| Weather | OpenWeather, Météo providers (by venue/kickoff) |
| Corners / cards detail | API-Football, Sportmonks detailed stats |

*(Provider names are categories to evaluate, not endorsements; confirm current licensing terms.)*

**Provider abstraction (outbound ports):** each capability is an interface in `libs/domain`, implemented by adapters in `libs/infrastructure`. This makes providers swappable and testable with mocks.

```ts
export interface SportsDataProviderPort { getFixture(q): Promise<FixtureDto>; getTeamStats(id, scope): Promise<TeamStatsDto>; /* ... */ }
export interface OddsProviderPort { getOdds(matchRef, markets): Promise<OddsSnapshotDto[]>; }
export interface RefereeStatsProviderPort { getRefereeStats(refId, season): Promise<RefereeStatsDto>; }
export interface WeatherProviderPort { getForecast(venue, kickoffUtc): Promise<WeatherDto>; }
export interface InjuryProviderPort { getInjuries(teamId): Promise<InjuryDto[]>; }
export interface LineupProviderPort { getProbableLineup(matchRef): Promise<LineupDto>; }
export interface TeamStatsProviderPort { getTeamStats(teamId, scope): Promise<TeamStatsDto>; }
export interface PlayerStatsProviderPort { getPlayerStats(playerId, season): Promise<PlayerStatsDto>; }
```

**Adapter responsibilities:** auth/key handling, rate-limit & quota management, retries/backoff, response mapping to canonical DTOs, provenance stamping, and **circuit breaking** when a provider degrades. A **multi-provider strategy** (primary + fallback per capability) plus aggressive caching reduces cost and single-provider risk. Each adapter ships with **contract tests** against recorded fixtures.

### Español

**Principio:** usar **solo APIs legales, proveedores con licencia o fuentes públicas explícitamente permitidas**. **No** diseñar el núcleo sobre scraping frágil o no autorizado. Verificar siempre los Términos de Servicio, licencias y derechos de redistribución de cada proveedor antes de integrar; el licenciamiento de datos de fútbol varía por competición y región.

**Categorías de proveedores candidatos (verificar licencia por caso de uso):**
| Necesidad | Ejemplos de categorías *(evaluar licencia)* |
|---|---|
| Partidos, resultados, alineaciones, stats | API-Football (API-Sports), Sportmonks, Opta/Stats Perform (premium), StatsBomb (xG) |
| Cuotas y movimiento | The Odds API, agregadores tipo OddsAPI, feeds de casas con licencia |
| xG / datos de evento avanzados | StatsBomb, Opta, Sportmonks |
| Lesiones / sanciones / disponibilidad | Sportmonks, endpoints de lesiones de API-Football, feeds oficiales |
| Árbitros y designaciones | Sitios/APIs oficiales de liga donde se permita, proveedores especializados |
| Clima | OpenWeather, proveedores meteorológicos (por sede/hora) |
| Detalle de córners / tarjetas | API-Football, Sportmonks |

*(Los nombres son categorías a evaluar, no recomendaciones; confirmar términos de licencia vigentes.)*

**Abstracción de proveedor (puertos de salida):** cada capacidad es una interfaz en `libs/domain`, implementada por adaptadores en `libs/infrastructure`. Esto los hace intercambiables y testeables con mocks (ver interfaces arriba).

**Responsabilidades del adaptador:** gestión de auth/keys, rate-limit y cuotas, reintentos/backoff, mapeo a DTOs canónicos, sellado de procedencia y **circuit breaking** ante degradación. Una **estrategia multi-proveedor** (primario + fallback por capacidad) más caché agresiva reduce coste y riesgo de proveedor único. Cada adaptador incluye **tests de contrato** contra fixtures grabados.

---

## 16. REST Endpoints / Endpoints REST

### English

Base path `/. /api/v1`. JSON. Auth via `Authorization: Bearer` (access token) + refresh cookie. Standard envelope, pagination, and error format below.

**Auth**
- `POST /api/v1/auth/register` — create account (email, password, age confirm, T&C).
- `POST /api/v1/auth/login` — returns access token + sets refresh cookie.
- `POST /api/v1/auth/refresh` — rotate tokens.
- `POST /api/v1/auth/logout` — revoke refresh.
- `POST /api/v1/auth/forgot-password` / `POST /api/v1/auth/reset-password`.

**Users**
- `GET /api/v1/users/me` — profile. `PATCH /api/v1/users/me` — update locale/settings.
- `POST /api/v1/users/me/self-limit` — set RG self-limits. `POST /api/v1/users/me/export` / `DELETE /api/v1/users/me` — GDPR.

**Teams / Players / Competitions / Referees**
- `GET /api/v1/teams/:id`, `GET /api/v1/teams?search=`, `GET /api/v1/teams/:id/stats`.
- `GET /api/v1/players/:id`, `GET /api/v1/players/:id/stats`.
- `GET /api/v1/competitions`, `GET /api/v1/competitions/:id/seasons`.
- `GET /api/v1/referees/:id`, `GET /api/v1/referees/:id/stats`.

**Matches**
- `GET /api/v1/matches/search?q=Real+Madrid+vs+Barcelona` — resolve fixture → ranked candidates.
- `GET /api/v1/matches/:id` — canonical match + stats + assigned referee + odds summary.

**Odds**
- `GET /api/v1/matches/:id/odds` — latest snapshot per market/bookmaker.
- `GET /api/v1/matches/:id/odds/history?market=OU_2_5` — movement series.

**Predictions / Reports**
- `POST /api/v1/predictions` — body `{ matchId, markets? }` → async `{ jobId, predictionId }`.
- `GET /api/v1/predictions/:id` — prediction + results (model probs, edges, EV, stake, confidence, risk).
- `GET /api/v1/predictions?mine&page=` — user history (paginated).
- `GET /api/v1/reports/:id` — full assembled narrative report.
- `GET /api/v1/jobs/:jobId` — job status for progressive UI (or SSE `/jobs/:jobId/stream`).

**Watchlist**
- `GET /api/v1/watchlist`, `POST /api/v1/watchlist`, `DELETE /api/v1/watchlist/:id`.

**Admin** (RBAC: admin)
- `GET /api/v1/admin/data-sources`, `POST /api/v1/admin/data-sync` — trigger sync.
- `GET /api/v1/admin/models`, `GET /api/v1/admin/models/:version/backtest`.
- `GET /api/v1/admin/users`, `PATCH /api/v1/admin/users/:id/role`.
- `GET /api/v1/admin/audit?entity=&page=`.

**Health / Ops**
- `GET /health` (liveness), `GET /health/ready` (readiness: db/redis/providers), `GET /metrics` (Prometheus).

**Cross-cutting conventions:**
- **API versioning:** URI prefix `/api/v1` (simple, cache-friendly); deprecation via headers; contracts in `libs/contracts`.
- **Pagination:** cursor-based (`?cursor=&limit=`) for large/time-series lists; page-based for small admin tables.
- **Response envelope:** `{ data, meta?, error: null }` on success; `{ data: null, error: { code, message, details? } }` on failure.
- **Error handling:** NestJS exception filter → typed `ApiError` codes (`AUTH_INVALID`, `MATCH_NOT_FOUND`, `PROVIDER_UNAVAILABLE`, `NO_VALUE_FOUND`, `VALIDATION_FAILED`), correlation id per request.
- **OpenAPI/Swagger:** auto-generated at `/api/docs` from decorators + `contracts`.

### Español

Base `/api/v1`. JSON. Auth vía `Authorization: Bearer` + cookie de refresh. Envelope, paginación y formato de error estándar abajo.

**Auth:** `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/forgot-password`, `POST /auth/reset-password`.
**Users:** `GET/PATCH /users/me`, `POST /users/me/self-limit`, `POST /users/me/export`, `DELETE /users/me`.
**Teams/Players/Competitions/Referees:** `GET /teams/:id`, `GET /teams?search=`, `GET /teams/:id/stats`, `GET /players/:id/stats`, `GET /competitions`, `GET /referees/:id/stats`.
**Matches:** `GET /matches/search?q=...` (candidatos rankeados), `GET /matches/:id`.
**Odds:** `GET /matches/:id/odds`, `GET /matches/:id/odds/history?market=...`.
**Predictions/Reports:** `POST /predictions` (async `{jobId, predictionId}`), `GET /predictions/:id`, `GET /predictions?mine&page=`, `GET /reports/:id`, `GET /jobs/:jobId` (o SSE).
**Watchlist:** `GET/POST /watchlist`, `DELETE /watchlist/:id`.
**Admin (RBAC admin):** `GET /admin/data-sources`, `POST /admin/data-sync`, `GET /admin/models`, `GET /admin/models/:version/backtest`, `GET /admin/users`, `PATCH /admin/users/:id/role`, `GET /admin/audit`.
**Health/Ops:** `GET /health`, `GET /health/ready`, `GET /metrics`.

**Convenciones transversales:**
- **Versionado:** prefijo `/api/v1` (simple, cacheable); deprecación por headers; contratos en `libs/contracts`.
- **Paginación:** por cursor (`?cursor=&limit=`) en listas grandes/series; por página en tablas admin pequeñas.
- **Envelope:** `{ data, meta?, error: null }` en éxito; `{ data: null, error: { code, message, details? } }` en fallo.
- **Errores:** filtro de excepción NestJS → códigos `ApiError` tipados (`AUTH_INVALID`, `MATCH_NOT_FOUND`, `PROVIDER_UNAVAILABLE`, `NO_VALUE_FOUND`, `VALIDATION_FAILED`), id de correlación por petición.
- **OpenAPI/Swagger:** autogenerado en `/api/docs`.

---

## 17. Main DTOs / DTOs Principales

### English

Contract DTOs (in `libs/contracts`, zod-validated). Illustrative shapes:

```ts
// Auth
RegisterRequest  = { email: string; password: string; locale: 'en'|'es'; ageConfirmed: true; acceptedTerms: true }
LoginRequest     = { email: string; password: string }
AuthResponse     = { accessToken: string; user: { id: string; email: string; role: string; locale: string } }

// Match resolution
MatchSearchResponse = { data: Array<{ matchId: string; home: TeamRef; away: TeamRef; competition: string; kickoffUtc: string; confidence: number }> }
TeamRef = { id: string; name: string; crestUrl?: string }

// Prediction request/response
CreatePredictionRequest = { matchId: string; markets?: MarketKey[] }
CreatePredictionResponse = { jobId: string; predictionId: string; status: 'queued' }

PredictionResultDto = {
  market: MarketKey; selection: string;
  modelProbability: number; impliedProbability?: number;
  edge?: number; expectedValue?: number;
  suggestedStakePct?: number;
  confidence: 'low'|'medium'|'high'; risk: 'low'|'medium'|'high'
}

// Report
AnalysisReportDto = {
  matchId: string; language: 'en'|'es';
  summary: string; recentForm: string; keyDataPoints: string[];
  risks: string[]; keyVariables: string[];
  predictions: PredictionResultDto[];
  recommendedMarkets: PredictionResultDto[];
  bestBet?: PredictionResultDto; alternatives: PredictionResultDto[];
  confidence: 'low'|'medium'|'high'; risk: 'low'|'medium'|'high';
  reasoning: string; sources: Array<{ label: string; url?: string; provider: string }>;
  responsibleGamblingWarning: string;
  generatedAt: string; modelVersion: string; staleness?: { provider: string; ageMinutes: number }[]
}
```

**Validation rules (examples):** email RFC-validated + normalized; password ≥ 12 chars with complexity; `ageConfirmed` & `acceptedTerms` must be literal `true`; `markets[]` constrained to the catalog enum; `matchId` must exist; all numeric probabilities ∈ [0,1]; stake % capped server-side regardless of input. Validation runs at the controller boundary (zod/class-validator) and again in domain VOs (defense in depth).

### Español

DTOs de contrato (en `libs/contracts`, validados con zod). Formas ilustrativas: ver bloque de código arriba (`RegisterRequest`, `LoginRequest`, `AuthResponse`, `MatchSearchResponse`, `CreatePredictionRequest/Response`, `PredictionResultDto`, `AnalysisReportDto`).

**Reglas de validación (ejemplos):** email validado RFC + normalizado; password ≥ 12 caracteres con complejidad; `ageConfirmed` y `acceptedTerms` deben ser literal `true`; `markets[]` limitado al enum del catálogo; `matchId` debe existir; toda probabilidad ∈ [0,1]; el % de stake se limita en el servidor sin importar el input. La validación corre en la frontera del controlador (zod/class-validator) y de nuevo en los VOs de dominio (defensa en profundidad).

---

## 18. Background Jobs / Procesos en Segundo Plano

### English

BullMQ queues (Redis-backed), consumed by `apps/worker`. Each job is **idempotent**, retried with **exponential backoff**, and routed to a **dead-letter queue** on terminal failure. Concurrency tuned per queue.

| Queue | Trigger | Work | Notes |
|---|---|---|---|
| `ingest:fixtures` | cron + on-demand | pull fixtures/results from providers | dedupe by externalIds |
| `ingest:stats` | cron + event | team/player/match stats | provenance + staleness |
| `ingest:odds` | frequent cron | append `OddsSnapshot` | high-frequency; drives CLV |
| `ingest:injuries-lineups` | pre-match cron | injuries, suspensions, probable XI | time-sensitive near kickoff |
| `ingest:referee` | on assignment | referee stats | |
| `ingest:weather` | pre-match | venue forecast | |
| `normalize` | after ingest | map → canonical | |
| `features:compute` | after normalize / on prediction | build feature vector | cache by (matchId, featureVersion) |
| `predict:run` | on `POST /predictions` | run models → results | stores snapshot hash |
| `value:detect` | after predict | edge/EV/stake/risk | thresholds → recommendations |
| `report:generate` | after value | LLM + RAG narrative → report | schema + guardrail validation |
| `backtest:run` | on model change / scheduled | replay history → metrics | admin-visible |
| `notify:dispatch` | on report-ready / watchlist | email/push | |
| `maintenance:recompute-stats` | nightly | refresh TeamStats/Elo | materialized aggregates |

**Scheduling:** repeatable jobs via BullMQ schedulers; odds ingested most frequently (movement matters), injuries/lineups intensify near kickoff. **Observability:** per-queue metrics (depth, latency, failure rate), Bull Board dashboard (admin-only), tracing across the pipeline. **Idempotency:** natural keys + upserts so re-runs never duplicate.

### Español

Colas BullMQ (sobre Redis), consumidas por `apps/worker`. Cada job es **idempotente**, con reintentos de **backoff exponencial** y enrutado a **dead-letter** ante fallo terminal. Concurrencia ajustada por cola.

| Cola | Disparador | Trabajo | Notas |
|---|---|---|---|
| `ingest:fixtures` | cron + on-demand | partidos/resultados | dedupe por externalIds |
| `ingest:stats` | cron + evento | stats equipo/jugador/match | procedencia + obsolescencia |
| `ingest:odds` | cron frecuente | añadir `OddsSnapshot` | alta frecuencia; alimenta CLV |
| `ingest:injuries-lineups` | cron pre-partido | lesiones, sanciones, XI probable | sensible al tiempo |
| `ingest:referee` | al designar | stats de árbitro | |
| `ingest:weather` | pre-partido | pronóstico de sede | |
| `normalize` | tras ingesta | mapear → canónico | |
| `features:compute` | tras normalizar / al predecir | construir vector | caché por (matchId, featureVersion) |
| `predict:run` | en `POST /predictions` | modelos → resultados | guarda hash de snapshot |
| `value:detect` | tras predecir | edge/EV/stake/riesgo | umbrales → recomendaciones |
| `report:generate` | tras valor | narrativa LLM + RAG → informe | validación de esquema + guardrails |
| `backtest:run` | al cambiar modelo / agendado | replay → métricas | visible a admin |
| `notify:dispatch` | informe-listo / watchlist | email/push | |
| `maintenance:recompute-stats` | nocturno | refrescar TeamStats/Elo | agregados materializados |

**Agenda:** jobs repetibles vía schedulers de BullMQ; las cuotas se ingieren con más frecuencia, lesiones/alineaciones se intensifican cerca del inicio. **Observabilidad:** métricas por cola (profundidad, latencia, fallos), dashboard Bull Board (solo admin), trazas en el pipeline. **Idempotencia:** claves naturales + upserts para no duplicar en reintentos.

---

## 19. Security and Compliance / Seguridad y Cumplimiento

### English

**AuthN/AuthZ:** JWT **access** (short-lived, ~15 min) + **refresh** (rotating, httpOnly secure cookie, reuse-detection revokes the family). Argon2id password hashing. Optional OAuth (Google) and TOTP MFA. **RBAC** with `user/analyst/admin` roles + fine-grained permissions; route guards + policy checks at use-case boundary. *(Recommendation: JWT + rotating refresh is sufficient for v1; consider a managed identity provider — Auth0/Clerk/Keycloak — to offload security if budget allows.)*

**Application security:** input validation at controller (zod/class-validator) **and** domain VOs; output encoding; parameterized queries via Prisma; **rate limiting** (per-IP + per-user, stricter on auth & prediction endpoints); brute-force lockout + captcha on repeated failures; CORS allow-list; Helmet headers/CSP; request size limits; idempotency keys on mutating endpoints; abuse detection on prediction spam.

**Secrets & keys:** no secrets in code/repo; `.env` for local only; production secrets in a **vault** (AWS Secrets Manager / Doppler / Vault); provider API keys rotated, scoped, and usage-budgeted; per-environment isolation.

**Data protection:** TLS everywhere; encryption at rest (DB + object storage); PII minimization; field-level encryption for sensitive fields; **audit logging** of admin/security actions (append-only `AuditLog`); GDPR data export/delete; configurable retention.

**Gambling compliance & responsible gambling (first-class):**
- **No guarantees** — every output is probabilistic; copy and schema enforce risk framing.
- **No bet execution** in v1; informational only.
- **Age gating** (18+/21+ per jurisdiction) at registration; jurisdiction notice; geo-aware disclaimers.
- **Minor protection**; **self-exclusion** & self-imposed limits; links to help resources/helplines on every relevant screen.
- **Terms & Conditions**, privacy policy, and explicit **legal disclaimers** ("not financial advice", "past performance ≠ future results").
- Marketing constraints: no "sure bet"/guaranteed-profit language anywhere; calibrated, sober UI.

**Threat model highlights:** credential stuffing → MFA + lockout; provider key leakage → vault + rotation; scraping/abuse of prediction API → rate limits + auth + tiering; data poisoning from a bad provider → provenance + anomaly checks + multi-provider cross-validation; LLM prompt injection via source text → sanitize retrieved content + schema-validate output + numbers are read-only.

### Español

**AuthN/AuthZ:** JWT **access** (corto, ~15 min) + **refresh** (rotatorio, cookie httpOnly segura, la detección de reuso revoca la familia). Hash de contraseñas Argon2id. OAuth (Google) y MFA TOTP opcionales. **RBAC** con roles `user/analyst/admin` + permisos finos; guards de ruta + chequeos de política en la frontera del caso de uso. *(Recomendación: JWT + refresh rotatorio basta para v1; valorar un proveedor de identidad gestionado — Auth0/Clerk/Keycloak — para delegar seguridad si el presupuesto lo permite.)*

**Seguridad de aplicación:** validación en controlador (zod/class-validator) **y** en VOs de dominio; codificación de salida; consultas parametrizadas vía Prisma; **rate limiting** (por IP + por usuario, más estricto en auth y predicción); bloqueo por fuerza bruta + captcha tras fallos repetidos; allow-list de CORS; cabeceras Helmet/CSP; límites de tamaño de petición; claves de idempotencia en endpoints mutantes; detección de abuso en spam de predicción.

**Secretos y claves:** sin secretos en código/repo; `.env` solo local; secretos de producción en **vault** (AWS Secrets Manager / Doppler / Vault); claves de proveedor rotadas, con scope y presupuesto de uso; aislamiento por entorno.

**Protección de datos:** TLS en todo; cifrado en reposo (DB + objetos); minimización de PII; cifrado a nivel de campo para datos sensibles; **auditoría** de acciones admin/seguridad (`AuditLog` append-only); exportación/borrado GDPR; retención configurable.

**Cumplimiento de juego y juego responsable (de primera clase):**
- **Sin garantías** — toda salida es probabilística; copy y esquema imponen el encuadre de riesgo.
- **Sin ejecución de apuestas** en v1; solo informativo.
- **Gating de edad** (18+/21+ según jurisdicción) en el registro; aviso de jurisdicción; disclaimers según geo.
- **Protección de menores**; **autoexclusión** y autolímites; enlaces a recursos/líneas de ayuda en cada pantalla relevante.
- **Términos y Condiciones**, política de privacidad y **disclaimers legales** explícitos ("no es asesoría financiera", "rendimiento pasado ≠ resultados futuros").
- Restricciones de marketing: nada de lenguaje de "apuesta segura"/ganancia garantizada; UI calibrada y sobria.

**Modelo de amenazas:** credential stuffing → MFA + lockout; fuga de claves → vault + rotación; abuso de la API de predicción → rate limits + auth + tiers; envenenamiento de datos → procedencia + chequeos de anomalías + validación cruzada multi-proveedor; inyección de prompt vía texto fuente → sanitizar contenido recuperado + validar esquema de salida + números de solo lectura.

---

## 20. Testing Strategy / Estrategia de Testing

### English

Test pyramid mapped to the hexagonal layers; CI gates merges on green + coverage thresholds.

- **Unit tests (domain):** Value Objects (Probability/Odds/Edge invariants), Domain Services (Poisson, Elo, Kelly, ValueCalculator) — pure, fast, deterministic; the bulk of tests. Target >90% on `domain`.
- **Use-case tests (application):** orchestration with **fake adapters** from `libs/testing` — verify flows (resolve → ingest → features → predict → value → report) without IO.
- **Repository tests (infrastructure):** Prisma repos against a **real Postgres** in a Testcontainer; verify mapping, indexes, transactions.
- **Adapter / contract tests (providers):** each provider adapter tested against **recorded fixtures** and a **contract test** ensuring the provider's response still matches the expected schema (catch breaking provider changes early). Mock-provider tests for the fakes.
- **Prediction-engine tests:** golden tests on known inputs (deterministic Poisson/Elo outputs), property-based tests (probabilities sum to 1, monotonicity), and **calibration assertions** on held-out data.
- **Backtesting tests:** verify ROI/CLV/calibration computations on synthetic + historical samples; regression-guard model metrics (a model change that worsens CLV fails CI).
- **Integration tests (api):** controller → use case → db/redis wired, key endpoints (auth, predictions, reports) with Testcontainers.
- **Contract tests (FE↔BE):** validate responses against `libs/contracts` zod schemas; consumer-driven where useful.
- **E2E tests:** Playwright across critical journeys (register+age gate → search → analyze → report → history); Newman/REST for API e2e.
- **Frontend tests:** component tests (Testing Library), visual/Storybook, accessibility (axe) checks.
- **Security tests:** authz matrix tests, rate-limit tests, dependency scanning (SCA), SAST, secret scanning, periodic DAST.
- **Data-normalization tests:** heterogeneous payloads → canonical entities, unit conversions, dedupe correctness.

**Tooling:** Jest/Vitest, Supertest, Playwright, Testcontainers, zod, fast-check (property-based), Bull test utils. **Quality gates:** coverage (domain/application >80–90%), no boundary violations (Nx), green contract tests before deploy.

### Español

Pirámide de tests mapeada a las capas hexagonales; CI bloquea merges sin verde + umbrales de cobertura.

- **Unit (dominio):** Value Objects (invariantes Probability/Odds/Edge), Servicios de Dominio (Poisson, Elo, Kelly, ValueCalculator) — puros, rápidos, deterministas; el grueso. Objetivo >90% en `domain`.
- **Casos de uso (aplicación):** orquestación con **adaptadores fake** de `libs/testing` — verificar flujos sin IO.
- **Repositorios (infraestructura):** repos Prisma contra **Postgres real** en Testcontainer; verificar mapeo, índices, transacciones.
- **Adaptadores / contrato (proveedores):** cada adaptador contra **fixtures grabados** y un **test de contrato** que garantiza que la respuesta del proveedor sigue cumpliendo el esquema (detectar cambios rompedores pronto). Tests de mock-provider.
- **Motor de predicción:** golden tests con inputs conocidos (Poisson/Elo deterministas), tests basados en propiedades (probabilidades suman 1, monotonía) y **aserciones de calibración** en datos held-out.
- **Backtesting:** verificar cálculos de ROI/CLV/calibración en muestras sintéticas + históricas; regresión de métricas (un cambio que empeora CLV falla en CI).
- **Integración (api):** controlador → caso de uso → db/redis cableados, endpoints clave (auth, predictions, reports) con Testcontainers.
- **Contrato (FE↔BE):** validar respuestas contra esquemas zod de `libs/contracts`; consumer-driven donde aporte.
- **E2E:** Playwright en journeys críticos (registro+edad → búsqueda → análisis → informe → historial); Newman/REST para e2e de API.
- **Frontend:** tests de componente (Testing Library), visual/Storybook, accesibilidad (axe).
- **Seguridad:** matriz de authz, rate-limit, escaneo de dependencias (SCA), SAST, secretos, DAST periódico.
- **Normalización de datos:** payloads heterogéneos → entidades canónicas, conversión de unidades, dedupe correcto.

**Herramientas:** Jest/Vitest, Supertest, Playwright, Testcontainers, zod, fast-check, utils de Bull. **Gates de calidad:** cobertura (dominio/aplicación >80–90%), sin violaciones de frontera (Nx), tests de contrato en verde antes de desplegar.

---

## 21. DevOps Strategy / Estrategia DevOps

### English

**Local dev (Docker Compose):** services for `postgres`, `redis`, `api`, `worker`, `web`, plus `adminer`/`bull-board` for inspection. One command boot; seeded data; Prisma migrate on start.
```yaml
# docker-compose.yml (sketch)
services:
  postgres: { image: postgres:16, ports: ["5432:5432"], env: [...], volumes: [pgdata] }
  redis:    { image: redis:7, ports: ["6379:6379"] }
  api:      { build: ./apps/api, depends_on: [postgres, redis], env_file: .env }
  worker:   { build: ./apps/worker, depends_on: [postgres, redis] }
  web:      { build: ./apps/web, depends_on: [api] }
```
**Migrations & seed:** Prisma migrations versioned in repo; `prisma migrate deploy` in CI/CD; idempotent seed scripts (reference data: competitions, market catalog, roles) + optional demo fixtures.

**CI (GitHub Actions):** on PR → `nx affected` runs lint, type-check, unit/integration tests, build, contract tests; Docker image build + scan; coverage + boundary checks as required status. Caching via Nx Cloud/remote cache for speed.
```
lint → typecheck → test (affected) → build → contract-tests → image-build+scan → (on main) deploy
```
**CD & environments:** **local → staging → production**; immutable container images tagged by SHA; promote-by-tag; DB migrations gated and reversible; blue/green or rolling deploys; feature flags via `libs/config`. Infra as Code (Terraform) recommended.

**Observability:** structured JSON logs (pino) with correlation ids; metrics (Prometheus/OpenTelemetry) — RED for API, queue depth/latency for workers, model-quality dashboards (calibration/ROI/CLV); distributed tracing (OTel) across api→worker→providers; **error monitoring** (Sentry); uptime/synthetic checks; alerting (PagerDuty/Slack).

**Backups & DR:** automated Postgres backups (PITR) + periodic restore drills; object-storage versioning; documented RPO/RTO; secrets backup in vault; runbooks for provider outages and model rollback (champion/challenger makes rollback trivial).

### Español

**Dev local (Docker Compose):** servicios `postgres`, `redis`, `api`, `worker`, `web`, más `adminer`/`bull-board` para inspección. Arranque en un comando; datos sembrados; Prisma migrate al iniciar (ver boceto arriba).

**Migraciones y seed:** migraciones Prisma versionadas; `prisma migrate deploy` en CI/CD; scripts de seed idempotentes (referencia: competiciones, catálogo de mercados, roles) + fixtures demo opcionales.

**CI (GitHub Actions):** en PR → `nx affected` corre lint, type-check, tests unit/integración, build, tests de contrato; build de imagen Docker + escaneo; cobertura + chequeos de frontera como estado requerido. Caché vía Nx Cloud/remoto para velocidad (pipeline arriba).

**CD y entornos:** **local → staging → producción**; imágenes inmutables etiquetadas por SHA; promoción por tag; migraciones gateadas y reversibles; despliegues blue/green o rolling; feature flags vía `libs/config`. IaC (Terraform) recomendado.

**Observabilidad:** logs JSON estructurados (pino) con ids de correlación; métricas (Prometheus/OpenTelemetry) — RED para API, profundidad/latencia de colas para workers, dashboards de calidad de modelo (calibración/ROI/CLV); trazas distribuidas (OTel) api→worker→proveedores; **monitoreo de errores** (Sentry); checks de uptime/sintéticos; alertas (PagerDuty/Slack).

**Backups y DR:** backups automáticos de Postgres (PITR) + simulacros de restore; versionado de almacenamiento de objetos; RPO/RTO documentados; backup de secretos en vault; runbooks para caídas de proveedor y rollback de modelo (champion/challenger lo hace trivial).

---

## 22. Development Plan by Phases / Plan de Desarrollo por Fases

### English

Each phase lists **Objective · Deliverables · Tasks · Modules · Acceptance · Risks**. Recommended order is sequential with some parallelization (FE can start once contracts exist).

**Phase 1 — Nx monorepo setup.** *Objective:* foundation + boundaries. *Deliverables:* Nx workspace, `apps/{api,worker,web}`, `libs/*`, tags + boundary lint, base tsconfig, lint/format, CI skeleton. *Tasks:* generators, tag scheme, `enforce-module-boundaries`. *Modules:* (scaffolding). *Acceptance:* `nx affected` lints; a forbidden import fails CI. *Risks:* over-engineering early — keep libs thin.

**Phase 2 — Base NestJS backend.** *Objective:* running API + worker. *Deliverables:* health endpoints, config (`libs/config`, zod env), logging/tracing, exception filter, response envelope, Swagger. *Acceptance:* `/health`, `/api/docs` live; structured logs. *Risks:* config drift — validate env at boot.

**Phase 3 — Hexagonal foundation.** *Objective:* ports/adapters skeleton. *Deliverables:* `Result` type, base entities/VOs, port interfaces, DI tokens, fake adapters in `libs/testing`. *Acceptance:* a sample use case runs with a fake adapter under test. *Risks:* abstraction creep — only add ports you use.

**Phase 4 — Database & Prisma.** *Objective:* persistence. *Deliverables:* Prisma schema for core entities, migrations, seed (roles, competitions, market catalog), repository adapters + Testcontainer tests. *Modules:* all data-owning. *Acceptance:* migrate + seed in CI; repo tests green. *Risks:* schema churn — model the time-series tables carefully now.

**Phase 5 — Auth & users.** *Objective:* secure accounts. *Deliverables:* register/login/refresh, Argon2id, JWT + rotating refresh, RBAC, age gate, RG self-limits, GDPR export/delete. *Modules:* auth, users, audit. *Acceptance:* authz matrix tests; age gate enforced. *Risks:* token handling bugs — cover with security tests.

**Phase 6 — Teams & matches.** *Objective:* core football aggregates + resolution. *Deliverables:* teams/players/competitions/matches entities + repos, fixture **search/resolution** endpoint, match detail. *Modules:* teams, players, competitions, matches. *Acceptance:* "Real Madrid vs Barcelona" resolves to ranked candidates. *Risks:* entity-resolution ambiguity — confidence + confirm step.

**Phase 7 — Provider integrations.** *Objective:* real data behind ports. *Deliverables:* one primary adapter per capability (sports data, odds, referee, injuries, lineups, weather), key management, circuit breakers, contract tests. *Modules:* data-sources, ingestion. *Acceptance:* live fetch + provenance; contract tests pass. *Risks:* licensing/cost — confirm ToS first; cache aggressively.

**Phase 8 — Ingestion & normalization.** *Objective:* canonical pipeline. *Deliverables:* BullMQ ingest/normalize queues, idempotent upserts, staleness/provenance, dead-letter. *Modules:* ingestion, data-sources. *Acceptance:* scheduled syncs populate canonical tables idempotently. *Risks:* duplicates — natural keys + upsert.

**Phase 9 — Feature engineering.** *Objective:* reproducible features. *Deliverables:* feature pipeline (form, rolling avgs, splits, H2H, SoS, absence-impact, referee tendencies), versioned + cached feature store. *Modules:* features. *Acceptance:* deterministic vector per `(matchId, version)`. *Risks:* leakage — strict as-of-kickoff cutoffs.

**Phase 10 — First statistical prediction engine.** *Objective:* baseline probabilities. *Deliverables:* Poisson/Dixon-Coles + Elo for 1X2/OU/BTTS, golden + property tests, `Prediction`/`PredictionResult` persistence. *Modules:* predictions. *Acceptance:* calibrated baseline; probabilities valid & reproducible. *Risks:* poor calibration — add isotonic/Platt.

**Phase 11 — Odds & value betting.** *Objective:* edge detection. *Deliverables:* odds snapshots + movement, implied-prob (de-margined), edge/EV, fractional-Kelly conservative stake, thresholds → recommendations. *Modules:* odds, value-betting, recommendations. *Acceptance:* value flagged only past gates; "no value found" works. *Risks:* over-aggressive stakes — hard caps + tests.

**Phase 12 — AI-generated reports.** *Objective:* explainable output. *Deliverables:* `LlmExplanationPort` + RAG retriever, report assembly, guardrail validator, EN/ES narrative, sources, RG warning, immutable persistence + cache. *Modules:* ai-analysis, reports. *Acceptance:* narrative never contradicts numbers; warning + citations present. *Risks:* hallucination — numbers read-only + schema validation.

**Phase 13 — Frontend dashboard.** *Objective:* user shell. *Deliverables:* Next.js app, auth flow, dashboard, watchlist, design system (`libs/ui`), i18n EN/ES. *Modules:* (FE). *Acceptance:* login → dashboard → watchlist works; a11y AA. *Risks:* contract drift — generate clients from `contracts`.

**Phase 14 — Match analysis page.** *Objective:* trigger + view analysis. *Deliverables:* search UI, analyze CTA, job-progress (poll/SSE), full report view with charts, risk meter, sources. *Acceptance:* end-to-end fixture → report in UI. *Risks:* long jobs — progressive/streaming UI.

**Phase 15 — Prediction history.** *Objective:* persistence UX. *Deliverables:* history list/filter, report re-open, outcome tagging (post-match settle job). *Modules:* reports, predictions. *Acceptance:* past reports retrievable, immutable. *Risks:* outcome mislabeling — settle from authoritative results.

**Phase 16 — Admin panel.** *Objective:* ops & governance. *Deliverables:* data-source health, sync triggers, user/role mgmt, model versions + backtest view, audit browser. *Modules:* admin, audit, backtesting. *Acceptance:* admin-only RBAC; sync from UI. *Risks:* privilege escalation — strict guards + audit.

**Phase 17 — Testing strategy implementation.** *Objective:* quality gates. *Deliverables:* full pyramid wired in CI, coverage thresholds, contract + e2e (Playwright), backtest regression guard. *Acceptance:* CI blocks on red/coverage/boundaries. *Risks:* flaky e2e — Testcontainers + retries.

**Phase 18 — Security hardening.** *Objective:* production-grade. *Deliverables:* rate limits, MFA option, vault secrets, SAST/SCA/DAST in CI, pen-test fixes, RG/legal copy review. *Acceptance:* ASVS L2 checklist; clean scans. *Risks:* compliance gaps — legal review before launch.

**Phase 19 — Deployment.** *Objective:* ship. *Deliverables:* staging+prod infra (IaC), CD pipeline, observability, backups/DR drills, runbooks. *Acceptance:* promote-by-tag deploy; alerts + dashboards live. *Risks:* migration downtime — reversible, gated migrations.

**Phase 20 — Future roadmap.** *Objective:* evolve. *Deliverables:* ML/gradient-boosting models, Python `model-service`, GraphQL gateway, more markets/leagues, mobile. *Acceptance:* models beat baseline on CLV before promotion. *Risks:* scope creep — gate by backtest evidence.

### Español

Cada fase lista **Objetivo · Entregables · Tareas · Módulos · Aceptación · Riesgos**. Orden secuencial con algo de paralelización (el FE puede empezar al existir los contratos).

**Fase 1 — Setup monorepo Nx.** *Objetivo:* base + fronteras. *Entregables:* workspace Nx, `apps/{api,worker,web}`, `libs/*`, tags + lint de frontera, tsconfig base, lint/format, esqueleto de CI. *Aceptación:* `nx affected` lintea; un import prohibido falla CI. *Riesgos:* sobre-ingeniería temprana — libs delgadas.

**Fase 2 — Backend NestJS base.** *Objetivo:* API + worker corriendo. *Entregables:* health, config (zod env), logging/trazas, filtro de excepción, envelope, Swagger. *Aceptación:* `/health`, `/api/docs`. *Riesgos:* deriva de config — validar env al boot.

**Fase 3 — Base hexagonal.** *Objetivo:* esqueleto ports/adapters. *Entregables:* tipo `Result`, entidades/VOs base, interfaces de puerto, tokens DI, fakes en `libs/testing`. *Aceptación:* caso de uso de ejemplo con fake. *Riesgos:* abstracción excesiva — solo puertos usados.

**Fase 4 — DB & Prisma.** *Objetivo:* persistencia. *Entregables:* esquema core, migraciones, seed (roles, competiciones, catálogo), repos + tests Testcontainer. *Aceptación:* migrate+seed en CI; repos verdes. *Riesgos:* cambios de esquema — modelar bien las series temporales ya.

**Fase 5 — Auth & users.** *Objetivo:* cuentas seguras. *Entregables:* register/login/refresh, Argon2id, JWT + refresh rotatorio, RBAC, gate de edad, autolímites JR, export/borrado GDPR. *Aceptación:* matriz authz; gate de edad. *Riesgos:* bugs de tokens — tests de seguridad.

**Fase 6 — Teams & matches.** *Objetivo:* agregados core + resolución. *Entregables:* entidades + repos, endpoint de **búsqueda/resolución**, detalle de match. *Aceptación:* "Real Madrid vs Barcelona" → candidatos. *Riesgos:* ambigüedad — confianza + confirmación.

**Fase 7 — Integraciones de proveedor.** *Objetivo:* datos reales tras puertos. *Entregables:* un adaptador primario por capacidad, gestión de claves, circuit breakers, tests de contrato. *Aceptación:* fetch en vivo + procedencia. *Riesgos:* licencia/coste — confirmar ToS; cachear.

**Fase 8 — Ingesta & normalización.** *Objetivo:* pipeline canónico. *Entregables:* colas ingest/normalize, upserts idempotentes, obsolescencia/procedencia, dead-letter. *Aceptación:* syncs pueblan tablas idempotentemente. *Riesgos:* duplicados — claves naturales + upsert.

**Fase 9 — Ingeniería de features.** *Objetivo:* features reproducibles. *Entregables:* pipeline (forma, medias móviles, splits, H2H, SoS, impacto de ausencias, árbitro), feature store versionado + cacheado. *Aceptación:* vector determinista por `(matchId, version)`. *Riesgos:* leakage — cortes estrictos as-of-kickoff.

**Fase 10 — Primer motor estadístico.** *Objetivo:* baseline. *Entregables:* Poisson/Dixon-Coles + Elo para 1X2/OU/BTTS, golden + property tests, persistencia. *Aceptación:* baseline calibrado; probabilidades válidas y reproducibles. *Riesgos:* mala calibración — isotónica/Platt.

**Fase 11 — Odds & value betting.** *Objetivo:* detección de edge. *Entregables:* snapshots + movimiento, prob. implícita (sin margen), edge/EV, stake Kelly fraccionado, umbrales → recomendaciones. *Aceptación:* valor solo tras gates; "sin valor" funciona. *Riesgos:* stakes agresivos — topes + tests.

**Fase 12 — Informes IA.** *Objetivo:* salida explicable. *Entregables:* `LlmExplanationPort` + RAG, ensamblado, validador de guardrails, narrativa EN/ES, fuentes, aviso JR, persistencia inmutable + caché. *Aceptación:* narrativa no contradice números; aviso + citas. *Riesgos:* alucinación — números read-only + esquema.

**Fase 13 — Dashboard frontend.** *Objetivo:* shell de usuario. *Entregables:* app Next.js, flujo de auth, dashboard, watchlist, design system, i18n EN/ES. *Aceptación:* login → dashboard → watchlist; a11y AA. *Riesgos:* deriva de contrato — generar clientes desde `contracts`.

**Fase 14 — Página de análisis.** *Objetivo:* disparar + ver análisis. *Entregables:* UI de búsqueda, CTA analizar, progreso de job (poll/SSE), informe con gráficos, medidor de riesgo, fuentes. *Aceptación:* partido → informe en UI. *Riesgos:* jobs largos — UI progresiva/streaming.

**Fase 15 — Historial.** *Objetivo:* UX de persistencia. *Entregables:* lista/filtro, reapertura, etiquetado de resultado (job post-partido). *Aceptación:* informes pasados recuperables, inmutables. *Riesgos:* mal etiquetado — liquidar desde resultados autoritativos.

**Fase 16 — Panel admin.** *Objetivo:* ops y gobierno. *Entregables:* salud de fuentes, syncs, gestión usuarios/roles, versiones + backtest, navegador de auditoría. *Aceptación:* RBAC admin; sync desde UI. *Riesgos:* escalada de privilegios — guards + auditoría.

**Fase 17 — Implementación de testing.** *Objetivo:* gates de calidad. *Entregables:* pirámide en CI, umbrales, contrato + e2e (Playwright), regresión de backtest. *Aceptación:* CI bloquea por rojo/cobertura/fronteras. *Riesgos:* e2e flaky — Testcontainers + reintentos.

**Fase 18 — Hardening de seguridad.** *Objetivo:* grado producción. *Entregables:* rate limits, MFA, secretos en vault, SAST/SCA/DAST en CI, fixes de pen-test, revisión de copy JR/legal. *Aceptación:* checklist ASVS L2; escaneos limpios. *Riesgos:* huecos de cumplimiento — revisión legal antes del lanzamiento.

**Fase 19 — Despliegue.** *Objetivo:* publicar. *Entregables:* infra staging+prod (IaC), CD, observabilidad, backups/DR, runbooks. *Aceptación:* deploy por tag; alertas + dashboards. *Riesgos:* downtime de migración — migraciones reversibles y gateadas.

**Fase 20 — Roadmap futuro.** *Objetivo:* evolucionar. *Entregables:* modelos ML/gradient boosting, `model-service` Python, gateway GraphQL, más mercados/ligas, móvil. *Aceptación:* modelos baten baseline en CLV antes de promover. *Riesgos:* scope creep — gatear por evidencia de backtest.

---

## 23. MVP Roadmap / Roadmap MVP

### English

**MVP goal:** a trustworthy single-flow product — user searches a fixture, gets a calibrated, explained, risk-framed report — on a small set of top leagues.

- **Milestone A (Foundations):** Phases 1–5 — monorepo, NestJS, hexagonal base, DB/Prisma, auth + RG/age gate.
- **Milestone B (Core data):** Phases 6–9 — teams/matches + resolution, **one** provider per capability, ingestion/normalization, feature pipeline — limited to ~3–5 leagues.
- **Milestone C (Predictions & value):** Phases 10–11 — Poisson/Elo baseline for 1X2/OU/BTTS + value detection with conservative staking + backtest harness.
- **Milestone D (Explainable report + UI):** Phases 12–15 — LLM/RAG report (EN/ES), dashboard, analysis page, history.
- **Milestone E (Ops minimum):** slices of Phases 16–19 — basic admin (data-source health, sync), CI gates, staging deploy, observability + backups.

**MVP scope guards:** few leagues, few markets (1X2, OU2.5, BTTS, corners, cards), single provider per capability with caching, conservative stakes, "no value found" honesty, full RG/legal. **Explicitly deferred:** gradient-boosting ML, GraphQL, mobile, broad market/league coverage, automated outcome ML retraining.

### Español

**Objetivo MVP:** producto confiable de un solo flujo — el usuario busca un partido y obtiene un informe calibrado, explicado y enmarcado en riesgo — en pocas ligas top.

- **Hito A (Fundaciones):** Fases 1–5 — monorepo, NestJS, base hexagonal, DB/Prisma, auth + JR/edad.
- **Hito B (Datos core):** Fases 6–9 — teams/matches + resolución, **un** proveedor por capacidad, ingesta/normalización, pipeline de features — limitado a ~3–5 ligas.
- **Hito C (Predicción y valor):** Fases 10–11 — baseline Poisson/Elo para 1X2/OU/BTTS + detección de valor con stake conservador + backtest.
- **Hito D (Informe explicable + UI):** Fases 12–15 — informe LLM/RAG (EN/ES), dashboard, página de análisis, historial.
- **Hito E (Ops mínimo):** partes de Fases 16–19 — admin básico (salud de fuentes, sync), gates de CI, deploy a staging, observabilidad + backups.

**Límites del MVP:** pocas ligas, pocos mercados (1X2, OU2.5, BTTS, córners, tarjetas), un proveedor por capacidad con caché, stakes conservadores, honestidad de "sin valor", JR/legal completo. **Diferido:** ML gradient boosting, GraphQL, móvil, cobertura amplia, reentrenamiento ML automático.

---

## 24. Advanced Version Roadmap / Roadmap Versión Avanzada

### English

Post-MVP evolution, **gated by backtest/CLV evidence**, not hype:

- **Modeling:** add gradient boosting / calibrated ensembles; dedicated Python `model-service` (FastAPI) behind `PredictionModelPort`; automated retraining with drift detection; player-level and lineup-dependent models; live/in-play models (separate pipeline).
- **Markets & coverage:** more markets (player props, HT/FT combos, Asian lines depth), more leagues/competitions, multi-bookmaker odds aggregation + best-line detection, CLV tracking dashboards per user.
- **AI layer:** richer RAG corpus (curated, licensed), multilingual narratives beyond EN/ES, explanation quality scoring, what-if scenario explanations.
- **Platform:** GraphQL gateway over the same `contracts`; mobile app (React Native) reusing `libs/ui` patterns; public API for partners (rate-limited, tiered); webhooks/notifications.
- **Personalization:** user risk profiles, custom thresholds, bankroll-aware staking suggestions (still conservative, still no execution), watchlist intelligence.
- **Trust & governance:** public methodology/transparency reports, model cards, calibration dashboards exposed to users; A/B of model versions via champion/challenger.
- **Possible later (separate legal review):** if-and-only-if compliant in a jurisdiction, optional bet-slip *hand-off* (deep link to a licensed operator) — never in-app execution; requires dedicated legal/compliance workstream.

### Español

Evolución post-MVP, **gateada por evidencia de backtest/CLV**, no por hype:

- **Modelado:** añadir gradient boosting / ensembles calibrados; `model-service` Python (FastAPI) tras `PredictionModelPort`; reentrenamiento automático con detección de drift; modelos a nivel jugador y dependientes de alineación; modelos en vivo (pipeline aparte).
- **Mercados y cobertura:** más mercados (props de jugador, combos PP/Final, profundidad asiática), más ligas, agregación multi-bookmaker + mejor línea, dashboards de CLV por usuario.
- **Capa IA:** corpus RAG más rico (curado, licenciado), narrativas multilingües más allá de EN/ES, scoring de calidad de explicación, explicaciones de escenarios what-if.
- **Plataforma:** gateway GraphQL sobre los mismos `contracts`; app móvil (React Native) reutilizando patrones de `libs/ui`; API pública para partners (rate-limited, por tiers); webhooks/notificaciones.
- **Personalización:** perfiles de riesgo, umbrales propios, sugerencias de stake según bankroll (conservadoras, sin ejecución), inteligencia de watchlist.
- **Confianza y gobierno:** informes públicos de metodología/transparencia, model cards, dashboards de calibración para usuarios; A/B de versiones vía champion/challenger.
- **Posible más adelante (revisión legal aparte):** solo si es conforme en una jurisdicción, *hand-off* opcional de bet-slip (deep link a operador con licencia) — nunca ejecución in-app; requiere un workstream legal/compliance dedicado.

---

## 25. Technical Risks and Mitigation / Riesgos Técnicos y Mitigación

### English

| Risk | Impact | Mitigation |
|---|---|---|
| **Data licensing/cost** | Legal exposure, budget overrun | Confirm ToS/licensing per provider before integrating; abstract behind ports; cache aggressively; multi-provider fallback; usage budgets. |
| **Provider outages / breaking changes** | Stale or failed analysis | Circuit breakers, retries/backoff, contract tests, last-known + staleness flags, multi-provider. |
| **Poor model calibration** | Misleading edges | Mandatory calibration (Platt/isotonic), backtesting gates (Brier/CLV), champion/challenger, confidence gating. |
| **Overfitting / data leakage** | Inflated backtest, real losses | As-of-kickoff feature cutoffs, out-of-sample validation, CLV as honest metric, rejected if only beats by overfit. |
| **LLM hallucination** | False/contradictory narrative | Numbers read-only to LLM, RAG-grounded sources, schema + guardrail validation, templated fallback. |
| **Regulatory/compliance** | Shutdown, fines | No guarantees, no execution v1, age/geo gating, RG features, legal review, audit logs. |
| **Aggressive staking harm** | User harm, reputational | Fractional Kelly + hard caps + min-edge gating, "no value found" honesty, sober UI. |
| **Scalability of time-series** | Slow queries at scale | Partitioning, precomputed aggregates/materialized views, read replicas, proper indexes, optional Timescale. |
| **Boundary erosion** | Unmaintainable coupling | Nx tags + `enforce-module-boundaries` as CI gate, code review, architecture tests. |
| **Cost of LLM/providers at scale** | Margin erosion | Caching, token budgets per tier, batch where possible, cheaper models for non-critical synthesis. |
| **Security breaches** | Data loss, abuse | ASVS L2, MFA, vault, rate limits, SAST/SCA/DAST, pen-tests, least privilege. |
| **Scope creep** | Delivery slippage | Backtest-gated roadmap, MVP discipline, phase acceptance criteria. |

### Español

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **Licencia/coste de datos** | Exposición legal, sobrecoste | Confirmar ToS/licencia por proveedor; abstraer tras puertos; cachear; fallback multi-proveedor; presupuestos de uso. |
| **Caídas/cambios de proveedor** | Análisis obsoleto o fallido | Circuit breakers, reintentos/backoff, tests de contrato, último-conocido + obsolescencia, multi-proveedor. |
| **Mala calibración** | Edges engañosos | Calibración obligatoria, gates de backtesting (Brier/CLV), champion/challenger, gating por confianza. |
| **Sobreajuste / leakage** | Backtest inflado, pérdidas reales | Cortes as-of-kickoff, validación out-of-sample, CLV como métrica honesta, rechazo si solo bate por overfit. |
| **Alucinación LLM** | Narrativa falsa/contradictoria | Números read-only, fuentes RAG, validación esquema + guardrails, fallback por plantilla. |
| **Regulatorio/cumplimiento** | Cierre, multas | Sin garantías, sin ejecución v1, gating edad/geo, features JR, revisión legal, auditoría. |
| **Daño por stake agresivo** | Daño al usuario, reputación | Kelly fraccionado + topes + min-edge, honestidad "sin valor", UI sobria. |
| **Escala de series temporales** | Consultas lentas | Particionado, agregados precomputados/vistas materializadas, réplicas, índices, Timescale opcional. |
| **Erosión de fronteras** | Acoplamiento inmanejable | Tags Nx + `enforce-module-boundaries` en CI, code review, tests de arquitectura. |
| **Coste LLM/proveedores a escala** | Erosión de margen | Caché, presupuestos de tokens por tier, batch, modelos más baratos para síntesis no crítica. |
| **Brechas de seguridad** | Pérdida de datos, abuso | ASVS L2, MFA, vault, rate limits, SAST/SCA/DAST, pen-tests, mínimo privilegio. |
| **Scope creep** | Retrasos | Roadmap gateado por backtest, disciplina de MVP, criterios de aceptación por fase. |

---

## 26. Final Recommendations / Recomendaciones Finales

### English

1. **Lead with honesty, not hype.** The product's moat is trust: calibrated probabilities, explainable reasoning, transparent sources, and relentless risk framing. "No value found" is a feature.
2. **Keep the LLM in its lane.** Data and statistical/ML models produce numbers; the LLM only explains. Enforce this structurally (module boundaries + read-only numeric context + guardrail validation).
3. **Backtest before you trust.** No model ships without ROI/calibration/**CLV** evidence on out-of-sample data. CLV ≥ 0 over large samples is the strongest honest signal.
4. **Respect the architecture.** Hexagonal + Nx tags keep the domain pure and providers swappable; enforce boundaries in CI so they don't erode.
5. **Start narrow, prove value.** MVP: few leagues, few markets, one provider per capability, conservative staking — then expand by evidence, not ambition.
6. **Compliance is product, not paperwork.** Age/geo gating, responsible-gambling tooling, no guarantees, no bet execution in v1 — built in from day one and legally reviewed before launch.
7. **Design for provider reality.** Outages, rate limits, costs, and breaking changes are certain — circuit breakers, caching, multi-provider, and contract tests are non-negotiable.
8. **Plan the ML escape hatch early.** Keep `PredictionModelPort` clean so a Python `model-service` can slot in for gradient boosting without touching the domain.
9. **Make reproducibility a first-class concern.** Store model version + input snapshot per prediction; immutable reports; champion/challenger for safe model evolution.
10. **Next step:** proceed to step-by-step implementation prompts phase-by-phase (starting at Phase 1), generating code against these contracts and boundaries.

### Español

1. **Liderar con honestidad, no con hype.** El foso del producto es la confianza: probabilidades calibradas, razonamiento explicable, fuentes transparentes y encuadre de riesgo constante. "Sin valor" es una característica.
2. **Mantener al LLM en su carril.** Los datos y los modelos estadísticos/ML producen los números; el LLM solo explica. Imponerlo estructuralmente (fronteras + contexto numérico read-only + validación de guardrails).
3. **Backtest antes de confiar.** Ningún modelo se publica sin evidencia de ROI/calibración/**CLV** out-of-sample. CLV ≥ 0 en muestras grandes es la señal honesta más fuerte.
4. **Respetar la arquitectura.** Hexagonal + tags Nx mantienen el dominio puro y los proveedores intercambiables; imponer fronteras en CI para que no se erosionen.
5. **Empezar estrecho, probar valor.** MVP: pocas ligas, pocos mercados, un proveedor por capacidad, stake conservador — luego expandir por evidencia, no por ambición.
6. **El cumplimiento es producto, no papeleo.** Gating de edad/geo, herramientas de juego responsable, sin garantías, sin ejecución de apuestas en v1 — integrado desde el día uno y revisado legalmente antes del lanzamiento.
7. **Diseñar para la realidad de los proveedores.** Caídas, rate limits, costes y cambios rompedores son seguros — circuit breakers, caché, multi-proveedor y tests de contrato son innegociables.
8. **Planear pronto la salida hacia ML.** Mantener `PredictionModelPort` limpio para que un `model-service` Python encaje para gradient boosting sin tocar el dominio.
9. **Hacer de la reproducibilidad algo de primera clase.** Guardar versión de modelo + snapshot de inputs por predicción; informes inmutables; champion/challenger para evolución segura.
10. **Siguiente paso:** avanzar a prompts de implementación paso a paso, fase por fase (empezando en la Fase 1), generando código contra estos contratos y fronteras.

---

> **End of SPEC & Development Plan v1.0 / Fin del SPEC y Plan de Desarrollo v1.0**
> Next: per-phase implementation prompts on request. / Siguiente: prompts de implementación por fase, bajo petición.






