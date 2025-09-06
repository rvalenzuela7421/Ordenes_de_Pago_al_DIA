-- ============================================================================
-- CORREGIR CONSTRAINT Y GENERAR 300 REGISTROS
-- ============================================================================
-- 1. Corregir constraint de estados
-- 2. Generar 300 registros con conceptos correctos
-- ============================================================================

-- ============================================================================
-- PASO 1: CORREGIR CONSTRAINT DE ESTADOS
-- ============================================================================

-- Eliminar constraint problemático
ALTER TABLE public.ordenes_pago DROP CONSTRAINT IF EXISTS ordenes_pago_estado_check;
ALTER TABLE public.ordenes_pago DROP CONSTRAINT IF EXISTS check_estado_valido;

-- Actualizar cualquier estado existente que pueda estar mal
UPDATE public.ordenes_pago SET estado = 'Solicitada' WHERE estado IN ('solicitada', 'pendiente');
UPDATE public.ordenes_pago SET estado = 'Devuelta' WHERE estado IN ('devuelta', 'rechazada');
UPDATE public.ordenes_pago SET estado = 'Generada' WHERE estado IN ('generada', 'procesada');
UPDATE public.ordenes_pago SET estado = 'Aprobada' WHERE estado IN ('aprobada', 'aprovada');
UPDATE public.ordenes_pago SET estado = 'Pagada' WHERE estado IN ('pagada', 'completada');

-- Crear nuevo constraint correcto
ALTER TABLE public.ordenes_pago 
ADD CONSTRAINT ordenes_pago_estado_check 
CHECK (estado IN ('Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada'));

-- ============================================================================
-- PASO 2: GENERAR 300 REGISTROS CON CONCEPTOS CORRECTOS
-- ============================================================================

DO $$
DECLARE
    -- Arrays de datos CORREGIDOS
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
    
    -- CONCEPTOS EXACTOS según especificación
    conceptos TEXT[] := ARRAY[
        'Convenio de uso de red',
        'Reconocimiento y pago de comisiones por recaudo Leasing',
        'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
        'Costo de recaudo TRC',
        'Referenciación de clientes',
        'Bono cumplimiento penetraciones seguros voluntarios',
        'Retornos títulos de capitalización GanaMás'
    ];
    
    -- Variables de trabajo
    i INTEGER;
    fecha_solicitud DATE;
    proveedor_sel TEXT;
    concepto_sel TEXT;
    monto NUMERIC;
    iva_calc NUMERIC;
    total_calc NUMERIC;
    numero_solicitud TEXT;
    
BEGIN
    RAISE NOTICE 'Iniciando generación de 300 registros con constraint corregido...';
    
    -- Generar 300 registros
    FOR i IN 1..300 LOOP
        -- Fecha aleatoria del último año (2023-2024)
        fecha_solicitud := '2023-01-01'::date + (random() * 730)::integer;
        
        -- Seleccionar proveedor aleatorio
        proveedor_sel := proveedores[1 + floor(random() * array_length(proveedores, 1))];
        
        -- Seleccionar concepto aleatorio de los 7 específicos
        concepto_sel := conceptos[1 + floor(random() * array_length(conceptos, 1))];
        
        -- Generar monto aleatorio entre 500,000 y 5,000,000
        monto := 500000 + (random() * 4500000);
        monto := ROUND(monto, -3); -- Redondear a miles
        
        -- Calcular IVA (19%)
        iva_calc := ROUND(monto * 0.19, 2);
        
        -- Calcular total
        total_calc := monto + iva_calc;
        
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
            fecha_solicitud,
            numero_solicitud,
            proveedor_sel,
            concepto_sel,
            monto,
            iva_calc,
            total_calc,
            'Solicitada',
            fecha_solicitud + (random() * interval '8 hours') + interval '8 hours',
            fecha_solicitud + (random() * interval '8 hours') + interval '8 hours'
        );
        
        -- Mostrar progreso cada 50 registros
        IF i % 50 = 0 THEN
            RAISE NOTICE 'Generados % registros...', i;
        END IF;
        
    END LOOP;
    
    RAISE NOTICE '✅ Completado: 300 registros generados exitosamente';
    
END $$;

-- ============================================================================
-- AGREGAR REGISTROS ADICIONALES EN FECHAS ESPECÍFICAS
-- ============================================================================

DO $$
DECLARE
    fechas_especiales DATE[] := ARRAY[
        '2024-01-15'::date,
        '2024-02-14'::date,
        '2024-03-15'::date,
        '2024-04-15'::date,
        '2024-05-15'::date,
        '2024-06-17'::date,
        '2024-07-15'::date,
        '2024-08-15'::date,
        '2024-09-16'::date,
        '2024-10-15'::date
    ];
    
    fecha_sel DATE;
    i INTEGER;
    contador_extra INTEGER := 301;
    registros_extra INTEGER;
    
BEGIN
    RAISE NOTICE 'Agregando registros adicionales en fechas específicas...';
    
    -- Para cada fecha especial, agregar 2-4 registros extra
    FOREACH fecha_sel IN ARRAY fechas_especiales LOOP
        registros_extra := 2 + floor(random() * 3); -- Entre 2 y 4 registros
        
        FOR i IN 1..registros_extra LOOP
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
                'SOL-2024-' || LPAD(contador_extra::text, 4, '0'),
                -- Proveedor aleatorio
                (ARRAY[
                    'NT-860034313-DAVIVIENDA S.A.',
                    'NT-860034593-BANCOLOMBIA S.A.',
                    'NT-860002964-BANCO DE BOGOTÁ S.A.',
                    'NT-860007738-BANCO POPULAR S.A.',
                    'NT-860034594-BANCO COLPATRIA S.A.'
                ])[1 + floor(random() * 5)],
                -- Concepto específico aleatorio
                (ARRAY[
                    'Convenio de uso de red',
                    'Reconocimiento y pago de comisiones por recaudo Leasing',
                    'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
                    'Costo de recaudo TRC',
                    'Referenciación de clientes',
                    'Bono cumplimiento penetraciones seguros voluntarios',
                    'Retornos títulos de capitalización GanaMás'
                ])[1 + floor(random() * 7)],
                -- Monto aleatorio
                ROUND((800000 + (random() * 3200000))::NUMERIC, -3),
                -- IVA calculado
                ROUND(((800000 + (random() * 3200000)) * 0.19)::NUMERIC, 2),
                -- Total
                ROUND(((800000 + (random() * 3200000)) * 1.19)::NUMERIC, 2),
                'Solicitada',
                fecha_sel + (random() * interval '8 hours') + interval '8 hours',
                fecha_sel + (random() * interval '8 hours') + interval '8 hours'
            );
            
            contador_extra := contador_extra + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Registros adicionales completados';
    
END $$;

-- ============================================================================
-- VERIFICACIONES FINALES
-- ============================================================================

-- Contar registros por estado
SELECT 'REGISTROS POR ESTADO:' as info;
SELECT estado, COUNT(*) as cantidad 
FROM public.ordenes_pago 
GROUP BY estado 
ORDER BY cantidad DESC;

-- Contar registros de "Solicitada"
SELECT 'TOTAL SOLICITADAS:' as info;
SELECT COUNT(*) as total_solicitadas 
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';

-- Distribución por concepto (solo los 7 correctos)
SELECT 'DISTRIBUCIÓN POR CONCEPTO:' as info;
SELECT 
    concepto,
    COUNT(*) as cantidad,
    ROUND(AVG(monto_solicitud), 0) as promedio_monto
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY concepto
ORDER BY cantidad DESC;

-- Fechas con múltiples registros
SELECT 'FECHAS CON MÚLTIPLES REGISTROS:' as info;
SELECT 
    fecha_solicitud,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE estado = 'Solicitada'
GROUP BY fecha_solicitud
HAVING COUNT(*) > 1
ORDER BY cantidad DESC, fecha_solicitud DESC
LIMIT 15;

-- Rango de fechas
SELECT 'RANGO DE FECHAS:' as info;
SELECT 
    MIN(fecha_solicitud) as fecha_inicio,
    MAX(fecha_solicitud) as fecha_fin,
    COUNT(DISTINCT fecha_solicitud) as dias_con_solicitudes
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================
SELECT '🎉 GENERACIÓN COMPLETADA EXITOSAMENTE 🎉' as resultado;
SELECT '✅ Constraint de estados corregido' as detalle;
SELECT '✅ 300+ registros con estado Solicitada generados' as detalle;
SELECT '✅ Solo 7 conceptos específicos utilizados' as detalle;
SELECT '✅ Fechas distribuidas en 2023-2024' as detalle;
SELECT '✅ Múltiples registros en fechas específicas' as detalle;
