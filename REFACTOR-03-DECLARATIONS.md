# Tarea 3 — Normalizar declaraciones de componentes

**Rama:** `internal/refactor-03-declarations`
**Base:** `develop` (con tareas 01 y 02 mergeadas)
**Tipo:** refactor — no cambia comportamiento

---

## Objetivo

Todos los componentes deben declararse como `const` con tipo de retorno implícito,
no como `function` declarations. La convención de `code/AGENTS.md` establece PascalCase
para componentes y el patrón `const ComponentName = () =>`.

Además, los componentes deben ser `export default` al final del fichero, no inline
en la declaración.

---

## Ficheros afectados

```bash
cd code
grep -rl "^export default function\|^function [A-Z]" src --include="*.tsx" | grep -v "__tests__" | sort
```

Patrón a buscar y reemplazar:

```tsx
// ❌ Así está actualmente en algunos ficheros
export default function LoginForm({ callbackUrl = "/", error }: LoginFormProps) {
  ...
}

// ✅ Así debe quedar
const LoginForm = ({ callbackUrl = "/", error }: LoginFormProps) => {
  ...
};

export default LoginForm;
```

---

## Regla sobre `useCallback` y `useMemo`

`code/AGENTS.md` especifica:
> `useCallback` for all event handlers, `useMemo` for derived values

Si durante este refactor encuentras handlers que no usan `useCallback` o valores
derivados que no usan `useMemo`, añádelos. Ejemplo:

```tsx
// ❌
const handleSubmit = async (event: React.FormEvent) => { ... };

// ✅
const handleSubmit = useCallback(async (event: React.FormEvent) => { ... }, [deps]);
```

---

## Pasos exactos

### 1. Crear la rama

```bash
cd code
git checkout develop
git pull origin develop
git checkout -b internal/refactor-03-declarations
```

### 2. Para cada fichero afectado

**a) Cambiar `export default function ComponentName` por `const`:**

```tsx
// Antes
export default function LoginForm({ callbackUrl = "/" }: LoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  ...
  return (...);
}

// Después
const LoginForm = ({ callbackUrl = "/" }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  ...
  return (...);
};

export default LoginForm;
```

**b) Añadir `useCallback` a event handlers si falta.**

**c) Verificar que el componente sigue renderizando correctamente.**

### 3. Verificar después de cada fichero

```bash
npm run type-check
npm run lint
```

### 4. Commits — uno por módulo o área

```bash
git commit -m "refactor(auth): normalize component declaration to const arrow"
git commit -m "refactor(tasks): normalize component declarations and add useCallback"
# ... etc
```

### 5. Verificación final

```bash
npm run check
grep -rn "^export default function\|^function [A-Z]" src --include="*.tsx"
# debe devolver 0 resultados
```

### 6. Push y PR

```bash
git push origin internal/refactor-03-declarations
```

**Título del PR:** `refactor: normalize component declarations to const arrow functions`

**Descripción del PR:**
```
## What
Converts all `function ComponentName` declarations to `const ComponentName = () =>`.
Adds missing `useCallback` wrappers to event handlers per AGENTS.md convention.

## Why
Consistency across all component files. Arrow functions + const make the export
pattern predictable (always `export default ComponentName` at end of file).

## Changes
- N component files: function → const conversion
- N event handlers: wrapped in useCallback where missing
- No logic changes

## Verification
- [ ] `npm run check` passes
- [ ] No `.tsx` file has `export default function` or top-level `function [A-Z]`
- [ ] All event handlers use `useCallback`
```

---

## Definición de done

- `npm run check` pasa
- Ningún `.tsx` tiene `export default function` ni declaraciones `function ComponentName` a nivel de módulo
- El `export default` siempre está al final del fichero, solo el nombre
