# 🚀 Ejecutar Migración del Sistema Social

## ⚡ Método Rápido (Recomendado)

### Paso 1: Abre el SQL Editor
Ve a: **https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/sql/new**

### Paso 2: Copia y Pega el SQL
Abre el archivo `EXECUTE_SOCIAL_MIGRATION.sql` y copia **TODO** su contenido.

### Paso 3: Ejecuta
1. Pega el SQL en el editor
2. Haz clic en **"Run"** o presiona `Cmd/Ctrl + Enter`
3. Espera a que termine (puede tardar unos segundos)

### Paso 4: Verifica
Ejecuta el contenido de `VERIFY_SOCIAL_SYSTEM.sql` para confirmar que todo se creó correctamente.

---

## 📋 Qué se Creará

✅ **4 Tablas nuevas:**
- `follows` - Relaciones de seguimiento
- `friends` - Amistades y solicitudes
- `conversations` - Conversaciones entre usuarios
- `messages` - Mensajes de chat

✅ **7 Columnas nuevas en `profiles`:**
- `username` - Nombre de usuario único
- `following_count` - Contador de seguidos
- `followers_count` - Contador de seguidores
- `friends_count` - Contador de amigos
- `is_online` - Estado online
- `last_seen_at` - Última vez visto
- `voice_status` - Estado del asistente de voz

✅ **9 Políticas RLS** para seguridad

✅ **8 Índices** para rendimiento

✅ **1 Función y 1 Trigger** para timestamps automáticos

---

## ⚠️ Nota Importante

Si tienes usuarios sin `username`, ejecuta esto **ANTES** de la migración principal:

```sql
UPDATE public.profiles 
SET username = 'user_' || substring(id::text, 1, 8)
WHERE username IS NULL;
```

---

## 🔍 Si Hay Errores

1. **Error de username duplicado:**
   - Ejecuta el UPDATE de arriba primero

2. **Error de permisos:**
   - Asegúrate de estar usando una cuenta con permisos de administrador

3. **Error de constraint:**
   - Revisa los logs en Supabase Dashboard → Logs → Postgres Logs

---

## ✅ Verificación Post-Migración

Después de ejecutar, verifica que todo esté correcto:

```sql
-- Verificar tablas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('follows', 'friends', 'conversations', 'messages');

-- Verificar columnas en profiles
SELECT column_name 
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('username', 'following_count', 'followers_count', 'friends_count', 'is_online', 'last_seen_at', 'voice_status');
```

---

**¿Listo?** Abre el SQL Editor y ejecuta `EXECUTE_SOCIAL_MIGRATION.sql` 🚀


