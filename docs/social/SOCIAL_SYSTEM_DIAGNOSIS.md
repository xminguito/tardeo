# 🔍 Diagnóstico del Sistema Social

## ✅ Estado Actual

### ❌ **PROBLEMA ENCONTRADO:**
La migración `20251124_create_social_system.sql` **NO se ha ejecutado** en la base de datos.

### 📊 Evidencia:

1. **Tablas sociales NO existen:**
   - ❌ `follows` - NO existe
   - ❌ `friends` - NO existe
   - ❌ `conversations` - NO existe
   - ❌ `messages` - NO existe

2. **Columnas sociales en `profiles` incompletas:**
   - ✅ `bio` - EXISTE
   - ❌ `username` - FALTA
   - ❌ `following_count` - FALTA
   - ❌ `followers_count` - FALTA
   - ❌ `friends_count` - FALTA
   - ❌ `is_online` - FALTA
   - ❌ `last_seen_at` - FALTA
   - ❌ `voice_status` - FALTA

3. **Migración no aplicada:**
   - La migración `20251124_create_social_system.sql` existe en el código
   - Pero NO aparece en la lista de migraciones ejecutadas en Supabase

---

## 🛠️ SOLUCIÓN

### Opción 1: Ejecutar en SQL Editor (RECOMENDADO)

1. **Ve al Dashboard de Supabase:**
   ```
   https://supabase.com/dashboard/project/kzcowengsnnuglyrjuto/sql/new
   ```

2. **Copia y pega el contenido de:**
   ```
   EXECUTE_SOCIAL_MIGRATION.sql
   ```

3. **Ejecuta el script** (botón "Run" o `Cmd/Ctrl + Enter`)

4. **Verifica con:**
   ```
   VERIFY_SOCIAL_SYSTEM.sql
   ```

### Opción 2: Usar Supabase CLI

```bash
# Si tienes la contraseña de la base de datos configurada
cd /Users/franciscojavier/Sites/tardeo
supabase db push

# O ejecutar la migración específica
supabase migration up
```

---

## 📋 Checklist Post-Migración

Después de ejecutar la migración, verifica:

- [ ] ✅ Las 4 tablas sociales existen
- [ ] ✅ Las 8 columnas sociales en `profiles` existen
- [ ] ✅ RLS está habilitado en todas las tablas
- [ ] ✅ Las políticas RLS están creadas (9 políticas)
- [ ] ✅ Los índices están creados (8 índices)
- [ ] ✅ La función `handle_updated_at()` existe
- [ ] ✅ El trigger `set_friends_updated_at` existe

---

## 🔧 Edge Functions Verificadas

Las siguientes Edge Functions están implementadas y deberían funcionar **después** de ejecutar la migración:

- ✅ `social-follow` - Seguir/dejar de seguir usuarios
- ✅ `social-friend-request` - Enviar/aceptar solicitudes de amistad
- ✅ `social-get-conversations` - Obtener conversaciones del usuario
- ✅ `social-mark-read` - Marcar mensajes como leídos
- ✅ `social-send-message` - Enviar mensajes (texto, audio, AI)

**Nota:** Estas funciones fallarán hasta que las tablas existan.

---

## 🚨 Problemas Potenciales Detectados

### 1. **Constraint UNIQUE en `username`**
   - Si ya hay usuarios sin `username`, el `ALTER TABLE` puede fallar
   - **Solución:** Ejecutar primero:
     ```sql
     UPDATE public.profiles SET username = 'user_' || id::text WHERE username IS NULL;
     ```

### 2. **Check constraint en `voice_status`**
   - Solo acepta: `'enabled'`, `'disabled'`, `'busy'`
   - Los valores existentes deben cumplir esta restricción

### 3. **Foreign Keys**
   - Todas las tablas referencian `profiles(id)`
   - Asegúrate de que todos los usuarios tengan un perfil en `profiles`

---

## 📝 Próximos Pasos

1. **Ejecutar la migración** usando `EXECUTE_SOCIAL_MIGRATION.sql`
2. **Verificar** con `VERIFY_SOCIAL_SYSTEM.sql`
3. **Probar las Edge Functions** desde el frontend
4. **Revisar logs** si hay errores

---

## 📞 Si Necesitas Ayuda

Si encuentras errores al ejecutar la migración:

1. **Copia el mensaje de error completo**
2. **Verifica los logs** en Supabase Dashboard → Logs → Postgres Logs
3. **Revisa las políticas RLS** si hay problemas de permisos

---

**Fecha del diagnóstico:** 2025-11-24
**Estado:** ⚠️ Migración pendiente de ejecución

