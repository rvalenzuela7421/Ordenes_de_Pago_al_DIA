-- =====================================================
-- SCRIPT: Diagnosticar y Arreglar Roles en Tabla Profiles
-- DESCRIPCIÓN: Identificar todos los roles existentes y migrar correctamente
-- PROBLEMA: Hay roles que no están en el nuevo constraint
-- =====================================================

-- 1. DIAGNÓSTICO: VER TODOS LOS ROLES EXISTENTES
SELECT '🔍 TODOS LOS ROLES ACTUALES' as diagnostico,
       role,
       COUNT(*) as cantidad_usuarios,
       STRING_AGG(email, ', ' ORDER BY email) as emails
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- 2. VER USUARIOS ESPECÍFICOS CON CADA ROL
SELECT '📋 DETALLE POR USUARIO' as info,
       email,
       nombre_completo,
       role,
       created_at::date as fecha_creacion
FROM public.profiles 
ORDER BY role, email;

-- 3. IDENTIFICAR QUÉ ROLES NO ESTÁN EN EL CONSTRAINT PLANEADO
-- (Los roles planeados son: AdminCOP, ConsultaCOP, OperacionCOP, OperacionBSEG)
SELECT '⚠️  ROLES NO CONTEMPLADOS EN CONSTRAINT' as problema,
       role,
       COUNT(*) as usuarios_afectados,
       STRING_AGG(email, ', ') as emails_afectados
FROM public.profiles 
WHERE role NOT IN ('AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionBSEG')
GROUP BY role;

-- 4. VERIFICAR SI HAY CONSTRAINT ACTUAL
SELECT '🔧 CONSTRAINT ACTUAL' as info,
       tc.constraint_name, 
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK';

-- 5. ELIMINAR CONSTRAINT EXISTENTE (SI EXISTE)
DO $$ 
BEGIN
    -- Eliminar constraint si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'profiles' 
        AND constraint_name = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
        RAISE NOTICE '✅ Constraint profiles_role_check eliminado';
    ELSE
        RAISE NOTICE 'ℹ️  No había constraint profiles_role_check que eliminar';
    END IF;
END $$;

-- 6. MIGRAR OperacionTRIB a OperacionBSEG (si existe)
UPDATE public.profiles 
SET role = 'OperacionBSEG'
WHERE role = 'OperacionTRIB';

-- Mostrar cuántos se actualizaron
SELECT '🔄 MIGRACIÓN OperacionTRIB → OperacionBSEG' as accion,
       CASE 
         WHEN EXISTS (SELECT 1 FROM public.profiles WHERE role = 'OperacionBSEG') 
         THEN 'Usuarios migrados correctamente'
         ELSE 'No había usuarios OperacionTRIB para migrar'
       END as resultado;

-- 7. AHORA VER TODOS LOS ROLES DESPUÉS DE LA MIGRACIÓN
SELECT '📊 ROLES DESPUÉS DE MIGRACIÓN' as estado,
       role,
       COUNT(*) as cantidad_usuarios
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- 8. CREAR CONSTRAINT INCLUSIVO CON TODOS LOS ROLES EXISTENTES
-- Primero obtengamos dinámicamente todos los roles para el constraint
DO $$ 
DECLARE
    roles_list text;
    constraint_sql text;
BEGIN
    -- Obtener lista de todos los roles únicos
    SELECT string_agg(DISTINCT '''' || role || '''', ', ' ORDER BY '''' || role || '''')
    INTO roles_list
    FROM public.profiles;
    
    -- Construir y ejecutar el constraint
    constraint_sql := 'ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN (' || roles_list || '))';
    
    RAISE NOTICE '🏗️  Creando constraint con roles: %', roles_list;
    EXECUTE constraint_sql;
    RAISE NOTICE '✅ Constraint creado exitosamente';
END $$;

-- 9. VERIFICAR CONSTRAINT CREADO
SELECT '✅ NUEVO CONSTRAINT VERIFICADO' as resultado,
       tc.constraint_name, 
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name = 'profiles_role_check';

-- 10. ACTUALIZAR METADATOS DE AUTH (si existen usuarios OperacionTRIB)  
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"OperacionBSEG"'
)
WHERE raw_user_meta_data ->> 'role' = 'OperacionTRIB';

-- 11. RESULTADO FINAL
SELECT '🎯 RESULTADO FINAL' as resumen,
       role,
       COUNT(*) as usuarios,
       STRING_AGG(nombre_completo, ', ' ORDER BY nombre_completo) as nombres
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- 12. MENSAJE PARA EL USUARIO ESPECÍFICO
SELECT '👤 TU USUARIO ESPECÍFICO' as info,
       email,
       nombre_completo, 
       role,
       CASE 
         WHEN role = 'OperacionBSEG' THEN '✅ LISTO PARA LOGIN'
         ELSE '⚠️  Verificar rol'
       END as estado
FROM public.profiles 
WHERE email = 'rsierrav7421@gmail.com';

SELECT '🚀 PRÓXIMOS PASOS' as accion,
       '1. Limpiar sesión del navegador (localStorage, sessionStorage, cookies)' as paso1,
       '2. Cerrar y reabrir navegador completamente' as paso2,  
       '3. Intentar hacer login con tus credenciales' as paso3;
