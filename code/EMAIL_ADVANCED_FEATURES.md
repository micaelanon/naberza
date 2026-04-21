# Email Advanced Features Implementation (P8-05)

This document outlines the implementation of 5 advanced email features for Naberza, progressively rolled out across 4 phases.

## Phase 1: Telegram Alerts & User Preferences ✅

### Overview
Foundational infrastructure for sending Telegram notifications when specific email events occur.

### Database Models
- **TelegramPreference**: User's Telegram connection details and settings
- **TelegramAlert**: Configurable alert rules with trigger types
- **TelegramMessage**: Message queue and delivery tracking

### Alert Types (AlertTriggerType)
1. **PRIORITY_SENDER**: Alert when email from VIP contacts
2. **KEYWORD**: Alert when keywords appear in subject/body
3. **UNPAID_INVOICE**: Alert for unpaid invoices
4. **URGENT_TASK**: Alert for overdue tasks
5. **FINANCE_SUMMARY**: Alert for financial milestones
6. **DAILY_DIGEST**: Daily summary alert
7. **WEEKLY_DIGEST**: Weekly summary alert

### API Routes
```
GET  /api/notifications/telegram/preferences      # Get user preference
POST /api/notifications/telegram/preferences      # Register for Telegram
PUT  /api/notifications/telegram/preferences      # Update preferences

GET  /api/notifications/telegram/alerts           # List alerts
POST /api/notifications/telegram/alerts           # Create alert
GET  /api/notifications/telegram/alerts/[id]      # Get alert
PUT  /api/notifications/telegram/alerts/[id]      # Update alert
DELETE /api/notifications/telegram/alerts/[id]    # Delete alert
POST /api/notifications/telegram/alerts/[id]/toggle # Enable/disable alert
```

### Service Methods
- `registerUser(userId)` - Register user for Telegram
- `getPreference(userId)` - Get current preferences
- `verifyTelegramUser(userId, telegramId, username)` - Link Telegram account
- `createAlert(input)` - Create new alert rule
- `listAlerts(preferenceId, filter)` - Get user's alerts
- `updateAlert(id, input)` - Modify alert settings
- `deleteAlert(id)` - Remove alert
- `toggleAlert(id, enabled)` - Enable/disable alert
- `sendMessage(preferenceId, text)` - Send message
- `hasEnabledAlerts(userId, triggerType)` - Check for active alerts
- `getEnabledAlertsForTrigger(userId, triggerType)` - Get alerts by trigger

### Event Emissions
- `notification.telegram.registered` - User registered
- `notification.telegram.verified` - Telegram account linked
- `notification.telegram.alert.created` - Alert created
- `notification.telegram.alert.updated` - Alert modified
- `notification.telegram.alert.deleted` - Alert removed
- `notification.telegram.sent` - Message sent successfully
- `notification.telegram.failed` - Message send failed

### Architecture Decisions
- **Singleton Pattern**: TelegramService instantiated once in service factory
- **Repository Pattern**: Clean data access separation
- **Event-Driven**: Emit events for integration with automations
- **Audit Logging**: All changes logged for compliance
- **Error Handling**: Graceful degradation if Telegram unavailable

### Configuration
Alert config structure varies by trigger type:

```typescript
// Priority Sender
{ senderEmails: ["boss@example.com"], senderNames?: [] }

// Keyword
{ keywords: ["invoice", "payment"], searchIn: "subject|body|both", caseSensitive?: false }

// Unpaid Invoice
{ daysUntilDue?: 7, minimumAmount?: 100 }

// Urgent Task
{ daysOverdue?: 2, minPriority?: "HIGH" }

// Finance Summary
{ trackingCategories?: ["rent"], thresholdAmount?: 1000 }

// Digest
{ includeMetrics: ["emailCount", "invoicesDue", "tasksCompleted", "financeChanges"] }
```

### Testing
Run tests for Phase 1:
```bash
npm test -- telegram.service.test.ts
npm test -- telegram.repository.test.ts
npm test -- /api/notifications/telegram
```

---

## Phase 2: Email Cleanup Rules & Quick Actions

### Planned Features
- Smart email cleanup with preview and bulk delete
- Automatic rule-based email organization
- Quick action buttons for common operations

### Models
- **EmailCleanupRule**: Rule definitions for bulk actions
- **EmailCleanupLog**: Execution history and audit trail
- **QuickAction**: User-defined shortcuts for actions
- **QuickActionLog**: Execution tracking

### API Routes
```
GET  /api/email/cleanup                    # List rules
POST /api/email/cleanup                    # Create rule
GET  /api/email/cleanup/[id]/matches       # Preview matching emails
POST /api/email/cleanup/[id]/execute       # Run cleanup
DELETE /api/email/cleanup/[id]             # Delete rule
```

---

## Phase 3: Invoice Extraction from Email Attachments

### Planned Features
- Detect PDF attachments that are invoices
- Extract invoice data using OCR
- Auto-classify and store in Finance module

### Models
- **InvoiceExtractionLog**: OCR result tracking

### Integration Points
- Email attachment processing
- OCR service integration (Tesseract/Google Vision)
- Invoice service for storing extracted data

---

## Phase 4: Intelligent Daily/Weekly Summaries

### Planned Features
- Aggregate email metrics
- Summarize key actions needed
- Multi-channel delivery (email, Telegram)

### Models
- **IntelligentSummary**: Generated summaries with metrics

### Metrics to Track
- Email count by period
- Invoices due
- Tasks completed
- Finance changes
- Key senders

---

## Integration with Automation Engine

Phase 1 integrates with existing automation system:
- TelegramAlert can be triggered by events (email.received, invoice.unpaid)
- ActionDispatcher can invoke TelegramService
- Events emitted for further processing

Example automation:
```
Trigger: email.received
Condition: from:"boss@example.com"
Action: Send Telegram alert "New email from boss"
```

---

## Migration & Deployment

### Database Migration
```bash
npx prisma migrate dev --name add_email_advanced_features
```

This creates:
- telegram_preferences table
- telegram_alerts table
- telegram_messages table
- email_cleanup_rules table
- email_cleanup_logs table
- invoice_extraction_logs table
- intelligent_summaries table
- quick_actions table
- quick_action_logs table

### Deployment Checklist
- [ ] Run migration on production database
- [ ] Deploy API routes
- [ ] Update service factory
- [ ] Configure Telegram bot token in environment
- [ ] Run audit log verification
- [ ] Test alert creation/delivery flow

---

## Future Considerations

1. **Rate Limiting**: Queue Telegram messages to avoid hitting API limits
2. **Retry Logic**: Exponential backoff for failed deliveries
3. **Templating**: Message templates for consistency
4. **Analytics**: Track alert effectiveness and engagement
5. **User Preferences**: Fine-grained notification preferences
6. **Batch Operations**: Group multiple alerts into single message

---

## Related Issues & PRs
- Feature branch: `feature/p8-05-email-advanced-features`
- Follows: Phase 8 (P8) email automation improvements
- Aligns with: Existing automation engine, event bus, audit logging
