-- ====================================================================
-- AGREGAR CAMPO AVATAR_URL A LA TABLA PROFILES
-- ====================================================================
-- Fecha: $(date)
-- Propósito: Agregar soporte para almacenar la URL del avatar del usuario

-- Verificar si la tabla profiles existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RAISE EXCEPTION 'La tabla profiles no existe. Ejecuta primero supabase-setup.sql';
    END IF;
END $$;

-- Agregar campo avatar_url si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'profiles' 
                   AND column_name = 'avatar_url') THEN
        
        ALTER TABLE public.profiles 
        ADD COLUMN avatar_url TEXT;
        
        COMMENT ON COLUMN public.profiles.avatar_url IS 'URL de la imagen de avatar del usuario desde Supabase Storage';
        
        RAISE NOTICE '✅ Campo avatar_url agregado exitosamente a la tabla profiles';
    ELSE
        RAISE NOTICE '⚠️  Campo avatar_url ya existe en la tabla profiles';
    END IF;
END $$;

-- Verificar la estructura actualizada
\echo '\n📊 ESTRUCTURA ACTUALIZADA DE LA TABLA PROFILES:'
SELECT 
    column_name as "Campo",
    data_type as "Tipo",
    is_nullable as "Nullable",
    column_default as "Default"
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
ORDER BY ordinal_position;

-- Contar registros existentes
\echo '\n📈 ESTADÍSTICAS:'
SELECT 
    COUNT(*) as total_usuarios,
    COUNT(avatar_url) as usuarios_con_avatar,
    COUNT(*) - COUNT(avatar_url) as usuarios_sin_avatar
FROM public.profiles;

\echo '\n✅ Script completado exitosamente!'
\echo '🔧 Los usuarios ahora pueden subir y almacenar sus avatares personalizados'
