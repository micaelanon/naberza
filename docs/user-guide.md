# Naberza OS — Guía de uso y configuración

## 1. Arrancar el sistema

```bash
cd ~/.openclaw/workspace/naberza
docker compose up -d
```

Espera ~20 segundos. Abre: **http://localhost:3000**

### Credenciales
- Email: `admin@naberza.local`
- Password: `TestPassword123!`

### Cargar datos de ejemplo (opcional)
```bash
cd code
npx tsx prisma/seed.ts
```
Esto crea 6 items en el inbox, 6 tareas, 3 ideas y 5 eventos de auditoría de ejemplo.

Para limpiar los datos de ejemplo:
```bash
npx tsx prisma/clear-seed.sql
```

---

## 2. Lo que puedes hacer ahora mismo

### ✅ Tareas (`/tasks/dashboard`)
El módulo más completo. Aquí puedes:
- **Crear tareas** → botón "+ Nueva tarea"
  - Título (obligatorio)
  - Descripción
  - Prioridad: Alta / Media / Baja / Sin prioridad
  - Tipo: Normal / Persistente / Recurrente
  - Fecha de vencimiento
  - Etiquetas (separadas por coma)
- **Completar tareas** → botón ✓
- **Cancelar tareas** → botón ✕
- **Filtrar** por estado: Todas / Pendientes / En progreso / Completadas

### ✅ Inbox (`/inbox/dashboard`)
Tu bandeja de entrada universal:
- **Crear items manualmente** → botón "+ Nuevo item"
  - Título, descripción, prioridad
  - Se crea como fuente "Manual"
- **Descartar items** → botón ✕
- **Filtrar** por estado: Todos / Pendientes / Clasificados / Descartados

### ✅ Ideas (`/ideas/dashboard`)
Captura rápida de ideas:
- **Crear ideas** → botón "+ Nueva idea"
  - Título, descripción, etiquetas

### ✅ Facturas (`/invoices/dashboard`)
Registro de facturas:
- **Crear facturas** → botón "+ Nueva factura"
  - Emisor, importe (€), fecha emisión, fecha vencimiento, categoría, notas

### ✅ Finanzas (`/finance/dashboard`)
Registro de movimientos financieros:
- **Crear movimientos** → botón "+ Nuevo movimiento"
  - Tipo: Gasto / Ingreso / Cargo recurrente / Snapshot de saldo
  - Importe, descripción, categoría, fecha

### ✅ Dashboard (`/`)
Vista general con contadores reales:
- Items en inbox pendientes
- Tareas pendientes
- Documentos recientes
- Facturas sin pagar
- Alertas del hogar

### ✅ Automaciones (`/automations/dashboard`)
Vista de reglas de automatización. Para crear reglas usa la API:
```bash
curl -X POST http://localhost:3000/automations/api/rules \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Notificar facturas urgentes",
    "triggerEvent": "invoice.created",
    "conditions": { "amount": { "gt": 500 } },
    "actions": [{ "type": "send_notification", "params": { "message": "Factura > 500€" } }]
  }'
```

### ✅ Auditoría (`/audit/dashboard`)
Log de todos los eventos del sistema. Inmutable y automático.

### ✅ Health check
```bash
curl http://localhost:3000/api/health
```
Devuelve estado de la base de datos y dependencias.

---

## 3. Configurar adaptadores externos

### 📬 Correo IMAP (recibir emails en el inbox)

Añade estas variables a `code/.env`:

```env
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=tu@gmail.com
IMAP_PASSWORD=tu-app-password
IMAP_TLS=true
```

**Para Gmail:**
1. Ve a https://myaccount.google.com/apppasswords
2. Crea una contraseña de aplicación
3. Usa esa contraseña en `IMAP_PASSWORD`

El adaptador IMAP (`src/lib/adapters/mail/mail-imap.adapter.ts`) se conecta y descarga emails nuevos al inbox. Para activar la sincronización, llama a la API:
```bash
curl -X POST http://localhost:3000/inbox/api/sync
```

> **Estado actual**: El adaptador existe y está testeado, pero la ruta `/inbox/api/sync` no existe aún. Hay que crearla o usar un cron externo que llame al servicio de sync.

---

### 📄 Paperless-ngx (documentos)

Necesitas una instancia de [Paperless-ngx](https://docs.paperless-ngx.com/) corriendo.

```env
PAPERLESS_URL=http://tu-paperless:8000
PAPERLESS_TOKEN=tu-api-token
```

**Obtener el token:**
1. En Paperless → Settings → API Tokens
2. Crea un nuevo token

Para sincronizar documentos:
```bash
curl -X POST http://localhost:3000/documents/api/sync
```

Esto descarga documentos de Paperless y los registra en Naberza. Los documentos se muestran en `/documents/dashboard`.

---

### 🏠 Home Assistant (domótica)

Necesitas una instancia de [Home Assistant](https://www.home-assistant.io/) accesible.

```env
HOME_ASSISTANT_URL=http://tu-homeassistant:8123
HOME_ASSISTANT_TOKEN=tu-long-lived-access-token
```

**Obtener el token:**
1. En Home Assistant → Perfil → Long-Lived Access Tokens
2. Crea un nuevo token

El adaptador (`src/lib/adapters/home-assistant/`) puede leer entidades y eventos. Los eventos del hogar se muestran en `/home/dashboard`.

---

### 🔔 Notificaciones por Telegram

```env
TELEGRAM_BOT_TOKEN=tu-bot-token
TELEGRAM_DEFAULT_CHAT_ID=tu-chat-id
```

**Configurar:**
1. Habla con @BotFather en Telegram → `/newbot` → copia el token
2. Envía un mensaje al bot
3. Ve a `https://api.telegram.org/bot<TOKEN>/getUpdates` para obtener tu chat_id

Las automaciones pueden enviar notificaciones por Telegram cuando se disparan reglas con acción `send_notification`.

---

### 📧 Notificaciones por Email (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu@gmail.com
SMTP_PASSWORD=tu-app-password
SMTP_FROM=naberza@tudominio.com
SMTP_DEFAULT_TO=tu@gmail.com
```

Similar a IMAP: usa una contraseña de aplicación de Gmail.

---

### 🔗 Webhooks (entrada externa)

Puedes enviar datos al inbox desde cualquier servicio externo via webhook:

```bash
curl -X POST http://localhost:3000/webhooks/api/TU_TOKEN \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nuevo evento desde n8n",
    "body": "Se ha detectado actividad en el servidor",
    "priority": "HIGH"
  }'
```

Los tokens de webhook se gestionan en el código. Cada webhook crea un item en el inbox automáticamente.

---

## 4. Usar la API directamente

Todas las rutas API siguen el mismo patrón:

| Módulo | Listar | Crear | Detalle | Acciones |
|---|---|---|---|---|
| Inbox | `GET /inbox/api` | `POST /inbox/api` | `GET /inbox/api/:id` | `POST /inbox/api/:id/dismiss` |
| Tasks | `GET /tasks/api` | `POST /tasks/api` | `GET /tasks/api/:id` | `POST .../complete`, `POST .../cancel` |
| Ideas | `GET /ideas/api` | `POST /ideas/api` | `GET /ideas/api/:id` | `POST .../promote` |
| Invoices | `GET /invoices/api` | `POST /invoices/api` | `GET /invoices/api/:id` | `POST .../pay` |
| Finance | `GET /finance/api` | `POST /finance/api` | `GET /finance/api/:id` | `POST .../flag` |
| Documents | `GET /documents/api` | — | `GET /documents/api/:id` | `POST /documents/api/sync` |
| Home | `GET /home/api/events` | — | `GET .../events/:id` | `POST .../events/:id/acknowledge` |
| Automations | `GET /automations/api/rules` | `POST /automations/api/rules` | `GET .../rules/:id` | — |
| Approvals | `GET /automations/api/approvals` | — | — | `POST .../grant`, `POST .../deny` |

Ejemplo crear tarea vía curl:
```bash
curl -X POST http://localhost:3000/tasks/api \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=TU_SESSION_TOKEN" \
  -d '{
    "title": "Comprar leche",
    "priority": "LOW",
    "tags": ["compras", "casa"]
  }'
```

---

## 5. Lo que NO funciona todavía

| Qué | Por qué | Esfuerzo |
|---|---|---|
| Editar tareas/items desde la UI | No hay formularios de edición (solo crear) | Medio |
| Sync automático de email/Paperless | Falta cron o scheduler que llame a sync periódicamente | Bajo |
| Routing automático inbox → módulos | Las reglas de routing existen pero no hay UI para configurarlas | Medio |
| Búsqueda global | Cada módulo tiene search en API pero no hay barra de búsqueda en UI | Bajo |
| Drag & drop / reordenar | No existe | Alto |
| Multi-usuario | El schema lo soporta pero la UI asume single-user | Alto |

---

## 6. Stack técnico

- **Frontend**: Next.js 16, React 19, CSS Modules (BEM)
- **Backend**: Next.js API Routes, Prisma ORM
- **Base de datos**: PostgreSQL 16 (Docker)
- **Auth**: NextAuth.js con credenciales
- **Tests**: Vitest, 407+ tests
- **CI**: GitHub Actions (lint, type-check, test, build)
