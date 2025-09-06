-- ============================================================================
-- GENERACIÓN SIMPLE DE 300 REGISTROS - VERSIÓN RÁPIDA
-- ============================================================================

DO $$
DECLARE
    i INTEGER;
    fecha_solicitud DATE;
    monto NUMERIC;
    iva_calc NUMERIC;
    total_calc NUMERIC;
BEGIN
    -- Generar 300 registros
    FOR i IN 1..300 LOOP
        -- Fecha aleatoria del último año
        fecha_solicitud := '2023-01-01'::date + (random() * 730)::integer;
        
        -- Monto aleatorio entre 500K y 5M
        monto := 500000 + (random() * 4500000);
        monto := ROUND(monto, -3);
        
        -- Calcular IVA y total
        iva_calc := ROUND(monto * 0.19, 2);
        total_calc := monto + iva_calc;
        
        INSERT INTO public.ordenes_pago (
            fecha_solicitud, numero_solicitud, proveedor, concepto, 
            monto_solicitud, iva, total_solicitud, estado, created_at, updated_at
        ) VALUES (
            fecha_solicitud,
            'SOL-2024-' || LPAD(i::text, 4, '0'),
            -- Proveedor aleatorio
            (ARRAY[
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
            ])[1 + floor(random() * 10)],
            -- Concepto aleatorio
            (ARRAY[
                'Convenio de uso de red',
                'Reconocimiento y pago de comisiones por recaudo Leasing',
                'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
                'Costo de recaudo TRC',
                'Referenciación de clientes',
                'Bono cumplimiento penetraciones seguros voluntarios',
                'Retornos títulos de capitalización GanaMás',
                'Comisiones por servicios bancarios',
                'Servicios de corresponsalía bancaria',
                'Gastos de administración cuenta corriente'
            ])[1 + floor(random() * 10)],
            monto,
            iva_calc,
            total_calc,
            'Solicitada',
            fecha_solicitud + (random() * interval '8 hours') + interval '8 hours',
            fecha_solicitud + (random() * interval '8 hours') + interval '8 hours'
        );
    END LOOP;
    
    RAISE NOTICE '✅ 300 registros generados exitosamente';
END $$;

-- Verificación rápida
SELECT 
    COUNT(*) as total_registros,
    MIN(fecha_solicitud) as fecha_inicio,
    MAX(fecha_solicitud) as fecha_fin,
    SUM(monto_solicitud) as monto_total
FROM public.ordenes_pago 
WHERE estado = 'Solicitada';
