-- ============================================
-- SECURITY FIX: Check and update policies carefully
-- ============================================

-- 1. Drop old public policies if they exist and create new restricted ones
DO $$ 
BEGIN
  -- Drop old profiles policy if exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Los perfiles son visibles para todos') THEN
    DROP POLICY "Los perfiles son visibles para todos" ON public.profiles;
  END IF;
  
  -- Create new profiles policy if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Usuarios autenticados pueden ver perfiles') THEN
    EXECUTE 'CREATE POLICY "Usuarios autenticados pueden ver perfiles" ON public.profiles FOR SELECT TO authenticated USING (true)';
  END IF;

  -- Drop old activity_participants policy if exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_participants' AND policyname = 'Los participantes son visibles para todos') THEN
    DROP POLICY "Los participantes son visibles para todos" ON public.activity_participants;
  END IF;
  
  -- Create new activity_participants policy if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_participants' AND policyname = 'Usuarios autenticados pueden ver participantes') THEN
    EXECUTE 'CREATE POLICY "Usuarios autenticados pueden ver participantes" ON public.activity_participants FOR SELECT TO authenticated USING (true)';
  END IF;

  -- Drop old user_interests policy if exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interests' AND policyname = 'Los intereses de usuarios son visibles para todos') THEN
    DROP POLICY "Los intereses de usuarios son visibles para todos" ON public.user_interests;
  END IF;
  
  -- Create new user_interests policies if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interests' AND policyname = 'Usuarios pueden ver sus propios intereses') THEN
    EXECUTE 'CREATE POLICY "Usuarios pueden ver sus propios intereses" ON public.user_interests FOR SELECT TO authenticated USING (auth.uid() = user_id)';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_interests' AND policyname = 'Ver intereses de compañeros de actividad') THEN
    EXECUTE 'CREATE POLICY "Ver intereses de compañeros de actividad" ON public.user_interests FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM activity_participants ap1 JOIN activity_participants ap2 ON ap1.activity_id = ap2.activity_id WHERE ap1.user_id = auth.uid() AND ap2.user_id = user_interests.user_id))';
  END IF;

  -- Add delete policy for activities if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activities' AND policyname = 'Creadores pueden eliminar sus actividades') THEN
    EXECUTE 'CREATE POLICY "Creadores pueden eliminar sus actividades" ON public.activities FOR DELETE TO authenticated USING (auth.uid() = created_by)';
  END IF;
END $$;