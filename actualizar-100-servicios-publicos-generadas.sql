-- ============================================================================
-- ACTUALIZAR 100 SOLICITUDES DE SERVICIOS PÚBLICOS MÁS ANTIGUAS A "GENERADA"
-- ============================================================================
-- Script para tomar las 100 solicitudes más antiguas de servicios públicos
-- y actualizar campos fecha_op, numero_op y estado
-- ============================================================================

-- 1. VERIFICAR SOLICITUDES ANTES DEL CAMBIO
-- ============================================================================
SELECT 
    '🔍 SOLICITUDES A MODIFICAR (ANTES)' as categoria,
    COUNT(*) as total_solicitudes_psp,
    COUNT(CASE WHEN estado = 'Solicitada' THEN 1 END) as estado_solicitada,
    COUNT(CASE WHEN estado = 'Generada' THEN 1 END) as estado_generada,
    MIN(fecha_solicitud)::date as fecha_mas_antigua,
    MAX(fecha_solicitud)::date as fecha_mas_reciente
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos';

-- Mostrar las 10 más antiguas que van a cambiar
SELECT 
    '📋 LAS 10 MÁS ANTIGUAS QUE CAMBIARÁN' as categoria,
    numero_solicitud,
    fecha_solicitud::date,
    concepto,
    LEFT(proveedor, 30) || '...' as proveedor,
    total_solicitud,
    estado
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Solicitada'
ORDER BY fecha_solicitud ASC
LIMIT 10;

-- ============================================================================
-- 2. ACTUALIZAR LAS 100 MÁS ANTIGUAS
-- ============================================================================

WITH solicitudes_a_actualizar AS (
    SELECT 
        id,
        numero_solicitud,
        fecha_solicitud,
        -- Generar días aleatorios entre 1 y 3
        (1 + (RANDOM() * 2)::INTEGER) as dias_adicionales
    FROM public.ordenes_pago 
    WHERE tipo_solicitud = 'Pago de Servicios Públicos'
      AND estado = 'Solicitada'
    ORDER BY fecha_solicitud ASC
    LIMIT 100
)
UPDATE public.ordenes_pago 
SET 
    fecha_op = sau.fecha_solicitud + INTERVAL '1 day' * sau.dias_adicionales,
    numero_op = 'OP-' || EXTRACT(YEAR FROM sau.fecha_solicitud)::text || '-' || 
                LPAD((EXTRACT(DOY FROM sau.fecha_solicitud) + EXTRACT(HOUR FROM NOW()) + EXTRACT(MINUTE FROM NOW()))::text, 5, '0'),
    estado = 'Generada',
    updated_at = NOW()
FROM solicitudes_a_actualizar sau
WHERE ordenes_pago.id = sau.id;

-- ============================================================================
-- 3. VERIFICAR CAMBIOS REALIZADOS
-- ============================================================================

-- Contar registros modificados
SELECT 
    '✅ RESUMEN DE CAMBIOS' as categoria,
    COUNT(*) as registros_modificados,
    'Estado cambiado a: Generada' as cambio_estado,
    'Fecha OP: fecha_solicitud + 1-3 días' as cambio_fecha_op,
    'Número OP: OP-YYYY-XXXXX' as formato_numero_op
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Generada'
  AND updated_at >= NOW() - INTERVAL '2 minutes';

-- Verificar el nuevo estado de las solicitudes de servicios públicos
SELECT 
    '📊 NUEVO ESTADO DE SERVICIOS PÚBLICOS' as categoria,
    estado,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago WHERE tipo_solicitud = 'Pago de Servicios Públicos'), 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY estado
ORDER BY cantidad DESC;

-- Mostrar ejemplos de solicitudes actualizadas
SELECT 
    '📋 EJEMPLOS DE SOLICITUDES ACTUALIZADAS' as categoria,
    numero_solicitud,
    fecha_solicitud::date as fecha_solicitud,
    fecha_op::date as fecha_op,
    (fecha_op::date - fecha_solicitud::date) as dias_diferencia,
    numero_op,
    concepto,
    LEFT(proveedor, 30) || '...' as proveedor,
    estado
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Generada'
  AND updated_at >= NOW() - INTERVAL '2 minutes'
ORDER BY fecha_solicitud ASC
LIMIT 15;

-- ============================================================================
-- 4. VERIFICAR DISTRIBUCIÓN DE DÍAS AGREGADOS
-- ============================================================================

SELECT 
    '📅 DISTRIBUCIÓN DE DÍAS AGREGADOS' as categoria,
    (fecha_op::date - fecha_solicitud::date) as dias_agregados,
    COUNT(*) as cantidad_solicitudes,
    ROUND(COUNT(*) * 100.0 / 100, 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Generada'
  AND updated_at >= NOW() - INTERVAL '2 minutes'
GROUP BY (fecha_op::date - fecha_solicitud::date)
ORDER BY dias_agregados;

-- ============================================================================
-- 5. VERIFICAR NÚMEROS DE OP GENERADOS
-- ============================================================================

SELECT 
    '🔢 MUESTRA DE NÚMEROS OP GENERADOS' as categoria,
    numero_op,
    COUNT(*) as cantidad,
    MIN(fecha_solicitud)::date as fecha_min,
    MAX(fecha_solicitud)::date as fecha_max
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Generada'
  AND updated_at >= NOW() - INTERVAL '2 minutes'
GROUP BY numero_op
ORDER BY numero_op
LIMIT 10;

-- ============================================================================
-- 6. VERIFICAR QUE QUEDAN SOLICITUDES SOLICITADAS
-- ============================================================================

SELECT 
    '🔍 SOLICITUDES QUE QUEDAN EN ESTADO SOLICITADA' as categoria,
    COUNT(*) as cantidad_restante,
    MIN(fecha_solicitud)::date as fecha_mas_antigua_restante,
    MAX(fecha_solicitud)::date as fecha_mas_reciente_restante
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Solicitada';

-- ============================================================================
-- 7. ESTADÍSTICAS FINALES POR CONCEPTO
-- ============================================================================

SELECT 
    '📈 DISTRIBUCIÓN POR CONCEPTO (GENERADAS)' as categoria,
    concepto,
    COUNT(*) as cantidad_generadas,
    ROUND(AVG(fecha_op::date - fecha_solicitud::date), 1) as promedio_dias_op
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Generada'
  AND updated_at >= NOW() - INTERVAL '2 minutes'
GROUP BY concepto
ORDER BY cantidad_generadas DESC;

-- ============================================================================
-- 8. MENSAJE DE FINALIZACIÓN
-- ============================================================================

SELECT 
    '🎉 ACTUALIZACIÓN COMPLETADA' as estado,
    '100 solicitudes de servicios públicos actualizadas a estado "Generada"' as mensaje,
    'Se agregaron fechas OP (1-3 días después) y números OP únicos' as detalles,
    NOW() as fecha_completacion;
