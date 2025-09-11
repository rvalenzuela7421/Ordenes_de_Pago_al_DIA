-- ============================================================================
-- ELIMINAR TABLA PROVEEDORES
-- Script para borrar completamente la tabla proveedores de la base de datos
-- ============================================================================

-- 1. Eliminar la tabla si existe (con CASCADE para eliminar dependencias)
-- ============================================================================
DROP TABLE IF EXISTS public.proveedores CASCADE;

-- 2. Eliminar índices relacionados (por si quedaron huérfanos)
-- ============================================================================
DROP INDEX IF EXISTS public.idx_proveedores_numero_identificacion;
DROP INDEX IF EXISTS public.idx_proveedores_tipo_documento;
DROP INDEX IF EXISTS public.idx_proveedores_tipo_persona;
DROP INDEX IF EXISTS public.idx_proveedores_nombre_razon_social;

-- 3. Eliminar políticas RLS relacionadas (por si quedaron)
-- ============================================================================
DROP POLICY IF EXISTS "Usuarios pueden leer proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "Solo admins pueden modificar proveedores" ON public.proveedores;

-- 4. Eliminar trigger relacionado (por si quedó)
-- ============================================================================
DROP TRIGGER IF EXISTS update_proveedores_updated_at ON public.proveedores;

-- 5. Verificar que la tabla fue eliminada
-- ============================================================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_name = 'proveedores' 
            AND table_schema = 'public'
        ) 
        THEN 'La tabla proveedores AÚN EXISTE' 
        ELSE '✅ La tabla proveedores ha sido ELIMINADA correctamente'
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

