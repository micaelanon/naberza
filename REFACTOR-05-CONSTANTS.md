# Tarea 5 — Extraer magic strings a constants.ts

**Rama:** `internal/refactor-05-constants`
**Base:** `develop` (con tareas 01–04 mergeadas)
**Tipo:** refactor — no cambia comportamiento

---

## Objetivo

Crear `src/lib/constants.ts` y eliminar todos los string/number literals
que representan conceptos de negocio: rutas, teclas de teclado, status values,
API endpoints internos y query cache keys.

Convención de referencia:
`~/.openclaw/workspace/projects/copilot-instructions-test/instructions/constants-conventions.instructions.md`

---

## Qué crear

### `code/src/lib/constants.ts`

```typescript
// ─── Route paths ───────────────────────────────────────────────────
export const ROUTE_PATHS = {
  HOME:          "/home/dashboard",
  TASKS:         "/tasks/dashboard",
  INBOX:         "/inbox/dashboard",
  INVOICES:      "/invoices/dashboard",
  DOCUMENTS:     "/documents/dashboard",
  FINANCE:       "/finance/dashboard",
  IDEAS:         "/ideas/dashboard",
  AUTOMATIONS:   "/automations/dashboard",
  INTEGRATIONS:  "/integrations/dashboard",
  USERS:         "/users/dashboard",
  AUDIT:         "/audit/dashboard",
  LOGIN:         "/login",
  MAIL_ANALYSIS: "/mail-analysis",
} as const;

// ─── API endpoints (internos) ──────────────────────────────────────
export const API_PATHS = {
  HEALTH: "/api/health",
} as const;

// ─── Keyboard keys ─────────────────────────────────────────────────
export const KEYBOARD_KEYS = {
  ESCAPE: "Escape",
  ENTER:  "Enter",
} as const;

// ─── Status values de negocio ──────────────────────────────────────
export const CONNECTION_STATUS = {
  ACTIVE:   "active",
  INACTIVE: "inactive",
  ERROR:    "error",
} as const;

export const AUDIT_STATUS = {
  SUCCESS: "success",
  PENDING: "pending",
  FAILURE: "failure",
} as const;

export const HEALTH_STATUS = {
  OK:       "ok",
  DEGRADED: "degraded",
  ERROR:    "error",
} as const;

// ─── Query cache keys (TanStack Query) ────────────────────────────
export const QUERY_KEYS = {
  tasks:        "tasks",
  inbox:        "inbox",
  invoices:     "invoices",
  documents:    "documents",
  finance:      "finance",
  ideas:        "ideas",
  homeWidgets:  "home-widgets",
  automations:  "automations",
  integrations: "integrations",
  users:        "users",
  health:       "health",
} as const;
```

---

## Ficheros a actualizar

### Rutas hardcodeadas — 22 ficheros

Buscar todos los usos de rutas literales y reemplazar con `ROUTE_PATHS.*`:

```bash
grep -rn '"/inbox/dashboard"\|"/tasks/dashboard"\|"/invoices/dashboard"\|"/home/dashboard"\|"/finance/dashboard"\|"/ideas/dashboard"\|"/documents/dashboard"\|"/automations/dashboard"\|"/integrations/dashboard"\|"/login"' src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v .next
```

Ficheros confirmados con rutas hardcodeadas:
- `src/components/ui/sidebar/sidebar.tsx`
- `src/lib/dashboard/dashboard.service.ts`
- `src/lib/dashboard/action-digest.ts`
- `src/lib/mail-analysis/mail-analysis.ts`
- `src/app/mail-analysis/page.tsx`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/middleware.ts`
- `src/lib/auth.ts`

### Keyboard keys — 1 fichero

```
src/components/ui/confirm-delete-modal/confirm-delete-modal.tsx (línea 16)
```

```typescript
// ❌ Antes
if (e.key === "Escape") onCancel();

// ✅ Después
import { KEYBOARD_KEYS } from "@/lib/constants";
if (e.key === KEYBOARD_KEYS.ESCAPE) onCancel();
```

### Status strings en lib/ — 5+ ficheros

```
src/lib/adapters/adapter-registry.ts
src/lib/health/health.service.ts
src/lib/audit/audit-subscriptions.ts
src/app/home/api/live/route.ts
src/lib/security/security-headers.ts  → API_PATHS.HEALTH
```

---

## Criterio de exclusión

**No extraer a constants:**
- Status values que son parte de una definición de tipo TypeScript
  (`type ConnectionStatus = "active" | "inactive" | "error"` → el tipo se queda,
  los valores usados en runtime van a la constante)
- Strings de un solo uso cuyo significado es obvio por contexto

---

## Pasos

### 1. Crear la rama

```bash
cd code
git checkout develop
git pull origin develop
git checkout -b internal/refactor-05-constants
```

### 2. Crear `src/lib/constants.ts`

Con el contenido exacto del bloque de arriba.

### 3. Buscar y reemplazar por área

Ir fichero a fichero. Para cada uno:
- Añadir el import: `import { ROUTE_PATHS, KEYBOARD_KEYS, ... } from "@/lib/constants";`
- Reemplazar el literal por la constante

### 4. Verificar

```bash
npm run type-check
npm run lint
npm run test:run
```

Verificación final — debe devolver 0 resultados:
```bash
grep -rn '"/inbox/dashboard"\|"/tasks/dashboard"\|"/home/dashboard"\|"/invoices/dashboard"\|"Escape"\|"Enter"' src --include="*.tsx" --include="*.ts" | grep -v __tests__ | grep -v .next | grep -v "constants.ts"
```

### 5. Commits — uno por área

```bash
git commit -m "refactor(lib): add constants.ts with ROUTE_PATHS, KEYBOARD_KEYS, status values"
git commit -m "refactor(navigation): replace hardcoded route strings with ROUTE_PATHS"
git commit -m "refactor(lib): replace hardcoded status strings with CONNECTION_STATUS, HEALTH_STATUS, AUDIT_STATUS"
git commit -m "refactor(ui): replace keyboard key literals with KEYBOARD_KEYS"
```

### 6. Push y PR

```bash
git push origin internal/refactor-05-constants
```

**Título del PR:** `refactor: extract magic strings to constants.ts`

**Descripción:**
```
## What
- `src/lib/constants.ts` creado con ROUTE_PATHS, API_PATHS, KEYBOARD_KEYS, CONNECTION_STATUS, AUDIT_STATUS, HEALTH_STATUS, QUERY_KEYS
- N ficheros actualizados: rutas literales → ROUTE_PATHS.*
- confirm-delete-modal: "Escape" → KEYBOARD_KEYS.ESCAPE
- adapter-registry, health.service, audit-subscriptions: status strings → constantes tipadas

## Why
Magic strings en 22+ ficheros. Un cambio de ruta requería buscar y reemplazar en toda la base de código. Ahora hay un único punto de verdad.

## Verification
- [ ] `npm run check` passes
- [ ] `grep -rn '"/tasks/dashboard"\|"/inbox/dashboard"' src --include="*.tsx" --include="*.ts" | grep -v constants.ts` devuelve 0 resultados
```

---

## Definición de done

- `src/lib/constants.ts` existe y exporta ROUTE_PATHS, KEYBOARD_KEYS, CONNECTION_STATUS, AUDIT_STATUS, HEALTH_STATUS, QUERY_KEYS
- Ningún fichero `.tsx` o `.ts` fuera de `constants.ts` tiene rutas literales como `"/tasks/dashboard"`
- `npm run check` pasa
