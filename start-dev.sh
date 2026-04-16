#!/bin/bash
# Naberza OS — Local Development Startup Script

set -e

echo "🚀 Iniciando Naberza OS en local..."

# 1. Navega al proyecto
cd /Users/micaelai/.openclaw/workspace/naberza
echo "📍 Directorio: $(pwd)"

# 2. Verifica rama
BRANCH=$(git branch --show-current)
echo "🔀 Rama: $BRANCH"
if [ "$BRANCH" != "develop" ]; then
  echo "⚠️  Estás en la rama '$BRANCH', cambia a develop:"
  echo "   git checkout develop"
  exit 1
fi

# 3. Verifica .env.local
if [ ! -f ".env.local" ]; then
  echo "⚠️  .env.local no encontrado"
  exit 1
fi
echo "✅ .env.local configurado"

# 4. Levanta Docker Compose
echo -e "\n📦 Iniciando servicios (PostgreSQL + app)..."
docker compose up -d

# 5. Espera a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté disponible..."
for i in {1..30}; do
  if docker compose exec -T postgres pg_isready -U naberza >/dev/null 2>&1; then
    echo "✅ PostgreSQL listo"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ PostgreSQL no respondió en 30 segundos"
    exit 1
  fi
  sleep 1
done

# 6. Navega a directorio del código
cd code

# 7. Instala dependencias si es necesario
if [ ! -d "node_modules" ]; then
  echo -e "\n📚 Instalando dependencias..."
  npm install
fi

# 8. Inicia dev server
echo -e "\n✨ Iniciando servidor de desarrollo..."
echo "🌐 Accede a: http://localhost:3000"
echo ""
echo "📝 Credenciales de prueba:"
echo "   Email: admin@naberza.local"
echo "   Password: TestPassword123!"
echo ""
echo "Presiona Ctrl+C para parar el servidor"
npm run dev
