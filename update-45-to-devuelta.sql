-- ============================================================================
-- ACTUALIZAR 45 SOLICITUDES ALEATORIAS A ESTADO "DEVUELTA"
-- ============================================================================
-- Cambiar estado de "Solicitada" a "Devuelta" en 45 registros aleatorios
-- Actualizar updated_at con fechas posteriores pero cercanas a fecha_solicitud
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
ORDER BY cantidad DESC;

-- ============================================================================
-- PASO 2: Actualizar 45 registros aleatorios
-- ============================================================================

DO $$
DECLARE
    registros_actualizados INTEGER;
BEGIN
    RAISE NOTICE 'Seleccionando 45 solicitudes aleatorias para cambiar a Devuelta...';
    
    -- Actualizar 45 registros aleatorios
    WITH solicitudes_aleatorias AS (
        SELECT id, fecha_solicitud, numero_solicitud
        FROM public.ordenes_pago 
        WHERE estado = 'Solicitada'
        ORDER BY RANDOM()
        LIMIT 45
    )
    UPDATE public.ordenes_pago 
    SET 
        estado = 'Devuelta',
        updated_at = solicitudes_aleatorias.fecha_solicitud + 
                     (floor(random() * 5) + 1) * interval '1 day' +  -- Entre 1-5 días después
                     (floor(random() * 8) + 9) * interval '1 hour'   -- Entre 9AM-5PM
    FROM solicitudes_aleatorias
    WHERE public.ordenes_pago.id = solicitudes_aleatorias.id;
    
    GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
    
    RAISE NOTICE '✅ % registros actualizados a estado Devuelta', registros_actualizados;
END $$;

-- ============================================================================
-- PASO 3: Verificar los cambios realizados
-- ============================================================================

-- Contar registros por estado después de la actualización
SELECT 'DISTRIBUCIÓN DESPUÉS DE ACTUALIZACIÓN:' as info;
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

-- Mostrar algunos ejemplos de registros actualizados
SELECT 'EJEMPLOS DE REGISTROS DEVUELTOS:' as info;
SELECT 
    numero_solicitud,
    proveedor,
    concepto,
    monto_solicitud,
    fecha_solicitud,
    updated_at,
    estado,
    -- Calcular días de diferencia
    (updated_at::date - fecha_solicitud::date) as dias_diferencia
FROM public.ordenes_pago 
WHERE estado = 'Devuelta'
ORDER BY numero_solicitud
LIMIT 10;

-- Verificar que las fechas updated_at son posteriores a fecha_solicitud
SELECT 'VERIFICACIÓN DE FECHAS:' as info;
SELECT 
    COUNT(*) as total_devueltas,
    COUNT(CASE WHEN updated_at::date > fecha_solicitud::date THEN 1 END) as fechas_posteriores_correctas,
    MIN(updated_at::date - fecha_solicitud::date) as min_dias_diferencia,
    MAX(updated_at::date - fecha_solicitud::date) as max_dias_diferencia,
    ROUND(AVG(updated_at::date - fecha_solicitud::date), 1) as promedio_dias_diferencia
FROM public.ordenes_pago 
WHERE estado = 'Devuelta';

-- Estadísticas por concepto de las devueltas
SELECT 'CONCEPTOS MÁS DEVUELTOS:' as info;
SELECT 
    concepto,
    COUNT(*) as cantidad_devuelta,
    ROUND(AVG(monto_solicitud), 0) as monto_promedio
FROM public.ordenes_pago 
WHERE estado = 'Devuelta'
GROUP BY concepto
ORDER BY cantidad_devuelta DESC;

-- Distribución mensual de devoluciones
SELECT 'DISTRIBUCIÓN MENSUAL DE DEVOLUCIONES:' as info;
SELECT 
    DATE_TRUNC('month', fecha_solicitud) as mes,
    COUNT(*) as solicitudes_devueltas,
    SUM(monto_solicitud) as monto_total_devuelto
FROM public.ordenes_pago 
WHERE estado = 'Devuelta'
GROUP BY DATE_TRUNC('month', fecha_solicitud)
ORDER BY mes;

-- Resumen final
SELECT 'RESUMEN DE ACTUALIZACIÓN:' as info;
SELECT 
    'Total de registros procesados' as descripcion,
    (SELECT COUNT(*) FROM public.ordenes_pago WHERE estado IN ('Solicitada', 'Devuelta')) as cantidad
UNION ALL
SELECT 
    'Registros en estado Solicitada' as descripcion,
    (SELECT COUNT(*) FROM public.ordenes_pago WHERE estado = 'Solicitada') as cantidad
UNION ALL
SELECT 
    'Registros en estado Devuelta' as descripcion,
    (SELECT COUNT(*) FROM public.ordenes_pago WHERE estado = 'Devuelta') as cantidad
UNION ALL
SELECT 
    'Porcentaje de devoluciones' as descripcion,
    ROUND(
        (SELECT COUNT(*)::NUMERIC FROM public.ordenes_pago WHERE estado = 'Devuelta') * 100 / 
        NULLIF((SELECT COUNT(*) FROM public.ordenes_pago WHERE estado IN ('Solicitada', 'Devuelta')), 0),
        1
    ) as cantidad;

-- ============================================================================
-- RESULTADO FINAL
-- ============================================================================
SELECT '🎉 ACTUALIZACIÓN COMPLETADA EXITOSAMENTE 🎉' as resultado;
SELECT '✅ 45 solicitudes cambiadas a estado Devuelta' as detalle;
SELECT '✅ Fechas updated_at actualizadas correctamente (1-5 días después)' as detalle;
SELECT '✅ Distribución realista de devoluciones por concepto' as detalle;
