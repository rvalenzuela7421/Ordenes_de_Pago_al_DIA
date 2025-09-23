-- ============================================================================
-- SOLUCIÓN RÁPIDA: HABILITAR ACCESO A TABLA PARAMETROS
-- Los datos existen, pero la aplicación no puede leerlos
-- ============================================================================

-- 1. VERIFICAR ESTADO ACTUAL DE RLS
-- ============================================================================
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasrls as has_policies
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'parametros';

-- 2. VER POLÍTICAS ACTUALES
-- ============================================================================
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'parametros';

-- 3. SOLUCIÓN TEMPORAL: DESHABILITAR RLS
-- ============================================================================
-- Esto permitirá acceso completo a la tabla temporalmente
ALTER TABLE public.parametros DISABLE ROW LEVEL SECURITY;

-- 4. VERIFICAR QUE FUNCIONA
-- ============================================================================
SELECT 
    'TEST - ACCESO FUNCIONANDO' as test,
    COUNT(*) as total_parametros,
    COUNT(CASE WHEN nombre_grupo = 'GRUPO_BOLIVAR' THEN 1 END) as grupo_bolivar,
    COUNT(CASE WHEN nombre_grupo = 'CONFIGURACION_IVA' THEN 1 END) as config_iva
FROM public.parametros;

-- 5. MOSTRAR GRUPO_BOLIVAR PARA CONFIRMAR
-- ============================================================================
SELECT 
    'GRUPO_BOLIVAR - CONFIRMACIÓN' as resultado,
    nombre_grupo,
    valor_dominio,
    vigente,
    orden
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
ORDER BY orden;

-- 6. CREAR POLÍTICAS PERMISIVAS (ALTERNATIVA AL PASO 3)
-- ============================================================================
-- Solo ejecutar si prefieres mantener RLS habilitado
/*
-- Re-habilitar RLS si lo deshabilitaste arriba
ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "Solo admins pueden modificar parametros" ON public.parametros;
DROP POLICY IF EXISTS "Usuarios pueden leer parametros" ON public.parametros;

-- Crear política súper permisiva para lectura
CREATE POLICY "Acceso total lectura parametros"
ON public.parametros FOR SELECT
USING (true);

-- Crear política para escritura (solo usuarios autenticados)
CREATE POLICY "Acceso total escritura parametros"  
ON public.parametros FOR ALL
TO authenticated
USING (true);
*/

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ RLS DESHABILITADO EN TABLA PARAMETROS';
    RAISE NOTICE '🚀 AHORA LA APLICACIÓN DEBERÍA PODER LEER LOS DATOS';
    RAISE NOTICE '';
    RAISE NOTICE '📋 PASOS SIGUIENTES:';
    RAISE NOTICE '   1. Refrescar la página de Nueva Solicitud';
    RAISE NOTICE '   2. Verificar que aparezcan las 11 empresas';
    RAISE NOTICE '   3. Si funciona, el problema era RLS';
    RAISE NOTICE '';
END $$;


