-- ============================================================================
-- ELIMINAR TABLA PARAMETROS
-- Script para borrar completamente la tabla parametros de la base de datos
-- ============================================================================

-- 1. Eliminar la tabla si existe (con CASCADE para eliminar dependencias)
-- ============================================================================
DROP TABLE IF EXISTS public.parametros CASCADE;

-- 2. Eliminar índices relacionados (por si quedaron huérfanos)
-- ============================================================================
DROP INDEX IF EXISTS public.idx_parametros_nombre_grupo;
DROP INDEX IF EXISTS public.idx_parametros_vigente;
DROP INDEX IF EXISTS public.idx_parametros_nombre_vigente;

-- 3. Eliminar políticas RLS relacionadas (por si quedaron)
-- ============================================================================
DROP POLICY IF EXISTS "Usuarios pueden leer parametros" ON public.parametros;
DROP POLICY IF EXISTS "Solo admins pueden modificar parametros" ON public.parametros;

-- 4. Eliminar trigger relacionado (por si quedó)
-- ============================================================================
DROP TRIGGER IF EXISTS update_parametros_updated_at ON public.parametros;

-- 5. Verificar que la tabla fue eliminada
-- ============================================================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'parametros' 
            AND table_schema = 'public'
        ) 
        THEN 'La tabla parametros AÚN EXISTE' 
        ELSE '✅ La tabla parametros ha sido ELIMINADA correctamente'
    END as resultado;

-- 6. Mostrar todas las tablas actuales (para confirmar)
-- ============================================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================================================
-- NOTAS:
-- - El CASCADE elimina automáticamente cualquier dependencia
-- - Si la tabla no existe, no dará error por el IF EXISTS
-- - Este script es seguro de ejecutar múltiples veces
-- ============================================================================

