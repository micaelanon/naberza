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
- tests
- build
