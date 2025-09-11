-- ============================================================================
-- DIAGNÓSTICO: ¿POR QUÉ LA APLICACIÓN NO PUEDE LEER LA TABLA PARAMETROS?
-- Script para identificar problemas de acceso a datos
-- ============================================================================

-- 1. VERIFICAR QUE LA TABLA EXISTE Y TIENE DATOS
-- ============================================================================
SELECT 
    'TABLA PARAMETROS - DATOS EXISTENTES' as diagnostico,
    COUNT(*) as total_registros
FROM public.parametros;

-- 2. VERIFICAR REGISTROS DEL GRUPO_BOLIVAR ESPECÍFICAMENTE
-- ============================================================================
SELECT 
    'GRUPO_BOLIVAR - DATOS EXISTENTES' as diagnostico,
    COUNT(*) as total_grupo_bolivar,
    COUNT(CASE WHEN vigente = 'S' THEN 1 END) as vigentes,
    COUNT(CASE WHEN vigente = 'N' THEN 1 END) as no_vigentes
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR';

-- 3. MOSTRAR LOS PRIMEROS 5 REGISTROS PARA VERIFICAR FORMATO
-- ============================================================================
SELECT 
    'MUESTRA DE DATOS' as diagnostico,
    nombre_grupo,
    valor_dominio,
    orden,
    vigente,
    LENGTH(valor_dominio) as longitud_valor
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR'
ORDER BY orden
LIMIT 5;

-- 4. VERIFICAR ROW LEVEL SECURITY (RLS)
-- ============================================================================
SELECT 
    'RLS STATUS' as diagnostico,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls as has_rls_policies
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'parametros';

-- 5. VERIFICAR POLÍTICAS RLS EXISTENTES
-- ============================================================================
SELECT 
    'POLÍTICAS RLS' as diagnostico,
    policyname as nombre_politica,
    cmd as comando,
    permissive as permisiva,
    roles as roles_aplicables,
    qual as condicion
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'parametros';

-- 6. VERIFICAR PERMISOS EN LA TABLA
-- ============================================================================
SELECT 
    'PERMISOS TABLA' as diagnostico,
    grantee as usuario,
    privilege_type as permiso,
    is_grantable as puede_otorgar
FROM information_schema.role_table_grants 
WHERE table_schema = 'public' AND table_name = 'parametros'
ORDER BY grantee, privilege_type;

-- 7. VERIFICAR SI HAY TRIGGERS QUE PUEDAN INTERFERIR
-- ============================================================================
SELECT 
    'TRIGGERS' as diagnostico,
    trigger_name as nombre_trigger,
    event_manipulation as evento,
    action_timing as momento
FROM information_schema.triggers 
WHERE event_object_schema = 'public' AND event_object_table = 'parametros';

-- 8. VERIFICAR CONFIGURACIÓN IVA
-- ============================================================================
SELECT 
    'CONFIGURACION_IVA - DATOS' as diagnostico,
    COUNT(*) as total_registros,
    STRING_AGG(valor_dominio, ', ') as valores_iva
FROM public.parametros 
WHERE nombre_grupo = 'CONFIGURACION_IVA';

-- 9. PROBAR CONSULTA EXACTA QUE HACE LA APLICACIÓN
-- ============================================================================
-- Simular la consulta que hace la aplicación
SELECT 
    'CONSULTA APLICACIÓN - GRUPO_BOLIVAR' as diagnostico,
    COUNT(*) as registros_encontrados
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND vigente = 'S'
ORDER BY orden;

-- 10. CONSULTA COMPLETA COMO LA HACE LA APP
-- ============================================================================
SELECT 
    'RESULTADO COMPLETO APP' as diagnostico,
    id,
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    orden,
    vigente,
    created_at,
    updated_at
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND vigente = 'S'
ORDER BY orden ASC;

-- 11. VERIFICAR USUARIO ACTUAL Y ROLES
-- ============================================================================
SELECT 
    'USUARIO ACTUAL' as diagnostico,
    current_user as usuario_actual,
    current_role as rol_actual,
    session_user as usuario_sesion;

-- 12. VERIFICAR CONEXIÓN ANON KEY (TÍPICA DE SUPABASE)
-- ============================================================================
-- Nota: Esta consulta podría fallar si no tienes permisos
SELECT 
    'AUTH CONTEXT' as diagnostico,
    auth.uid() as user_id,
    auth.role() as user_role,
    auth.email() as user_email;

-- RESUMEN FINAL
-- ============================================================================
DO $$
DECLARE
    total_parametros INTEGER;
    total_grupo_bolivar INTEGER;
    rls_enabled BOOLEAN;
BEGIN
    -- Contar registros
    SELECT COUNT(*) INTO total_parametros FROM public.parametros;
    SELECT COUNT(*) INTO total_grupo_bolivar FROM public.parametros WHERE nombre_grupo = 'GRUPO_BOLIVAR' AND vigente = 'S';
    
    -- Verificar RLS
    SELECT rowsecurity INTO rls_enabled FROM pg_tables WHERE schemaname = 'public' AND tablename = 'parametros';
    
    -- Mostrar resumen
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '                           DIAGNÓSTICO RESUMEN';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Total parámetros en tabla: %', total_parametros;
    RAISE NOTICE 'GRUPO_BOLIVAR vigentes: %', total_grupo_bolivar;
    RAISE NOTICE 'RLS habilitado: %', COALESCE(rls_enabled, false);
    RAISE NOTICE '';
    
    IF total_grupo_bolivar = 0 THEN
        RAISE WARNING '❌ NO SE ENCONTRARON EMPRESAS DEL GRUPO BOLIVAR VIGENTES';
    ELSIF total_grupo_bolivar < 11 THEN
        RAISE WARNING '⚠️  SOLO % EMPRESAS ENCONTRADAS (ESPERADAS: 11)', total_grupo_bolivar;
    ELSE
        RAISE NOTICE '✅ SE ENCONTRARON % EMPRESAS DEL GRUPO BOLIVAR', total_grupo_bolivar;
    END IF;
    
    IF rls_enabled THEN
        RAISE NOTICE '🔐 RLS HABILITADO - VERIFICAR POLÍTICAS DE ACCESO';
    ELSE
        RAISE NOTICE '🔓 RLS DESHABILITADO - ACCESO LIBRE A LA TABLA';
    END IF;
END $$;

