# Tarea 6 — i18n: centralizar texto de UI en locale files

**Rama:** `internal/refactor-06-i18n`
**Base:** `develop` (con tareas 01–05 mergeadas)
**Tipo:** refactor — no cambia comportamiento visible

---

## Objetivo

Eliminar todos los strings de texto visible al usuario que están hardcodeados
en componentes `.tsx`. Centralizarlos en `src/locales/shared/es.json`
e integrar `next-intl` para consumirlos.

Naberza es una app personal en español. Por ahora solo se necesita `es.json`.
La infraestructura next-intl permite añadir más idiomas en el futuro sin refactorizar.

Convención de referencia:
`~/.openclaw/workspace/projects/copilot-instructions-test/instructions/i18n-conventions.instructions.md`

---

## Alcance real (del audit)

- **82+ instancias** de texto hardcodeado en **22 ficheros**
- Categorías: placeholders, botones, títulos, empty states, opciones de select,
  labels de navegación, mensajes de error, aria-labels

---

## Paso 1 — Instalar next-intl

```bash
cd code
npm install next-intl
```

---

## Paso 2 — Infraestructura

### `code/src/i18n.ts`

```typescript
import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async () => ({
  locale: "es",
  messages: (await import("./locales/shared/es.json")).default,
}));
```

### `code/next.config.ts` — añadir el plugin

```typescript
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// envolver el export existente:
export default withNextIntl({
  // ... config existente sin tocar
});
```

### `code/src/middleware.ts` — añadir locale detection

```typescript
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

const intlMiddleware = createMiddleware({
  locales: ["es"],
  defaultLocale: "es",
  localePrefix: "never",  // sin /es/ en la URL
});

export function middleware(request: NextRequest) {
  // Auth guard existente — mantenerlo
  // Añadir al final, antes del return:
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

**IMPORTANTE:** Si middleware.ts ya tiene lógica de auth guard (redirección a /login),
mantenerla intacta. next-intl middleware se añade encima de la lógica existente
o se combina usando `chain`. No romper el auth.

### `code/src/app/layout.tsx` — provider

```typescript
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

// En el RootLayout existente, envolver children:
const messages = await getMessages();

return (
  <html lang="es">
    <body>
      <NextIntlClientProvider messages={messages}>
        {/* ... resto del layout existente sin tocar ... */}
      </NextIntlClientProvider>
    </body>
  </html>
);
```

---

## Paso 3 — Crear `src/locales/shared/es.json`

```json
{
  "app.common.cancel":    "Cancelar",
  "app.common.delete":    "Eliminar",
  "app.common.edit":      "Editar",
  "app.common.save":      "Guardar",
  "app.common.add":       "Añadir",
  "app.common.create":    "Crear",
  "app.common.confirm":   "Confirmar",
  "app.common.retry":     "Reintentar",
  "app.common.loading":   "Cargando...",
  "app.common.deleting":  "Eliminando...",
  "app.common.search":    "Buscar...",
  "app.common.noResults": "Sin resultados",
  "app.common.optional":  "(opcional)",
  "app.common.required":  "Campo obligatorio",

  "app.nav.home":         "Casa",
  "app.nav.tasks":        "Tareas",
  "app.nav.inbox":        "Inbox",
  "app.nav.invoices":     "Facturas",
  "app.nav.documents":    "Documentos",
  "app.nav.finance":      "Finanzas",
  "app.nav.ideas":        "Ideas",
  "app.nav.automations":  "Automatizaciones",
  "app.nav.integrations": "Integraciones",
  "app.nav.users":        "Usuarios",
  "app.nav.audit":        "Auditoría",
  "app.nav.ariaLabel":    "Navegación principal",

  "app.delete.modal.title":    "¿Eliminar este elemento?",
  "app.delete.modal.subtitle": "Esta acción no se puede deshacer.",

  "app.tasks.searchPlaceholder":   "Buscar tareas...",
  "app.tasks.titlePlaceholder":    "¿Qué necesitas hacer?",
  "app.tasks.descPlaceholder":     "Descripción (opcional)",
  "app.tasks.tagsPlaceholder":     "Etiquetas (separadas por coma)",
  "app.tasks.priority.none":       "Sin prioridad",
  "app.tasks.priority.low":        "Baja",
  "app.tasks.priority.medium":     "Media",
  "app.tasks.priority.high":       "Alta",
  "app.tasks.type.normal":         "Normal",
  "app.tasks.type.persistent":     "Persistente",
  "app.tasks.type.recurring":      "Recurrente",

  "app.inbox.searchPlaceholder":   "Buscar en inbox...",
  "app.inbox.titlePlaceholder":    "¿Qué quieres anotar?",
  "app.inbox.detailPlaceholder":   "Detalles (opcional)",
  "app.inbox.priority.none":       "Sin prioridad",
  "app.inbox.priority.low":        "Baja",
  "app.inbox.priority.medium":     "Media",
  "app.inbox.priority.high":       "Alta",
  "app.inbox.category.unclassified": "Sin clasificar",
  "app.inbox.category.task":       "Tarea",
  "app.inbox.category.document":   "Documento",
  "app.inbox.category.invoice":    "Factura",
  "app.inbox.category.event":      "Evento",
  "app.inbox.category.alert":      "Alerta",
  "app.inbox.category.idea":       "Idea",
  "app.inbox.category.financial":  "Financiero",
  "app.inbox.category.review":     "Revisión",

  "app.invoices.searchPlaceholder": "Buscar facturas...",
  "app.invoices.issuerPlaceholder": "Emisor (ej: Endesa)",
  "app.invoices.amountPlaceholder": "Importe (€)",
  "app.invoices.categoryPlaceholder": "Categoría (ej: Suministros)",
  "app.invoices.status.pending":   "Pendiente",
  "app.invoices.status.paid":      "Pagada",
  "app.invoices.status.overdue":   "Vencida",
  "app.invoices.status.cancelled": "Cancelada",
  "app.invoices.action.markPaid":  "Marcar como pagada",

  "app.finance.amountPlaceholder":   "Importe (€)",
  "app.finance.descPlaceholder":     "Descripción",
  "app.finance.categoryPlaceholder": "Categoría",

  "app.ideas.searchPlaceholder": "Buscar ideas...",
  "app.ideas.titlePlaceholder":  "¿Qué idea tienes?",
  "app.ideas.descPlaceholder":   "Desarrolla la idea (opcional)",

  "app.home.section.urgent":       "Atención inmediata",
  "app.home.section.access":       "Cerraduras y accesos",

  "app.errors.generic":            "Ha ocurrido un error. Inténtalo de nuevo.",
  "app.errors.notFound":           "No encontrado.",
  "app.errors.unauthorized":       "Sin autorización."
}
```

### `code/src/locales/shared/index.ts`

```typescript
import es from "./es.json";
export default { es };
```

### `code/src/locales/index.ts`

```typescript
export { default } from "./shared";
```

---

## Paso 4 — Migrar componentes

Para cada fichero afectado, el patrón es siempre el mismo:

```typescript
// Server Component
import { useTranslations } from "next-intl";

const TasksView = () => {
  const t = useTranslations();
  return (
    <input placeholder={t("app.tasks.searchPlaceholder")} />
  );
};

// Client Component ("use client" ya presente)
"use client";
import { useTranslations } from "next-intl";

const InboxView = () => {
  const t = useTranslations();
  return <button>{t("app.common.cancel")}</button>;
};
```

**Ficheros a migrar (22):**
```
src/components/ui/confirm-delete-modal/confirm-delete-modal.tsx
src/components/ui/sidebar/sidebar.tsx
src/app/tasks/dashboard/tasks-view/tasks-view.tsx
src/app/inbox/dashboard/inbox-view/inbox-view.tsx
src/app/invoices/dashboard/invoices-view/invoices-view.tsx
src/app/finance/dashboard/finance-view/finance-view.tsx
src/app/ideas/dashboard/ideas-view/ideas-view.tsx
src/app/home/dashboard/home-view/home-view.tsx
src/app/mail-analysis/page.tsx
src/app/audit/layout.tsx
src/app/automations/layout.tsx
src/app/documents/layout.tsx
src/app/finance/layout.tsx
src/app/home/layout.tsx
src/app/ideas/layout.tsx
src/app/inbox/layout.tsx
src/app/integrations/layout.tsx
src/app/invoices/layout.tsx
src/app/tasks/layout.tsx
src/app/users/layout.tsx
src/app/users/dashboard/settings-view/settings-view.tsx
src/components/ui/toast/toast.tsx
```

---

## Reglas de migración

1. Si el texto ya tiene una clave en `es.json` → usar `t("la.clave")`
2. Si encuentras texto no listado en el `es.json` de arriba → añadir la clave al JSON **antes** de usarla en el componente
3. Los strings de código (no visibles al usuario: nombres de clases CSS, valores de data-attributes, keys de objetos) **NO** van al JSON
4. Los `console.error` / `console.warn` de servidor **NO** van al JSON
5. Si un texto tiene variables: `t("app.errors.count", { count: n })`

---

## Pasos

### 1. Crear la rama

```bash
cd code
git checkout develop
git pull origin develop
git checkout -b internal/refactor-06-i18n
```

### 2. Instalar y configurar infraestructura

```bash
npm install next-intl
```

Crear/modificar en orden:
1. `src/i18n.ts` (nuevo)
2. `src/locales/shared/es.json` (nuevo)
3. `src/locales/shared/index.ts` (nuevo)
4. `src/locales/index.ts` (nuevo)
5. `next.config.ts` (modificar — añadir plugin)
6. `src/middleware.ts` (modificar — añadir intl, sin romper auth)
7. `src/app/layout.tsx` (modificar — añadir provider)

### 3. Verificar que la app arranca

```bash
npm run type-check
npm run dev  # debe arrancar sin errores en consola
```

### 4. Migrar componentes — uno por módulo

```bash
git commit -m "refactor(ui): migrate confirm-delete-modal and sidebar to i18n"
git commit -m "refactor(tasks): migrate tasks-view to i18n"
git commit -m "refactor(inbox): migrate inbox-view to i18n"
git commit -m "refactor(invoices): migrate invoices-view to i18n"
git commit -m "refactor(finance): migrate finance-view to i18n"
git commit -m "refactor(ideas): migrate ideas-view to i18n"
git commit -m "refactor(home): migrate home-view to i18n"
git commit -m "refactor(layouts): migrate all layout.tsx title strings to i18n"
```

### 5. Verificar

```bash
npm run check

# Debe devolver 0 resultados de texto UI hardcodeado en español:
grep -rn '"Cancelar"\|"Eliminar"\|"Editar"\|"Buscar"\|"Guardar"' src --include="*.tsx" | grep -v __tests__ | grep -v es.json | grep -v .next
```

### 6. Push y PR

```bash
git push origin internal/refactor-06-i18n
```

**Título del PR:** `refactor: centralize UI text in es.json via next-intl`

**Descripción:**
```
## What
- next-intl instalado y configurado (i18n.ts, middleware, layout provider)
- src/locales/shared/es.json creado con N claves
- 22 ficheros migrados: strings hardcodeados → t("clave")
- Infraestructura lista para añadir más idiomas sin refactorizar

## Why
82+ strings de UI hardcodeados en 22 ficheros. Sin esto, cambiar
un label requiere buscar en toda la base de código. Con es.json
hay un único punto de verdad para todo el texto visible.

## Verification
- [ ] `npm run check` passes
- [ ] App arranca y muestra todos los textos correctamente
- [ ] `grep -rn '"Cancelar"\|"Eliminar"\|"Editar"' src --include="*.tsx" | grep -v es.json` devuelve 0
```

---

## Definición de done

- `src/locales/shared/es.json` existe con todas las claves de texto UI
- `next-intl` instalado y configurado: i18n.ts + next.config + middleware + layout
- Ningún `.tsx` tiene strings de texto visible al usuario hardcodeados
- `npm run check` pasa
- La app renderiza todos los textos correctamente
