-- ============================================================================
-- SCRIPT: Agregar campo fecha_cuenta_cobro a tabla ordenes_pago
-- PROPÓSITO: Almacenar la fecha de la cuenta de cobro como campo requerido
-- FECHA: 2024 - Sistema COP
-- ============================================================================

-- 1. AGREGAR CAMPO FECHA_CUENTA_COBRO COMO OPCIONAL INICIALMENTE
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS fecha_cuenta_cobro DATE;

-- 2. AGREGAR COMENTARIO PARA DOCUMENTACIÓN  
-- ============================================================================
COMMENT ON COLUMN public.ordenes_pago.fecha_cuenta_cobro IS 'Fecha de la cuenta de cobro extraída del PDF o ingresada manualmente - campo requerido';

-- 3. VERIFICAR ESTRUCTURA ANTES DE HACER EL CAMPO REQUERIDO
-- ============================================================================
SELECT 
    'Campo fecha_cuenta_cobro agregado correctamente:' as info,
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
AND column_name = 'fecha_cuenta_cobro'
AND table_schema = 'public';

-- 4. MOSTRAR REGISTROS EXISTENTES SIN FECHA (para análisis)
-- ============================================================================  
SELECT 
    'Registros existentes sin fecha_cuenta_cobro:' as info,
    COUNT(*) as total_sin_fecha
FROM public.ordenes_pago 
WHERE fecha_cuenta_cobro IS NULL;

-- 5. ACTUALIZAR REGISTROS EXISTENTES CON FECHA PREDETERMINADA
-- ============================================================================
-- Usar fecha_solicitud como valor por defecto para registros existentes
UPDATE public.ordenes_pago 
SET fecha_cuenta_cobro = fecha_solicitud
WHERE fecha_cuenta_cobro IS NULL 
AND fecha_solicitud IS NOT NULL;

-- Si no hay fecha_solicitud, usar fecha_creacion
UPDATE public.ordenes_pago 
SET fecha_cuenta_cobro = DATE(fecha_creacion)
WHERE fecha_cuenta_cobro IS NULL 
AND fecha_creacion IS NOT NULL;

-- Si no hay ninguna fecha, usar fecha actual
UPDATE public.ordenes_pago 
SET fecha_cuenta_cobro = CURRENT_DATE
WHERE fecha_cuenta_cobro IS NULL;

-- 6. VERIFICAR QUE TODOS LOS REGISTROS TIENEN FECHA
-- ============================================================================
SELECT 
    'Verificación post-actualización:' as info,
    COUNT(*) as total_registros,
    COUNT(fecha_cuenta_cobro) as con_fecha_cobro,
    COUNT(*) - COUNT(fecha_cuenta_cobro) as sin_fecha_cobro
FROM public.ordenes_pago;

-- 7. HACER EL CAMPO REQUERIDO (NOT NULL)
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ALTER COLUMN fecha_cuenta_cobro SET NOT NULL;

-- 8. VERIFICACIÓN FINAL
-- ============================================================================
SELECT 
    'Campo fecha_cuenta_cobro configurado como requerido:' as resultado,
    column_name, 
    data_type, 
    is_nullable as es_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
AND column_name = 'fecha_cuenta_cobro'
AND table_schema = 'public';

-- 9. MOSTRAR EJEMPLO DE REGISTROS CON FECHA
-- ============================================================================
SELECT 
    'Ejemplo de registros con fecha_cuenta_cobro:' as info,
    numero_orden,
    proveedor,
    fecha_cuenta_cobro,
    fecha_solicitud,
    estado
FROM public.ordenes_pago 
ORDER BY fecha_cuenta_cobro DESC
LIMIT 5;

-- ============================================================================
-- RESUMEN DE CAMBIOS:
-- ✅ Campo fecha_cuenta_cobro agregado como DATE
-- ✅ Campo documentado con comentario
-- ✅ Registros existentes actualizados con fechas válidas  
-- ✅ Campo configurado como NOT NULL (requerido)
-- ✅ Verificaciones de integridad completadas
-- ============================================================================
