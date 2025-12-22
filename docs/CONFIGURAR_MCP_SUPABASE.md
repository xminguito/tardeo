# 🔐 Configurar MCP de Supabase con Permisos de Escritura

Para que yo pueda ejecutar migraciones directamente, necesitas configurar el MCP de Supabase con el **Service Role Key** en lugar del Anon Key.

## 📋 Pasos para Configurar

### 1. Obtener tu Service Role Key

1. Ve al Dashboard de Supabase:
   ```
   https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/settings/api
   ```

2. Busca la sección **"Project API keys"**

3. Copia el **`service_role` key** (⚠️ **NUNCA** lo compartas públicamente ni lo subas a Git)

### 2. Configurar en Cursor

El MCP de Supabase se configura en la configuración de Cursor. Tienes dos opciones:

#### Opción A: Configuración Global de Cursor

1. Abre la configuración de Cursor:
   - `Cmd/Ctrl + ,` → Busca "MCP" o "Model Context Protocol"
   - O ve a: `Cursor Settings → Features → MCP`

2. Busca la configuración del servidor MCP de Supabase

3. Actualiza la configuración para incluir el Service Role Key:

```json
{
  "mcpServers": {
    "supabase-tardeo": {
      "url": "tu_url_del_servidor_mcp",
      "apiKey": "tu_service_role_key_aqui",
      "projectId": "kzcowengsnnuglyrjuto"
    }
  }
}
```

#### Opción B: Archivo de Configuración MCP

Si Cursor usa un archivo de configuración (como `~/.cursor/mcp.json` o similar):

1. Localiza el archivo de configuración MCP
2. Busca la entrada de Supabase
3. Añade o actualiza con el Service Role Key:

```json
{
  "servers": {
    "supabase-tardeo": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server",
        "--project-id",
        "kzcowengsnnuglyrjuto",
        "--api-key",
        "TU_SERVICE_ROLE_KEY_AQUI"
      ]
    }
  }
}
```

### 3. Reiniciar Cursor

Después de actualizar la configuración:
1. Guarda los cambios
2. Reinicia Cursor completamente
3. Verifica que el MCP esté conectado

---

## ⚠️ Seguridad Importante

**El Service Role Key tiene permisos COMPLETOS de administrador:**

- ✅ Puede ejecutar cualquier SQL (DDL, DML)
- ✅ Puede leer/escribir cualquier tabla
- ✅ Bypassa Row Level Security (RLS)
- ✅ Puede modificar la estructura de la base de datos

**Por eso:**
- ❌ **NUNCA** lo subas a Git
- ❌ **NUNCA** lo compartas públicamente
- ❌ **NUNCA** lo uses en código del cliente (frontend)
- ✅ Solo úsalo en servidores/Edge Functions/MCP

---

## 🔍 Verificar que Funciona

Después de configurar, puedo intentar ejecutar una consulta simple de escritura para verificar:

```sql
-- Esto debería funcionar si tengo permisos de escritura
SELECT 1 as test;
```

Si funciona, podré ejecutar migraciones directamente.

---

## 📝 Alternativa: Usar Supabase CLI

Si prefieres no dar permisos completos al MCP, puedes usar el CLI de Supabase:

```bash
# Configurar la contraseña de la base de datos
export PGPASSWORD="tu_password_de_db"

# O usar el método con archivo .pgpass
echo "host:port:database:username:password" > ~/.pgpass
chmod 600 ~/.pgpass

# Luego ejecutar migraciones
supabase db push
```

---

## 🚀 Una Vez Configurado

Una vez que tenga permisos de escritura, podré:
- ✅ Ejecutar migraciones directamente
- ✅ Crear/modificar tablas
- ✅ Aplicar cambios de esquema
- ✅ Ejecutar cualquier SQL que necesites

**¿Necesitas ayuda para encontrar dónde está la configuración MCP en tu versión de Cursor?**


