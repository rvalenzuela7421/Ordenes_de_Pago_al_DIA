-- ============================================================================
-- AGREGAR GRUPOS DE PARÁMETROS FALTANTES: ACREEDORES Y CONCEPTOS
-- ============================================================================
-- Este script migra los datos hardcodeados del código a la tabla parametros

-- ============================================================================
-- 1. GRUPO ACREEDORES
-- ============================================================================
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) VALUES
('ACREEDORES', 'Empresas acreedoras autorizadas para órdenes de pago', 'NT-860034313-DAVIVIENDA S.A.', 1, 'S');

-- Otros acreedores que se pueden agregar en el futuro:
-- ('ACREEDORES', 'Empresas acreedoras autorizadas para órdenes de pago', 'NT-860003020-BBVA COLOMBIA S.A.', 2, 'S'),
-- ('ACREEDORES', 'Empresas acreedoras autorizadas para órdenes de pago', 'NT-860034594-BANCOLOMBIA S.A.', 3, 'S'),
-- ('ACREEDORES', 'Empresas acreedoras autorizadas para órdenes de pago', 'NT-900156264-BANCO DE BOGOTÁ S.A.', 4, 'S');

-- ============================================================================
-- 2. GRUPO CONCEPTOS
-- ============================================================================
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) VALUES
('CONCEPTOS', 'Conceptos válidos para órdenes de pago del Grupo Bolívar', 'Convenio de uso de red', 1, 'S'),
('CONCEPTOS', 'Conceptos válidos para órdenes de pago del Grupo Bolívar', 'Reconocimiento y pago de comisiones por recaudo Leasing', 2, 'S'),
('CONCEPTOS', 'Conceptos válidos para órdenes de pago del Grupo Bolívar', 'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing', 3, 'S'),
('CONCEPTOS', 'Conceptos válidos para órdenes de pago del Grupo Bolívar', 'Costo de recaudo TRC', 4, 'S'),
('CONCEPTOS', 'Conceptos válidos para órdenes de pago del Grupo Bolívar', 'Referenciación de clientes', 5, 'S'),
('CONCEPTOS', 'Conceptos válidos para órdenes de pago del Grupo Bolívar', 'Bono cumplimiento penetraciones seguros voluntarios', 6, 'S'),
('CONCEPTOS', 'Conceptos válidos para órdenes de pago del Grupo Bolívar', 'Retornos títulos de capitalización GanaMás', 7, 'S');

-- ============================================================================
-- 3. VERIFICAR RESULTADOS
-- ============================================================================
SELECT 'ACREEDORES INSERTADOS:' as info;
SELECT 
    orden, 
    valor_dominio as acreedor,
    vigente
FROM public.parametros 
WHERE nombre_grupo = 'ACREEDORES' 
ORDER BY orden;

SELECT 'CONCEPTOS INSERTADOS:' as info;
SELECT 
    orden, 
    valor_dominio as concepto,
    vigente
FROM public.parametros 
WHERE nombre_grupo = 'CONCEPTOS' 
ORDER BY orden;

-- ============================================================================
-- 4. RESUMEN FINAL
-- ============================================================================
SELECT 
    nombre_grupo,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN vigente = 'S' THEN 1 END) as vigentes
FROM public.parametros 
WHERE nombre_grupo IN ('GRUPO_BOLIVAR', 'ACREEDORES', 'CONCEPTOS')
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

SELECT '✅ Migración de datos hardcodeados a base de datos completada' as resultado;
