# CONTRIBUTING

## Branching strategy

```text
main        → producción
develop     → integración
feature/*   → nuevas funcionalidades
bugfix/*    → correcciones no productivas
hotfix/*    → correcciones urgentes en producción
release/*   → estabilización de release si hiciera falta
internal/*  → trabajo interno
```

## Flujo de trabajo

### Trabajo normal
1. crear rama desde `develop`
2. implementar cambio
3. push a rama
4. abrir PR a `develop`
5. revisar
6. mergear a `develop`
7. `develop` ejecuta CI
8. el despliegue a `pre` se lanza manualmente cuando haga falta

### Producción
- no abrir PR manual de `develop` por defecto
- usar el workflow **Release to Main** cuando toque promoción real
- ese workflow promueve `develop` a `main` y dispara despliegue a `pro`

## Calidad mínima
Antes de mergear:
- detect-secrets
- lint
- type-check
- tests (vitest)
- build

## Secrets opcionales

| Secret | Workflow | Efecto sin él |
|--------|----------|---------------|
| `VERCEL_TOKEN` | deploy-pre, deploy-production | Deploy falla pero CI pasa |
| `VERCEL_ORG_ID` | deploy-pre, deploy-production | Deploy falla pero CI pasa |
| `VERCEL_PROJECT_ID` | deploy-pre, deploy-production | Deploy falla pero CI pasa |
| `SNYK_TOKEN` | snyk.yml | Snyk se salta, CI pasa igualmente |

Sin `SNYK_TOKEN` el workflow de seguridad Snyk existe pero no ejecuta el scan real.
Para activarlo: Settings → Secrets and variables → Actions → añadir `SNYK_TOKEN`.
Obténlo en [snyk.io](https://snyk.io) → Account Settings → Auth Token.
