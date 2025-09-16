-- =====================================================
-- SCRIPT: Cambiar perfil OperacionTRIB por OperacionBSEG
-- DESCRIPCIÓN: Actualiza el nombre del perfil en base de datos
-- TABLAS: public.profiles, auth.users
-- =====================================================

-- Verificar estado actual
SELECT 'ANTES DE ACTUALIZAR' as momento, 
       COUNT(*) as total_usuarios,
       role,
       STRING_AGG(email, ', ') as emails
FROM public.profiles 
WHERE role = 'OperacionTRIB'
GROUP BY role;

-- 1. ACTUALIZAR PERFILES EN TABLA public.profiles
UPDATE public.profiles 
SET role = 'OperacionBSEG'
WHERE role = 'OperacionTRIB';

-- 2. ACTUALIZAR METADATOS DE AUTH (si existen)  
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"OperacionBSEG"'
)
WHERE raw_user_meta_data ->> 'role' = 'OperacionTRIB';

-- 3. VERIFICAR CAMBIOS
SELECT 'DESPUÉS DE ACTUALIZAR' as momento,
       COUNT(*) as total_usuarios,
       role,
       STRING_AGG(email, ', ') as emails
FROM public.profiles 
WHERE role = 'OperacionBSEG'
GROUP BY role;

-- 4. VERIFICAR QUE NO QUEDE NINGÚN OperacionTRIB
SELECT 'VERIFICACIÓN - NO DEBERÍA HABER RESULTADOS' as verificacion,
       COUNT(*) as usuarios_operacion_trib_restantes
FROM public.profiles 
WHERE role = 'OperacionTRIB';

-- 5. MOSTRAR TODOS LOS ROLES ACTUALES
SELECT 
    role,
    COUNT(*) as cantidad_usuarios,
    STRING_AGG(nombre_completo, ', ' ORDER BY nombre_completo) as usuarios
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- 6. ACTUALIZAR CONSTRAINTS SI EXISTEN
-- Verificar si hay constraints que necesiten actualización
DO $$
BEGIN
    -- Intentar actualizar constraint de role si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%role%' 
        AND check_clause LIKE '%OperacionTRIB%'
    ) THEN
        -- Esto requerirá modificación manual de los constraints
        RAISE NOTICE 'ATENCIÓN: Hay constraints que contienen OperacionTRIB que necesitan actualización manual';
        
        -- Mostrar los constraints que necesitan actualización
        FOR constraint_rec IN 
            SELECT constraint_name, check_clause 
            FROM information_schema.check_constraints 
            WHERE check_clause LIKE '%OperacionTRIB%'
        LOOP
            RAISE NOTICE 'Constraint: % - Definition: %', constraint_rec.constraint_name, constraint_rec.check_clause;
        END LOOP;
    END IF;
END $$;

-- Mensaje final
SELECT '✅ ACTUALIZACIÓN DE PERFIL COMPLETADA' as status,
       'OperacionTRIB → OperacionBSEG' as cambio_realizado;
