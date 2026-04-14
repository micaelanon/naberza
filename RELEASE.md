# RELEASE

## Flujo real

### Trabajo normal
1. crear una rama `feature/*`, `bugfix/*` o `internal/*` desde `develop`
2. abrir PR hacia `develop`
3. revisar y mergear esa PR
4. al llegar a `develop`, se ejecuta CI
5. el deploy a `pre` se lanza manualmente cuando se quiera validar en entorno

### Producción
No se abre una PR manual de `develop` por defecto.
La promoción a producción se hace con el workflow manual **Release to Main**.

Ese workflow:
1. toma `develop`
2. hace fast-forward de `main` con `develop`
3. empuja `main`
4. dispara el workflow de producción

## Requisitos para deploy real a Vercel
Configurar estos secrets en GitHub:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

Sin esos secrets:
- CI y build pueden pasar
- `pre` falla si intentas lanzarlo
- `pro` falla si intentas lanzarlo

## Comandos útiles
### Lanzar release manual desde GitHub CLI
```bash
gh workflow run "Release to Main" --repo micaelanon/naberza --ref main -f run_deploy=true
```

### Lanzar deploy pre manual
```bash
gh workflow run deploy-pre.yml --repo micaelanon/naberza --ref develop
```
