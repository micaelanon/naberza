# Contributing to Naberza OS

## Branch Naming

Use kebab-case after the prefix:

```
feature/add-inbox-classification
bugfix/fix-task-filter-overflow
hotfix/fix-auth-loop
internal/update-prisma-schema
```

## Code Style

- **Imports**: Grouped and sorted via `eslint-plugin-simple-import-sort`
- **Naming**: kebab-case for files/folders, camelCase for vars, PascalCase for components/types
- **Types**: Co-located with code, interface for objects, type for unions
- **Components**: Default export, with co-located tests, styles, and types

See `instructions/` in copilot-instructions-test for full conventions.

## Pull Request Process

1. Branch from `develop`
2. Keep commits atomic and descriptive
3. Run `npm run check` before pushing
4. Open PR to `develop`
5. Address review feedback
6. Merge when approved

## Testing

Every module must have tests:
- Unit tests for services
- Component tests for UI
- Integration tests for module flow

Run: `npm run test`

## Commits

Keep commits small and descriptive:

```
feat: add inbox classification service
fix: prevent task filter overflow
docs: update architecture diagram
chore: update dependencies
```

## Review Checklist

Before merging:
- [ ] Tests pass (`npm run test:run`)
- [ ] Lint passes (`npm run lint`)
- [ ] Types check (`npm run type-check`)
- [ ] No duplicate code (`npm run check:duplication`)
- [ ] Code reviewed
- [ ] No secrets or hardcoded values
- [ ] Documentation updated if needed
