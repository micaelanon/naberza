# naBerza

Aplicación personal de tareas, recordatorios y citas.

## Estado de esta versión

Esta primera versión es deliberadamente básica:
- dashboard sobrio y usable
- separación conceptual entre tareas normales y persistentes
- estructura preparada para crecer
- persistencia básica con Supabase o fallback local
- sin envío real de recordatorios todavía

## Stack

- Next.js
- TypeScript
- App Router
- ESLint

## Scripts

```bash
npm run dev
npm run lint
npm run type-check
npm run test
npm run build
```

## Desarrollo local

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## Seguridad actual

- La tabla `tasks` debe quedar protegida por RLS y ligada a `auth.uid()` mediante `owner_id`.
- No debe existir acceso público total a las tareas en Supabase.
- El workflow de PR incluye CI, CodeQL, JSCPD y Snyk, pero Snyk requiere configurar `SNYK_TOKEN` en los secrets del repositorio.

## Criterio de producto

La v1 busca una sensación limpia, sobria y útil.
No intenta aparentar una plataforma completa si aún no hay persistencia ni automatización real.
