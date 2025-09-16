-- =====================================================
-- SCRIPT: Actualizar Constraint y Cambiar OperacionTRIB por OperacionBSEG
-- DESCRIPCIÓN: Arreglar constraint y actualizar roles correctamente
-- PROBLEMA: Check constraint no permite OperacionBSEG
-- =====================================================

-- 1. VERIFICAR ESTADO ACTUAL ANTES DEL CAMBIO
SELECT 'ANTES DEL CAMBIO' as momento,
       role,
       COUNT(*) as cantidad_usuarios,
       STRING_AGG(email, ', ' ORDER BY email) as emails
FROM public.profiles 
WHERE role IN ('OperacionTRIB', 'OperacionBSEG')
GROUP BY role;

-- 2. VERIFICAR CONSTRAINT ACTUAL
SELECT 'CONSTRAINT ACTUAL' as info,
       tc.constraint_name, 
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE '%role%';

-- 3. ELIMINAR CONSTRAINT ANTIGUO
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 4. CREAR NUEVO CONSTRAINT CON OperacionBSEG
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('AdminCOP', 'ConsultaCOP', 'OperacionCOP', 'OperacionBSEG'));

-- 5. VERIFICAR NUEVO CONSTRAINT
SELECT 'NUEVO CONSTRAINT' as info,
       tc.constraint_name, 
       cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'profiles' 
  AND tc.constraint_type = 'CHECK'
  AND tc.constraint_name LIKE '%role%';

-- 6. AHORA SÍ PODEMOS ACTUALIZAR LOS DATOS EN public.profiles
UPDATE public.profiles 
SET role = 'OperacionBSEG'
WHERE role = 'OperacionTRIB';

-- 7. ACTUALIZAR METADATOS DE AUTH (si existen)  
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{role}',
    '"OperacionBSEG"'
)
WHERE raw_user_meta_data ->> 'role' = 'OperacionTRIB';

-- 8. VERIFICAR RESULTADOS
SELECT 'DESPUÉS DEL CAMBIO' as momento,
       role,
       COUNT(*) as cantidad_usuarios,
       STRING_AGG(nombre_completo, ', ' ORDER BY nombre_completo) as usuarios
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- 9. VERIFICAR QUE NO QUEDEN OperacionTRIB
SELECT 'VERIFICACIÓN FINAL' as verificacion,
       COUNT(*) as usuarios_operacion_trib_restantes
FROM public.profiles 
WHERE role = 'OperacionTRIB';

-- 10. MOSTRAR USUARIO ESPECÍFICO QUE TENÍA EL ERROR
SELECT 'USUARIO QUE CAUSABA ERROR' as info,
       email,
       nombre_completo,
       role,
       'AHORA DEBERÍA SER OperacionBSEG' as estado_esperado
FROM public.profiles 
WHERE email = 'rsierrav7421@gmail.com';

-- MENSAJE FINAL
SELECT '✅ ACTUALIZACIÓN COMPLETADA' as status,
       'Constraint actualizado y roles migrados correctamente' as mensaje,
       'Ahora puedes hacer login normalmente' as siguiente_paso;
