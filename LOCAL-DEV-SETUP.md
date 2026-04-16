# Levantar Naberza en Local (develop)

## Requisitos

- Docker Desktop instalado y corriendo
- Node.js 22.13.0 (o usa `asdf` con `.tool-versions`)
- npm

## Quick Start (Script Automático)

```bash
cd /Users/micaelai/.openclaw/workspace/naberza
chmod +x start-dev.sh
./start-dev.sh
```

El script automáticamente:
1. Verifica que estés en rama `develop`
2. Levanta PostgreSQL + app con Docker Compose
3. Espera a que PostgreSQL esté listo
4. Instala dependencias (si es la primera vez)
5. Inicia el servidor de desarrollo

---

## Setup Manual Step-by-Step

### 1. Navega al proyecto

```bash
cd /Users/micaelai/.openclaw/workspace/naberza
```

### 2. Verifica rama

```bash
git branch
# Debe mostrar: * develop
```

### 3. Levanta los servicios (PostgreSQL + app)

```bash
docker-compose up -d
```

Esperaré unos segundos a que PostgreSQL esté listo.

### 4. Verifica que todo esté UP

```bash
docker-compose ps
```

Deberías ver:
- `naberza-postgres` → **Up** (Port 5432)
- `naberza-app` → **Up** (Port 3000)

### 5. Instala dependencias (primera vez solamente)

```bash
cd code
npm install
```

### 6. Inicia el servidor de desarrollo

```bash
npm run dev
```

Verás algo como:
```
▲ Next.js 16.2.3
✓ Ready in 2.3s
✓ Compiled /src
```

---

## Acceso

Una vez que el servidor esté running:

| Recurso | URL |
|---------|-----|
| **App** | http://localhost:3000 |
| **Login** | http://localhost:3000/login |
| **Inbox Dashboard** | http://localhost:3000/inbox/dashboard |
| **Tasks Dashboard** | http://localhost:3000/tasks/dashboard |
| **Otros módulos** | `/audit`, `/documents`, `/finance`, `/home`, `/ideas`, `/automations`, `/integrations`, `/invoices`, `/users` |

---

## Credenciales de Prueba

Configuradas en `.env.local`:

```
Email:    admin@naberza.local
Password: TestPassword123!
```

Puedes cambiarlas editando `.env.local` si quieres otras credenciales.

---

## Workflow de Desarrollo

### Editar código

```bash
# El hot reload está activado
# Simplemente edita archivos en code/src/
# Los cambios aparecen automáticamente en el navegador
```

### Ejecutar tests

```bash
cd code
npm run test
```

### Lint

```bash
npm run lint
```

### Type-check

```bash
npm run type-check
```

### Build de producción

```bash
npm run build
```

---

## Parar el Servidor

### Parar el dev server

```bash
Ctrl+C  # En la terminal donde corre npm run dev
```

### Parar los servicios Docker

```bash
docker-compose down
```

### Resetear la base de datos

```bash
# Esto elimina los volúmenes (datos se pierden)
docker-compose down -v

# Levanta nuevamente
docker-compose up -d
```

---

## Troubleshooting

### ❌ "Connection refused" al acceder a http://localhost:3000

**Causa**: PostgreSQL o app no están running.

**Solución**:
```bash
# Verifica estado
docker-compose ps

# Si algo no está UP, revisa logs
docker-compose logs postgres    # PostgreSQL logs
docker-compose logs app         # App logs

# Reinicia
docker-compose restart
```

### ❌ "Invalid credentials" en login

**Causa**: Credenciales no coinciden con `.env.local`.

**Solución**:
1. Verifica `.env.local` existe
2. Contiene exactamente:
   ```
   AUTH_ADMIN_EMAIL=admin@naberza.local
   AUTH_ADMIN_PASSWORD=TestPassword123!
   ```
3. Reinicia el app:
   ```bash
   docker-compose restart app
   ```

### ❌ npm install falla

**Causa**: Node version mismatch o cache corrupto.

**Solución**:
```bash
# Verifica Node version
node --version  # Debe ser 22.13.0+

# Si no: usa asdf
asdf install  # Lee .tool-versions

# Limpia cache
rm -rf node_modules package-lock.json
npm cache clean --force

# Reinstala
npm install
```

### ❌ Puerto 3000 ya en uso

**Causa**: Otro proceso usa el puerto.

**Solución**:
```bash
# Encuentra qué está usando el puerto
lsof -i :3000

# Mata el proceso (si es otro Node)
kill -9 <PID>

# O usa otro puerto
npm run dev -- -p 3001
# Luego accede a http://localhost:3001
```

### ❌ Docker daemon not running

**Causa**: Docker Desktop no está corriendo.

**Solución**:
```bash
# macOS: Abre Docker Desktop desde Applications
open /Applications/Docker.app

# O desde terminal:
open -a Docker
```

---

## Verificar que todo funciona

Después de `npm run dev`:

1. Abre http://localhost:3000
   - ✅ Deberías ver la página principal
   
2. Abre http://localhost:3000/login
   - ✅ Deberías ver el formulario de login
   
3. Intenta login con:
   - Email: `admin@naberza.local`
   - Password: `TestPassword123!`
   - ✅ Deberías ser redirigido a `/inbox/dashboard`

4. Verifica que ves "Inbox" en la página
   - ✅ La página scaffold está visible

---

## Notas Importantes

- **Rama**: Siempre trabaja en `develop` (es la rama de staging)
- **Base de datos**: PostgreSQL en Docker, datos persisten en volumen
- **Variables de entorno**: `.env.local` es local-only y no se versionea
- **Hot reload**: Activado automáticamente en dev
- **Cambios en BD**: Si modificas schema en Prisma, ejecuta:
  ```bash
  npx prisma migrate dev --name <nombre>
  ```

---

## Más Información

- `docs/docker-setup.md` - Setup de Docker más detallado
- `docs/test-users-and-auth.md` - Autenticación y usuarios de prueba
- `CONTRIBUTING.md` - Guía de desarrollo

---

¿Problemas? Revisa los logs:

```bash
# App logs
docker-compose logs app -f

# PostgreSQL logs
docker-compose logs postgres -f

# Todos
docker-compose logs -f
```
