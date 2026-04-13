# RELEASE

## Flujo real

### Trabajo normal
1. crear una rama `feature/*`, `bugfix/*` o `internal/*` desde `develop`
2. abrir PR hacia `develop`
3. revisar y mergear esa PR
4. al llegar a `develop`, se ejecuta CI y se intenta deploy a `pre`

### Producción
No se abre una PR manual de `develop` por defecto.
La promoción a producción se hace con el workflow manual **Release to Main**.

Ese workflow:
1. toma `develop` (o la rama indicada)
2. hace fast-forward de `main` con esa rama
3. empuja `main`
4. dispara el workflow de producción

## Requisitos para deploy real a Vercel
Configurar estos secrets en GitHub:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Sin esos secrets:
- CI y build pueden pasar
- `pre` se salta con aviso
- `pro` falla para no simular un release inexistente

## Comandos útiles
### Lanzar release manual desde GitHub CLI
```bash
gh workflow run "Release to Main" --repo micaelanon/naberza --ref main -f source_ref=develop -f run_deploy=true
```

### Lanzar deploy pre manual
```bash
gh workflow run deploy-pre.yml --repo micaelanon/naberza --ref develop
```
