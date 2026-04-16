# Project Structure Analysis: spa-repairform vs Naberza OS

## Overview

Comparison of code organization patterns between your `spa-repairform` production project and the `Naberza OS` foundation we're building. This analysis informs Phase 1+ architecture decisions.

---

## spa-repairform Pattern (Reference)

### Directory Structure
```
code/src/pages/
├── creation-repairs/
│   ├── attach-product-photo/
│   │   ├── __tests__/
│   │   │   └── attach-photo.test.tsx
│   │   ├── utils/
│   │   │   └── types.ts
│   │   ├── attach-photo.tsx
│   │   ├── attach-photo.css
│   │   └── index.ts
│   ├── ident/
│   │   ├── components/
│   │   │   ├── client-not-found-modal/
│   │   │   ├── phone-ident/
│   │   │   └── qr-ident/
│   │   ├── ident.tsx
│   │   ├── ident.css
│   │   └── index.ts
│   └── terms-and-conditions/
│       ├── components/
│       │   ├── add-products-modal-content/
│       │   └── pdf-reader/
│       ├── utils/
│       │   └── render-underlined-text.tsx
│       ├── terms-and-conditions.tsx
│       └── index.ts
├── customer-delivery/
│   ├── delivery-tabs/
│   │   ├── components/
│   │   │   ├── phone-tab/
│   │   │   ├── pin-tab/
│   │   │   └── qr-tab/
│   │   ├── hooks/
│   │   │   └── use-customer-delivery.ts
│   │   ├── delivery-tabs.tsx
│   │   ├── delivery-tabs.css
│   │   └── index.ts
│   └── request-fix/
│       ├── components/
│       │   └── request-fix-card/
│       ├── request-fix.tsx
│       └── index.ts
└── invoices/
    ├── dressmaker-invoicing/
    ├── invoicing-history/
    └── pending-invoicing/
```

### Key Patterns

#### 1. Naming Convention
- **Files**: `{feature-name}.tsx` (not `page.tsx`)
- **Folders**: `kebab-case`
- **Components**: PascalCase in exports via `index.ts`

#### 2. Component Structure
Each view folder contains:
```
{feature}/
├── {feature}.tsx          # Main component
├── {feature}.css          # Styles (co-located)
├── index.ts               # Public export
├── components/            # Sub-components (optional)
│   ├── domain/           # Business logic components
│   └── presentational/    # Pure UI components
├── hooks/                 # Custom React hooks (optional)
│   └── use-{feature}.ts
├── utils/                 # Helpers & types (optional)
│   ├── types.ts
│   ├── interfaces.ts
│   └── helpers.ts
└── __tests__/             # Tests at each level
    ├── {feature}.test.tsx
    ├── components/
    │   └── {component}.test.tsx
    └── hooks/
        └── use-{feature}.test.ts
```

#### 3. Public Interface Pattern
```typescript
// index.ts
export { default as DeliveryTabs } from './delivery-tabs';

// {feature}.tsx
export default function DeliveryTabs(): ReactNode {
  return (/* component */)
}
```

#### 4. Sub-component Nesting
Large features have `components/` subfolders with their own `index.ts`:
```
delivery-tabs/
├── components/
│   ├── phone-tab/
│   │   ├── phone-tab.tsx
│   │   └── index.ts
│   ├── pin-tab/
│   │   ├── pin-tab.tsx
│   │   └── index.ts
│   └── qr-tab/
│       ├── qr-tab.tsx
│       └── index.ts
└── delivery-tabs.tsx
```

#### 5. Styles
- `{component}.css` co-located in component folder
- Not using Tailwind (similar to Naberza)
- CSS Modules or plain CSS

#### 6. Hooks
- `hooks/` subfolder for view-specific hooks
- Named: `use-{feature}.ts`
- Example: `use-customer-delivery.ts`, `use-repair-form.ts`

---

## Naberza OS Structure (Phase 0)

### Current Pattern (after T8 refactor)
```
code/src/app/
├── inbox/
│   ├── dashboard/
│   │   ├── inbox-view/
│   │   │   ├── inbox-view.tsx
│   │   │   ├── index.ts
│   │   │   └── layout.tsx
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── layout.tsx
├── tasks/
│   ├── dashboard/
│   │   ├── tasks-view/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   └── layout.tsx
└── (11 modules total)
```

### What's in Place ✅
- **Named components**: `inbox-view.tsx`, `tasks-view.tsx` (not `page.tsx`)
- **Public exports**: Each view has `index.ts`
- **Metadata**: Next.js App Router metadata in layout files
- **Module grouping**: Clear `/module/dashboard/` structure
- **Nesting ready**: Structure prepared for future `components/`, `hooks/`, `utils/`

### What's Missing (compared to spa-repairform) ❌
- `components/` subfolder (domain/presentational split)
- `hooks/` subfolder (view-specific custom hooks)
- `utils/` subfolder (types, interfaces, helpers)
- `__tests__/` folders (we use co-located `.test.tsx` files)
- `.css` files (we rely on CSS Modules imported at app level)
- Nested component structure (too early for Phase 0)

---

## Decision: Progressive Structure for Naberza

### Rationale

**Phase 0 pages are intentionally minimal**. Adding `components/`, `hooks/`, `utils/` now would be premature scaffolding for features that don't exist yet.

**Better approach**: Establish the pattern now, implement when needed in Phase 1.

### Recommended Structure for Phase 1+

```
{module}/dashboard/{module}-view/
├── {module}-view.tsx              # Main view
├── index.ts                       # Public export
├── layout.tsx                     # Next.js metadata
├── {module}-view.css              # Styles (when needed)
│
├── components/                    # Phase 1+ when features grow
│   ├── domain/
│   │   ├── {business-logic}/
│   │   └── index.ts
│   └── presentational/
│       ├── {ui-component}/
│       └── index.ts
│
├── hooks/                         # Phase 1+ when custom logic needed
│   ├── use-{module}.ts
│   └── index.ts
│
├── utils/                         # Phase 1+ for reusable logic
│   ├── types.ts
│   ├── interfaces.ts
│   ├── helpers.ts
│   └── index.ts
│
└── __tests__/                     # Phase 1+ parallel to production
    ├── {module}-view.test.tsx
    ├── components/
    │   └── {component}.test.tsx
    └── hooks/
        └── use-{module}.test.ts
```

### When to Add Each Layer

| Layer | Added When | Example |
|-------|-----------|---------|
| `components/domain/` | First feature needs business logic component | InboxClassifier component in Inbox module |
| `components/presentational/` | First feature needs reusable UI component | TaskCard component in Tasks module |
| `hooks/` | Custom state/side-effect logic | `use-inbox-filters.ts` in Inbox module |
| `utils/` | Shared types, helpers, formatting | `format-date.ts` in Finance module |
| `__tests__/` | Phase 1+ comprehensive testing | Test coverage for all modules |

---

## Files to Standardize (from spa-repairform)

### Already Present in Naberza ✅
```
✅ .env.local.example           # Local development template
✅ .env.example (code/)          # App configuration template
✅ .dockerignore                 # Docker build cleanup
✅ Dockerfile                    # Production image
✅ docker-compose.yml            # Local dev orchestration
✅ docs/docker-setup.md          # Operational documentation
✅ CONTRIBUTING.md               # Development guidelines
✅ RELEASE.md                    # Deployment procedures
```

### Recommended to Add (from spa-repairform) 🔄

#### Tooling & Config
- **`.tool-versions`**: Lock Node.js version (22.x)
  ```
  nodejs 22.13.0
  ```
- **`.snyk`**: Snyk security scanning configuration
- **`.secrets.baseline`**: Baseline for detect-secrets CI check
- **`snyk.ignore-rules`**: Exclusions for known security issues
- **`sonar-project.properties`**: SonarQube integration (optional, Phase 2+)

#### Development Standards
- **`CODING-CONVENTIONS.md`**: In-repo style guide aligned with copilot-instructions-test
- **`commitlint.config.js`**: Commit message validation rules
- **`coverage-config.js`**: Jest/Vitest coverage thresholds

#### Testing (Phase 1+)
- **`stryker.conf.mjs`**: Mutation testing (optional, advanced)
- **`cypress/`**: E2E test suite structure (Phase 2+)

#### Security
- **`/.snyk`**: Snyk CLI configuration
- **`.snyk` file**: Baseline snapshots

---

## Architecture Notes

### Naberza Modular Monolith vs spa-repairform

| Aspect | spa-repairform | Naberza OS |
|--------|---|---|
| **Domain Model** | Single feature (repair form) | 11 bounded contexts (modules) |
| **Architecture** | Feature-based pages | Modular monolith + App Router |
| **Boundaries** | Component hierarchy | Module interfaces + event bus |
| **State** | React Context + Redux slices | Event-driven, audit trail |
| **Testing Strategy** | Unit + E2E (Cypress) | Unit + Integration + Event tests |
| **Database** | Backend API calls | Prisma ORM (Phase 1) |

### When spa-repairform Pattern Matters in Naberza

**Perfect fit for**: Building out individual module views (Inbox, Tasks, etc.)
- Each module's main view becomes: `{module}-view.tsx`
- Complex modules add: `components/domain/`, `hooks/`, `utils/`
- Tests live in: `__tests__/` alongside production code

**Different from spa-repairform**:
- Naberza uses `src/modules/{module}/` for business logic
- App Router pages at `src/app/{module}/` are thin presentation layers
- Event bus coordinates between modules (not React Context)

---

## Implementation Timeline

### Phase 0 ✅ (Now)
- [x] Basic page scaffolds with named components
- [x] Public `index.ts` exports
- [x] Module-level layout structure
- [ ] Add `.tool-versions` file
- [ ] Add `.secrets.baseline` for CI

### Phase 1 (Core Loop)
- [ ] Implement Inbox module with full structure
  - Add `components/domain/` for ClassificationEngine
  - Add `hooks/use-inbox-filters.ts`
  - Add `utils/` for types and helpers
  - Add `__tests__/` tests
- [ ] Establish test strategy (Unit, Integration, E2E)
- [ ] Add `commitlint` for commit validation
- [ ] Document patterns in `CODING-CONVENTIONS.md`

### Phase 2+ (Advanced)
- [ ] Add Cypress E2E tests
- [ ] Mutation testing (Stryker) for critical paths
- [ ] SonarQube integration
- [ ] Code coverage reporting

---

## Quick Reference: Adding a Real Feature

When starting a new Phase 1 feature (e.g., Inbox):

1. **Create structure**:
   ```
   src/app/inbox/dashboard/inbox-view/
   ├── components/
   │   ├── domain/
   │   │   ├── inbox-classifier/
   │   │   │   ├── inbox-classifier.tsx
   │   │   │   └── index.ts
   │   │   └── index.ts
   │   ├── presentational/
   │   │   ├── inbox-item-card/
   │   │   │   ├── inbox-item-card.tsx
   │   │   │   └── index.ts
   │   │   └── index.ts
   │   └── index.ts
   ├── hooks/
   │   ├── use-inbox-filters.ts
   │   └── index.ts
   ├── utils/
   │   ├── types.ts
   │   └── index.ts
   └── __tests__/
       ├── inbox-view.test.tsx
       ├── components/
       │   └── inbox-item-card.test.tsx
       └── hooks/
           └── use-inbox-filters.test.ts
   ```

2. **Follow patterns**:
   - Export via `index.ts` at each level
   - Co-locate styles (`.css` files next to components)
   - Hooks use `use-` prefix
   - Tests use `__tests__/` subfolder
   - Types in `utils/types.ts`

3. **Test coverage**:
   - Unit tests for hooks and utilities
   - Integration tests for components
   - E2E tests for full workflows (Phase 2+)

---

## Summary

**Current state**: Naberza Phase 0 has clean, scalable structure ready for Phase 1.

**Next action**: When implementing Phase 1 features, apply spa-repairform patterns:
- `components/domain/` and `components/presentational/`
- `hooks/` for custom logic
- `utils/` for types and helpers
- `__tests__/` for tests

**Philosophy**: Build what you need when you need it. Phase 0 is the foundation; Phase 1 adds the building.
