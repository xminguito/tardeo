# 🔧 Actualizar Configuración MCP para Permisos de Escritura

## 📍 Ubicación del Archivo

El archivo de configuración MCP está en:
```
~/.cursor/mcp.json
```

## 🔍 Configuración Actual

Tu configuración actual tiene `read_only=true`, lo que impide ejecutar migraciones:

```json
{
  "mcpServers": {
    "supabase tardeo": {
      "url": "https://mcp.supabase.com/mcp?project_ref=kzcowengsnnuglyrjuto&read_only=true&features=...",
      "headers": {}
    }
  }
}
```

## ✅ Configuración Actualizada (con Escritura)

Para habilitar permisos de escritura, necesitas:

### Opción 1: Solo Remover `read_only=true` (Más Simple)

```json
{
  "mcpServers": {
    "supabase tardeo": {
      "url": "https://mcp.supabase.com/mcp?project_ref=kzcowengsnnuglyrjuto&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage",
      "headers": {}
    }
  }
}
```

**Nota:** Esto puede requerir autenticación adicional. Si no funciona, usa la Opción 2.

### Opción 2: Añadir Service Role Key en Headers (Recomendado)

1. **Obtén tu Service Role Key:**
   - Ve a: https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/settings/api
   - Copia el **`service_role` key**

2. **Actualiza `~/.cursor/mcp.json`:**

```json
{
  "mcpServers": {
    "supabase tardeo": {
      "url": "https://mcp.supabase.com/mcp?project_ref=kzcowengsnnuglyrjuto&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching%2Cstorage",
      "headers": {
        "Authorization": "Bearer TU_SERVICE_ROLE_KEY_AQUI"
      }
    }
  }
}
```

**⚠️ IMPORTANTE:** Reemplaza `TU_SERVICE_ROLE_KEY_AQUI` con tu Service Role Key real.

## 🚀 Pasos para Aplicar

1. **Abre el archivo:**
   ```bash
   nano ~/.cursor/mcp.json
   # o
   code ~/.cursor/mcp.json
   ```

2. **Actualiza la configuración** según la Opción 1 o 2

3. **Guarda el archivo**

4. **Reinicia Cursor completamente:**
   - Cierra todas las ventanas de Cursor
   - Vuelve a abrir Cursor

5. **Verifica que funciona:**
   - Pídeme que ejecute una consulta simple
   - O intenta ejecutar una migración

## 🔒 Seguridad

- ⚠️ El Service Role Key tiene **permisos completos**
- ❌ **NUNCA** lo subas a Git
- ❌ **NUNCA** lo compartas públicamente
- ✅ Solo úsalo en configuraciones locales seguras

## 📝 Nota sobre Autenticación

El MCP de Supabase puede usar diferentes métodos de autenticación:
- **Sin headers:** Usa autenticación basada en sesión de Cursor
- **Con Service Role Key:** Autenticación directa con permisos completos

Si la Opción 1 no funciona después de reiniciar, usa la Opción 2.

---

**¿Quieres que actualice el archivo por ti?** Solo necesito que me confirmes si prefieres la Opción 1 (sin Service Role Key) o la Opción 2 (con Service Role Key).


