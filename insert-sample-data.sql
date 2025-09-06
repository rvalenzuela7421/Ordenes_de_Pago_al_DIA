-- ============================================================================
-- INSERTAR DATOS DE EJEMPLO EN ORDENES_PAGO
-- ============================================================================
-- 10 registros con estado "Solicitada" para pruebas
-- ============================================================================

-- ============================================================================
-- INSERTAR REGISTROS DE EJEMPLO
-- ============================================================================

INSERT INTO public.ordenes_pago (
    fecha_solicitud,
    numero_solicitud,
    proveedor,
    concepto,
    monto_solicitud,
    iva,
    total_solicitud,
    estado,
    created_at,
    updated_at
) VALUES

-- Registro 1: Convenio de uso de red - DAVIVIENDA
(
    '2024-01-15'::date,
    'SOL-2024-0001',
    'NT-860034313-DAVIVIENDA S.A.',
    'Convenio de uso de red',
    2500000.00,
    475000.00,
    2975000.00,
    'Solicitada',
    '2024-01-15 08:30:00-05',
    '2024-01-15 08:30:00-05'
),

-- Registro 2: Comisiones recaudo Leasing - BANCOLOMBIA
(
    '2024-01-16'::date,
    'SOL-2024-0002',
    'NT-860034593-BANCOLOMBIA S.A.',
    'Reconocimiento y pago de comisiones por recaudo Leasing',
    1800000.00,
    342000.00,
    2142000.00,
    'Solicitada',
    '2024-01-16 09:15:00-05',
    '2024-01-16 09:15:00-05'
),

-- Registro 3: Vida Deudores Leasing - BANCO DE BOGOTÁ
(
    '2024-01-17'::date,
    'SOL-2024-0003',
    'NT-860002964-BANCO DE BOGOTÁ S.A.',
    'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
    3200000.00,
    608000.00,
    3808000.00,
    'Solicitada',
    '2024-01-17 10:20:00-05',
    '2024-01-17 10:20:00-05'
),

-- Registro 4: Costo de recaudo TRC - BANCO POPULAR
(
    '2024-01-18'::date,
    'SOL-2024-0004',
    'NT-860007738-BANCO POPULAR S.A.',
    'Costo de recaudo TRC',
    1500000.00,
    285000.00,
    1785000.00,
    'Solicitada',
    '2024-01-18 11:45:00-05',
    '2024-01-18 11:45:00-05'
),

-- Registro 5: Referenciación de clientes - COLPATRIA
(
    '2024-01-19'::date,
    'SOL-2024-0005',
    'NT-860034594-BANCO COLPATRIA S.A.',
    'Referenciación de clientes',
    950000.00,
    180500.00,
    1130500.00,
    'Solicitada',
    '2024-01-19 14:10:00-05',
    '2024-01-19 14:10:00-05'
),

-- Registro 6: Bono cumplimiento seguros - AV VILLAS
(
    '2024-01-22'::date,
    'SOL-2024-0006',
    'NT-860035827-BANCO AV VILLAS S.A.',
    'Bono cumplimiento penetraciones seguros voluntarios',
    2200000.00,
    418000.00,
    2618000.00,
    'Solicitada',
    '2024-01-22 08:25:00-05',
    '2024-01-22 08:25:00-05'
),

-- Registro 7: Retornos títulos GanaMás - CITIBANK
(
    '2024-01-23'::date,
    'SOL-2024-0007',
    'NT-860034326-CITIBANK COLOMBIA S.A.',
    'Retornos títulos de capitalización GanaMás',
    1750000.00,
    332500.00,
    2082500.00,
    'Solicitada',
    '2024-01-23 15:30:00-05',
    '2024-01-23 15:30:00-05'
),

-- Registro 8: Convenio de uso de red - BBVA
(
    '2024-01-24'::date,
    'SOL-2024-0008',
    'NT-860003020-BBVA COLOMBIA S.A.',
    'Convenio de uso de red',
    2800000.00,
    532000.00,
    3332000.00,
    'Solicitada',
    '2024-01-24 09:40:00-05',
    '2024-01-24 09:40:00-05'
),

-- Registro 9: Comisiones recaudo Leasing - SCOTIABANK
(
    '2024-01-25'::date,
    'SOL-2024-0009',
    'NT-860051135-SCOTIABANK COLPATRIA S.A.',
    'Reconocimiento y pago de comisiones por recaudo Leasing',
    2100000.00,
    399000.00,
    2499000.00,
    'Solicitada',
    '2024-01-25 13:20:00-05',
    '2024-01-25 13:20:00-05'
),

-- Registro 10: Costo de recaudo TRC - BANCO CAJA SOCIAL
(
    '2024-01-26'::date,
    'SOL-2024-0010',
    'NT-860007335-BANCO CAJA SOCIAL S.A.',
    'Costo de recaudo TRC',
    1350000.00,
    256500.00,
    1606500.00,
    'Solicitada',
    '2024-01-26 16:15:00-05',
    '2024-01-26 16:15:00-05'
);

-- ============================================================================
-- VERIFICACIONES DESPUÉS DE LA INSERCIÓN
-- ============================================================================

-- Contar registros insertados
SELECT 'REGISTROS INSERTADOS:' as info;
SELECT COUNT(*) as total_solicitadas 
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';

-- Mostrar resumen de los registros creados
SELECT 'RESUMEN DE SOLICITUDES CREADAS:' as info;
SELECT 
    numero_solicitud,
    proveedor,
    concepto,
    monto_solicitud,
    iva,
    total_solicitud,
    fecha_solicitud,
    estado
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
ORDER BY fecha_solicitud, numero_solicitud;

-- Estadísticas de montos
SELECT 'ESTADÍSTICAS DE MONTOS:' as info;
SELECT 
    MIN(monto_solicitud) as monto_minimo,
    MAX(monto_solicitud) as monto_maximo,
    AVG(monto_solicitud) as monto_promedio,
    SUM(monto_solicitud) as monto_total_solicitado,
    SUM(total_solicitud) as total_con_iva
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';

-- Distribución por concepto
SELECT 'DISTRIBUCIÓN POR CONCEPTO:' as info;
SELECT 
    concepto,
    COUNT(*) as cantidad,
    SUM(monto_solicitud) as total_monto,
    AVG(monto_solicitud) as promedio_monto
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY concepto
ORDER BY cantidad DESC;

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
/*
DATOS CREADOS:
✅ 10 registros con estado "Solicitada"
✅ Números de solicitud secuenciales (SOL-2024-0001 a SOL-2024-0010)
✅ Proveedores reales del sector financiero colombiano
✅ Conceptos del área tributaria/seguros
✅ Montos realistas en pesos colombianos
✅ IVA calculado al 19% sobre cada monto
✅ Fechas secuenciales de enero 2024
✅ Timestamps completos con zona horaria colombiana

PROVEEDORES INCLUIDOS:
- DAVIVIENDA S.A.
- BANCOLOMBIA S.A.  
- BANCO DE BOGOTÁ S.A.
- BANCO POPULAR S.A.
- BANCO COLPATRIA S.A.
- BANCO AV VILLAS S.A.
- CITIBANK COLOMBIA S.A.
- BBVA COLOMBIA S.A.
- SCOTIABANK COLPATRIA S.A.
- BANCO CAJA SOCIAL S.A.

CONCEPTOS INCLUIDOS:
- Convenio de uso de red
- Reconocimiento y pago de comisiones por recaudo Leasing
- Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing  
- Costo de recaudo TRC
- Referenciación de clientes
- Bono cumplimiento penetraciones seguros voluntarios
- Retornos títulos de capitalización GanaMás
*/
