#!/usr/bin/env node

/**
 * Script para ejecutar la migración del sistema social
 * 
 * Uso:
 *   node run-social-migration.js
 * 
 * Requiere: SUPABASE_SERVICE_ROLE_KEY en .env.local o como variable de entorno
 */

const fs = require('fs');
const path = require('path');

// Leer variables de entorno
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Se requieren SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  console.error('');
  console.error('Añade SUPABASE_SERVICE_ROLE_KEY a .env.local:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key');
  console.error('');
  console.error('O ejecuta:');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=tu_key node run-social-migration.js');
  process.exit(1);
}

async function executeMigration() {
  console.log('🚀 Ejecutando migración del sistema social...\n');

  // Leer el archivo de migración
  const migrationPath = path.join(__dirname, 'EXECUTE_SOCIAL_MIGRATION.sql');
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Error: No se encuentra ${migrationPath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');
  
  // Limpiar el SQL (remover comentarios de verificación)
  const cleanSQL = sql
    .split('-- ============================================')[0]
    .trim();

  try {
    // Ejecutar SQL usando la API REST de Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql: cleanSQL }),
    });

    if (!response.ok) {
      // Intentar método alternativo: usar query directamente
      console.log('⚠️  Método RPC no disponible, intentando método alternativo...\n');
      
      // Dividir el SQL en statements individuales
      const statements = cleanSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      console.log(`📝 Ejecutando ${statements.length} statements...\n`);

      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        if (statement.trim().length === 0) continue;

        try {
          // Usar la API de PostgREST para ejecutar SQL directo
          // Nota: Esto requiere permisos especiales
          console.log(`[${i + 1}/${statements.length}] Ejecutando statement...`);
          
          // Por ahora, mostrar instrucciones manuales
          if (i === 0) {
            console.log('\n⚠️  No se puede ejecutar DDL directamente desde la API REST.');
            console.log('Por favor ejecuta la migración manualmente:\n');
            console.log('1. Ve a: https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/sql/new');
            console.log('2. Copia el contenido de: EXECUTE_SOCIAL_MIGRATION.sql');
            console.log('3. Pégalo y ejecuta en el SQL Editor\n');
            break;
          }
        } catch (err) {
          console.error(`❌ Error en statement ${i + 1}:`, err.message);
        }
      }
    } else {
      const result = await response.json();
      console.log('✅ Migración ejecutada exitosamente!');
      console.log('Resultado:', result);
    }
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error.message);
    console.error('\n📋 Instrucciones manuales:');
    console.error('1. Ve a: https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/sql/new');
    console.error('2. Copia el contenido de: EXECUTE_SOCIAL_MIGRATION.sql');
    console.error('3. Pégalo y ejecuta en el SQL Editor\n');
    process.exit(1);
  }
}

executeMigration();


