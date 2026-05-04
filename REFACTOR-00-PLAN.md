# Plan de refactor — naBerza

Este documento describe el plan completo de refactorización del codebase para que el código
existente cumpla las convenciones definidas en `code/AGENTS.md` y en la librería de instrucciones.

**No modifica comportamiento. No toca base de datos, auth, migraciones ni infraestructura.**

---

## Antes de empezar — leer obligatoriamente

1. Leer `~/.openclaw/workspace/AGENTS.md` (workspace)
2. Leer `~/.openclaw/workspace/CODING.md` (protocolo de convenciones)
3. Leer `code/AGENTS.md` (convenciones específicas de naBerza)
4. Confirmar que estás en la rama `develop` antes de crear cualquier rama de trabajo

Rama de partida para todas las tareas: `develop`
Flujo: `internal/*` → PR → `develop`

---

## Reglas operativas para este refactor

- Cada tarea tiene su propia rama y su propio PR
- Nunca mezcles dos tareas en la misma rama
- Antes de hacer commit en cada tarea: `npm run check` (lint + type-check + tests)
- Si un test falla por el refactor, arréglalo en el mismo commit
- Si algo no está cubierto por las convenciones → para y pregunta
- No cambies comportamiento. Si para refactorizar algo hay que cambiar lógica → para y pregunta

---

## Tareas (en orden de ejecución)

| # | Fichero | Rama | Estado |
|---|---------|------|--------|
| 1 | `REFACTOR-01-TOOLING.md` | `internal/refactor-01-tooling` | ✅ mergeada |
| 2 | `REFACTOR-02-TYPES.md` | `internal/refactor-02-types` | ✅ mergeada |
| 3 | `REFACTOR-03-DECLARATIONS.md` | `internal/refactor-03-declarations` | ✅ mergeada |
| 4 | `REFACTOR-04-CONSOLE.md` | `internal/refactor-04-console` | ✅ mergeada |
| 5 | `REFACTOR-05-CONSTANTS.md` | `internal/refactor-05-constants` | pendiente |
| 6 | `REFACTOR-06-I18N.md` | `internal/refactor-06-i18n` | pendiente (requiere 05) |

**Ejecutar en ese orden.** La tarea 5 debe estar mergeada antes de empezar la 6
porque la 6 asume que los status values ya están en constants.ts.

---

## Qué NO toca este refactor

- Lógica de negocio (comportamiento de los módulos)
- Schema de Prisma ni migraciones
- Configuración de NextAuth / auth (salvo añadir next-intl middleware en tarea 6)
- Variables de entorno
- Workflows de CI/CD
- Docker / infraestructura
- Endpoints de API
