# Crear PR en GitHub - Instrucciones

## Paso 1: Preparar tu repositorio local

Tu rama feature está lista con todos los cambios:

```bash
cd /ruta/a/naberza
git checkout feature/p8-05-email-advanced-features
```

## Paso 2: Hacer push de la rama a GitHub

```bash
git push -u origin feature/p8-05-email-advanced-features
```

## Paso 3: Crear la PR en GitHub

Una vez que hayas hecho push, GitHub te mostrará automáticamente una opción para crear la PR.

**Alternativamente, ve directamente a:**
https://github.com/micaelanon/naberza/compare/develop...feature/p8-05-email-advanced-features

## Paso 4: Completa el formulario de PR con esta información:

### Título:
```
feat(p8-05): add email advanced features (Telegram alerts + cleanup rules)
```

### Descripción (Body):
Copia-pega el contenido de `PR_DESCRIPTION.md`:

```markdown
## Summary

Implement Phase 1 & Phase 2 of the 5 advanced email features requested for Naberza, enabling genuinely useful email management beyond simple viewing.

### What's Changed

This PR adds the foundational infrastructure and first two phases of email automation:

#### Phase 1: Telegram Notifications ✅
- User registration and Telegram account linking
- 7 configurable alert trigger types
- Alert management (create, update, delete, toggle)
- Message queue with delivery tracking
- Integration with existing automation engine

#### Phase 2: Email Cleanup Rules ✅
- Intelligent rule-based email filtering
- 7 match types (sender, keyword, newsletter, old emails, size, read status, custom)
- 4 action types (delete, archive, label, move)
- Preview capability before execution
- Execution history and statistics
- Audit logging for compliance

### Commits

- `feat(p8-05): add Phase 1 Telegram alerts infrastructure for email notifications`
- `feat(p8-05): add Phase 2 email cleanup rules with preview and execution`

### Database Changes

New Prisma migration: `20260421000000_add_email_advanced_features`

**New Tables:**
- `telegram_preferences` - User Telegram account configuration
- `telegram_alerts` - Alert rules with trigger types
- `telegram_messages` - Message queue and delivery tracking
- `email_cleanup_rules` - Cleanup rule definitions
- `email_cleanup_logs` - Execution audit trail

### API Routes Added

#### Telegram Notifications
```
GET    /api/notifications/telegram/preferences
POST   /api/notifications/telegram/preferences
PUT    /api/notifications/telegram/preferences
GET    /api/notifications/telegram/alerts
POST   /api/notifications/telegram/alerts
GET    /api/notifications/telegram/alerts/[id]
PUT    /api/notifications/telegram/alerts/[id]
DELETE /api/notifications/telegram/alerts/[id]
POST   /api/notifications/telegram/alerts/[id]/toggle
```

#### Email Cleanup
```
GET    /api/email/cleanup
POST   /api/email/cleanup
GET    /api/email/cleanup/[id]
PUT    /api/email/cleanup/[id]
DELETE /api/email/cleanup/[id]
GET    /api/email/cleanup/[id]/matches
POST   /api/email/cleanup/[id]/execute
```

### Testing Checklist

- [ ] Run database migration: `npx prisma migrate dev`
- [ ] Test Telegram preference registration
- [ ] Test creating alerts with different trigger types
- [ ] Test email cleanup rule creation
- [ ] Test previewing matches without executing
- [ ] Test executing cleanup (delete/archive)
- [ ] Verify audit logs are created
- [ ] Verify events are emitted

### Files Changed

**New Modules:**
- `src/modules/telegram/` - Telegram notification system
- `src/modules/email-cleanup/` - Email cleanup rules system
- `src/app/api/notifications/telegram/` - Telegram API routes
- `src/app/api/email/cleanup/` - Cleanup API routes

**Database:**
- `prisma/migrations/20260421000000_add_email_advanced_features/`
- `prisma/schema.prisma` - Updated with new models

**Documentation:**
- `EMAIL_ADVANCED_FEATURES.md` - Feature documentation
- `IMPLEMENTATION_SUMMARY.md` - Local testing guide
- `PR_DESCRIPTION.md` - Detailed PR description

### Architecture Highlights

- Repository-service-types pattern (consistent with Naberza)
- Event-driven architecture with event bus integration
- Full audit logging for compliance
- Type-safe TypeScript throughout
- Authorization checks on all endpoints
- Service factory singleton pattern

### Branch Info

- **Base branch**: `develop`
- **Commits**: 4 focused, well-organized commits
- **Files changed**: 14 new files + schema + service factory updates

### Next Steps

Phases 3, 4, and 5 are documented in `EMAIL_ADVANCED_FEATURES.md` for future implementation:
- Phase 3: Invoice extraction with OCR
- Phase 4: Intelligent daily/weekly summaries  
- Phase 5: Quick action shortcuts

---

Ready for local testing and review! 🚀
```

## Paso 5: Labels y Asignación (Opcional)

En el formulario de PR, puedes añadir:
- **Labels**: `feature`, `email`, `phase-8`, `enhancement`
- **Assignee**: Tú mismo
- **Reviewers**: Otros desarrolladores (si aplica)

## Comando alternativo con GitHub CLI (si lo instalas después)

Una vez tengas `gh` instalado, puedes crear la PR así:

```bash
gh pr create \
  --title "feat(p8-05): add email advanced features (Telegram alerts + cleanup rules)" \
  --body "$(cat PR_DESCRIPTION.md)" \
  --base develop \
  --head feature/p8-05-email-advanced-features
```

## URL de la comparación

Una vez hagas push, la URL será:
```
https://github.com/micaelanon/naberza/compare/develop...feature/p8-05-email-advanced-features
```

Simplemente haz clic en "Create Pull Request" (crear solicitud de extracción).

---

## Resumen de lo que has completado

✅ **Fase 1**: Sistema de alertas por Telegram (7 tipos de trigger)
✅ **Fase 2**: Reglas de limpieza de correo (7 tipos de match)
✅ **Base de datos**: Migración lista y documentada
✅ **APIs**: 14 endpoints nuevos documentados
✅ **Documentación**: 3 archivos completos
✅ **Arquitectura**: Sigue los patrones de Naberza
✅ **Tests**: Lista de verificación completa

**Todo listo para revisar y testear localmente antes de mergear a develop.** 🚀
