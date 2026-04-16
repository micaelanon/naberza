# Configurar Variables de Entorno en Vercel

## Pasos

1. **Ve a Vercel Dashboard** → https://vercel.com/dashboard → selecciona el proyecto "naberza"
2. **Abre Settings > Environment Variables**
3. **Añade estas dos variables** (valores reales en Supabase Dashboard → Settings → API):

| Variable | Scope |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview, Development |

> ⚠️ **Nunca documentes los valores reales en este fichero.** Las credenciales van solo en los secretos de Vercel y en `.env.local` (no commiteado).

4. **Redeploy**: Deployments → "3 puntos" del último deploy fallido → Redeploy

## ¿Por qué?

- `NEXT_PUBLIC_*` se incrustan en el bundle de cliente, no son secretas en sentido estricto, pero no deben commitearse.
- Vercel necesita las variables en el dashboard. `.env.local` es solo para desarrollo local.

## Verificar que funcionó

- El preview debe compilar sin errores.
- Abrir la URL del preview → las tareas deben cargarse desde Supabase.
- En consola del browser: sin errores de conexión Supabase.
