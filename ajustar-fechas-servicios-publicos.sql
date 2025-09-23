-- ============================================================================
-- AJUSTAR FECHAS DE SERVICIOS PÚBLICOS - RESTAR 100 DÍAS
-- ============================================================================
-- Script para ajustar las fechas de solicitud y documento de cobro
-- de los registros de servicios públicos que tengan fechas >= hoy
-- Restar 100 días para hacerlas más históricas
-- ============================================================================

-- 1. VERIFICAR REGISTROS ANTES DEL CAMBIO
-- ============================================================================
SELECT 
    '🔍 REGISTROS A MODIFICAR (ANTES)' as categoria,
    COUNT(*) as total_registros,
    MIN(fecha_solicitud) as fecha_solicitud_minima,
    MAX(fecha_solicitud) as fecha_solicitud_maxima,
    MIN(fecha_cuenta_cobro) as fecha_cobro_minima,
    MAX(fecha_cuenta_cobro) as fecha_cobro_maxima
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND fecha_solicitud >= CURRENT_DATE;

-- Mostrar algunos ejemplos específicos
SELECT 
    '📋 EJEMPLOS ESPECÍFICOS (ANTES)' as categoria,
    numero_solicitud,
    fecha_solicitud,
    fecha_cuenta_cobro,
    concepto,
    proveedor
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND fecha_solicitud >= CURRENT_DATE
ORDER BY fecha_solicitud
LIMIT 10;

-- ============================================================================
-- 2. ACTUALIZAR FECHAS - RESTAR 100 DÍAS
-- ============================================================================

UPDATE public.ordenes_pago 
SET 
    fecha_solicitud = fecha_solicitud - INTERVAL '100 days',
    fecha_cuenta_cobro = fecha_cuenta_cobro - INTERVAL '100 days',
    updated_at = NOW()
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND fecha_solicitud >= CURRENT_DATE;

-- ============================================================================
-- 3. VERIFICAR CAMBIOS REALIZADOS
-- ============================================================================

-- Contar registros modificados
SELECT 
    '✅ RESUMEN DE CAMBIOS' as categoria,
    COUNT(*) as registros_modificados,
    'Fechas ajustadas: -100 días' as ajuste_aplicado,
    NOW() as fecha_actualizacion
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND updated_at >= NOW() - INTERVAL '1 minute';

-- Verificar el nuevo rango de fechas de servicios públicos
SELECT 
    '📅 NUEVO RANGO DE FECHAS' as categoria,
    COUNT(*) as total_servicios_publicos,
    MIN(fecha_solicitud)::date as fecha_solicitud_minima,
    MAX(fecha_solicitud)::date as fecha_solicitud_maxima,
    MIN(fecha_cuenta_cobro)::date as fecha_cobro_minima,
    MAX(fecha_cuenta_cobro)::date as fecha_cobro_maxima
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos';

-- Mostrar algunos ejemplos después del cambio
SELECT 
    '📋 EJEMPLOS DESPUÉS DEL CAMBIO' as categoria,
    numero_solicitud,
    fecha_solicitud::date as fecha_solicitud,
    fecha_cuenta_cobro::date as fecha_cuenta_cobro,
    concepto,
    LEFT(proveedor, 30) || '...' as proveedor_resumido
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND updated_at >= NOW() - INTERVAL '1 minute'
ORDER BY fecha_solicitud DESC
LIMIT 10;

-- ============================================================================
-- 4. VERIFICAR DISTRIBUCIÓN POR MESES DESPUÉS DEL AJUSTE
-- ============================================================================

SELECT 
    '📆 DISTRIBUCIÓN POR MES (DESPUÉS DEL AJUSTE)' as categoria,
    to_char(fecha_solicitud, 'YYYY-MM') as año_mes,
    COUNT(*) as cantidad_solicitudes,
    MIN(fecha_solicitud)::date as primera_fecha,
    MAX(fecha_solicitud)::date as ultima_fecha
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY to_char(fecha_solicitud, 'YYYY-MM')
ORDER BY año_mes DESC;

-- ============================================================================
-- 5. VERIFICAR QUE NO QUEDEN FECHAS FUTURAS
-- ============================================================================

SELECT 
    '🔍 VERIFICACIÓN FINAL' as categoria,
    COUNT(*) as solicitudes_futuras,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ No hay fechas futuras'
        ELSE '⚠️ Aún hay ' || COUNT(*) || ' fechas futuras'
    END as estado
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND fecha_solicitud > CURRENT_DATE;

-- ============================================================================
-- 6. MENSAJE DE FINALIZACIÓN
-- ============================================================================

SELECT 
    '🎉 AJUSTE COMPLETADO' as estado,
    'Fechas de servicios públicos ajustadas correctamente (-100 días)' as mensaje,
    'Solo se modificaron registros con fechas >= hoy' as criterio_aplicado,
    NOW() as fecha_completacion;
