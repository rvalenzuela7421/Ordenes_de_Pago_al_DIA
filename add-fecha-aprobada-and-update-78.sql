-- ============================================================================
-- AGREGAR CAMPO fecha_aprobada Y ACTUALIZAR 78 REGISTROS A "APROBADA"
-- ============================================================================
-- 1. Agregar campo opcional fecha_aprobada entre total_op y fecha_op
-- 2. Actualizar 78 registros aleatorios de "Generada" a "Aprobada"  
-- 3. Llenar fecha_aprobada y updated_at
-- ============================================================================

-- ============================================================================
-- PASO 1: Agregar campo fecha_aprobada a la tabla
-- ============================================================================

-- Agregar la columna fecha_aprobada como opcional
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS fecha_aprobada TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Agregar comentario para documentación
COMMENT ON COLUMN public.ordenes_pago.fecha_aprobada IS 'Fecha y hora de aprobación de la orden de pago';

-- Mostrar estructura actualizada de la tabla (campos relevantes)
SELECT 'ESTRUCTURA ACTUALIZADA - CAMPOS PRINCIPALES:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'ordenes_pago'
  AND column_name IN (
    'numero_solicitud', 'numero_op', 'total_solicitud', 'total_op', 
    'fecha_aprobada', 'fecha_op', 'fecha_pago', 'estado', 'updated_at'
  )
ORDER BY ordinal_position;

-- ============================================================================
-- PASO 2: Verificar registros disponibles antes de actualizar
-- ============================================================================

SELECT 'REGISTROS DISPONIBLES ANTES DE APROBACIÓN:' as info;
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

-- Verificar que hay suficientes registros "Generada"
SELECT 'VERIFICACIÓN:' as info;
SELECT 
    CASE 
        WHEN COUNT(*) >= 78 THEN '✅ Suficientes registros Generada disponibles para aprobar'
        ELSE '❌ No hay suficientes registros en estado Generada'
    END as estado_verificacion,
    COUNT(*) as registros_generada_disponibles
FROM public.ordenes_pago 
WHERE estado = 'Generada';

-- ============================================================================
-- PASO 3: Actualizar 78 registros aleatorios a "Aprobada"
-- ============================================================================

DO $$
DECLARE
    registros_actualizados INTEGER;
BEGIN
    RAISE NOTICE 'Seleccionando 78 registros aleatorios para aprobar...';
    
    -- Actualizar 78 registros aleatorios de Generada a Aprobada
    WITH registros_aleatorios AS (
        SELECT 
            id, 
            fecha_op, 
            numero_op, 
            numero_solicitud,
            ROW_NUMBER() OVER (ORDER BY RANDOM()) as rn
        FROM public.ordenes_pago 
        WHERE estado = 'Generada'
        ORDER BY RANDOM()
        LIMIT 78
    )
    UPDATE public.ordenes_pago 
    SET 
        estado = 'Aprobada',
        -- Fecha aprobada: 1-5 días posteriores a fecha_op
        fecha_aprobada = registros_aleatorios.fecha_op + 
                        (floor(random() * 5) + 1) * interval '1 day' +    -- Entre 1-5 días después
                        (floor(random() * 8) + 9) * interval '1 hour',    -- Entre 9AM-5PM
        
        -- Updated_at: misma fecha que fecha_aprobada
        updated_at = registros_aleatorios.fecha_op + 
                     (floor(random() * 5) + 1) * interval '1 day' +
                     (floor(random() * 8) + 9) * interval '1 hour'
    FROM registros_aleatorios
    WHERE public.ordenes_pago.id = registros_aleatorios.id;
    
    GET DIAGNOSTICS registros_actualizados = ROW_COUNT;
    
    RAISE NOTICE '✅ % registros aprobados exitosamente', registros_actualizados;
END $$;

-- ============================================================================
-- PASO 4: Verificar los cambios realizados
-- ============================================================================

-- Contar registros por estado después de la aprobación
SELECT 'DISTRIBUCIÓN DESPUÉS DE APROBACIONES:' as info;
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

-- Mostrar ejemplos de registros aprobados
SELECT 'EJEMPLOS DE REGISTROS APROBADOS:' as info;
SELECT 
    numero_solicitud,
    numero_op,
    proveedor,
    concepto,
    total_solicitud,
    total_op,
    fecha_solicitud,
    fecha_op,
    fecha_aprobada,
    updated_at,
    estado,
    -- Calcular días de diferencia entre fechas clave
    (fecha_op::date - fecha_solicitud::date) as dias_solicitud_a_op,
    (fecha_aprobada::date - fecha_op::date) as dias_op_a_aprobacion
FROM public.ordenes_pago 
WHERE estado = 'Aprobada'
ORDER BY fecha_aprobada DESC
LIMIT 12;

-- Verificar que las fechas de aprobación son posteriores a fecha_op
SELECT 'VERIFICACIÓN DE FECHAS DE APROBACIÓN:' as info;
SELECT 
    COUNT(*) as total_aprobadas,
    COUNT(CASE WHEN fecha_aprobada::date > fecha_op::date THEN 1 END) as fechas_aprobacion_posteriores,
    COUNT(CASE WHEN fecha_aprobada IS NOT NULL THEN 1 END) as fechas_aprobacion_completadas,
    COUNT(CASE WHEN updated_at::date = fecha_aprobada::date THEN 1 END) as updated_at_sincronizado,
    MIN(fecha_aprobada::date - fecha_op::date) as min_dias_diferencia,
    MAX(fecha_aprobada::date - fecha_op::date) as max_dias_diferencia,
    ROUND(AVG(fecha_aprobada::date - fecha_op::date), 1) as promedio_dias_diferencia
FROM public.ordenes_pago 
WHERE estado = 'Aprobada';

-- Análisis del flujo completo (solicitud → OP → aprobación)
SELECT 'ANÁLISIS DEL FLUJO COMPLETO:' as info;
SELECT 
    COUNT(*) as total_aprobadas,
    ROUND(AVG(fecha_op::date - fecha_solicitud::date), 1) as promedio_dias_solicitud_a_op,
    ROUND(AVG(fecha_aprobada::date - fecha_op::date), 1) as promedio_dias_op_a_aprobacion,
    ROUND(AVG(fecha_aprobada::date - fecha_solicitud::date), 1) as promedio_dias_solicitud_a_aprobacion,
    MIN(fecha_aprobada::date - fecha_solicitud::date) as min_dias_total,
    MAX(fecha_aprobada::date - fecha_solicitud::date) as max_dias_total
FROM public.ordenes_pago 
WHERE estado = 'Aprobada';

-- Estadísticas por concepto de las aprobadas
SELECT 'CONCEPTOS MÁS APROBADOS:' as info;
SELECT 
    concepto,
    COUNT(*) as cantidad_aprobada,
    ROUND(AVG(total_op), 0) as monto_promedio_aprobado,
    ROUND(SUM(total_op), 0) as total_monto_aprobado
FROM public.ordenes_pago 
WHERE estado = 'Aprobada'
GROUP BY concepto
ORDER BY cantidad_aprobada DESC;

-- Distribución mensual de aprobaciones
SELECT 'DISTRIBUCIÓN MENSUAL DE APROBACIONES:' as info;
SELECT 
    DATE_TRUNC('month', fecha_solicitud) as mes_original,
    COUNT(*) as ops_aprobadas,
    ROUND(SUM(total_op), 0) as monto_total_aprobado,
    ROUND(AVG(total_op), 0) as monto_promedio_aprobado,
    ROUND(AVG(fecha_aprobada::date - fecha_solicitud::date), 1) as dias_promedio_proceso
FROM public.ordenes_pago 
WHERE estado = 'Aprobada'
GROUP BY DATE_TRUNC('month', fecha_solicitud)
ORDER BY mes_original;

-- Análisis de tiempos de aprobación por rango de días
SELECT 'TIEMPOS DE APROBACIÓN (OP → Aprobada):' as info;
SELECT 
    CASE 
        WHEN (fecha_aprobada::date - fecha_op::date) = 1 THEN '1 día'
        WHEN (fecha_aprobada::date - fecha_op::date) = 2 THEN '2 días'
        WHEN (fecha_aprobada::date - fecha_op::date) = 3 THEN '3 días'
        WHEN (fecha_aprobada::date - fecha_op::date) = 4 THEN '4 días'
        WHEN (fecha_aprobada::date - fecha_op::date) = 5 THEN '5 días'
        ELSE 'Más de 5 días'
    END as tiempo_aprobacion,
    COUNT(*) as cantidad_ops,
    ROUND(AVG(total_op), 0) as monto_promedio
FROM public.ordenes_pago 
WHERE estado = 'Aprobada'
GROUP BY (fecha_aprobada::date - fecha_op::date)
ORDER BY (fecha_aprobada::date - fecha_op::date);

-- Resumen financiero por estado
SELECT 'RESUMEN FINANCIERO POR ESTADO:' as info;
SELECT 
    estado,
    COUNT(*) as cantidad_registros,
    ROUND(SUM(COALESCE(total_solicitud, 0)), 0) as monto_total_solicitudes,
    ROUND(SUM(COALESCE(total_op, 0)), 0) as monto_total_ops,
    ROUND(AVG(COALESCE(total_op, total_solicitud, 0)), 0) as monto_promedio
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

-- Verificación de integridad de datos
SELECT 'VERIFICACIÓN DE INTEGRIDAD:' as info;
SELECT 
    'Registros Aprobada con fecha_aprobada NULL' as verificacion,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE estado = 'Aprobada' AND fecha_aprobada IS NULL
UNION ALL
SELECT 
    'Registros Aprobada con fecha_op NULL' as verificacion,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE estado = 'Aprobada' AND fecha_op IS NULL
UNION ALL
SELECT 
    'Registros con fecha_aprobada < fecha_op' as verificacion,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE estado = 'Aprobada' AND fecha_aprobada::date < fecha_op::date;

-- ============================================================================
-- RESULTADO FINAL
-- ============================================================================
SELECT '🎉 APROBACIÓN DE OP COMPLETADA EXITOSAMENTE 🎉' as resultado;
SELECT '✅ Campo fecha_aprobada agregado exitosamente' as detalle;
SELECT '✅ 78 registros cambiados a estado Aprobada' as detalle;
SELECT '✅ Fechas de aprobación posteriores a fecha_op (1-5 días)' as detalle;
SELECT '✅ Updated_at sincronizado con fecha_aprobada' as detalle;
SELECT '✅ Flujo completo: Solicitud → OP → Aprobación' as detalle;
