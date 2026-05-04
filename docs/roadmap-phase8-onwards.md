# Naberza — Roadmap Fase 8 en adelante

> Documento de orquestación para agentes openclaw.
> Cada PR tiene instrucciones autosuficientes. El agente debe leer los archivos referenciados antes de empezar.
> Estado del proyecto antes de estas fases: Phase 7 completa, ~420 tests, CI verde, Next.js 16, Prisma, imapflow, Supabase.
>
> **Última actualización (2026-05-02)**: PRs #100–#104 implementados por openclaw. El clasificador usa Vertex AI Gemini 2.5 Flash (`@google/genai`) en lugar de Claude Haiku. CI verde con 517 tests.

---

## FASE 8-A — AI Email Triage & Bulk Deletion (PRIORIDAD MÁXIMA)

**Objetivo**: El usuario tiene miles de correos. Quiere que la IA decida cuáles se pueden borrar y que Naberza ejecute el borrado masivo con su aprobación previa.

**Flujo completo**:
1. Usuario pulsa "Iniciar triage" en la nueva página `/email-triage`
2. Naberza conecta al IMAP, descarga metadatos de los emails (no cuerpo completo, solo subject/from/date/attachments)
3. La IA (Claude Haiku) evalúa cada email y asigna: `trash` / `archive` / `keep` / `review`
4. Se muestra al usuario un resumen por categoría con posibilidad de overrides
5. Usuario pulsa "Ejecutar" → Naberza mueve a la Papelera los emails marcados como `trash` vía IMAP

**Seguridades no negociables**:
- Nunca borrado permanente: siempre mover a Trash (Gmail lo retiene 30 días)
- Nunca borrar emails con PDF adjunto no procesado → forzar `review`
- Nunca borrar emails de menos de 48h → forzar `keep`
- Dry run siempre antes de ejecutar: el usuario ve exactamente qué se borrará
- El botón ejecutar requiere confirmación explícita con recuento

---

### PR #100 — Extender MailImapAdapter con operaciones de escritura

**Rama**: `feature/mail-imap-write-ops`

**Contexto**: El archivo actual `code/src/lib/adapters/mail/mail-imap.adapter.ts` solo tiene `fetchNewMessages` y `markAsRead`. ImapFlow (ya instalado) soporta `messageDelete` y `messageFlagsAdd`. El adaptador actual conecta y desconecta por cada operación (no mantiene sesión) — mantener ese patrón.

**Cambios en `code/src/lib/adapters/mail/mail-imap.adapter.ts`**:

Añadir el siguiente método público:

```typescript
async trashMessage(uid: number): Promise<void>
```

Implementación con ImapFlow:
- Conectar al cliente
- Abrir mailbox INBOX
- Intentar primero `client.messageMove(String(uid), '[Gmail]/Trash', { uid: true })` — esto funciona para Gmail
- Si falla con error "NO [TRYCREATE]" o "Mailbox doesn't exist", fallback: `client.messageFlagsAdd(String(uid), ['\\Deleted'], { uid: true })` seguido de `client.messageExpunge()`
- Capturar el error, relanzar como `AdapterError('EXTERNAL_ERROR', ...)`
- Siempre cerrar la sesión en el finally

Añadir también:
```typescript
async fetchMessageSnippet(uid: number): Promise<{ body: string; bodyHtml?: string }>
```
Para obtener el cuerpo de un email concreto (necesario para que la IA lea el snippet). Usar `client.download(String(uid), undefined, { uid: true })` o fetchAll con `bodyParts: ['TEXT']`.

Añadir al `export` en `code/src/lib/adapters/mail/index.ts` los nuevos métodos.

**Tests** en `code/src/lib/adapters/mail/__tests__/`:
- Crear `mail-imap-write.test.ts`
- Mock de ImapFlow con vi.mock
- Test: trashMessage llama messageMove con la ruta correcta
- Test: trashMessage en fallback llama messageFlagsAdd + messageExpunge si messageMove falla
- Test: fetchMessageSnippet devuelve body

**Criterio de aceptación**:
- `npm run check` pasa sin errores
- Los nuevos tests están en verde
- El método `trashMessage` está exportado desde el index del adapter

---

### PR #101 — AI Email Classifier ✅ IMPLEMENTADO (con cambio de modelo)

**Rama**: `feature/email-ai-classifier`

**Dependencia**: PR #100 mergeado.

> **Nota de implementación**: openclaw usó Vertex AI Gemini 2.5 Flash (`@google/genai`) en lugar de `@anthropic-ai/sdk`. Las variables de entorno son `VERTEX_PROJECT_ID` y `VERTEX_LOCATION` (ya documentadas en `.env.example`). La lógica es idéntica a la especificación.

**Nueva dependencia instalada**:
```bash
cd code && npm install @google/genai
```

**Variables de entorno** en `code/.env.example`:
```
VERTEX_PROJECT_ID=
VERTEX_LOCATION=global
```

**Nuevo archivo**: `code/src/lib/email-triage/email-classifier.ts`

Este módulo exporta una única función:

```typescript
export interface EmailToClassify {
  uid: number;
  from: string;
  subject: string;
  date: Date;
  hasAttachments: boolean;
  attachmentNames: string[];
  isRead: boolean;
  snippet?: string; // primeros 300 chars del cuerpo si disponible
}

export type TriageDecision = 'trash' | 'archive' | 'keep' | 'review';

export interface ClassificationResult {
  uid: number;
  decision: TriageDecision;
  reason: string;
  confidence: number; // 0-1
  category: string;  // "newsletter", "ci-notification", "invoice", "personal", etc.
}

export async function classifyEmailBatch(
  emails: EmailToClassify[]
): Promise<ClassificationResult[]>
```

**Implementación del classifier**:
- Usar `@anthropic-ai/sdk` con modelo `claude-haiku-4-5-20251001` (más barato para volumen)
- Activar prompt caching en el system prompt (añadir `cache_control: { type: "ephemeral" }` al bloque de sistema)
- Procesar en lotes de 20 emails por llamada para eficiencia
- Cada lote: una sola llamada a Claude con todos los emails en JSON, pedir respuesta en JSON array
- Si una llamada falla, reintentar el lote una vez; si vuelve a fallar, marcar todos como `review`

**System prompt** (con cache):
```
Eres un asistente personal de limpieza de correo electrónico. Tu trabajo es analizar emails y decidir si se pueden eliminar de forma segura del inbox.

Criterios de decisión:
- "trash": newsletters, emails promocionales, notificaciones automáticas de CI/CD (GitHub Actions, Vercel, etc.), alertas de plataformas (Snyk, Dependabot), emails de marketing, códigos de un solo uso ya caducados, confirmaciones de suscripción antiguas, emails de redes sociales (Twitter/X, LinkedIn notificaciones), notificaciones automáticas de aplicaciones que no requieren acción.
- "archive": facturas/recibos importantes, confirmaciones de compra, emails de bancos o administraciones, invitaciones de calendario pasadas, cualquier cosa que sea importante conservar pero no necesita estar en el inbox activo.
- "keep": emails de personas reales dirigidos directamente al usuario, cualquier cosa que requiera respuesta o acción pendiente, emails recientes importantes.
- "review": cualquier cosa donde no estés seguro. Si hay duda, siempre "review".

REGLAS ABSOLUTAS que no puedes ignorar:
- Si el email tiene adjuntos PDF → siempre "archive" o "review", nunca "trash"
- Si el email tiene menos de 48 horas de antigüedad → siempre "keep"
- Si el asunto contiene palabras como "factura", "invoice", "pago", "payment", "bank", "banco", "AFIP", "Hacienda", "seguro", "renovación" → "archive"
- Ante la duda mínima → "review"

Responde ÚNICAMENTE con un JSON array, sin texto adicional.
```

**User prompt** por lote:
```json
Clasifica estos emails. Fecha actual: {currentDate}

[
  { "uid": 123, "from": "...", "subject": "...", "date": "...", "hasAttachments": false, "snippet": "..." },
  ...
]

Responde con:
[
  { "uid": 123, "decision": "trash", "reason": "Newsletter de marketing", "confidence": 0.95, "category": "newsletter" },
  ...
]
```

**Tests** en `code/src/lib/email-triage/__tests__/email-classifier.test.ts`:
- Mock del cliente Anthropic con `vi.mock('@anthropic-ai/sdk')`
- Test: emails de GitHub Actions → trash
- Test: email con PDF adjunto → nunca trash
- Test: email de hace 1 hora → siempre keep
- Test: fallo de API → todos los items del lote como review
- Test: lotes de más de 20 emails se dividen en múltiples llamadas

**Criterio de aceptación**:
- `npm run check` pasa
- Tests en verde
- `ANTHROPIC_API_KEY` documentada en `.env.example`

---

### PR #102 — Prisma models + módulo email-triage

**Rama**: `feature/email-triage-module`

**Dependencia**: PR #101 mergeado.

**Nuevos modelos en `code/prisma/schema.prisma`** (añadir al final, antes del cierre):

```prisma
// ─────────────────────────────────────────────
// EMAIL TRIAGE module
// ─────────────────────────────────────────────

model EmailTriageSession {
  id             String               @id @default(cuid())
  status         TriageSessionStatus  @default(PENDING)
  connectionId   String               @map("connection_id")
  totalFetched   Int                  @default(0) @map("total_fetched")
  totalProcessed Int                  @default(0) @map("total_processed")
  trashCount     Int                  @default(0) @map("trash_count")
  archiveCount   Int                  @default(0) @map("archive_count")
  keepCount      Int                  @default(0) @map("keep_count")
  reviewCount    Int                  @default(0) @map("review_count")
  executedAt     DateTime?            @map("executed_at")
  createdAt      DateTime             @default(now()) @map("created_at")
  updatedAt      DateTime             @updatedAt @map("updated_at")

  items EmailTriageItem[]

  @@index([status])
  @@index([createdAt(sort: Desc)])
  @@map("email_triage_sessions")
}

model EmailTriageItem {
  id             String         @id @default(cuid())
  sessionId      String         @map("session_id")
  uid            Int
  fromAddress    String         @map("from_address")
  subject        String
  emailDate      DateTime       @map("email_date")
  hasAttachments Boolean        @default(false) @map("has_attachments")
  aiDecision     TriageDecision @map("ai_decision")
  aiReason       String?        @map("ai_reason")
  aiConfidence   Float?         @map("ai_confidence")
  aiCategory     String?        @map("ai_category")
  userDecision   TriageDecision? @map("user_decision")
  executed       Boolean        @default(false)
  executedAt     DateTime?      @map("executed_at")
  createdAt      DateTime       @default(now()) @map("created_at")

  session EmailTriageSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([aiDecision])
  @@index([executed])
  @@map("email_triage_items")
}

enum TriageSessionStatus {
  PENDING
  FETCHING
  CLASSIFYING
  READY
  EXECUTING
  DONE
  FAILED
}

enum TriageDecision {
  TRASH
  ARCHIVE
  KEEP
  REVIEW
}
```

**Migración**:
```bash
cd code && npx prisma migrate dev --name add_email_triage
```

**Nuevo módulo**: `code/src/modules/email-triage/`

Crear los siguientes archivos:

`email-triage.types.ts`:
```typescript
export type { TriageSessionStatus, TriageDecision } from '@prisma/client';

export interface TriageSessionSummary {
  id: string;
  status: TriageSessionStatus;
  totalFetched: number;
  totalProcessed: number;
  trashCount: number;
  archiveCount: number;
  keepCount: number;
  reviewCount: number;
  createdAt: Date;
  executedAt: Date | null;
}

export interface TriageItemView {
  id: string;
  uid: number;
  fromAddress: string;
  subject: string;
  emailDate: Date;
  hasAttachments: boolean;
  effectiveDecision: TriageDecision; // userDecision ?? aiDecision
  aiDecision: TriageDecision;
  aiReason: string | null;
  aiConfidence: number | null;
  aiCategory: string | null;
  userDecision: TriageDecision | null;
  executed: boolean;
}
```

`email-triage.repository.ts`: CRUD estándar sobre los modelos Prisma. Métodos:
- `createSession(connectionId: string): Promise<EmailTriageSession>`
- `updateSessionStatus(id, status, counts?): Promise<void>`
- `upsertItems(sessionId, items: EmailTriageItemCreateInput[]): Promise<void>`
- `getSession(id): Promise<TriageSessionSummary | null>`
- `getSessionItems(sessionId, filter?: { decision?: TriageDecision }): Promise<TriageItemView[]>`
- `overrideItemDecision(itemId, decision: TriageDecision): Promise<void>`
- `markItemExecuted(itemId): Promise<void>`
- `listSessions(limit?: number): Promise<TriageSessionSummary[]>`

`email-triage.service.ts`: Orquestador principal. Métodos:
- `startSession(connectionId: string): Promise<string>` — crea sesión, inicia en background fetch + classify
- `executeSession(sessionId: string): Promise<{ trashed: number; errors: number }>` — ejecuta los trash
- `overrideDecision(sessionId, itemId, decision): Promise<void>`
- `overrideCategoryDecision(sessionId, aiCategory, newDecision): Promise<void>`

Implementación de `startSession`:
1. Crear sesión con status `FETCHING`
2. Obtener el adapter IMAP desde SourceConnection
3. Llamar `adapter.fetchNewMessages()` con límite de 500 emails más recientes (para no sobrecargar en la primera sesión)
4. Actualizar status a `CLASSIFYING`, guardar `totalFetched`
5. Para cada email, aplicar las reglas de seguridad ANTES de mandar a la IA:
   - Si fecha < 48h → forzar `keep`
   - Si tiene adjuntos PDF → pre-clasificar como `review`
6. El resto → llamar `classifyEmailBatch` del classifier
7. Guardar todos los items
8. Actualizar status a `READY` con los contadores

Implementación de `executeSession`:
1. Verificar que status sea `READY`
2. Obtener todos los items con `effectiveDecision = TRASH`
3. Para cada uno: llamar `adapter.trashMessage(uid)`
4. Marcar como executed
5. Actualizar status a `DONE`

`index.ts`: exportar todo lo público.

**Tests** en `code/src/modules/email-triage/__tests__/`:
- `email-triage.service.test.ts`: mock del adapter y classifier, verificar reglas de seguridad (PDF → review, <48h → keep)
- `email-triage.repository.test.ts`: test con prisma mock

**Criterio de aceptación**:
- Migración se aplica limpia
- `npm run check` pasa
- Tests en verde
- La regla "PDF → review" y "<48h → keep" está cubierta por test

---

### PR #103 — API routes para email triage

**Rama**: `feature/email-triage-api`

**Dependencia**: PR #102 mergeado.

**Nuevas rutas en `code/src/app/email-triage/`**:

```
code/src/app/email-triage/
├── api/
│   ├── route.ts                           # POST → startSession, GET → listSessions
│   ├── [sessionId]/
│   │   ├── route.ts                       # GET → getSession + items
│   │   ├── execute/
│   │   │   └── route.ts                   # POST → executeSession
│   │   └── items/
│   │       └── [itemId]/
│   │           └── override/
│   │               └── route.ts           # POST → overrideDecision
```

**`api/route.ts`**:
- `POST`: cuerpo `{ connectionId: string }`, llama `emailTriageService.startSession()`, devuelve `{ sessionId, status }`
- `GET`: devuelve últimas 10 sesiones

**`api/[sessionId]/route.ts`**:
- `GET`: devuelve sesión completa con items agrupados por decisión efectiva

**`api/[sessionId]/execute/route.ts`**:
- `POST`: llama `emailTriageService.executeSession(sessionId)`, devuelve `{ trashed, errors }`
- Requiere que la sesión esté en estado `READY`, devolver 409 si no

**`api/[sessionId]/items/[itemId]/override/route.ts`**:
- `POST`: cuerpo `{ decision: TriageDecision }`, llama `overrideDecision`

Todas las rutas requieren sesión autenticada (usar el patrón existente del proyecto con `getServerSession`).

**Tests**: al menos 1 test de integración por ruta (request HTTP mock).

**Criterio de aceptación**: `npm run check` pasa, rutas responden correctamente.

---

### PR #104 — UI de Email Triage

**Rama**: `feature/email-triage-ui`

**Dependencia**: PR #103 mergeado.

**Nueva página**: `code/src/app/email-triage/page.tsx` (y `dashboard/` si sigue el patrón del proyecto)

Seguir exactamente el patrón visual del resto de módulos: `AppShell`, CSS custom properties, Material Symbols, sin librerías externas de UI.

**Vista 1: Sin sesión activa**
- Selector de conexión IMAP (dropdown con las SourceConnections tipo `EMAIL_IMAP` activas)
- Botón "Analizar inbox con IA"
- Aviso: "La IA analizará hasta 500 emails. Los emails con adjuntos PDF y los de menos de 48 horas nunca se borrarán automáticamente."

**Vista 2: Procesando** (polling cada 3s a `GET /api/email-triage/[sessionId]`)
- Barra de progreso
- Texto: "Descargando emails... / Clasificando con IA... / Listo"

**Vista 3: Resultados (READY)**

Mostrar 4 secciones colapsables:

```
🗑️ Mover a papelera   [342 emails]   [Ver todos ▼]
   - newsletter@empresa.com — 45 emails — "Newsletters promocionales"
   - noreply@github.com — 120 emails — "Notificaciones de CI"
   ...

📦 Archivar           [28 emails]   [Ver todos ▼]
   - facturas@banco.com — 12 emails — "Recibos bancarios"
   ...

✅ Conservar          [15 emails]
   ...

⚠️ Revisar tú         [8 emails]
   ...
```

Para cada sección, listar agrupado por `aiCategory` con botón para cambiar la decisión de toda la categoría.

**Barra de acción fija en la parte inferior**:
```
[342 a papelera · 28 a archivar · 15 conservados · 8 para revisar]
[Ejecutar ahora]
```

**Modal de confirmación** antes de ejecutar:
```
⚠️ Estás a punto de mover 342 emails a la Papelera de Gmail.
Podrás recuperarlos durante 30 días desde Gmail.
Los 28 emails para archivar NO se moverán automáticamente (función en desarrollo).

[Cancelar]  [Mover 342 emails a Papelera]
```

Después de ejecutar: mostrar resultado con toast y contadores finales.

**Añadir enlace al sidebar**: entre "Mail Analysis" y "Inbox" en `code/src/components/ui/sidebar/`.

**Añadir strings i18n** en `code/src/locales/` (español) para todos los textos nuevos.

**Criterio de aceptación**:
- El flujo completo funciona end-to-end
- El modal de confirmación siempre aparece antes de ejecutar
- Los estados de carga son visibles
- `npm run check` pasa

---

## FASE 8-B — Unsubscribe con un clic

**Objetivo**: En la página de Mail Analysis actual, los newsletters detectados no tienen acción directa. Queremos que el usuario pueda ver el link de unsubscribe y abrirlo con un clic.

### PR #105 — Extractor de unsubscribe links

**Rama**: `feature/unsubscribe-links`

**Cambio en `code/src/lib/mail-analysis/mail-analysis.ts`**:

Añadir al tipo `MailSenderGroup`:
```typescript
unsubscribeUrl?: string;
```

Añadir función `extractUnsubscribeLink(body: string | null): string | undefined`:
1. Buscar header `List-Unsubscribe:` en el body (el mail sync lo guarda en body con formato `Header: value`)
2. Si no hay header, buscar en el body HTML el primer link con texto que contenga "unsubscribe", "darse de baja", "cancelar suscripción"
3. Limpiar la URL (ya existe `sanitizeUrlCandidate` en el mismo archivo — reutilizarla)
4. Devolver solo si la URL empieza por `https://` (no exponer URLs no seguras)

Actualizar `buildSenderGroups` para incluir `unsubscribeUrl` del primer email del grupo.

**Cambio en `code/src/app/mail-analysis/page.tsx`**:

En la sección de newsletters, si hay `unsubscribeUrl`, mostrar un botón `[Abrir link de baja]` que abre la URL en nueva pestaña (`target="_blank" rel="noopener noreferrer"`).

**Tests**: test unitario para `extractUnsubscribeLink` con varios formatos de body.

---

## FASE 8-C — Módulo Wishlist (cosas que quiero comprar)

**Objetivo**: Módulo nuevo para guardar productos/cosas que el usuario quiere comprar con URL, precio estimado, prioridad y notas.

### PR #106 — Wishlist: modelo + módulo + API + UI completa

**Rama**: `feature/wishlist-module`

**Nuevo modelo Prisma**:

```prisma
model WishlistItem {
  id           String          @id @default(cuid())
  title        String
  url          String?
  notes        String?         @db.Text
  priceEst     Decimal?        @db.Decimal(10, 2) @map("price_est")
  currency     String          @default("EUR")
  priority     Priority        @default(MEDIUM)
  status       WishlistStatus  @default(PENDING)
  tags         String[]
  purchasedAt  DateTime?       @map("purchased_at")
  createdAt    DateTime        @default(now()) @map("created_at")
  updatedAt    DateTime        @updatedAt @map("updated_at")

  @@index([status])
  @@index([priority])
  @@map("wishlist_items")
}

enum WishlistStatus {
  PENDING
  BOUGHT
  DISCARDED
}
```

**Módulo**: `code/src/modules/wishlist/` con repository, service, types e index.

**Rutas API**: `code/src/app/wishlist/api/` — CRUD completo (GET lista, POST crear, PATCH editar, DELETE con confirm).

**UI**: `code/src/app/wishlist/dashboard/` — siguiendo el patrón exacto del módulo `ideas` (que es el más similar en estructura). Filtros por status y priority. Botón "Marcar como comprado" que pone status=BOUGHT y purchasedAt=now. Vista separada "Comprado" para historial.

**Sidebar**: añadir enlace.

---

## FASE 8-D — Módulo Projects

**Objetivo**: Un espacio para documentar y gestionar proyectos personales, con tareas vinculadas, documentos y notas.

### PR #107 — Projects: modelo + módulo + API + UI

**Rama**: `feature/projects-module`

**Nuevo modelo Prisma**:

```prisma
model Project {
  id          String        @id @default(cuid())
  name        String
  description String?       @db.Text
  status      ProjectStatus @default(ACTIVE)
  tags        String[]
  startedAt   DateTime?     @map("started_at")
  dueAt       DateTime?     @map("due_at")
  completedAt DateTime?     @map("completed_at")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  notes ProjectNote[]

  @@index([status])
  @@map("projects")
}

model ProjectNote {
  id        String   @id @default(cuid())
  projectId String   @map("project_id")
  body      String   @db.Text
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@map("project_notes")
}

enum ProjectStatus {
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}
```

**UI**: lista de proyectos + vista de detalle por proyecto que muestra nombre, descripción, notas ordenadas por fecha (tipo log), y en el futuro tareas vinculadas.

---

## FASE 8-E — Subscription Tracker

**Objetivo**: Registrar suscripciones recurrentes (Netflix, dominios, seguros) con fecha de renovación y coste, independiente del módulo de invoices.

### PR #108 — Subscriptions: modelo + módulo + UI

**Rama**: `feature/subscription-tracker`

**Nuevo modelo Prisma**:

```prisma
model Subscription {
  id              String             @id @default(cuid())
  name            String
  provider        String?
  amount          Decimal            @db.Decimal(10, 2)
  currency        String             @default("EUR")
  billingCycle    BillingCycle
  nextRenewalAt   DateTime           @map("next_renewal_at")
  status          SubscriptionStatus @default(ACTIVE)
  notes           String?
  url             String?
  alertDaysBefore Int                @default(7) @map("alert_days_before")
  createdAt       DateTime           @default(now()) @map("created_at")
  updatedAt       DateTime           @updatedAt @map("updated_at")

  @@index([status])
  @@index([nextRenewalAt])
  @@map("subscriptions")
}

enum BillingCycle {
  MONTHLY
  QUARTERLY
  ANNUAL
  ONE_TIME
}

enum SubscriptionStatus {
  ACTIVE
  CANCELLED
  PAUSED
}
```

**Dashboard**: lista con próximas renovaciones ordenadas por fecha. Resaltar las que renuevan en menos de `alertDaysBefore` días. Total mensual y anual calculado (sum agrupado por ciclo).

---

## FASE 8-F — Weekly Digest por Telegram

**Objetivo**: Todos los lunes a las 9:00, Naberza envía a Telegram un resumen semanal: tareas vencidas, facturas pendientes, suscripciones que renuevan esta semana, correos sin procesar.

### PR #109 — Weekly digest

**Rama**: `feature/weekly-digest`

Usar el sistema de automations existente + el Telegram adapter existente.

**Nuevo endpoint API**: `POST /api/digest/weekly` — genera y envía el digest. Requiere autenticación.

El digest recoge datos de:
- `tasks` donde `status = PENDING` y `dueAt < now()`
- `invoices` donde `status = PENDING` y `dueAt < now() + 7 días`
- `subscriptions` donde `nextRenewalAt < now() + 7 días` (cuando exista la tabla)
- `inboxItems` donde `status = PENDING` y `sourceType = EMAIL`

Formatear como mensaje Telegram con secciones. Enviar con el Telegram adapter existente.

**Cron**: añadir nota en la documentación de que esto se puede invocar con un cron job externo (Vercel Cron, crontab) llamando al endpoint con un token.

---

## FASE 8-G — Panel de uso de OpenAI Codex

**Objetivo**: El usuario tiene Codex Pro y quiere ver de un vistazo cuánto cupo de la ventana primaria (5h) y secundaria (semanal) ha consumido, cuándo se resetea, y si puede lanzar más agentes.

### PR #110 — Codex Usage Dashboard

**Rama**: `feature/codex-usage-dashboard`

**Dependencia**: ninguna (módulo nuevo independiente).

**Contexto técnico**:
- La API de uso es `https://chatgpt.com/backend-api/wham/usage`
- Requiere `Authorization: Bearer <token>` donde el token se obtiene del archivo de autenticación de openclaw en `~/.openclaw/agents/main/agent/harness-auth/codex/06bfb5171eff0241/auth.json` (campo `token`)
- Opcionalmente puede requerir el header `ChatGPT-Account-Id` (también en ese JSON, campo `account_id` si existe)
- La respuesta tiene la forma:
  ```json
  {
    "plan_type": "pro",
    "user_email": "...",
    "rate_limit": {
      "primary_window": {
        "used_percent": 45.2,
        "reset_after_seconds": 8400
      },
      "secondary_window": {
        "used_percent": 72.1,
        "reset_after_seconds": 302400
      }
    }
  }
  ```
- `primary_window` = ventana de 5 horas
- `secondary_window` = ventana semanal (7 días)

**Nuevo módulo**: `code/src/modules/openclaw/`

`openclaw.types.ts`:
```typescript
export interface CodexUsageWindow {
  usedPercent: number;
  resetAfterSeconds: number;
}

export interface CodexUsage {
  planType: string;
  userEmail: string;
  primaryWindow: CodexUsageWindow;
  secondaryWindow: CodexUsageWindow;
  fetchedAt: Date;
}
```

`openclaw.service.ts`:
```typescript
export class OpenclawService {
  async getCodexUsage(): Promise<CodexUsage>
}
```

Implementación:
1. Leer el token desde el sistema de archivos local (solo funciona en entorno de desarrollo/servidor propio):
   - Ruta: `process.env.OPENCLAW_CODEX_AUTH_PATH` o por defecto `~/.openclaw/agents/main/agent/harness-auth/codex/06bfb5171eff0241/auth.json`
   - Parsear el JSON y extraer el campo `token`
2. Hacer `fetch` a `https://chatgpt.com/backend-api/wham/usage` con el header `Authorization: Bearer <token>`
3. Parsear la respuesta y devolver `CodexUsage`
4. Si falla (token expirado, red caída): lanzar error con mensaje claro

**Nueva variable de entorno** en `code/.env.example`:
```
# OpenClaw Codex auth (solo para entorno local/self-hosted)
# OPENCLAW_CODEX_AUTH_PATH=~/.openclaw/agents/main/agent/harness-auth/codex/06bfb5171eff0241/auth.json
```

**Nueva ruta API**: `code/src/app/api/openclaw/codex-usage/route.ts`
- `GET`: llama `openclawService.getCodexUsage()`, devuelve el objeto. Requiere sesión autenticada.
- Si el token no está configurado (entorno de producción sin acceso al FS local): devuelve 503 con `{ error: "Codex auth not configured" }`

**Nueva página**: `code/src/app/openclaw/dashboard/`

Seguir el patrón visual del proyecto (AppShell, CSS custom properties, Material Symbols, sin librerías externas).

**Vista principal** — dos tarjetas lado a lado:

```
┌─────────────────────────────┐  ┌─────────────────────────────┐
│  Ventana primaria (5h)      │  │  Ventana semanal (7 días)   │
│                             │  │                             │
│  [████████░░░░░░] 45%       │  │  [██████████████░] 72%      │
│                             │  │                             │
│  Reset en: 2h 20min         │  │  Reset en: 3d 12h           │
└─────────────────────────────┘  └─────────────────────────────┘

Plan: Pro   ·   houselectro8@gmail.com   ·   [Actualizar]
```

Estados de las barras:
- `used_percent < 60` → color verde (CSS var `--color-success`)
- `60 <= used_percent < 85` → color ámbar (CSS var `--color-warning`)
- `used_percent >= 85` → color rojo (CSS var `--color-error`)

Banner de estado en la parte superior:
- Verde: "Codex disponible · Puedes lanzar agentes"
- Ámbar: "Codex próximo al límite · Úsalo con moderación"
- Rojo: "Límite alcanzado · Reset en X"

El estado del banner sigue el peor estado de las dos ventanas.

Función de formateo de tiempo (`formatResetCountdown(seconds: number): string`):
- < 60s → "menos de 1 minuto"
- < 3600s → "Xh Ymin"
- >= 3600s → "Xd Yh" o "Xh" según corresponda

**Polling**: la página actualiza automáticamente cada 5 minutos (usar `setInterval` en `useEffect`).

**Sidebar**: añadir enlace en la sección de herramientas/sistema (al final del sidebar, separado del contenido de hogar).

**Añadir strings i18n** en `code/src/locales/` para todos los textos.

**Tests**:
- `openclaw.service.test.ts`: mock de `fs.readFileSync` + `fetch`, test éxito y test fallo de token
- `codex-usage/route.test.ts`: test con servicio mockeado
- `formatResetCountdown.test.ts`: test unitario para la función de formato

**Criterio de aceptación**:
- `npm run check` pasa
- Las barras de progreso muestran el % correcto
- El banner cambia de color según el estado
- El polling actualiza sin recargar la página
- Si `OPENCLAW_CODEX_AUTH_PATH` no está configurado, la página muestra un mensaje de configuración en lugar de error

---

## Orden de ejecución recomendado

```
PR #100 → PR #101 → PR #102 → PR #103 → PR #104  (Fase 8-A, ✅ completado)
PR #105  (Fase 8-B, independiente)
PR #106  (Fase 8-C, independiente)
PR #107  (Fase 8-D, independiente)
PR #108  (Fase 8-E, independiente)
PR #109  (Fase 8-F, depende de que existan subscriptions de #108)
PR #110  (Fase 8-G, independiente — puede hacerse en paralelo con cualquier otro)
```

---

## Convenciones del proyecto que todo agente debe respetar

- **Tests**: Vitest. Todos los nuevos módulos tienen tests. `npm run check` debe pasar en verde.
- **Tipos**: TypeScript strict. Sin `any`. Sin `@ts-ignore`.
- **Estilos**: CSS custom properties + BEM. Sin Tailwind. Sin librerías de componentes externas.
- **Iconos**: Material Symbols (ya configurados). Sin emojis en la UI.
- **i18n**: Todos los strings visibles van en `code/src/locales/es.json` (o el archivo correspondiente). Sin strings hardcodeados en JSX.
- **API routes**: Siempre verificar sesión con `getServerSession`. Devolver errores tipados.
- **Módulos**: Cada módulo tiene `repository.ts`, `service.ts`, `types.ts`, `index.ts`. El service nunca importa directamente de Prisma — usa el repository.
- **Sin TODOs en código**: usar README.md del módulo para notas.
- **Commits**: rama `feature/*` → PR a `develop`.

---

## Estado de este roadmap

| PR | Descripción | Status |
|----|-------------|--------|
| #100 | MailImapAdapter: trashMessage + fetchSnippet | ✅ completado |
| #101 | AI Email Classifier (Gemini 2.5 Flash, no Haiku) | ✅ completado |
| #102 | Prisma EmailTriage + módulo | ✅ completado |
| #103 | API routes email-triage | ✅ completado |
| #104 | UI email-triage | ✅ completado |
| #105 | Unsubscribe links | ✅ completado |
| #106 | Wishlist module | ⬜ pendiente |
| #107 | Projects module | ⬜ pendiente |
| #108 | Subscription tracker | ⬜ pendiente |
| #109 | Weekly Telegram digest | ⬜ pendiente |
| #110 | Codex Usage Dashboard | ⬜ pendiente |
