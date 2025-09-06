-- ============================================================================
-- ACTUALIZACIÓN DE TABLA ordenes_pago - DISTRIBUCIONES Y LIMPIEZA
-- ============================================================================
-- Script para agregar campo de distribuciones y eliminar campo innecesario
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. AGREGAR CAMPO INDICADOR DE DISTRIBUCIONES
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS ind_distribuciones CHAR(1) DEFAULT 'N' CHECK (ind_distribuciones IN ('S', 'N'));

-- 2. AGREGAR COMENTARIO PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON COLUMN public.ordenes_pago.ind_distribuciones IS 'Indicador si la solicitud tiene distribuciones: S=Si, N=No';

-- 3. ELIMINAR CAMPO total_op (ya no se usa)
-- ============================================================================
ALTER TABLE public.ordenes_pago 
DROP COLUMN IF EXISTS total_op;

-- 4. VERIFICAR CAMBIOS REALIZADOS
-- ============================================================================
SELECT 
    'Estructura actualizada de ordenes_pago:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. VERIFICAR QUE total_op YA NO EXISTE
-- ============================================================================
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Campo total_op eliminado correctamente'
        ELSE '❌ Campo total_op aún existe'
    END as resultado_eliminacion
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
  AND column_name = 'total_op';

-- 6. VERIFICAR QUE ind_distribuciones EXISTE
-- ============================================================================
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Campo ind_distribuciones agregado correctamente'
        ELSE '❌ Campo ind_distribuciones no se agregó'
    END as resultado_agregacion
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
  AND column_name = 'ind_distribuciones';

-- 7. ACTUALIZAR REGISTROS EXISTENTES (opcional)
-- ============================================================================
-- Establecer 'N' por defecto en registros existentes que tengan NULL
UPDATE public.ordenes_pago 
SET ind_distribuciones = 'N' 
WHERE ind_distribuciones IS NULL;

-- 8. VERIFICAR REGISTROS DE EJEMPLO
-- ============================================================================
SELECT 
    'Muestra de registros actualizados:' as info,
    id,
    numero_solicitud,
    proveedor,
    ind_distribuciones,
    archivo_xlsx_url
FROM public.ordenes_pago 
ORDER BY fecha_solicitud DESC 
LIMIT 5;

-- ============================================================================
-- RESUMEN DE CAMBIOS:
-- ============================================================================
-- ✅ Campo ind_distribuciones agregado (CHAR(1), valores S/N)
-- ✅ Campo total_op eliminado
-- ✅ Registros existentes actualizados con 'N' por defecto
-- ============================================================================

-- ============================================================================
-- PRÓXIMOS PASOS EN CÓDIGO:
-- ============================================================================
-- 1. 📋 Actualizar interfaz OrdenPago en lib/dashboard-data.ts
-- 2. 📋 Modificar formulario nueva solicitud para capturar indicador
-- 3. 📋 Actualizar API /api/solicitudes para guardar ind_distribuciones
-- 4. 📋 Modificar dashboard para mostrar columna Anexos con iconos
-- ============================================================================
