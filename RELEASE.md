# Release Process

## Versioning

Naberza OS uses Semantic Versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes, significant architecture shifts
- **MINOR**: New features, new modules, backward-compatible changes
- **PATCH**: Bug fixes, documentation, performance improvements

## Release Process

1. **Create release branch** from `main`:
```bash
git checkout main
git pull origin main
git checkout -b release/VERSION
```

2. **Update version and changelog**:
   - Update `code/package.json` version
   - Update `CHANGELOG.md` with new features, fixes, deprecations
   - Update `docs/roadmap.md` if needed

3. **Final validation**:
```bash
npm run check
```

4. **Tag release**:
```bash
git add package.json CHANGELOG.md docs/
git commit -m "release: v1.2.3"
git tag -a v1.2.3 -m "Release version 1.2.3"
```

5. **Push and open PR**:
```bash
git push origin release/VERSION
git push origin v1.2.3
```

6. **Merge to main** and `develop`:
   - Create PR from `release/VERSION` to `main`
   - Get approval and merge
   - Back-merge to `develop`

7. **Deploy to production**:
   - CI/CD automatically deploys `main` to production
   - Monitor logs and alerts

## Hotfix Process

For urgent production fixes:

1. **Create hotfix branch** from `main`:
```bash
git checkout main
git pull origin main
git checkout -b hotfix/ISSUE-DESCRIPTION
```

2. **Fix the issue**, test thoroughly

3. **Bump patch version** in `package.json`

4. **Commit and tag**:
```bash
git add .
git commit -m "fix: resolve critical issue"
git tag -a v1.2.1 -m "Hotfix version 1.2.1"
```

5. **Merge to main and develop**:
   - Merge hotfix to `main` (no PR needed for critical fixes)
   - Back-merge to `develop`
   - Cherry-pick to any active release branches

## Changelog Format

```markdown
## [1.2.3] - 2026-04-16

### Added
- New feature X
- New module Y

### Changed
- Improved performance of Z
- Updated documentation

### Fixed
- Fixed bug in module A
- Fixed regression in feature B

### Deprecated
- Old API endpoint (will be removed in 2.0)

### Security
- Patched vulnerability in adapter X
```

## Deployment Environments

| Environment | Branch | Manual Approval | Frequency |
|---|---|---|---|
| Staging (pre) | `develop` | No | Auto on merge |
| Production (pro) | `main` | Yes | Manual or tag-based |

Monitor deployments and rollback if needed.
