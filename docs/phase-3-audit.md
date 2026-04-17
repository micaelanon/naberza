# Phase 3 Audit — Naberza OS

**Fecha**: 2026-04-17
**Auditor**: GPT-5.4 (análisis) con Sonnet (implementación posterior)

---

## 1. Instrucciones leídas del proyecto de referencia

Ruta: `/Users/micaelai/.openclaw/workspace/projects/copilot-instructions-test/instructions/`

| # | Archivo | Leído |
|---|---------|-------|
| 1 | naming-conventions.instructions.md | ✅ |
| 2 | imports-exports.instructions.md | ✅ |
| 3 | typescript-conventions.instructions.md | ✅ |
| 4 | styling-bem-tokens.instructions.md | ✅ |
| 5 | utilities-conventions.instructions.md | ✅ |
| 6 | git-branching-workflow.instructions.md | ✅ |
| 7 | cicd-github-vercel.instructions.md | ✅ |
| 8 | environment-config.instructions.md | ✅ |
| 9 | nextjs-project-structure.instructions.md | ✅ |
| 10 | nextjs-data-fetching.instructions.md | ✅ |
| 11 | nextjs-routing.instructions.md | ✅ |
| 12 | nextjs-testing.instructions.md | ✅ |
| 13 | react-components.instructions.md | ✅ |
| 14 | react-testing.instructions.md | ✅ |
| 15 | react-project-structure.instructions.md | ✅ |
| 16 | react-api-layer.instructions.md | No leído (React SPA, no aplica a Next.js) |
| 17 | react-hooks.instructions.md | No leído (no hay hooks custom en Phase 3) |
| 18 | react-state-management.instructions.md | No leído (no hay state management en Phase 3) |
| 19 | react-styling.instructions.md | No leído (cubierto por styling-bem-tokens) |

---

## 2. Estado actual de Naberza

### Estructura reusable y válida

| Aspecto | Estado | Cumple instrucciones |
|---------|--------|---------------------|
| `src/app/` solo contiene rutas, layouts, pages | ✅ | ✅ |
| `src/components/` dividido en `domain/` y `ui/` | ✅ | ✅ |
| `src/lib/` contiene utilidades, db, auth, env, adapters | ✅ | ✅ |
| `src/modules/` contiene lógica de dominio | ✅ | ✅ (equivale a `application/`) |
| `src/types/` contiene tipos compartidos | ✅ | ✅ |
| `src/styles/tokens.css` define design tokens | ✅ | ✅ |
| `@types/env.d.ts` tipado de env | ✅ | ✅ |
| Path alias `@/` → `src/` | ✅ | ✅ |
| kebab-case en archivos y carpetas | ✅ | ✅ |
| PascalCase en clases/interfaces | ✅ | ✅ |
| camelCase en funciones/variables | ✅ | ✅ |
| `tsconfig.json` strict + noEmit + alias | ✅ | ✅ |
| `tsconfig.node.json` composite:true | ✅ | ✅ |
| `vitest.config.ts` con jsdom + setupFiles | ✅ | ✅ |
| `vitest.setup.ts` con cleanup + jest-dom | ✅ | ✅ |
| `eslint` con simple-import-sort + sonarjs + regexp | ✅ | ✅ |
| Git: `develop` como integración, `feature/*`, `bugfix/*`, `internal/*` | ✅ | ✅ |
| CI en GitHub Actions | ✅ | Parcial (ver abajo) |
| `jscpd` para duplicación | ✅ | ✅ |

### Partes mock, provisionales o incompletas

| Archivo/directorio | Tipo | Problema |
|--------------------|------|----------|
| `src/modules/integrations/adapters/paperless/` | Stub | Tiene `PaperlessDocumentProvider` que lanza `NotImplementedError`. El real está en `src/lib/adapters/paperless/`. **Duplicación dead code.** |
| `src/modules/integrations/adapters/home-assistant/` | Stub | Idem. Real en `src/lib/adapters/home-assistant/`. |
| `src/modules/integrations/adapters/mail/` | Stub | Idem. Real en `src/lib/adapters/mail/`. |
| `src/modules/integrations/adapters/notifications/` | Stub | `TelegramNotificationAdapter` lanza NotImplementedError. No hay adapter real. |
| `src/modules/integrations/providers/` | Stub | Tipos de provider interfaces aspiracionales (DocumentProvider, HomeAutomationProvider, etc.). Los adapters reales implementan `BaseAdapter` directamente. |
| `src/modules/automations/index.ts` | Placeholder | Vacío excepto comentario. |
| `src/modules/documents/index.ts` | Placeholder | Vacío excepto comentario. |
| `src/modules/finance/index.ts` | Placeholder | Vacío excepto comentario. |
| `src/modules/home/index.ts` | Placeholder | Vacío excepto comentario. |
| `src/modules/ideas/index.ts` | Placeholder | Vacío excepto comentario. |
| `src/modules/invoices/index.ts` | Placeholder | Vacío excepto comentario. |
| `src/modules/users/index.ts` | Placeholder | Vacío excepto comentario. |
| Audit service | In-memory | `AuditService` usa `InMemoryAuditStore`, no Prisma. Los audit events del seed no se muestran en la UI. |
| `@supabase/supabase-js` en dependencies | Dead dep | No se usa en ningún sitio. Residuo de scaffolding inicial. |

### Incumplimientos respecto a las instrucciones

#### I-01: CSS hardcoded (styling-bem-tokens.instructions.md)
**Regla**: "Never hardcode — always use CSS custom properties."
**Realidad**: `tasks-view.css` tiene ~30 colores hex hardcoded como fallbacks (`#c0392b`, `#fff`, `#fef2f2`, etc.). Otros CSS files tienen fallbacks con hex.
**Impacto**: Bajo (son fallbacks), pero incumple la regla literal.
**Acción**: Reemplazar hex por tokens existentes o definir tokens nuevos. Eliminar fallbacks hardcoded.

#### I-02: Exports (imports-exports.instructions.md)
**Regla**: "Components → export default. Types → export named."
**Realidad**: Todos los componentes usan `export default`. ✅
**Sin embargo**: Los barrels (`index.ts`) usan `export { default } from "./component"` en algunos y named exports en otros. Inconsistente pero no roto.
**Acción**: Verificar, normalizar si necesario. Impacto bajo.

#### I-03: Props location (react-components.instructions.md)
**Regla**: "Props are ALWAYS defined in utils/types.ts."
**Realidad**: La mayoría de componentes actuales no tienen props significativas (son server components sin props o con props triviales). `login-form` sí tiene `utils/types.ts`. ✅
**Acción**: Ninguna inmediata. Los componentes existentes cumplen o no tienen props que justifiquen extraer.

#### I-04: CI pipeline (cicd-github-vercel.instructions.md)
**Regla**: Jobs separados: detect-secrets, lint, type-check, unit-test, CodeQL/Semgrep. Coverage artifact. format:check.
**Realidad**: CI actual tiene 1 solo job `check` que corre todo en serie. No hay detect-secrets. No hay format:check. CodeQL existe como workflow separado ✅. No hay Semgrep. No hay coverage upload.
**Acción**: Mejorar CI sin romper lo existente. Separar jobs es deseable pero no bloquea. detect-secrets y format:check son gaps reales.

#### I-05: loading.tsx / error.tsx (nextjs-routing.instructions.md)
**Regla**: "`loading.tsx` for every data-fetching page. `error.tsx` for every segment that could fail."
**Realidad**: No hay ningún `loading.tsx` ni `error.tsx` en ningún segmento.
**Acción**: Crear loading.tsx y error.tsx para segmentos con data fetching: inbox, tasks, audit.

#### I-06: Stubs duplicados (integrations/adapters)
**Regla**: No presentar código no funcional como real.
**Realidad**: `modules/integrations/adapters/` tiene stubs que lanzan NotImplementedError. Los adapters reales viven en `lib/adapters/`.
**Acción**: Eliminar stubs o reconsolidar. Recomendación: eliminar `modules/integrations/adapters/` y mantener `modules/integrations/providers/` como tipos de referencia si se desea. Pero los providers tampoco están siendo usados.

#### I-07: Roadmap desactualizado
**Regla**: Documentación viva debe reflejar realidad.
**Realidad**: `docs/roadmap.md` muestra Phase 1-8 como no completadas. Phase 0, 1, 2 están completadas en realidad.
**Acción**: Actualizar roadmap.

#### I-08: Tests sync functions
**Regla**: Tests de funcionalidad existente.
**Realidad**: `syncPaperlessDocuments`, `syncHomeAssistantAlerts`, `syncMailMessages` no tienen tests.
**Acción**: Añadir tests.

#### I-09: Webhook route sin tests
**Regla**: "API Routes test with NextRequest constructor."
**Realidad**: `POST /webhooks/api/[token]` no tiene tests (solo `webhook-auth.ts` tiene tests).
**Acción**: Añadir tests de route handler.

---

## 3. ¿Qué es Phase 3 realmente?

Según `docs/roadmap.md`:
> **Phase 3 — Home & Events**: Home Assistant adapter + Home module + HA events pipeline + Safe service calls

**Estado**:
- HA adapter: ✅ HECHO (en `lib/adapters/home-assistant/`)
- Home module: ❌ Placeholder vacío
- HA events → InboxItem: ✅ HECHO (`syncHomeAssistantAlerts`)
- Safe service calls: ❌ No implementado (callService existe pero sin approval flow)

**Pero**: El roadmap original es aspiracional y ya fue reordenado en la práctica. Las fases 2-4 del roadmap se ejecutaron como "adapters primero" (Phase 2 práctica), dejando los módulos de dominio para después.

### Decisión: ¿Qué cierra Phase 3?

**No voy a inventar módulos nuevos** que no estaban previstos para este momento.

Phase 3 se cierra con:
1. Alineación con instrucciones del proyecto de referencia (gaps I-01 a I-09)
2. Tests de funcionalidad existente sin tests
3. CI robusta
4. Documentación sincronizada con la realidad
5. Limpieza de dead code / stubs

---

## 4. Tareas identificadas para cerrar Phase 3

| ID | Tarea | Complejidad | Modelo |
|----|-------|-------------|--------|
| P3-00 | Auditoría + diagnóstico | medium | GPT-5.4 |
| P3-01 | Limpieza stubs modules/integrations | low | GPT-5.4 |
| P3-02 | CSS hardcoded → tokens | low | Haiku |
| P3-03 | Default exports alineación | low | GPT-5.4 (análisis) |
| P3-04 | Tests sync functions | medium | Sonnet |
| P3-05 | CI alineación | medium | GPT-5.4 |
| P3-06 | Roadmap actualización | low | GPT-5.4 |
| P3-07 | Props types check | low | Haiku |
| P3-08 | loading.tsx + error.tsx | low | Haiku |
| P3-09 | Webhook route tests | medium | Sonnet |

---

## 5. Lo que NO debe tocarse

- Estructura de carpetas principal (funciona, es coherente)
- Módulos operativos (inbox, tasks, audit, dashboard)
- Adapters funcionales (lib/adapters/*)
- Auth flow
- Event bus + audit subscriptions
- Prisma schema (no hay cambios de dominio en Phase 3)
- Docker setup

---

## 6. Riesgos

| Riesgo | Mitigación |
|--------|-----------|
| Eliminar stubs rompe imports | Verificar que nada importa de modules/integrations/adapters/ |
| Cambiar exports rompe builds | Verificar cada cambio con type-check + build |
| CI changes bloquean PRs | Añadir nuevos checks como non-blocking primero |
| Tokens CSS incompletos | Definir tokens que falten antes de usarlos |

---

## 7. Hallazgos fuera de Phase 3 (documentados, no implementados)

1. `@supabase/supabase-js` es dead dependency — eliminar en una limpieza futura
2. Audit service in-memory debería migrar a Prisma-backed — Phase 4+
3. Módulos de dominio (Document, Invoice, Home, Finance, Ideas) — Phase 4+
4. Automation engine — Phase futura
5. Notifications (Telegram) — Phase futura
6. E2E tests (Playwright) — Phase futura
7. Husky / commitlint / lint-staged — mejora de DX futura
