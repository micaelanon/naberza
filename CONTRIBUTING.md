# CONTRIBUTING

## Branching strategy

```text
main        → producción
develop     → integración
feature/*   → nuevas funcionalidades
bugfix/*    → correcciones no productivas
hotfix/*    → correcciones urgentes en producción
release/*   → estabilización de release
internal/*  → trabajo interno
```

## Flujo recomendado

1. crear rama desde `develop`
2. implementar cambio
3. push a rama
4. abrir PR a `develop`
5. validar en `pre`
6. merge a `develop`
7. promoción posterior a `main`

## Calidad mínima

Antes de mergear:
- detect-secrets
- lint
- type-check
- tests
- revisión
