# Tarea 4 — Eliminar console statements en código cliente

**Rama:** `internal/refactor-04-console`
**Base:** `develop` (con tareas 01, 02 y 03 mergeadas)
**Tipo:** refactor — no cambia comportamiento observable

---

## Objetivo

Eliminar `console.log`, `console.info` y `console.debug` en código cliente
(componentes `.tsx`, hooks, lib de cliente). Los `console.error` y `console.warn`
en API routes y módulos de servidor son aceptables y están excluidos de la regla.

Después de la tarea 01 (tooling), el linter ya marca estos como `warn`.
Esta tarea los elimina o los reemplaza correctamente.

---

## Qué hacer con cada console statement

| Contexto | Acción |
|---------|--------|
| `console.log` de debug en componente cliente | Eliminar |
| `console.log` en handler de formulario (ej. login) | Eliminar |
| `console.error` en catch de error de usuario | Mantener como `console.error` o lanzar el error hacia arriba |
| `console.log` en API route / módulo servidor | Dejar (está excluido del linter) |
| `console.log` con datos sensibles (tokens, passwords) | Eliminar inmediatamente |

---

## Ficheros afectados (cliente)

```bash
cd code
grep -rn "console\." src --include="*.tsx" --include="*.ts" \
  | grep -v "node_modules" \
  | grep -v "__tests__" \
  | grep -v "src/app/.*/api/" \
  | grep -v "src/lib/" \
  | grep -v "src/modules/" \
  | sort
```

---

## Ejemplo concreto: login-form.tsx

```tsx
// ❌ Antes (con console.log de debug)
const result = await signIn("credentials", { ... });
console.log("[Login] Result:", result);  // ← eliminar

if (result?.error) {
  console.error("[Login] SignIn error:", result.error, result);  // ← eliminar en cliente
  ...
}
```

```tsx
// ✅ Después
const result = await signIn("credentials", { ... });

if (result?.error) {
  setFormError(
    result.error === "CredentialsSignin"
      ? "Email o contraseña incorrectos."
      : `Error de configuración: ${result.error}`
  );
  setIsLoading(false);
  return;
}
```

El error ya se muestra al usuario vía `setFormError`. El `console.error` de debug no aporta nada en producción.

---

## Pasos exactos

### 1. Crear la rama

```bash
cd code
git checkout develop
git pull origin develop
git checkout -b internal/refactor-04-console
```

### 2. Ejecutar búsqueda y revisar cada resultado

```bash
grep -rn "console\." src --include="*.tsx" \
  | grep -v "__tests__" \
  | grep -v "node_modules"
```

Para cada resultado:
- Si es debug puro (`console.log("[X]", data)`) → eliminar
- Si es manejo de error → asegurarse de que el error ya se propaga/muestra al usuario y eliminar el console
- Si hay duda → dejar y anotar en el commit message

### 3. Verificar

```bash
npm run lint    # no debe quedar ningún warn de no-console en código cliente
npm run test:run
```

### 4. Commits — uno por módulo o área

```bash
git commit -m "refactor(auth): remove debug console statements from login form"
git commit -m "refactor(tasks): remove debug console.log from task handlers"
# ... etc
```

### 5. Verificación final

```bash
npm run check

# Debe devolver 0 resultados en código cliente:
grep -rn "console\.log\|console\.info\|console\.debug" src --include="*.tsx" \
  | grep -v "__tests__" \
  | grep -v "node_modules"
```

### 6. Push y PR

```bash
git push origin internal/refactor-04-console
```

**Título del PR:** `refactor: remove debug console statements from client code`

**Descripción del PR:**
```
## What
Removes `console.log`, `console.info`, and `console.debug` from client-side components
and hooks. Server-side API routes, lib, and modules are excluded (logging is valid there).

## Why
Debug console statements should not reach production client bundles.
The `no-console` lint rule added in task 01 now enforces this mechanically.

## Changes
- N component/hook files: console statements removed
- Error handling preserved (errors still shown to user where applicable)
- No behavior changes: removed statements were debug-only

## Verification
- [ ] `npm run check` passes with no no-console warnings in client code
- [ ] No `console.log/info/debug` in .tsx files (outside __tests__)
- [ ] Error states still visible to users where they were before
```

---

## Definición de done

- `npm run check` pasa sin `no-console` warnings en código cliente
- Ningún `.tsx` fuera de `__tests__/` tiene `console.log`, `console.info` o `console.debug`
- Los errores que antes se logueaban siguen siendo manejados (mostrados al usuario o relanzados)
