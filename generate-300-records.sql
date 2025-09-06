-- ============================================================================
-- GENERACIÓN DE 300 REGISTROS DE EJEMPLO PARA ORDENES_PAGO
-- ============================================================================
-- Estado: "Solicitada"
-- Fechas: Distribuidas en el último año (2023-2024)
-- Múltiples registros por día en algunas fechas
-- ============================================================================

-- ============================================================================
-- FUNCIÓN PARA GENERAR DATOS MASIVOS
-- ============================================================================

DO $$
DECLARE
    -- Arrays de datos para variar
    proveedores TEXT[] := ARRAY[
        'NT-860034313-DAVIVIENDA S.A.',
        'NT-860034593-BANCOLOMBIA S.A.',
        'NT-860002964-BANCO DE BOGOTÁ S.A.',
        'NT-860007738-BANCO POPULAR S.A.',
        'NT-860034594-BANCO COLPATRIA S.A.',
        'NT-860035827-BANCO AV VILLAS S.A.',
        'NT-860034326-CITIBANK COLOMBIA S.A.',
        'NT-860003020-BBVA COLOMBIA S.A.',
        'NT-860051135-SCOTIABANK COLPATRIA S.A.',
        'NT-860007335-BANCO CAJA SOCIAL S.A.',
        'NT-860007394-BANCO AGRARIO DE COLOMBIA S.A.',
        'NT-860006655-BANCO COOPERATIVO COOPCENTRAL',
        'NT-860003021-BANCAMÍA S.A.',
        'NT-860000570-BANCO DE OCCIDENTE S.A.',
        'NT-860034912-BANCO FALABELLA S.A.',
        'NT-860051894-BANCO FINANDINA S.A.',
        'NT-860007738-BANCO GNB SUDAMERIS S.A.',
        'NT-860034594-BANCO PICHINCHA S.A.',
        'NT-860007335-BANCO SANTANDER DE NEGOCIOS S.A.',
        'NT-860002964-BANCO SERFINANZA S.A.'
    ];
    
    conceptos TEXT[] := ARRAY[
        'Convenio de uso de red',
        'Reconocimiento y pago de comisiones por recaudo Leasing',
        'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
        'Costo de recaudo TRC',
        'Referenciación de clientes',
        'Bono cumplimiento penetraciones seguros voluntarios',
        'Retornos títulos de capitalización GanaMás',
        'Comisiones por servicios bancarios',
        'Pagos por transferencias electrónicas',
        'Servicios de corresponsalía bancaria',
        'Gastos de administración cuenta corriente',
        'Comisiones por manejo de efectivo',
        'Servicios de procesamiento de datos',
        'Costos por transacciones ACH',
        'Servicios de custodia de valores'
    ];
    
    -- Variables de trabajo
    i INTEGER;
    fecha_base DATE;
    fecha_actual DATE;
    proveedor_sel TEXT;
    concepto_sel TEXT;
    monto_base NUMERIC;
    monto_iva NUMERIC;
    monto_total NUMERIC;
    numero_solicitud TEXT;
    registros_por_fecha INTEGER;
    j INTEGER;
    
BEGIN
    -- Mensaje inicial
    RAISE NOTICE 'Iniciando generación de 300 registros...';
    
    -- Generar 300 registros
    FOR i IN 1..300 LOOP
        -- Generar fecha aleatoria del último año (2023-2024)
        fecha_base := '2023-01-01'::date + (random() * 730)::integer;
        
        -- Seleccionar proveedor aleatorio
        proveedor_sel := proveedores[1 + floor(random() * array_length(proveedores, 1))];
        
        -- Seleccionar concepto aleatorio
        concepto_sel := conceptos[1 + floor(random() * array_length(conceptos, 1))];
        
        -- Generar monto aleatorio entre 500,000 y 5,000,000
        monto_base := 500000 + (random() * 4500000);
        monto_base := ROUND(monto_base, -3); -- Redondear a miles
        
        -- Calcular IVA (19%)
        monto_iva := ROUND(monto_base * 0.19, 2);
        
        -- Calcular total
        monto_total := monto_base + monto_iva;
        
        -- Generar número de solicitud
        numero_solicitud := 'SOL-2024-' || LPAD(i::text, 4, '0');
        
        -- Insertar el registro
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
        ) VALUES (
            fecha_base,
            numero_solicitud,
            proveedor_sel,
            concepto_sel,
            monto_base,
            monto_iva,
            monto_total,
            'Solicitada',
            fecha_base + (random() * interval '8 hours') + interval '8 hours', -- Entre 8AM y 4PM
            fecha_base + (random() * interval '8 hours') + interval '8 hours'
        );
        
        -- Mostrar progreso cada 50 registros
        IF i % 50 = 0 THEN
            RAISE NOTICE 'Generados % registros...', i;
        END IF;
        
    END LOOP;
    
    RAISE NOTICE '✅ Completado: 300 registros generados exitosamente';
    
END $$;

-- ============================================================================
-- GENERAR REGISTROS ADICIONALES EN FECHAS ESPECÍFICAS (MÚLTIPLES POR DÍA)
-- ============================================================================

DO $$
DECLARE
    fechas_multiples DATE[] := ARRAY[
        '2024-01-15'::date,
        '2024-01-22'::date,
        '2024-02-05'::date,
        '2024-02-14'::date,
        '2024-03-01'::date,
        '2024-03-15'::date,
        '2024-04-10'::date,
        '2024-05-20'::date,
        '2024-06-15'::date,
        '2024-07-01'::date
    ];
    
    fecha_sel DATE;
    i INTEGER;
    j INTEGER;
    contador_adicional INTEGER := 301;
    
BEGIN
    RAISE NOTICE 'Generando registros adicionales para fechas con múltiples solicitudes...';
    
    -- Para cada fecha seleccionada, crear entre 2-5 registros adicionales
    FOREACH fecha_sel IN ARRAY fechas_multiples LOOP
        FOR j IN 1..(2 + floor(random() * 4)) LOOP -- Entre 2 y 5 registros adicionales
            
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
            ) VALUES (
                fecha_sel,
                'SOL-2024-' || LPAD(contador_adicional::text, 4, '0'),
                -- Proveedor aleatorio
                (ARRAY[
                    'NT-860034313-DAVIVIENDA S.A.',
                    'NT-860034593-BANCOLOMBIA S.A.',
                    'NT-860002964-BANCO DE BOGOTÁ S.A.',
                    'NT-860007738-BANCO POPULAR S.A.',
                    'NT-860034594-BANCO COLPATRIA S.A.'
                ])[1 + floor(random() * 5)],
                -- Concepto aleatorio
                (ARRAY[
                    'Convenio de uso de red',
                    'Reconocimiento y pago de comisiones por recaudo Leasing',
                    'Costo de recaudo TRC',
                    'Referenciación de clientes',
                    'Comisiones por servicios bancarios'
                ])[1 + floor(random() * 5)],
                -- Monto aleatorio
                ROUND(800000 + (random() * 3200000), -3),
                -- IVA calculado
                ROUND((800000 + (random() * 3200000)) * 0.19, 2),
                -- Total
                ROUND((800000 + (random() * 3200000)) * 1.19, 2),
                'Solicitada',
                fecha_sel + (random() * interval '8 hours') + interval '8 hours',
                fecha_sel + (random() * interval '8 hours') + interval '8 hours'
            );
            
            contador_adicional := contador_adicional + 1;
        END LOOP;
        
        RAISE NOTICE 'Fecha %: registros adicionales creados', fecha_sel;
    END LOOP;
    
    RAISE NOTICE '✅ Registros adicionales completados';
    
END $$;

-- ============================================================================
-- VERIFICACIONES FINALES
-- ============================================================================

-- Contar total de registros generados
SELECT 'TOTAL DE REGISTROS GENERADOS:' as info;
SELECT COUNT(*) as total_registros FROM public.ordenes_pago WHERE estado = 'Solicitada';

-- Distribución por fechas (mostrar fechas con más registros)
SELECT 'FECHAS CON MÚLTIPLES REGISTROS:' as info;
SELECT 
    fecha_solicitud,
    COUNT(*) as cantidad_registros,
    SUM(monto_solicitud) as monto_total_dia,
    AVG(monto_solicitud) as monto_promedio_dia
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY fecha_solicitud
HAVING COUNT(*) > 1
ORDER BY cantidad_registros DESC, fecha_solicitud DESC
LIMIT 15;

-- Estadísticas generales
SELECT 'ESTADÍSTICAS GENERALES:' as info;
SELECT 
    COUNT(*) as total_solicitudes,
    MIN(fecha_solicitud) as fecha_mas_antigua,
    MAX(fecha_solicitud) as fecha_mas_reciente,
    MIN(monto_solicitud) as monto_minimo,
    MAX(monto_solicitud) as monto_maximo,
    AVG(monto_solicitud) as monto_promedio,
    SUM(monto_solicitud) as monto_total_solicitado,
    SUM(total_solicitud) as total_con_iva
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';

-- Distribución por proveedor (top 10)
SELECT 'TOP 10 PROVEEDORES:' as info;
SELECT 
    proveedor,
    COUNT(*) as cantidad_solicitudes,
    SUM(monto_solicitud) as monto_total,
    AVG(monto_solicitud) as monto_promedio
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY proveedor
ORDER BY cantidad_solicitudes DESC
LIMIT 10;

-- Distribución por concepto
SELECT 'DISTRIBUCIÓN POR CONCEPTO:' as info;
SELECT 
    concepto,
    COUNT(*) as cantidad,
    ROUND(AVG(monto_solicitud), 2) as monto_promedio
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY concepto
ORDER BY cantidad DESC;

-- Distribución mensual
SELECT 'DISTRIBUCIÓN MENSUAL:' as info;
SELECT 
    DATE_TRUNC('month', fecha_solicitud) as mes,
    COUNT(*) as solicitudes_mes,
    SUM(monto_solicitud) as monto_total_mes,
    AVG(monto_solicitud) as monto_promedio_mes
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY DATE_TRUNC('month', fecha_solicitud)
ORDER BY mes DESC;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
SELECT '🎉 GENERACIÓN COMPLETADA 🎉' as resultado;
SELECT '✅ 300+ registros con estado Solicitada creados' as detalle;
SELECT '✅ Fechas distribuidas en 2023-2024' as detalle;
SELECT '✅ Múltiples registros en fechas específicas' as detalle;
SELECT '✅ Datos variados y realistas' as detalle;
