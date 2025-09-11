-- ============================================================================
-- VERIFICAR CONEXIÓN DIRECTA Y REFRESCAR CACHE DE SUPABASE
-- Solución para problemas persistentes de acceso
-- ============================================================================

-- 1. VERIFICAR CONEXIÓN BÁSICA
-- ============================================================================
SELECT 'PRUEBA CONEXIÓN' as test, NOW() as timestamp_actual;

-- 2. VERIFICAR TABLA PARAMETROS EXISTE Y TIENE DATOS
-- ============================================================================
SELECT 
    'TABLA PARAMETROS' as test,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN nombre_grupo = 'GRUPO_BOLIVAR' THEN 1 END) as grupo_bolivar,
    COUNT(CASE WHEN nombre_grupo = 'CONFIGURACION_IVA' THEN 1 END) as config_iva
FROM public.parametros;

-- 3. MOSTRAR DATOS EXACTOS QUE BUSCA LA APP
-- ============================================================================
SELECT 
    'CONSULTA EXACTA APP' as test,
    id,
    nombre_grupo,
    valor_dominio,
    vigente,
    orden
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND vigente = 'S'
ORDER BY orden;

-- 4. VERIFICAR ESTADO RLS ACTUAL
-- ============================================================================
SELECT 
    'ESTADO RLS' as test,
    schemaname,
    tablename,
    rowsecurity as rls_disabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'parametros';

-- 5. REFRESCAR SCHEMA CACHE DE SUPABASE (FORZAR)
-- ============================================================================
-- Esto fuerza a Supabase a refrescar su cache interno
NOTIFY pgrst, 'reload schema';

-- 6. RECREAR TABLA SI ES NECESARIO (ÚLTIMO RECURSO)
-- ============================================================================
/*
-- SOLO ejecutar si nada más funciona
-- CUIDADO: Esto eliminará y recreará la tabla

DROP TABLE IF EXISTS public.parametros_temp;

CREATE TABLE public.parametros_temp AS 
SELECT * FROM public.parametros;

DROP TABLE public.parametros;

CREATE TABLE public.parametros (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_grupo TEXT NOT NULL,
    descripcion_grupo TEXT,
    valor_dominio TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    vigente TEXT NOT NULL CHECK (vigente IN ('S', 'N')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SIN RLS desde el inicio
ALTER TABLE public.parametros DISABLE ROW LEVEL SECURITY;

INSERT INTO public.parametros 
SELECT * FROM public.parametros_temp;

DROP TABLE public.parametros_temp;
*/

-- 7. VERIFICACIÓN FINAL
-- ============================================================================
DO $$
DECLARE
    total_bolivar INTEGER;
    rls_status BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO total_bolivar 
    FROM public.parametros 
    WHERE nombre_grupo = 'GRUPO_BOLIVAR' AND vigente = 'S';
    
    SELECT rowsecurity INTO rls_status 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'parametros';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'DIAGNÓSTICO FINAL:';
    RAISE NOTICE 'Empresas GRUPO_BOLIVAR vigentes: %', total_bolivar;
    RAISE NOTICE 'RLS habilitado: %', COALESCE(rls_status, false);
    RAISE NOTICE '============================================';
    
    IF total_bolivar = 0 THEN
        RAISE WARNING '❌ NO HAY DATOS DEL GRUPO_BOLIVAR';
    ELSIF total_bolivar < 11 THEN
        RAISE WARNING '⚠️ SOLO % EMPRESAS (ESPERADAS: 11)', total_bolivar;
    ELSE
        RAISE NOTICE '✅ DATOS CORRECTOS: % EMPRESAS', total_bolivar;
    END IF;
    
    IF rls_status THEN
        RAISE WARNING '🔐 RLS AÚN HABILITADO - EJECUTAR: ALTER TABLE public.parametros DISABLE ROW LEVEL SECURITY;';
    ELSE
        RAISE NOTICE '🔓 RLS DESHABILITADO CORRECTAMENTE';
    END IF;
END $$;

