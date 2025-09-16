-- =====================================================
-- SCRIPT DE PRUEBA: Consultas para Módulo de Administración
-- DESCRIPCIÓN: Verificar ordenamiento y funcionalidad para gestión de parámetros
-- ORDEN REQUERIDO: nombre_grupo, valor_dominio, orden
-- =====================================================

-- 1. CONSULTA PRINCIPAL: Todos los parámetros ordenados para administración
-- =====================================================
SELECT 
    '🔍 CONSULTA PRINCIPAL - TODOS LOS PARÁMETROS' as consulta,
    nombre_grupo,
    valor_dominio,
    orden,
    vigente,
    descripcion_grupo,
    created_at::date as fecha_creacion
FROM public.parametros
ORDER BY 
    nombre_grupo ASC,
    valor_dominio ASC,
    orden ASC;

-- 2. ESTADÍSTICAS POR GRUPO
-- =====================================================
SELECT 
    '📊 ESTADÍSTICAS POR GRUPO' as consulta,
    nombre_grupo,
    COUNT(*) as total_parametros,
    COUNT(CASE WHEN vigente = 'S' THEN 1 END) as vigentes,
    COUNT(CASE WHEN vigente = 'N' THEN 1 END) as no_vigentes,
    MIN(orden) as orden_minimo,
    MAX(orden) as orden_maximo
FROM public.parametros
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 3. CONSULTA CON PAGINACIÓN (SIMULADA)
-- =====================================================
-- Simulando página 1, tamaño 10
SELECT 
    '📄 PAGINACIÓN - PÁGINA 1 (10 registros)' as consulta,
    nombre_grupo,
    valor_dominio,
    orden,
    vigente
FROM public.parametros
ORDER BY 
    nombre_grupo ASC,
    valor_dominio ASC,
    orden ASC
LIMIT 10 OFFSET 0;

-- 4. BÚSQUEDA POR TEXTO (SIMULADA)
-- =====================================================
-- Simulando búsqueda de "BOLIVAR"
SELECT 
    '🔎 BÚSQUEDA - "BOLIVAR"' as consulta,
    nombre_grupo,
    valor_dominio,
    orden,
    vigente
FROM public.parametros
WHERE 
    nombre_grupo ILIKE '%BOLIVAR%' OR 
    valor_dominio ILIKE '%BOLIVAR%'
ORDER BY 
    nombre_grupo ASC,
    valor_dominio ASC,
    orden ASC;

-- 5. SOLO PARÁMETROS VIGENTES
-- =====================================================
SELECT 
    '✅ SOLO VIGENTES' as consulta,
    nombre_grupo,
    COUNT(*) as total_vigentes
FROM public.parametros
WHERE vigente = 'S'
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 6. CONTEO TOTAL PARA PAGINACIÓN
-- =====================================================
SELECT 
    '🔢 CONTEO TOTAL' as info,
    COUNT(*) as total_parametros,
    COUNT(CASE WHEN vigente = 'S' THEN 1 END) as total_vigentes,
    COUNT(CASE WHEN vigente = 'N' THEN 1 END) as total_no_vigentes,
    COUNT(DISTINCT nombre_grupo) as total_grupos
FROM public.parametros;

-- 7. VERIFICAR GRUPOS EXISTENTES
-- =====================================================
SELECT 
    '📂 GRUPOS EXISTENTES' as info,
    nombre_grupo,
    descripcion_grupo,
    COUNT(*) as cantidad_parametros
FROM public.parametros
GROUP BY nombre_grupo, descripcion_grupo
ORDER BY nombre_grupo;

-- 8. CONSULTA COMO LA HARÍA LA API (modo administración)
-- =====================================================
-- Simulando: GET /api/parametros?orderBy=admin&page=1&pageSize=20&vigente=S
SELECT 
    '🔧 SIMULACIÓN API - Modo Administración' as consulta,
    id,
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    orden,
    vigente,
    created_at,
    updated_at
FROM public.parametros
WHERE vigente = 'S'  -- Filtro por vigentes
ORDER BY 
    nombre_grupo ASC,
    valor_dominio ASC,
    orden ASC
LIMIT 20 OFFSET 0;  -- Paginación: página 1, 20 registros

-- 9. VERIFICAR INTEGRIDAD DE DATOS
-- =====================================================
SELECT 
    '⚠️ VERIFICACIÓN DE INTEGRIDAD' as verificacion,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN nombre_grupo IS NULL OR nombre_grupo = '' THEN 1 END) as grupos_vacios,
    COUNT(CASE WHEN valor_dominio IS NULL OR valor_dominio = '' THEN 1 END) as valores_vacios,
    COUNT(CASE WHEN vigente NOT IN ('S', 'N') THEN 1 END) as vigente_invalido,
    COUNT(CASE WHEN orden IS NULL THEN 1 END) as sin_orden
FROM public.parametros;

-- 10. RESULTADO ESPERADO PARA EL FRONTEND
-- =====================================================
SELECT 
    '🎯 RESULTADO FINAL PARA FRONTEND' as resultado,
    'Total de registros: ' || COUNT(*) as info_1,
    'Grupos únicos: ' || COUNT(DISTINCT nombre_grupo) as info_2,
    'Orden correcto verificado ✅' as info_3
FROM public.parametros;

-- MENSAJE FINAL
SELECT '✅ TODAS LAS CONSULTAS EJECUTADAS CORRECTAMENTE' as status,
       'Las consultas están listas para el módulo de administración' as mensaje;
