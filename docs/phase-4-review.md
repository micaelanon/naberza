# Phase 4 Architecture Review — P4-06

**Fecha**: 2026-04-17  
**Modelo**: Claude Opus 4.6  
**Scope**: Auditoría post Phase 4 — todos los domain modules implementados

---

## Resumen ejecutivo

El sistema está en buen estado estructural. Los 5 módulos de dominio (Documents, Invoices, Home, Finance, Ideas) siguen un patrón consistente: types → repository → service → API routes → view. El event bus, audit system y adapter registry forman una infraestructura sólida. Hay deuda técnica manejable que conviene resolver antes de Phase 5 (Automations).

**Veredicto: listo para Phase 5 tras resolver los issues críticos (0) y los importantes (3).**

---

## 1. Coherencia de módulos

### ✅ Lo que funciona bien

- **Patrón Service-Repository uniforme**: todos los módulos P4 siguen la misma estructura. Predecible, mantenible.
- **Types separados**: cada módulo tiene su `*.types.ts` con input/output/summary types. Bien.
- **Index barrels**: exports limpios, sin leaks de implementación interna.
- **Eventos tipados**: todos los servicios emiten eventos correctamente con `timestamp` + `actor: { type: "system" }`.
- **Tests consistentes**: patrón `vi.hoisted()` + mock de repo + mock de eventBus en todos los service tests.

### ⚠️ Inconsistencias detectadas

| Issue | Severidad | Detalle |
|-------|-----------|---------|
| Naming inconsistency | Media | `ideas.types.ts` vs `document.types.ts` — Ideas usa plural, los demás singular. Afecta: `ideas.repository.ts`, `ideas.service.ts` |
| Duplicate types provider-types | Media | `HealthCheckResult`, `AdapterError`, `AdapterErrorCode`, `BaseAdapter` están duplicados en `src/lib/adapters/adapter-types.ts` y `src/modules/integrations/providers/provider-types.ts` |
| Dashboard stats hardcoded zeros | Baja | `documentsRecent`, `invoicesUnpaid`, `homeAlerts` retornan `0` siempre — ahora que los módulos existen deberían consultar los repos reales |

---

## 2. Fronteras de módulo

### ✅ Bien respetadas

- Ningún módulo importa directamente el repository de otro módulo.
- Los cross-module refs son por ID (ej: `invoiceId` en FinancialEntry, `documentId` en Invoice, `inboxItemId` en Idea).
- No hay queries cross-module directas a Prisma.

### ⚠️ Riesgo futuro

- **Finance → Invoice relation**: `FinancialEntry.invoiceId` es una FK real en Prisma. Esto está bien a nivel schema, pero cuando Finance necesite datos del invoice (ej: mostrar issuer junto al entry), no debe hacer `prisma.invoice.findUnique()` directamente — debe pasar por `InvoiceService`. Hoy no hay ese problema porque no se usa, pero Phase 5 automations podría tentarlo.

---

## 3. Event Bus & Audit

### ✅ Correcto

- Event bus singleton, tipado, async-safe, error-isolated.
- Audit subscriptions cubren: inbox (4 events), tasks (2), automations (5), integrations (3).
- Los módulos P4 emiten eventos pero **no** tienen audit subscriptions registradas.

### 🔴 Issue importante: Audit subscriptions missing para Phase 4

`src/lib/audit/audit-subscriptions.ts` NO registra listeners para:
- `document.created`, `document.updated`, `document.linked`, `document.uploaded`
- `invoice.created`, `invoice.paid`, `invoice.overdue`, `invoice.anomaly_detected`
- `finance.entry.created`, `finance.anomaly.detected`
- `home.event.received`
- `idea.created`, `idea.promoted`

**Impacto**: Los eventos se emiten pero no se auditan. El audit log pierde visibilidad de todo lo que hacen los módulos P4.

**Fix**: Añadir subscriptions para los eventos de P4 en `registerAuditSubscriptions()`.

---

## 4. API Routes

### ✅ Consistente

- Todos los routes siguen patrón: parse params → call service → handle error → JSON response.
- Validación de body extraída a funciones puras (`validateCreateBody`, `buildCreateInput`).
- Error handling uniforme: try/catch → 500 con log.
- Status codes correctos: 200, 201, 400, 404, 500.

### ⚠️ Observaciones

| Issue | Severidad | Detalle |
|-------|-----------|---------|
| No auth check en API routes P4 | Media | Las rutas de Phase 1 (inbox, tasks) tampoco lo hacen — el middleware protege las pages pero las API routes bajo `/documents/api`, `/finance/api`, etc. dependen solo del middleware NextAuth matcher. En producción con API clients externos esto sería insuficiente. Para ahora está bien si el acceso es solo desde el frontend. |
| Ideas route `as any` | Baja | `src/app/ideas/api/route.ts:19` usa `as any` con eslint-disable. Minor, pero debería usar type assertion limpia. |
| `GET_TAGS` export muerto | Baja | `src/app/ideas/api/route.ts` exporta `GET_TAGS` que no es un handler válido de Next.js. No se llama nunca. |

---

## 5. Schema & Repository Layer

### ✅ Bien

- Prisma schema tiene los 5 modelos con índices apropiados.
- Repositories usan `prisma` singleton correctamente.
- Filter building es correcto (spread condicional con `&&`).

### ⚠️ Observaciones

| Issue | Severidad | Detalle |
|-------|-----------|---------|
| Repositories instanciados en cada route file | Baja | Cada `route.ts` hace `const repo = new Repo(); const service = new Service(repo)` — módulo-level, no request-level, así que no es un leak. Pero es repetitivo. Un factory o registro de servicios simplificaría Phase 5. |
| Decimal handling | Baja | `amount.toString()` en summaries funciona pero pierde control sobre formato. No es un bug ahora pero podría ser en locale-specific display. |

---

## 6. Test Coverage

### ✅ Números

- 279 tests, 26 files, 0 failures.
- Cobertura funcional de todos los services y routes de P4.

### ⚠️ Gaps conocidos

| Gap | Impacto |
|-----|---------|
| No tests para repositories (solo services y routes) | Los repos son wrappers de Prisma — el riesgo es bajo pero un integration test end-to-end sería valioso en Phase 5 |
| No tests para `dashboard.service` con repos P4 | Dashboard devuelve zeros hardcoded; cuando se conecte no tendrá tests |
| No tests para audit-subscriptions | Los autoLog mappers no están testeados — un mapper con typo pasaría desapercibido |

---

## 7. Deuda técnica heredada

| Item | Origen | Estado |
|------|--------|--------|
| `HealthCheckResult` / `BaseAdapter` duplicados | Phase 2 vs Phase 0 | Pendiente de consolidar |
| `InMemoryAuditStore` en producción | Phase 1 | Sin migración a Prisma-backed store |
| `code/.eslintcache` en git status | Phase 1 | `.gitignore` lo ignora pero aparece como dirty |
| `paperless.adapter.test.ts:37` unused eslint-disable | Phase 3 | Warning no bloqueante |
| No navegación global entre módulos | Phase 1 | Layout bare, navegación por URL |

---

## 8. Preparación para Phase 5 (Automations)

Phase 5 va a necesitar:

1. **Audit subscriptions P4** — sin esto el automation engine no puede auditar sus triggers sobre módulos P4. **Bloquea**.
2. **Dashboard stats reales** — no bloquea pero es deuda creciente.
3. **Service registry/factory** — las automations van a orquestar múltiples servicios; instanciar repo+service en cada sitio se vuelve friction.
4. **Provider types consolidation** — las automations necesitarán import de adapter types; tener dos fuentes es confuso.

---

## 9. Acciones recomendadas

### Antes de Phase 5 (bloquean)

1. **Añadir audit subscriptions para P4 events** — `document.*`, `invoice.*`, `finance.*`, `home.event.received`, `idea.*`
2. **Eliminar `GET_TAGS` export muerto** de `ideas/api/route.ts`
3. **Normalizar naming de Ideas** — `ideas.*` usa plural vs `document.*`, `invoice.*`, `home.*`, `finance.*` que usan singular. **Decisión: se deja plural** — el coste de renombrar (archivos + imports + tests) no compensa vs documentar la excepción. El módulo Ideas es inherentemente plural (colección de ideas). Consistencia futura: nuevos módulos usan singular.

### Deseables (no bloquean)

4. Dashboard stats conectados a repos P4
5. Consolidar types duplicados (adapter-types vs provider-types)
6. Service factory/registry para reducir boilerplate en routes
7. Tests para audit subscription mappers

---

## 10. Veredicto

**Phase 4 está completa y coherente.** Los 5 módulos siguen el patrón establecido, las fronteras están respetadas, los tests pasan, y el code quality es bueno.

Los 3 items bloqueantes para Phase 5 son menores — las audit subscriptions son el más importante. Estimación: 1-2 horas para cerrar los 3.

**Recomendación: resolver items 1-3, mergear, y pasar a Phase 5.**
