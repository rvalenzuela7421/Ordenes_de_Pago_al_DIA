-- Script para crear un usuario de prueba en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- =====================================================
-- CREAR USUARIO DE PRUEBA PARA EL SISTEMA COP
-- =====================================================

-- IMPORTANTE: Este script creará un usuario de prueba que podrás usar
-- para hacer login en la aplicación con credenciales reales.

-- CREDENCIALES DEL USUARIO DE PRUEBA:
-- Email: admin@cop.segurosbolivar.com
-- Contraseña: COP123456!
-- Rol: AdminCOP

-- 1. Insertar usuario en auth.users (tabla de autenticación de Supabase)
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    phone_confirmed_at,
    confirmation_sent_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@cop.segurosbolivar.com',
    crypt('COP123456!', gen_salt('bf')), -- Encriptar contraseña
    NOW(),
    NULL,
    NOW(),
    '',
    '',
    '',
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre_completo": "Administrador COP", "telefono": "3001234567", "role": "AdminCOP"}',
    FALSE,
    NOW(),
    NOW(),
    NULL,
    '',
    '',
    NULL,
    '',
    '',
    0,
    NULL,
    '',
    NULL
) ON CONFLICT (email) DO UPDATE SET
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = NOW();

-- 2. El perfil en public.profiles se creará automáticamente por el trigger
-- pero por si acaso, también lo insertamos manualmente

INSERT INTO public.profiles (
    id,
    email,
    nombre_completo,
    telefono,
    role,
    must_change_password,
    created_at,
    updated_at
) 
SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'nombre_completo',
    u.raw_user_meta_data->>'telefono',
    u.raw_user_meta_data->>'role',
    FALSE,
    NOW(),
    NOW()
FROM auth.users u 
WHERE u.email = 'admin@cop.segurosbolivar.com'
ON CONFLICT (id) DO UPDATE SET
    nombre_completo = EXCLUDED.nombre_completo,
    telefono = EXCLUDED.telefono,
    role = EXCLUDED.role,
    updated_at = NOW();

-- 3. Crear algunos usuarios adicionales de prueba
INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    phone_confirmed_at, confirmation_sent_at, confirmation_token, recovery_token,
    email_change_token_new, email_change_sent_at, last_sign_in_at, raw_app_meta_data,
    raw_user_meta_data, is_super_admin, created_at, updated_at
) VALUES
-- Usuario OperacionCOP
(
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'operacion@cop.segurosbolivar.com', crypt('COP123456!', gen_salt('bf')), NOW(),
    NULL, NOW(), '', '', '', NULL, NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre_completo": "Operador COP", "telefono": "3007654321", "role": "OperacionCOP"}',
    FALSE, NOW(), NOW()
),
-- Usuario ConsultaCOP  
(
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'consulta@cop.segurosbolivar.com', crypt('COP123456!', gen_salt('bf')), NOW(),
    NULL, NOW(), '', '', '', NULL, NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre_completo": "Consultor COP", "telefono": "3009876543", "role": "ConsultaCOP"}',
    FALSE, NOW(), NOW()
),
-- Usuario OperacionBSEG
(
    gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    'tributario@cop.segurosbolivar.com', crypt('COP123456!', gen_salt('bf')), NOW(),
    NULL, NOW(), '', '', '', NULL, NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre_completo": "Operador BSEG", "telefono": "3005432167", "role": "OperacionBSEG"}',
    FALSE, NOW(), NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 4. Crear perfiles para todos los usuarios
INSERT INTO public.profiles (id, email, nombre_completo, telefono, role, must_change_password, created_at, updated_at)
SELECT 
    u.id, u.email, u.raw_user_meta_data->>'nombre_completo',
    u.raw_user_meta_data->>'telefono', u.raw_user_meta_data->>'role',
    FALSE, NOW(), NOW()
FROM auth.users u 
WHERE u.email IN (
    'operacion@cop.segurosbolivar.com',
    'consulta@cop.segurosbolivar.com', 
    'tributario@cop.segurosbolivar.com'
)
ON CONFLICT (id) DO UPDATE SET
    nombre_completo = EXCLUDED.nombre_completo,
    telefono = EXCLUDED.telefono,
    role = EXCLUDED.role,
    updated_at = NOW();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que los usuarios se crearon correctamente
SELECT 
    p.email,
    p.nombre_completo,
    p.role,
    p.telefono,
    p.created_at
FROM public.profiles p
WHERE p.email LIKE '%@cop.segurosbolivar.com'
ORDER BY p.role, p.email;

-- =====================================================
-- CREDENCIALES PARA PROBAR
-- =====================================================

/*
🔐 USUARIOS DE PRUEBA CREADOS:

1. ADMINISTRADOR COP
   📧 Email: admin@cop.segurosbolivar.com
   🔑 Password: COP123456!
   👤 Rol: AdminCOP (puede hacer todo)

2. OPERADOR COP  
   📧 Email: operacion@cop.segurosbolivar.com
   🔑 Password: COP123456!
   👤 Rol: OperacionCOP (puede aprobar órdenes)

3. CONSULTOR COP
   📧 Email: consulta@cop.segurosbolivar.com  
   🔑 Password: COP123456!
   👤 Rol: ConsultaCOP (solo consultar)

4. OPERADOR BSEG
   📧 Email: tributario@cop.segurosbolivar.com
   🔑 Password: COP123456!  
   👤 Rol: OperacionBSEG (crear órdenes)

⚠️ IMPORTANTE: Usa cualquiera de estas credenciales para probar el login.
*/
