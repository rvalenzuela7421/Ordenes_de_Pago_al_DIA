-- ============================================================================
-- ELIMINAR CAMPO DESCRIPCION_DETALLE DE TABLA PARAMETROS
-- Limpieza para remover campo con nombre incorrecto antes de agregar 'regla'
-- ============================================================================

-- 1. VERIFICAR ESTRUCTURA ACTUAL ANTES DEL CAMBIO
-- ============================================================================
SELECT 
    table_name,
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'parametros' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. VERIFICAR SI EL CAMPO EXISTE
-- ============================================================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'parametros' 
              AND table_schema = 'public'
              AND column_name = 'descripcion_detalle'
        ) THEN 'Campo descripcion_detalle EXISTE - se procederá a eliminar'
        ELSE 'Campo descripcion_detalle NO EXISTE - no hay acción requerida'
    END as status_campo;

-- 3. ELIMINAR EL CAMPO SI EXISTE
-- ============================================================================
-- Eliminar índice asociado si existe
DROP INDEX IF EXISTS public.idx_parametros_descripcion_detalle;

-- Eliminar el campo descripcion_detalle
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'parametros' 
          AND table_schema = 'public'
          AND column_name = 'descripcion_detalle'
    ) THEN
        ALTER TABLE public.parametros 
        DROP COLUMN descripcion_detalle;
        
        RAISE NOTICE 'Campo descripcion_detalle eliminado exitosamente';
    ELSE
        RAISE NOTICE 'Campo descripcion_detalle no existe, no hay acción requerida';
    END IF;
END $$;

-- 4. VERIFICAR ESTRUCTURA DESPUÉS DE LA ELIMINACIÓN
-- ============================================================================
SELECT 
    table_name,
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'parametros' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. CONFIRMAR QUE EL CAMPO FUE ELIMINADO
-- ============================================================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'parametros' 
              AND table_schema = 'public'
              AND column_name = 'descripcion_detalle'
        ) THEN '❌ ADVERTENCIA: Campo descripcion_detalle aún existe'
        ELSE '✅ CONFIRMADO: Campo descripcion_detalle eliminado correctamente'
    END as resultado_final;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Este script elimina el campo descripcion_detalle completamente
-- 2. También elimina el índice asociado si existe
-- 3. Es seguro ejecutar múltiples veces (usa IF EXISTS)
-- 4. Después de esto, ejecutar add-regla-field.sql para agregar el campo correcto
-- 5. No afecta datos existentes en otros campos
-- ============================================================================
