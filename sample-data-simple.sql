-- ============================================================================
-- INSERCIÓN SIMPLE DE DATOS DE EJEMPLO
-- ============================================================================
-- Solo los registros, sin verificaciones extra
-- ============================================================================

INSERT INTO public.ordenes_pago (
    fecha_solicitud, numero_solicitud, proveedor, concepto, 
    monto_solicitud, iva, total_solicitud, estado, created_at, updated_at
) VALUES

('2024-01-15', 'SOL-2024-0001', 'NT-860034313-DAVIVIENDA S.A.', 'Convenio de uso de red', 2500000.00, 475000.00, 2975000.00, 'Solicitada', NOW(), NOW()),

('2024-01-16', 'SOL-2024-0002', 'NT-860034593-BANCOLOMBIA S.A.', 'Reconocimiento y pago de comisiones por recaudo Leasing', 1800000.00, 342000.00, 2142000.00, 'Solicitada', NOW(), NOW()),

('2024-01-17', 'SOL-2024-0003', 'NT-860002964-BANCO DE BOGOTÁ S.A.', 'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing', 3200000.00, 608000.00, 3808000.00, 'Solicitada', NOW(), NOW()),

('2024-01-18', 'SOL-2024-0004', 'NT-860007738-BANCO POPULAR S.A.', 'Costo de recaudo TRC', 1500000.00, 285000.00, 1785000.00, 'Solicitada', NOW(), NOW()),

('2024-01-19', 'SOL-2024-0005', 'NT-860034594-BANCO COLPATRIA S.A.', 'Referenciación de clientes', 950000.00, 180500.00, 1130500.00, 'Solicitada', NOW(), NOW()),

('2024-01-22', 'SOL-2024-0006', 'NT-860035827-BANCO AV VILLAS S.A.', 'Bono cumplimiento penetraciones seguros voluntarios', 2200000.00, 418000.00, 2618000.00, 'Solicitada', NOW(), NOW()),

('2024-01-23', 'SOL-2024-0007', 'NT-860034326-CITIBANK COLOMBIA S.A.', 'Retornos títulos de capitalización GanaMás', 1750000.00, 332500.00, 2082500.00, 'Solicitada', NOW(), NOW()),

('2024-01-24', 'SOL-2024-0008', 'NT-860003020-BBVA COLOMBIA S.A.', 'Convenio de uso de red', 2800000.00, 532000.00, 3332000.00, 'Solicitada', NOW(), NOW()),

('2024-01-25', 'SOL-2024-0009', 'NT-860051135-SCOTIABANK COLPATRIA S.A.', 'Reconocimiento y pago de comisiones por recaudo Leasing', 2100000.00, 399000.00, 2499000.00, 'Solicitada', NOW(), NOW()),

('2024-01-26', 'SOL-2024-0010', 'NT-860007335-BANCO CAJA SOCIAL S.A.', 'Costo de recaudo TRC', 1350000.00, 256500.00, 1606500.00, 'Solicitada', NOW(), NOW());

-- Verificación rápida
SELECT COUNT(*) as registros_insertados FROM public.ordenes_pago WHERE estado = 'Solicitada';
