# Tarea 1 — Configurar linter y auto-fix

**Rama:** `internal/refactor-01-tooling`
**Base:** `develop`
**Tipo:** chore — no cambia comportamiento, solo configura tooling

---

## Objetivo

Configurar `simple-import-sort` con los 6 grupos exactos del `code/AGENTS.md` y añadir
la regla `no-console` para código cliente. Después ejecutar auto-fix para que todos los
ficheros existentes queden ordenados automáticamente.

Cuando esta tarea esté mergeada, el linter detectará automáticamente todas las violaciones
de las tareas siguientes. Hacerla primero es obligatorio.

---

## Pasos exactos

### 1. Crear la rama

```bash
cd code
git checkout develop
git pull origin develop
git checkout -b internal/refactor-01-tooling
```

### 2. Actualizar `.eslintrc.json`

Reemplazar el contenido de `code/.eslintrc.json` con exactamente esto:

```json
{
  "extends": "next/core-web-vitals",
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint", "simple-import-sort", "sonarjs", "regexp"],
  "rules": {
    "simple-import-sort/imports": ["error", {
      "groups": [
        ["^react$", "^react/", "^next$", "^next/"],
        ["^@?\\w"],
        ["^@/"],
        ["^\\."],
        ["^.+\\u0000$"],
        ["\\.css$"]
      ]
    }],
    "simple-import-sort/exports": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }
    ],
    "sonarjs/cognitive-complexity": ["warn", 15],
    "sonarjs/no-duplicate-string": ["warn", 5],
    "regexp/no-empty-string-literal": "warn"
  },
  "overrides": [
    {
      "files": ["src/app/*/api/**/*.ts", "src/app/api/**/*.ts", "src/lib/**/*.ts", "src/modules/**/*.ts"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

Los 6 grupos corresponden exactamente al orden definido en `code/AGENTS.md`:
1. React y Next.js (framework)
2. Terceros (`@tanstack`, `next-auth`, etc.)
3. Internos con alias `@/`
4. Relativos `./`
5. Type-only imports (`import type`)
6. CSS (siempre el último)

La regla `no-console` es `warn` en cliente, `off` en API routes, lib y modules
(donde el logging de servidor es legítimo).

### 3. Ejecutar auto-fix

```bash
npm run lint -- --fix
```

Este comando reordenará automáticamente todos los imports del proyecto.

### 4. Verificar

```bash
npm run lint          # debe pasar sin errores (puede haber warns de no-console)
npm run type-check    # debe pasar
npm run test:run      # debe pasar
```

Si algún test falla por el reordenamiento de imports (imports que dependían del orden),
arreglarlo en el mismo commit.

### 5. Commit

```bash
git add code/.eslintrc.json
git add code/src  # todos los ficheros con imports reordenados
git commit -m "chore(lint): configure import groups and no-console rule

- simple-import-sort configured with 6 groups matching AGENTS.md
- no-console warn on client, off on server routes/lib/modules
- auto-fix applied to all existing files"
```

### 6. Push y PR

```bash
git push origin internal/refactor-01-tooling
```

**Título del PR:** `chore(lint): configure import groups and no-console rule`

**Descripción del PR:**
```
## What
Configures `simple-import-sort` with the 6 import groups defined in `code/AGENTS.md`.
Adds `no-console` rule for client-side code. Applies auto-fix to all existing files.

## Why
Enforces import ordering mechanically so future PRs don't depend on manual discipline.
The linter will now catch violations automatically.

## Changes
- `code/.eslintrc.json`: import groups + no-console rule with server-side override
- All `.tsx`/`.ts` files: imports reordered by auto-fix (no logic changes)

## Verification
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm run test:run` passes
```

---

## Definición de done

- `npm run check` pasa sin errores
- Ningún fichero en `src/` tiene imports en orden incorrecto
- `git diff` no muestra cambios de lógica, solo de orden de imports y `.eslintrc.json`
