#!/bin/bash
# scripts/post-build.sh
# Copia el backend al dist/ después del build de Vite
# Excluye: base de datos, uploads, logs (son datos de producción)

DIST="dist"
BACKEND="$DIST/backend"

echo "Copiando backend a dist/..."

# Crear estructura
mkdir -p "$BACKEND/api"
mkdir -p "$BACKEND/db"

# Copiar API
cp backend/api/*.php "$BACKEND/api/"
cp backend/api/.htaccess "$BACKEND/api/" 2>/dev/null

# Copiar schema, install, migrate, seed
cp backend/schema.sql "$BACKEND/"
cp backend/install.php "$BACKEND/"
cp backend/migrate_solver.php "$BACKEND/"
cp backend/seed_test_data.php "$BACKEND/"

# Crear .htaccess en db/ para proteger la base de datos
echo "Deny from all" > "$BACKEND/db/.htaccess"

# NO copiar:
# - backend/db/*.sqlite (base de datos de producción)
# - backend/uploads/ (archivos subidos)
# - backend/logs/ (logs de seguridad)

echo "Backend copiado a dist/ (sin base de datos, uploads ni logs)"
echo ""
echo "dist/ listo para copiar al servidor."
echo "Primera vez: ejecutar 'php backend/install.php' en el servidor"
echo "Actualización: ejecutar migración desde Owen web"
