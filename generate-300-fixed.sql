-- ============================================================================
-- GENERAR 300 REGISTROS - VERSIÓN CORREGIDA SIN ERRORES
-- ============================================================================

-- PASO 1: Corregir constraint de estados
ALTER TABLE public.ordenes_pago DROP CONSTRAINT IF EXISTS ordenes_pago_estado_check;
UPDATE public.ordenes_pago SET estado = 'Solicitada' WHERE estado IN ('solicitada', 'pendiente');
UPDATE public.ordenes_pago SET estado = 'Devuelta' WHERE estado IN ('devuelta', 'rechazada');
UPDATE public.ordenes_pago SET estado = 'Generada' WHERE estado IN ('generada', 'procesada');
UPDATE public.ordenes_pago SET estado = 'Aprobada' WHERE estado IN ('aprobada', 'aprovada');
UPDATE public.ordenes_pago SET estado = 'Pagada' WHERE estado IN ('pagada', 'completada');

ALTER TABLE public.ordenes_pago 
ADD CONSTRAINT ordenes_pago_estado_check 
CHECK (estado IN ('Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada'));

-- PASO 2: Generar 300 registros
DO $$
DECLARE
    i INTEGER;
    fecha_solicitud DATE;
    monto_base NUMERIC;
    iva_calc NUMERIC;
    total_calc NUMERIC;
    
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
        'NT-860007335-BANCO CAJA SOCIAL S.A.'
    ];
    
    conceptos TEXT[] := ARRAY[
        'Convenio de uso de red',
        'Reconocimiento y pago de comisiones por recaudo Leasing',
        'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
        'Costo de recaudo TRC',
        'Referenciación de clientes',
        'Bono cumplimiento penetraciones seguros voluntarios',
        'Retornos títulos de capitalización GanaMás'
    ];
    
BEGIN
    RAISE NOTICE 'Generando 300 registros...';
    
    FOR i IN 1..300 LOOP
        -- Fecha aleatoria del último año
        fecha_solicitud := '2023-01-01'::date + floor(random() * 730)::integer;
        
        -- Monto aleatorio entre 500,000 y 5,000,000 (convertir a NUMERIC)
        monto_base := (500000 + floor(random() * 4500000))::NUMERIC;
        monto_base := ROUND(monto_base, -3); -- Redondear a miles
        
        -- Calcular IVA (19%)
        iva_calc := ROUND(monto_base * 0.19, 2);
        
        -- Calcular total
        total_calc := monto_base + iva_calc;
        
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
            fecha_solicitud,
            'SOL-2024-' || LPAD(i::text, 4, '0'),
            proveedores[1 + floor(random() * array_length(proveedores, 1))::integer],
            conceptos[1 + floor(random() * array_length(conceptos, 1))::integer],
            monto_base,
            iva_calc,
            total_calc,
            'Solicitada',
            fecha_solicitud + (floor(random() * 8) + 8) * interval '1 hour',
            fecha_solicitud + (floor(random() * 8) + 8) * interval '1 hour'
        );
        
        -- Progreso cada 50 registros
        IF i % 50 = 0 THEN
            RAISE NOTICE 'Generados % registros...', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE '✅ 300 registros base completados';
END $$;

-- PASO 3: Agregar registros adicionales en fechas específicas
DO $$
DECLARE
    fechas_extra DATE[] := ARRAY[
        '2024-01-15', '2024-02-14', '2024-03-15', '2024-04-15', '2024-05-15',
        '2024-06-17', '2024-07-15', '2024-08-15', '2024-09-16', '2024-10-15'
    ];
    
    fecha_actual DATE;
    i INTEGER;
    j INTEGER;
    contador INTEGER := 301;
    monto_extra NUMERIC;
    iva_extra NUMERIC;
    total_extra NUMERIC;
    
BEGIN
    RAISE NOTICE 'Agregando registros adicionales...';
    
    FOR i IN 1..array_length(fechas_extra, 1) LOOP
        fecha_actual := fechas_extra[i];
        
        -- Agregar 2-4 registros por fecha
        FOR j IN 1..(2 + floor(random() * 3)::integer) LOOP
            -- Calcular montos (convertir a NUMERIC correctamente)
            monto_extra := (800000 + floor(random() * 3200000))::NUMERIC;
            monto_extra := ROUND(monto_extra, -3);
            iva_extra := ROUND(monto_extra * 0.19, 2);
            total_extra := monto_extra + iva_extra;
            
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
                fecha_actual,
                'SOL-2024-' || LPAD(contador::text, 4, '0'),
                (ARRAY[
                    'NT-860034313-DAVIVIENDA S.A.',
                    'NT-860034593-BANCOLOMBIA S.A.',
                    'NT-860002964-BANCO DE BOGOTÁ S.A.',
                    'NT-860007738-BANCO POPULAR S.A.',
                    'NT-860034594-BANCO COLPATRIA S.A.'
                ])[1 + floor(random() * 5)::integer],
                (ARRAY[
                    'Convenio de uso de red',
                    'Reconocimiento y pago de comisiones por recaudo Leasing',
                    'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
                    'Costo de recaudo TRC',
                    'Referenciación de clientes',
                    'Bono cumplimiento penetraciones seguros voluntarios',
                    'Retornos títulos de capitalización GanaMás'
                ])[1 + floor(random() * 7)::integer],
                monto_extra,
                iva_extra,
                total_extra,
                'Solicitada',
                fecha_actual + (floor(random() * 8) + 8) * interval '1 hour',
                fecha_actual + (floor(random() * 8) + 8) * interval '1 hour'
            );
            
            contador := contador + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Registros adicionales completados';
END $$;

-- PASO 4: Verificaciones
SELECT 'TOTAL DE REGISTROS SOLICITADAS:' as info;
SELECT COUNT(*) as total FROM public.ordenes_pago WHERE estado = 'Solicitada';

SELECT 'DISTRIBUCIÓN POR CONCEPTO:' as info;
SELECT concepto, COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY concepto
ORDER BY cantidad DESC;

SELECT 'FECHAS CON MÚLTIPLES REGISTROS:' as info;
SELECT fecha_solicitud, COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY fecha_solicitud
HAVING COUNT(*) > 1
ORDER BY cantidad DESC, fecha_solicitud DESC
LIMIT 10;

SELECT 'ESTADÍSTICAS DE MONTOS:' as info;
SELECT 
    MIN(monto_solicitud) as minimo,
    MAX(monto_solicitud) as maximo,
    ROUND(AVG(monto_solicitud), 0) as promedio,
    SUM(monto_solicitud) as total_solicitado
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';

SELECT '🎉 GENERACIÓN COMPLETADA EXITOSAMENTE 🎉' as resultado;
