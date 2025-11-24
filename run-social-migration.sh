#!/bin/bash

# Script para ejecutar la migración del sistema social
# Este script ejecuta la migración usando Supabase CLI

set -e

echo "🚀 Ejecutando migración del sistema social..."
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "supabase/migrations/20251124_create_social_system.sql" ]; then
    echo "❌ Error: No se encuentra el archivo de migración"
    exit 1
fi

# Intentar ejecutar la migración
echo "📦 Aplicando migración a la base de datos remota..."
echo ""

# Opción 1: Usar supabase db push (requiere contraseña)
if command -v supabase &> /dev/null; then
    echo "Usando Supabase CLI..."
    supabase db push --db-url "postgresql://postgres.kzcowengsnnuglyrjuto:[PASSWORD]@aws-1-eu-west-1.pooler.supabase.com:6543/postgres" || {
        echo ""
        echo "⚠️  El comando requiere la contraseña de la base de datos."
        echo ""
        echo "Opción alternativa:"
        echo "1. Ve a: https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/sql/new"
        echo "2. Copia el contenido de: EXECUTE_SOCIAL_MIGRATION.sql"
        echo "3. Pégalo y ejecuta en el SQL Editor"
        echo ""
        exit 1
    }
else
    echo "❌ Supabase CLI no está instalado"
    echo ""
    echo "Por favor ejecuta manualmente:"
    echo "1. Ve a: https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/sql/new"
    echo "2. Copia el contenido de: EXECUTE_SOCIAL_MIGRATION.sql"
    echo "3. Pégalo y ejecuta en el SQL Editor"
    echo ""
    exit 1
fi

echo ""
echo "✅ Migración ejecutada exitosamente!"
echo ""
echo "Verifica con: VERIFY_SOCIAL_SYSTEM.sql"


