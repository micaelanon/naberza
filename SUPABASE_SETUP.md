# Supabase Integration - Setup Instructions

## Paso 1: Configurar variables de entorno

Las variables ya están en `code/.env.local` con placeholders. Reemplácalos con tus valores reales:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Abre tu proyecto
3. Ve a **Settings > API**
4. Copia los valores:
   - `NEXT_PUBLIC_SUPABASE_URL` → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Anon public key

Actualiza `code/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Paso 2: Crear la tabla en Supabase

1. Ve a tu proyecto en Supabase
2. Abre **SQL Editor**
3. Copia todo el contenido de `code/supabase/migrations/001_create_tasks_table.sql`
4. Pégalo en el editor y ejecuta (click en ▶ o Cmd+Enter)

Esto creará:
- Tabla `tasks` con campos necesarios
- Índices para performance
- Row Level Security (RLS)
- 3 tareas demo

## Paso 3: Ejecutar el proyecto

```bash
cd code
npm run dev
```

La app cargará en `http://localhost:3000`

## Paso 4: Probar funcionalidades

✅ **Crear tarea** - Usa el botón "Añadir tarea" (aún no implementado, usamos las demo)

✅ **Completar tarea** - Click en el checkbox o el botón "↻" en persistentes

✅ **Reabrir tarea** - Click nuevamente en el checkbox

✅ **Recargar página** (F5 o Cmd+R) - Las tareas deben persistir desde Supabase

✅ **Verificar base de datos** - Abre Supabase SQL Editor y ejecuta:
```sql
SELECT id, title, completed, updated_at FROM tasks ORDER BY updated_at DESC;
```

## Fallback a localStorage

**Importante**: Si las variables de entorno no están configuradas o Supabase no responde, la app usa `localStorage` automáticamente. Esto permite desarrollo sin internet.

Verificar estado:
- Abre Browser DevTools → Console
- Busca "Supabase" en los logs
- Si ves "Supabase fetch error" pero tasks siguen cargándose = fallback activado ✓

## Archivos creados/modificados

```
code/
├── .env.local                              # Variables de Supabase
├── src/
│   ├── app/(dashboard)/page.tsx           # ✨ Ahora es Client Component con Supabase
│   └── lib/
│       ├── supabase-client.ts             # Cliente Supabase + flag de disponibilidad
│       └── supabase-tasks.ts              # Funciones para fetch/update/create tasks
└── supabase/
    └── migrations/
        └── 001_create_tasks_table.sql     # SQL para crear tabla
```

## Próximos pasos (after this branch merges)

- [ ] Implementar "Añadir tarea" (UI + Supabase create)
- [ ] Implementar filtros de navegación (Hoy, Próximamente, etc)
- [ ] Implementar vista de "Completadas"
- [ ] Sincronización en tiempo real con Realtime subscriptions
- [ ] Autenticación de usuarios
