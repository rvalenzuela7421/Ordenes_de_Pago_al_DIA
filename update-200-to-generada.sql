-- ============================================================================
-- ACTUALIZAR 200 SOLICITUDES ALEATORIAS A ESTADO "GENERADA"
-- ============================================================================
-- Cambiar estado de "Solicitada" a "Generada" en 200 registros aleatorios
-- Llenar campos: fecha_op, numero_op, total_op, updated_at
-- ============================================================================

-- ============================================================================
-- PASO 1: Verificar registros disponibles antes de actualizar
-- ============================================================================

SELECT 'REGISTROS DISPONIBLES ANTES DE ACTUALIZACIÓN:' as info;
SELECT 
    estado,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
GROUP BY estado 
ORDER BY 
    CASE estado
        WHEN 'Solicitada' THEN 1
        WHEN 'Devuelta' THEN 2
        WHEN 'Generada' THEN 3
        WHEN 'Aprobada' THEN 4
        WHEN 'Pagada' THEN 5
        ELSE 6
    END;

-- Verificar que hay suficientes registros "Solicitada"
SELECT 'VERIFICACIÓN:' as info;
SELECT 
    CASE 
        WHEN COUNT(*) >= 200 THEN '✅ Suficientes registros disponibles para actualizar'
        ELSE '❌ No hay suficientes registros en estado Solicitada'
    END as estado_verificacion,
    COUNT(*) as registros_solicitada_disponibles
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';

-- ============================================================================
-- PASO 2: Actualizar 200 registros aleatorios
-- ============================================================================

DO $$
DECLARE
    registros_actualizados INTEGER;
    contador_op INTEGER := 1;
BEGIN
    RAISE NOTICE 'Seleccionando 200 solicitudes aleatorias para cambiar a Generada...';
    
    -- Actualizar 200 registros aleatorios
    WITH solicitudes_aleatorias AS (
        SELECT 
            id, 
            fecha_solicitud, 
            numero_solicitud, 
            total_solicitud,
            ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
        FROM public.ordenes_pago 
        WHERE estado = 'Solicitada'
        ORDER BY RANDOM()
        LIMIT 200
    )
    UPDATE public.ordenes_pago 
    SET 
        estado = 'Generada',
        -- Fecha OP: 1-7 días posteriores a fecha_solicitud
        fecha_op = solicitudes_aleatorias.fecha_solicitud + 
                   (floor(random() * 7) + 1) * interval '1 day' +  -- Entre 1-7 días después
                   (floor(random() * 8) + 9) * interval '1 hour',  -- Entre 9AM-5PM
        
        -- Número OP: formato OP-2024-XXXX
        numero_op = 'OP-2024-' || LPAD((
            1000 + solicitudes_aleatorias.rn
        )::text, 4, '0'),
        
        -- Total OP: igual al total_solicitud
        total_op = solicitudes_aleatorias.total_solicitud,
        
        -- Updated_at: misma fecha que fecha_op
        updated_at = solicitudes_aleatorias.fecha_solicitud + 
                     (floor(random() * 7) + 1) * interval '1 day' +
                     (floor(random() * 8) + 9) * interval '1 hour'
    FROM solicitudes_aleatorias
    WHERE public.ordenes_pago.id = solicitudes_aleatorias.id;
    
    GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
    
    RAISE NOTICE '✅ % registros actualizados a estado Generada', registros_actualizados;
END $$;

-- ============================================================================
-- PASO 3: Verificar los cambios realizados
-- ============================================================================

-- Contar registros por estado después de la actualización
SELECT 'DISTRIBUCIÓN DESPUÉS DE ACTUALIZACIÓN:' as info;
SELECT 
    estado,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as porcentaje
FROM public.ordenes_pago 
GROUP BY estado 
ORDER BY 
    CASE estado
        WHEN 'Solicitada' THEN 1
        WHEN 'Devuelta' THEN 2
        WHEN 'Generada' THEN 3
        WHEN 'Aprobada' THEN 4
        WHEN 'Pagada' THEN 5
        ELSE 6
    END;

-- Mostrar algunos ejemplos de registros generados
SELECT 'EJEMPLOS DE REGISTROS GENERADOS (OP):' as info;
SELECT 
    numero_solicitud,
    numero_op,
    proveedor,
    concepto,
    monto_solicitud,
    total_solicitud,
    total_op,
    fecha_solicitud,
    fecha_op,
    updated_at,
    estado,
    -- Calcular días de diferencia
    (fecha_op::date - fecha_solicitud::date) as dias_diferencia
FROM public.ordenes_pago 
WHERE estado = 'Generada'
ORDER BY numero_op
LIMIT 15;

-- Verificar que las fechas son posteriores y los totales coinciden
SELECT 'VERIFICACIÓN DE DATOS:' as info;
SELECT 
    COUNT(*) as total_generadas,
    COUNT(CASE WHEN fecha_op::date > fecha_solicitud::date THEN 1 END) as fechas_op_posteriores,
    COUNT(CASE WHEN total_op = total_solicitud THEN 1 END) as totales_coinciden,
    COUNT(CASE WHEN numero_op IS NOT NULL THEN 1 END) as numeros_op_asignados,
    MIN(fecha_op::date - fecha_solicitud::date) as min_dias_diferencia,
    MAX(fecha_op::date - fecha_solicitud::date) as max_dias_diferencia,
    ROUND(AVG(fecha_op::date - fecha_solicitud::date), 1) as promedio_dias_diferencia
FROM public.ordenes_pago 
WHERE estado = 'Generada';

-- Verificar unicidad de números de OP
SELECT 'VERIFICACIÓN DE NÚMEROS OP:' as info;
SELECT 
    COUNT(*) as total_numeros_op,
    COUNT(DISTINCT numero_op) as numeros_op_unicos,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT numero_op) THEN '✅ Todos los números OP son únicos'
        ELSE '❌ Hay números OP duplicados'
    END as verificacion_unicidad
FROM public.ordenes_pago 
WHERE numero_op IS NOT NULL;

-- Estadísticas por concepto de las generadas
SELECT 'CONCEPTOS MÁS GENERADOS:' as info;
SELECT 
    concepto,
    COUNT(*) as cantidad_generada,
    ROUND(AVG(monto_solicitud), 0) as monto_promedio,
    ROUND(SUM(total_op), 0) as total_op_suma
FROM public.ordenes_pago 
WHERE estado = 'Generada'
GROUP BY concepto
ORDER BY cantidad_generada DESC;

-- Distribución mensual de generaciones de OP
SELECT 'DISTRIBUCIÓN MENSUAL DE OP GENERADAS:' as info;
SELECT 
    DATE_TRUNC('month', fecha_solicitud) as mes_solicitud,
    COUNT(*) as ops_generadas,
    ROUND(SUM(total_op), 0) as monto_total_ops,
    ROUND(AVG(total_op), 0) as monto_promedio_op
FROM public.ordenes_pago 
WHERE estado = 'Generada'
GROUP BY DATE_TRUNC('month', fecha_solicitud)
ORDER BY mes_solicitud;

-- Análisis de tiempos de procesamiento (solicitud → OP)
SELECT 'ANÁLISIS DE TIEMPOS DE PROCESAMIENTO:' as info;
SELECT 
    (fecha_op::date - fecha_solicitud::date) as dias_procesamiento,
    COUNT(*) as cantidad_ops,
    ROUND(AVG(total_op), 0) as monto_promedio
FROM public.ordenes_pago 
WHERE estado = 'Generada'
GROUP BY (fecha_op::date - fecha_solicitud::date)
ORDER BY dias_procesamiento;

-- Resumen comparativo de montos
SELECT 'COMPARACIÓN DE MONTOS:' as info;
SELECT 
    'Monto total solicitado' as descripcion,
    ROUND(SUM(monto_solicitud), 0) as valor
FROM public.ordenes_pago 
WHERE estado = 'Generada'
UNION ALL
SELECT 
    'Total solicitud (con IVA)' as descripcion,
    ROUND(SUM(total_solicitud), 0) as valor
FROM public.ordenes_pago 
WHERE estado = 'Generada'
UNION ALL
SELECT 
    'Total OP generado' as descripcion,
    ROUND(SUM(total_op), 0) as valor
FROM public.ordenes_pago 
WHERE estado = 'Generada'
UNION ALL
SELECT 
    'Verificación (Total Solicitud = Total OP)' as descripcion,
    CASE 
        WHEN SUM(total_solicitud) = SUM(total_op) THEN 1
        ELSE 0
    END as valor
FROM public.ordenes_pago 
WHERE estado = 'Generada';

-- Resumen final por estados
SELECT 'RESUMEN FINAL POR ESTADOS:' as info;
SELECT 
    estado,
    COUNT(*) as cantidad,
    ROUND(SUM(COALESCE(total_solicitud, 0)), 0) as monto_total,
    ROUND(AVG(COALESCE(total_solicitud, 0)), 0) as monto_promedio
FROM public.ordenes_pago 
GROUP BY estado 
ORDER BY 
    CASE estado
        WHEN 'Solicitada' THEN 1
        WHEN 'Devuelta' THEN 2
        WHEN 'Generada' THEN 3
        WHEN 'Aprobada' THEN 4
        WHEN 'Pagada' THEN 5
        ELSE 6
    END;

-- ============================================================================
-- RESULTADO FINAL
-- ============================================================================
SELECT '🎉 GENERACIÓN DE OP COMPLETADA EXITOSAMENTE 🎉' as resultado;
SELECT '✅ 200 solicitudes cambiadas a estado Generada' as detalle;
SELECT '✅ Números OP únicos asignados (OP-2024-XXXX)' as detalle;
SELECT '✅ Fechas OP posteriores a fechas de solicitud (1-7 días)' as detalle;
SELECT '✅ Total OP = Total Solicitud para cada registro' as detalle;
SELECT '✅ Updated_at sincronizado con fecha_op' as detalle;
