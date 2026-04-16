#!/bin/bash
# Quick Reference Card para levantar Naberza en local

cat << 'EOF'

╔══════════════════════════════════════════════════════════════════════════════╗
║                     🚀 NABERZA OS - LOCAL DEVELOPMENT                        ║
╚══════════════════════════════════════════════════════════════════════════════╝

📍 PROYECTO EN:
   /Users/micaelai/.openclaw/workspace/naberza

🔀 RAMA: develop ✅

═══════════════════════════════════════════════════════════════════════════════

⚡ LEVANTARLO EN 20 SEGUNDOS (Opción rápida):

   cd /Users/micaelai/.openclaw/workspace/naberza
   ./start-dev.sh

   Eso es. El script hace todo automáticamente.

═══════════════════════════════════════════════════════════════════════════════

📝 LEVANTARLO MANUAL (Si prefieres):

   1. cd /Users/micaelai/.openclaw/workspace/naberza

   2. docker-compose up -d
      (Levanta PostgreSQL + app)

   3. Espera ~5 segundos

   4. cd code && npm install
      (Solo la primera vez)

   5. npm run dev
      (Inicia servidor)

═══════════════════════════════════════════════════════════════════════════════

🌐 ACCESO:

   URL:        http://localhost:3000
   Login:      http://localhost:3000/login
   Dashboard:  http://localhost:3000/inbox/dashboard

═══════════════════════════════════════════════════════════════════════════════

🔑 CREDENCIALES DE PRUEBA:

   Email:    admin@naberza.local
   Password: TestPassword123!

═══════════════════════════════════════════════════════════════════════════════

✨ QUÉ VERÁS AL HACER LOGIN:

   ✅ Serás redirigido a /inbox/dashboard
   ✅ Verás un placeholder "Inbox" (es Phase 0, aún sin features)
   ✅ Puedes navegar a otros módulos en la URL:
      - /inbox/dashboard
      - /tasks/dashboard
      - /documents/dashboard
      - /finance/dashboard
      - /home/dashboard
      - /ideas/dashboard
      - /automations/dashboard
      - /integrations/dashboard
      - /invoices/dashboard
      - /audit/dashboard
      - /users/dashboard

═══════════════════════════════════════════════════════════════════════════════

📚 DOCUMENTACIÓN:

   LOCAL-DEV-SETUP.md        → Guía completa
   docs/docker-setup.md      → Setup de Docker detallado
   docs/test-users-and-auth.md → Auth y credenciales

═══════════════════════════════════════════════════════════════════════════════

🛑 PARAR:

   Dev server: Ctrl+C (en terminal de npm run dev)
   Docker:     docker-compose down
   Resetear BD: docker-compose down -v && docker-compose up -d

═══════════════════════════════════════════════════════════════════════════════

⚠️  TROUBLESHOOTING RÁPIDO:

   ❌ "Connection refused"
      → docker-compose ps (verifica que todo esté UP)

   ❌ "Invalid credentials"
      → Edita .env.local y verifica:
        AUTH_ADMIN_EMAIL=admin@naberza.local
        AUTH_ADMIN_PASSWORD=TestPassword123!

   ❌ "Port 3000 in use"
      → npm run dev -- -p 3001 (usa otro puerto)

═══════════════════════════════════════════════════════════════════════════════

🎯 ESTADO DE PHASE 0:

   ✅ Autenticación (NextAuth) — FUNCIONAL
   ✅ 11 módulos scaffolded — LISTOS PARA VER
   ✅ Prisma + PostgreSQL — READY
   ✅ Event bus + Audit — BACKEND LISTO

   ⏭️  Phase 1 (Core Loop): Inbox y Tasks (próximo)

═══════════════════════════════════════════════════════════════════════════════

💡 NOTAS:

   • Rama activa: develop (es staging)
   • Hot reload: Activo (cambios se reflejan automáticamente)
   • BD: PostgreSQL en Docker, datos persisten
   • .env.local: Local-only, no versionado

═══════════════════════════════════════════════════════════════════════════════

EOF
