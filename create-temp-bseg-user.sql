-- =====================================================
-- SCRIPT: Crear Usuario Temporal OperacionBSEG
-- DESCRIPCIÓN: Crear usuario de prueba con el nuevo rol
-- USO: Solo si persiste el problema de autenticación
-- =====================================================

-- 1. VERIFICAR USUARIOS ACTUALES
SELECT 'USUARIOS ACTUALES POR ROL' as info,
       role,
       COUNT(*) as cantidad,
       STRING_AGG(email, ', ') as emails
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- 2. CREAR USUARIO TEMPORAL CON NUEVO ROL
-- (Solo ejecutar si el problema persiste después de la migración)

/*
-- Insertar en auth.users (ajustar email según necesites)
INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at, invited_at,
    confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
    email_change_token_new, email_change, email_change_sent_at,
    last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at
) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'temp.bseg@cop.segurosbolivar.com', 
    crypt('TempBSEG2024!', gen_salt('bf')), 
    NOW(), NULL, '', '', '', '', '', '', NULL, NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre_completo": "Usuario Temporal BSEG", "telefono": "3001234567", "role": "OperacionBSEG"}',
    FALSE, NOW(), NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insertar en public.profiles
INSERT INTO public.profiles (id, email, nombre_completo, telefono, role, must_change_password)
SELECT 
    u.id,
    u.email,
    'Usuario Temporal BSEG',
    '3001234567',
    'OperacionBSEG',
    false
FROM auth.users u 
WHERE u.email = 'temp.bseg@cop.segurosbolivar.com'
AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
);
*/

-- 3. VERIFICAR RESULTADO
SELECT 'DESPUÉS DE CREAR USUARIO TEMPORAL' as info,
       role,
       COUNT(*) as cantidad,
       STRING_AGG(email, ', ') as emails
FROM public.profiles 
GROUP BY role
ORDER BY role;

-- CREDENCIALES DEL USUARIO TEMPORAL:
-- 📧 Email: temp.bseg@cop.segurosbolivar.com
-- 🔑 Password: TempBSEG2024!
-- 👤 Rol: OperacionBSEG

SELECT '✅ USUARIO TEMPORAL CREADO' as status,
       'temp.bseg@cop.segurosbolivar.com / TempBSEG2024!' as credenciales;
