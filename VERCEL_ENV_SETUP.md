# Configurar Variables de Entorno en Vercel

## Pasos:

1. **Ve a Vercel Dashboard**
   - https://vercel.com/dashboard
   - Selecciona el proyecto "naberza"

2. **Abre Settings > Environment Variables**
   - Click en "Add New" para cada variable

3. **Añade estas dos variables:**

| Variable | Valor | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://wlgmlfkbmpyckjckjgxz.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsZ21sZmtibXB5Y2tqY2tqZ3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxOTEyNDIsImV4cCI6MjA5MTc2NzI0Mn0.D0duQS1oFNThcyjdFcM36ucLCD06x8SrnlaPSlrFxXg` | Production, Preview, Development |

4. **Redeploy:**
   - Ve a Deployments
   - Haz click en los "3 puntos" del último deployment fallido
   - Selecciona "Redeploy"

## ¿Por qué?

- `NEXT_PUBLIC_*` son variables públicas que se incrustan en el cliente
- Vercel necesita que se configuren en el dashboard (no en .env.local)
- El archivo `.env.local` es solo para desarrollo local

## Verificar que funcionó:

Después del redeploy:
- El preview debe compilar exitosamente
- Abre la URL del preview en el navegador
- Deberías ver las tareas cargadas desde Supabase
