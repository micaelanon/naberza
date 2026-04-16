# naBerza

Sistema personal de tareas, recordatorios y citas con dashboard cuidado y recordatorios persistentes.

## Objetivo de la v1

Entregar una base mínima pero útil para:
- ✅ ver tareas generales en un dashboard funcional
- ✅ distinguir tareas persistentes de tareas normales
- ✅ marcar tareas como hechas y reabrir
- ✅ crear tareas nuevas
- ✅ persistencia en localStorage
- Recordatorios diarios por canal (próxima iteración)
- Autenticación de usuarios (próxima iteración)
- Sincronización a Supabase (próxima iteración)

## Estructura del repo

```text
naberza/
├── .github/           # Workflows de CI/CD
├── code/              # Aplicación Next.js + código fuente
├── docs/              # Documentación
├── vercel.json        # Config Vercel
├── CONTRIBUTING.md    # Cómo contribuir
├── RELEASE.md         # Flujo de releases
└── README.md          # Este fichero
```

Todo el código vive dentro de `code/`.

## Estado actual (2026-04-16)

V1 funcional del dashboard:
- ✅ Dashboard interactivo (Client Component)
- ✅ Toggle de tareas (localStorage primary store)
- ✅ Crear tareas nuevas
- ✅ Filtros por vista (Hoy, Próximamente, Persistentes, Completadas)
- ✅ Vitest setup + 17 tests pasando
- ✅ CI/CD con lint, type-check, tests, build
- ✅ Despliegue en Vercel (pre + pro)

## Roadmap

### v1.1 (próxima)
- [ ] Refactorizar page.tsx en componentes más pequeños
- [ ] Autenticación básica (magic link o anonymous)
- [ ] Sincronizar a Supabase realmente
- [ ] Tests de integración para componentes

### v1.2
- [ ] Notificaciones por Telegram
- [ ] Recordatorios automáticos
- [ ] Datos del usuario real (no "Julian Vane" hardcodeado)
- [ ] Rutas reales (/today, /persistent, etc.)

### v2
- [ ] Sincronización offline
- [ ] Apps móviles nativas (habitOS-mobile)
- [ ] Integración con coach console
- [ ] Reportes y análisis

## Desarrollo

```bash
# Setup
cd code
npm install --legacy-peer-deps

# Dev
npm run dev         # http://localhost:3000

# Testing
npm run test        # watch mode
npm run test:run    # single run
npm run check       # lint + type-check + test:run + build

# Build
npm run build
npm run start
```

## Configuración (local + Vercel)

Ver `SUPABASE_SETUP.md` y `VERCEL_ENV_SETUP.md`.
