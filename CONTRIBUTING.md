# Contributing to Naberza OS

## Quick Start

Nuevo contribuidor? Comienza aquí:

```bash
# 1. Clona y entra al repo
git clone https://github.com/micaelanon/naberza.git
cd naberza

# 2. Copia el template de entorno
cp .env.local.example .env.local
# Edita .env.local con credenciales de prueba

# 3. Inicia el entorno local
docker-compose up -d
cd code && npm install

# 4. Servidor de desarrollo
npm run dev              # http://localhost:3000

# 5. Ejecuta checks antes de commit
npm run check            # lint + type-check + tests + build
```

Para credenciales de usuario de prueba, ve a: `docs/test-users-and-auth.md`

---

## Branch Naming

Usa kebab-case después del prefijo:

```
feature/add-inbox-classification
bugfix/fix-task-filter-overflow
hotfix/fix-auth-loop
internal/update-prisma-schema
```

## Code Style

- **Imports**: Agrupados y ordenados via `eslint-plugin-simple-import-sort`
- **Naming**: kebab-case para archivos/carpetas, camelCase para variables, PascalCase para componentes/tipos
- **Types**: Co-localizados con el código, interface para objetos, type para uniones
- **Components**: Default export, con tests, estilos y tipos co-localizados

Ve a `instructions/` en copilot-instructions-test para convenciones completas.

## Pull Request Process

1. Rama desde `develop`
2. Mantén commits atómicos y descriptivos
3. Ejecuta `npm run check` antes de push
4. Abre PR a `develop`
5. Resuelve feedback de review
6. Merge cuando esté aprobado

## Testing

Cada módulo debe tener tests:
- Unit tests para servicios
- Component tests para UI
- Integration tests para flujos de módulo

Ejecuta: `npm run test`

## Commits

Mantén commits pequeños y descriptivos:

```
feat: add inbox classification service
fix: prevent task filter overflow
docs: update architecture diagram
chore: update dependencies
```

## Review Checklist

Antes de mergear:
- [ ] Tests pasan (`npm run test:run`)
- [ ] Lint pasa (`npm run lint`)
- [ ] Types check (`npm run type-check`)
- [ ] Sin código duplicado (`npm run check:duplication`)
- [ ] Código revisado
- [ ] Sin secretos o valores hardcodeados
- [ ] Documentación actualizada si es necesario

## Local Database (Docker)

Si necesitas trabajar con la base de datos:

```bash
# Ver estado de servicios
docker-compose ps

# Ver logs del app
docker-compose logs app

# Ver logs de PostgreSQL
docker-compose logs postgres

# Resetear base de datos
docker-compose down -v
docker-compose up -d
```

## Documentation

Actualiza docs cuando:
- Cambies arquitectura o decisiones
- Añadas nuevas features
- Modifiques workflows
- Actualices dependencias

Archivos claves:
- `docs/architecture.md` - Diseño del sistema
- `docs/domain-model.md` - Entidades y relaciones
- `docs/modules.md` - Límites de módulos
- `docs/roadmap.md` - Plan de desarrollo
- `CONTRIBUTING.md` - Este archivo

## Questions?

- Check `docs/` para arquitectura y decisiones
- Review `code/src/` para ejemplos de patrones
- Open an issue para clarificaciones
