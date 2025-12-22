-- ============================================
-- SECURITY FIX: Restricting Public Data Exposure
-- ============================================

-- 1. FIX PROFILES TABLE - Require authentication to view profiles
DROP POLICY IF EXISTS "Los perfiles son visibles para todos" ON public.profiles;

CREATE POLICY "Usuarios autenticados pueden ver perfiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. FIX ACTIVITY_PARTICIPANTS - Require authentication to view participants
DROP POLICY IF EXISTS "Los participantes son visibles para todos" ON public.activity_participants;

CREATE POLICY "Usuarios autenticados pueden ver participantes"
ON public.activity_participants FOR SELECT
TO authenticated
USING (true);

-- 3. FIX USER_INTERESTS - Users can only see their own interests and interests of activity co-participants
DROP POLICY IF EXISTS "Los intereses de usuarios son visibles para todos" ON public.user_interests;

CREATE POLICY "Usuarios pueden ver sus propios intereses"
ON public.user_interests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Ver intereses de compañeros de actividad"
ON public.user_interests FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM activity_participants ap1
    JOIN activity_participants ap2 ON ap1.activity_id = ap2.activity_id
    WHERE ap1.user_id = auth.uid() AND ap2.user_id = user_interests.user_id
  )
);

-- 4. ADD MISSING DELETE POLICY FOR ACTIVITIES
CREATE POLICY "Creadores pueden eliminar sus actividades"
ON public.activities FOR DELETE
TO authenticated
USING (auth.uid() = created_by);