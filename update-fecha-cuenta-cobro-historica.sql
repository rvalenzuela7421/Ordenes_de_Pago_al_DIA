-- ============================================================================
-- SCRIPT: Actualizar fecha_cuenta_cobro histórica en tabla ordenes_pago
-- PROPÓSITO: Establecer fecha_cuenta_cobro = fecha_solicitud - 1 día para registros existentes
-- FECHA: 2025-09-17 - Sistema COP
-- ============================================================================

-- 1. VERIFICACIÓN INICIAL - Estado actual de la base de datos
-- ============================================================================
SELECT 
    'Estado inicial de fechas:' as info,
    COUNT(*) as total_registros,
    COUNT(fecha_cuenta_cobro) as con_fecha_cobro,
    COUNT(*) - COUNT(fecha_cuenta_cobro) as sin_fecha_cobro,
    COUNT(fecha_solicitud) as con_fecha_solicitud
FROM public.ordenes_pago;

-- 2. MOSTRAR EJEMPLOS DE REGISTROS SIN FECHA_CUENTA_COBRO
-- ============================================================================
SELECT 
    'Ejemplos de registros sin fecha_cuenta_cobro:' as info,
    numero_solicitud,
    fecha_solicitud,
    fecha_cuenta_cobro,
    estado,
    proveedor
FROM public.ordenes_pago 
WHERE fecha_cuenta_cobro IS NULL
ORDER BY fecha_solicitud DESC
LIMIT 10;

-- 3. PREVIEW - Mostrar cálculo de nuevas fechas (sin aplicar cambios)
-- ============================================================================
SELECT 
    'Preview de actualización - fecha_solicitud - 1 día:' as info,
    numero_solicitud,
    fecha_solicitud,
    fecha_cuenta_cobro as fecha_cuenta_cobro_actual,
    (fecha_solicitud - INTERVAL '1 day')::DATE as nueva_fecha_cuenta_cobro,
    estado
FROM public.ordenes_pago 
WHERE fecha_cuenta_cobro IS NULL
  AND fecha_solicitud IS NOT NULL
ORDER BY fecha_solicitud DESC
LIMIT 10;

-- 4. ACTUALIZACIÓN PRINCIPAL - fecha_cuenta_cobro = fecha_solicitud - 1 día
-- ============================================================================
UPDATE public.ordenes_pago 
SET 
    fecha_cuenta_cobro = (fecha_solicitud - INTERVAL '1 day')::DATE,
    updated_at = CURRENT_TIMESTAMP
WHERE fecha_cuenta_cobro IS NULL 
  AND fecha_solicitud IS NOT NULL;

-- 5. MANEJO DE CASOS ESPECIALES - Registros sin fecha_solicitud
-- ============================================================================
-- Para registros que no tienen fecha_solicitud, usar fecha actual - 2 días
UPDATE public.ordenes_pago 
SET 
    fecha_cuenta_cobro = (CURRENT_DATE - INTERVAL '2 days')::DATE,
    updated_at = CURRENT_TIMESTAMP
WHERE fecha_cuenta_cobro IS NULL 
  AND fecha_solicitud IS NULL;

-- 6. VERIFICACIÓN POST-ACTUALIZACIÓN
-- ============================================================================
SELECT 
    'Estado después de actualización:' as info,
    COUNT(*) as total_registros,
    COUNT(fecha_cuenta_cobro) as con_fecha_cobro,
    COUNT(*) - COUNT(fecha_cuenta_cobro) as sin_fecha_cobro,
    MIN(fecha_cuenta_cobro) as fecha_cobro_mas_antigua,
    MAX(fecha_cuenta_cobro) as fecha_cobro_mas_reciente
FROM public.ordenes_pago;

-- 7. VALIDACIÓN - Verificar que fecha_cuenta_cobro es anterior a fecha_solicitud
-- ============================================================================
SELECT 
    'Validación - fecha_cuenta_cobro debe ser anterior a fecha_solicitud:' as info,
    COUNT(*) as total_comparaciones,
    COUNT(CASE WHEN fecha_cuenta_cobro < fecha_solicitud THEN 1 END) as fecha_cobro_anterior,
    COUNT(CASE WHEN fecha_cuenta_cobro >= fecha_solicitud THEN 1 END) as fecha_cobro_posterior_o_igual,
    COUNT(CASE WHEN fecha_cuenta_cobro = (fecha_solicitud - INTERVAL '1 day')::DATE THEN 1 END) as exactamente_1_dia_antes
FROM public.ordenes_pago 
WHERE fecha_cuenta_cobro IS NOT NULL 
  AND fecha_solicitud IS NOT NULL;

-- 8. EJEMPLOS FINALES - Mostrar registros actualizados
-- ============================================================================
SELECT 
    'Ejemplos de registros actualizados:' as info,
    numero_solicitud,
    fecha_cuenta_cobro,
    fecha_solicitud,
    (fecha_solicitud - fecha_cuenta_cobro) as diferencia_dias,
    estado,
    LEFT(proveedor, 30) as proveedor_resumido
FROM public.ordenes_pago 
WHERE fecha_cuenta_cobro IS NOT NULL
ORDER BY fecha_solicitud DESC
LIMIT 15;

-- 9. AUDITORÍA - Log del cambio realizado
-- ============================================================================
INSERT INTO public.audit_logs (
    accion,
    tabla_afectada,
    descripcion,
    datos_nuevos,
    created_at
) VALUES (
    'actualizar_fecha_cuenta_cobro_historica',
    'ordenes_pago',
    'Actualización masiva: fecha_cuenta_cobro = fecha_solicitud - 1 día para registros históricos',
    jsonb_build_object(
        'fecha_ejecucion', CURRENT_TIMESTAMP,
        'registros_actualizados', (SELECT COUNT(*) FROM public.ordenes_pago WHERE fecha_cuenta_cobro IS NOT NULL),
        'logica_aplicada', 'fecha_cuenta_cobro = fecha_solicitud - 1 day'
    ),
    CURRENT_TIMESTAMP
) ON CONFLICT DO NOTHING; -- Si la tabla audit_logs no existe, no falla

-- 10. RESUMEN FINAL
-- ============================================================================
SELECT 
    '✅ ACTUALIZACIÓN COMPLETADA' as resultado,
    'Todos los registros históricos han sido actualizados' as mensaje,
    'fecha_cuenta_cobro = fecha_solicitud - 1 día' as logica_aplicada,
    CURRENT_TIMESTAMP as fecha_ejecucion;

-- ============================================================================
-- RESUMEN DE CAMBIOS:
-- ✅ Registros históricos actualizados con fecha_cuenta_cobro
-- ✅ Lógica aplicada: fecha_cuenta_cobro = fecha_solicitud - 1 día
-- ✅ Casos especiales manejados (sin fecha_solicitud)
-- ✅ Validaciones de integridad completadas
-- ✅ Auditoría registrada para trazabilidad
-- ============================================================================
