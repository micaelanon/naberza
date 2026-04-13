# RELEASE

## Baseline

- Versionado semántico
- `develop` como rama de integración
- `main` como rama de producción
- despliegue a `pre` antes de promover a `pro`

## Flujo

1. integrar trabajo en `develop`
2. validar en `pre`
3. preparar release desde `develop` o `release/*`
4. merge a `main`
5. desplegar a `pro`
6. sincronizar cambios de release de vuelta a `develop` si aplica
