-- ============================================================================
-- SOLUCIÓN SIMPLE: DESHABILITAR RLS EN TABLA PARAMETROS
-- Compatible con todas las versiones de PostgreSQL/Supabase
-- ============================================================================

-- 1. VERIFICAR ESTADO ACTUAL (SIMPLE)
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'parametros';

-- 2. DESHABILITAR RLS COMPLETAMENTE
-- ============================================================================
ALTER TABLE public.parametros DISABLE ROW LEVEL SECURITY;

-- 3. VERIFICAR QUE SE DESHABILITÓ
-- ============================================================================
SELECT 
    'VERIFICACIÓN' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'parametros';

-- 4. PROBAR ACCESO A LOS DATOS
-- ============================================================================
SELECT 
    'PRUEBA ACCESO' as test,
    COUNT(*) as total_registros
FROM public.parametros;

-- 5. CONFIRMAR GRUPO_BOLIVAR
-- ============================================================================
SELECT 
    'GRUPO_BOLIVAR' as grupo,
    COUNT(*) as total_empresas
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR';

-- 6. MOSTRAR PRIMERAS 3 EMPRESAS PARA CONFIRMAR
-- ============================================================================
SELECT 
    'MUESTRA DATOS' as resultado,
    valor_dominio,
    vigente
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
ORDER BY orden 
LIMIT 3;

-- MENSAJE FINAL
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS DESHABILITADO EN TABLA PARAMETROS';
    RAISE NOTICE '🚀 AHORA REINICIA EL SERVIDOR NEXT.JS:';
    RAISE NOTICE '   1. Ctrl+C para parar el servidor';
    RAISE NOTICE '   2. npm run dev para reiniciar';
    RAISE NOTICE '   3. Refrescar http://localhost:3000/solicitudes/nueva';
    RAISE NOTICE '';
END $$;

