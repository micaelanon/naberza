# Tarea 2 — Extraer tipos inline a utils/types.ts

**Rama:** `internal/refactor-02-types`
**Base:** `develop` (con tarea 01 mergeada)
**Tipo:** refactor — no cambia comportamiento

---

## Objetivo

Mover todas las interfaces y tipos definidos inline en ficheros `.tsx` a su correspondiente
`utils/types.ts`. La convención del proyecto (ver `code/AGENTS.md`) es clara:

> Props **always** in `utils/types.ts`, never inline

---

## Ficheros afectados

Ejecuta esto para obtener la lista actualizada antes de empezar:

```bash
cd code
grep -rl "^interface \|^type " src --include="*.tsx" | grep -v "__tests__" | grep -v "utils/types" | sort
```

En el momento de escribir este documento, los ficheros con tipos inline incluyen al menos:

- `src/app/tasks/dashboard/tasks-view/tasks-view.tsx`
- `src/app/home/dashboard/home-view/home-view.tsx`
- `src/app/inbox/dashboard/inbox-view/inbox-view.tsx`
- `src/app/invoices/dashboard/invoices-view/invoices-view.tsx`
- `src/app/documents/dashboard/documents-view/documents-view.tsx`
- `src/app/finance/dashboard/finance-view/finance-view.tsx`
- `src/app/automations/dashboard/automations-view/automations-view.tsx`
- Todos los `error.tsx` con tipos inline

---

## Pasos exactos

### 1. Crear la rama

```bash
cd code
git checkout develop
git pull origin develop
git checkout -b internal/refactor-02-types
```

### 2. Para cada fichero con tipos inline

El proceso por fichero es siempre el mismo:

**a) Identificar los tipos inline:**
```tsx
// Ejemplo de lo que hay que mover
interface TaskFormState {
  title: string;
  description: string;
}

type StatusTab = "ALL" | TaskStatus;
```

**b) Crear o actualizar `utils/types.ts` junto al `.tsx`:**

Si no existe la carpeta `utils/`, crearla.

```typescript
// component/utils/types.ts
export interface TaskFormState {
  title: string;
  description: string;
}

export type StatusTab = "ALL" | TaskStatus;
```

**c) Actualizar el import en el `.tsx`:**

```tsx
// Añadir en el grupo de imports relativos (./)
import type { TaskFormState, StatusTab } from "./utils/types";

// O con alias si el componente ya usa @/:
import type { TaskFormState, StatusTab } from "@/app/tasks/dashboard/tasks-view/utils/types";
```

**d) Eliminar los tipos del `.tsx`.**

### 3. Verificar después de cada fichero

```bash
npm run type-check   # no debe romper nada
npm run lint         # no debe introducir nuevas violaciones
```

### 4. Commits — uno por módulo

No hacer un solo commit gigante. Commitear por módulo:

```bash
git commit -m "refactor(tasks): extract inline types to utils/types.ts"
git commit -m "refactor(inbox): extract inline types to utils/types.ts"
git commit -m "refactor(invoices): extract inline types to utils/types.ts"
# ... etc
```

### 5. Verificación final

```bash
npm run check   # lint + type-check + tests, debe pasar todo
```

Comprobar que el comando de búsqueda ya no devuelve ficheros:
```bash
grep -rl "^interface \|^type " src --include="*.tsx" | grep -v "__tests__" | grep -v "utils/types"
```

### 6. Push y PR

```bash
git push origin internal/refactor-02-types
```

**Título del PR:** `refactor: extract inline types to utils/types.ts`

**Descripción del PR:**
```
## What
Moves all inline `interface` and `type` definitions from `.tsx` files to their
corresponding `utils/types.ts` following the convention in `code/AGENTS.md`.

## Why
Props and types must always live in `utils/types.ts`, never inline in component files.
This makes types discoverable, reusable, and keeps components focused on rendering.

## Changes
- N component files: inline types removed
- N `utils/types.ts` files created or updated
- No logic changes whatsoever

## Verification
- [ ] `npm run check` passes
- [ ] No `.tsx` file contains a top-level `interface` or `type` definition
- [ ] No logic changes (only type declarations moved)
```

---

## Definición de done

- `npm run check` pasa sin errores
- Ningún `.tsx` en `src/` tiene definiciones de `interface` o `type` a nivel de módulo
  (solo se permiten dentro de funciones o como parámetros de genéricos inline)
- Todos los `utils/types.ts` exportan con `export interface` / `export type`
