/**
 * Prisma Seed Script — Naberza OS
 *
 * Inserts realistic demo data for development.
 * To run:   npm run db:seed
 * To clear: npm run db:clear-seed
 *
 * This file is intentionally NOT imported anywhere in the app.
 */

// Workaround for Prisma 6.x ESM enum validation issue:
// using createRequire ensures we load the compiled CJS client
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// Workaround: Prisma 6.x ESM loads the source runtime instead of compiled client.
// Loading via CJS require resolves the compiled client correctly.
// See: https://github.com/prisma/prisma/issues/22687
// eslint-disable-next-line sonarjs/no-internal-api-use
const { PrismaClient } = require("../node_modules/@prisma/client/index.js") as typeof import("@prisma/client");

const prisma = new PrismaClient();

async function seedUser() {
  const email = process.env.AUTH_ADMIN_EMAIL ?? "admin@naberza.local";

  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Admin" },
    create: {
      email,
      name: "Admin",
    },
  });

  console.log(`  ✓ admin user (${user.email})`);
  return user;
}

async function seedInbox() {
  const items = await prisma.$transaction([
    prisma.inboxItem.create({
      data: {
        title: "Factura Endesa — Febrero 2026",
        body: "Se adjunta factura de electricidad. Importe: 94,30 €",
        sourceType: "EMAIL",
        status: "PENDING",
        priority: "MEDIUM",
        classification: "INVOICE",
        classifiedBy: "AI_SUGGESTION",
        classificationConfidence: 0.92,
        metadata: { from: "facturas@endesa.com", attachments: 1 },
      },
    }),
    prisma.inboxItem.create({
      data: {
        title: "Alarma de temperatura en pasillo — 14:23",
        body: "Sensor S-04 ha superado 28°C durante más de 30 minutos",
        sourceType: "HOME_ASSISTANT",
        status: "PENDING",
        priority: "HIGH",
        classification: "ALERT",
        classifiedBy: "RULE",
        metadata: { sensor: "S-04", value: "29.1°C" },
      },
    }),
    prisma.inboxItem.create({
      data: {
        title: "Resumen semanal Copilot — 14 Apr 2026",
        body: "Esta semana: 40 PRs abiertas, 12 comentarios de revisión, 3 sugerencias aceptadas",
        sourceType: "API",
        status: "CLASSIFIED",
        priority: "LOW",
        classification: "REVIEW",
        classifiedBy: "AI_SUGGESTION",
        classificationConfidence: 0.85,
        processedAt: new Date("2026-04-14T09:00:00Z"),
      },
    }),
    prisma.inboxItem.create({
      data: {
        title: "Renovar seguro del coche — vence 30 May",
        body: "El seguro del Ford Focus vence el 30 de mayo.",
        sourceType: "MANUAL",
        status: "PENDING",
        priority: "MEDIUM",
        classification: "TASK",
        classifiedBy: "MANUAL",
        routedToModule: "tasks",
      },
    }),
    prisma.inboxItem.create({
      data: {
        title: "Presupuesto reforma baño — Fontanería García",
        body: "Total: 2.800 € IVA incluido. Validez: 30 días.",
        sourceType: "EMAIL",
        status: "PENDING",
        priority: "LOW",
        classification: "DOCUMENT",
        classifiedBy: "AI_SUGGESTION",
        classificationConfidence: 0.78,
        metadata: { from: "info@fontaneria-garcia.com", attachments: 2 },
      },
    }),
    prisma.inboxItem.create({
      data: {
        title: "Idea: automatizar backup mensual de fotos",
        body: "Usar Paperless + n8n para mover fotos del móvil a NAS el primer día de cada mes",
        sourceType: "MANUAL",
        status: "DISMISSED",
        priority: "NONE",
        classification: "IDEA",
        classifiedBy: "MANUAL",
        processedAt: new Date("2026-04-15T18:30:00Z"),
      },
    }),
  ]);
  console.log(`  ✓ ${items.length} inbox items`);
  return items;
}

async function seedTasks() {
  const tasks = await prisma.$transaction([
    prisma.task.create({
      data: {
        title: "Renovar seguro del coche",
        description: "Comparar ofertas en al menos 3 compañías antes de renovar.",
        priority: "MEDIUM",
        kind: "NORMAL",
        status: "PENDING",
        dueAt: new Date("2026-05-20T10:00:00Z"),
        tags: ["coche", "seguros", "personal"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Revisar PR #87 en habitOS",
        description: "Incluye cambios en el sistema de autenticación. Alta prioridad.",
        priority: "HIGH",
        kind: "NORMAL",
        status: "IN_PROGRESS",
        dueAt: new Date("2026-04-17T17:00:00Z"),
        tags: ["trabajo", "habitOS", "review"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Hacer copia de seguridad del NAS",
        description: "Verificar estado de backups. Último backup detectado hace 8 días.",
        priority: "HIGH",
        kind: "RECURRING",
        status: "PENDING",
        recurrenceRule: "FREQ=WEEKLY;BYDAY=MO",
        tags: ["infraestructura", "backup"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Solicitar certificado de empadronamiento",
        description: "Necesario para la tramitación del seguro médico privado.",
        priority: "LOW",
        kind: "NORMAL",
        status: "PENDING",
        dueAt: new Date("2026-04-30T12:00:00Z"),
        tags: ["gestiones", "personal"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Actualizar CV",
        description: "Añadir proyectos de 2025 y actualizar stack tecnológico.",
        priority: "LOW",
        kind: "NORMAL",
        status: "COMPLETED",
        completedAt: new Date("2026-04-10T16:00:00Z"),
        tags: ["personal", "carrera"],
      },
    }),
    prisma.task.create({
      data: {
        title: "Activar notificaciones de Home Assistant en móvil",
        description: "El webhook está configurado pero las notificaciones push no llegan.",
        priority: "NONE",
        kind: "PERSISTENT",
        status: "PENDING",
        tags: ["infraestructura", "home-assistant"],
      },
    }),
  ]);
  console.log(`  ✓ ${tasks.length} tasks`);
  return tasks;
}

async function seedAuditEvents(inboxItemId: string, taskId: string) {
  const events = await prisma.$transaction([
    prisma.auditEvent.create({
      data: {
        module: "inbox",
        action: "item.created",
        entityType: "InboxItem",
        entityId: inboxItemId,
        actor: "USER",
        actorDetail: "admin@naberza.local",
        status: "SUCCESS",
        input: { sourceType: "EMAIL" },
        output: { id: inboxItemId },
      },
    }),
    prisma.auditEvent.create({
      data: {
        module: "inbox",
        action: "item.classified",
        entityType: "InboxItem",
        entityId: inboxItemId,
        actor: "SYSTEM",
        status: "SUCCESS",
        input: { classification: "INVOICE", confidence: 0.92 },
      },
    }),
    prisma.auditEvent.create({
      data: {
        module: "tasks",
        action: "task.created",
        entityType: "Task",
        entityId: taskId,
        actor: "USER",
        actorDetail: "admin@naberza.local",
        status: "SUCCESS",
        input: { title: "Revisar PR #87 en habitOS" },
      },
    }),
    prisma.auditEvent.create({
      data: {
        module: "auth",
        action: "session.created",
        actor: "USER",
        actorDetail: "admin@naberza.local",
        status: "SUCCESS",
        metadata: { provider: "credentials" },
      },
    }),
    prisma.auditEvent.create({
      data: {
        module: "auth",
        action: "session.failed",
        actor: "USER",
        actorDetail: "admin@naberza.local",
        status: "FAILURE",
        errorMessage: "Invalid credentials",
        metadata: { attempt: 1 },
      },
    }),
  ]);
  console.log(`  ✓ ${events.length} audit events`);
}

async function seedIdeas() {
  await prisma.$transaction([
    prisma.idea.create({
      data: {
        title: "Integrar Notion como fuente de entrada del inbox",
        body: "Exportar páginas marcadas en Notion al inbox de Naberza para procesarlas.",
        tags: ["integrations", "notion"],
        status: "CAPTURED",
      },
    }),
    prisma.idea.create({
      data: {
        title: "Widget de tareas de hoy para escritorio macOS",
        body: "Un widget que muestre las tareas con dueAt de hoy directamente en el escritorio.",
        tags: ["mobile", "ux"],
        status: "CAPTURED",
      },
    }),
    prisma.idea.create({
      data: {
        title: "Modo focus: silenciar inbox durante bloques de trabajo",
        body: "Al activar modo focus, los items se acumulan sin notificar. Se procesan al salir.",
        tags: ["ux", "productividad"],
        status: "ARCHIVED",
      },
    }),
  ]);
  console.log(`  ✓ 3 ideas`);
}

async function main() {
  console.log("🌱 Seeding Naberza OS database...\n");

  await seedUser();
  const inboxItems = await seedInbox();
  const tasks = await seedTasks();
  await seedAuditEvents(inboxItems[0].id, tasks[1].id);
  await seedIdeas();

  console.log("\n✅ Seed completado.\n");
  console.log("Para eliminar estos datos:");
  console.log("  npm run db:clear-seed    (solo borra seed data, mantiene schema)");
  console.log("  npx prisma migrate reset (resetea todo, re-aplica migraciones)");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect().catch(() => null);
  });
