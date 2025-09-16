-- =====================================================
-- SCRIPT: Probar búsqueda de parámetros
-- DESCRIPCIÓN: Verificar qué grupos existen y cómo funciona la búsqueda
-- =====================================================

-- 1. VER TODOS LOS GRUPOS ÚNICOS QUE EXISTEN
-- =====================================================
SELECT 
    'GRUPOS DISPONIBLES' as consulta,
    nombre_grupo,
    COUNT(*) as cantidad_parametros
FROM public.parametros 
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 2. BUSCAR GRUPOS QUE CONTENGAN "ESTADO"
-- =====================================================
SELECT 
    'BÚSQUEDA: GRUPOS CON "ESTADO"' as consulta,
    nombre_grupo,
    valor_dominio,
    orden
FROM public.parametros 
WHERE nombre_grupo ILIKE '%ESTADO%'
ORDER BY nombre_grupo, orden;

-- 3. BUSCAR GRUPOS QUE CONTENGAN "ESTADO_S" (como el usuario busca)
-- =====================================================
SELECT 
    'BÚSQUEDA: GRUPOS CON "ESTADO_S"' as consulta,
    nombre_grupo,
    valor_dominio,
    orden
FROM public.parametros 
WHERE nombre_grupo ILIKE '%ESTADO_S%'
ORDER BY nombre_grupo, orden;

-- 4. BUSCAR CUALQUIER PARÁMETRO QUE CONTENGA "SOLICITUD"
-- =====================================================
SELECT 
    'BÚSQUEDA: CUALQUIER CAMPO CON "SOLICITUD"' as consulta,
    nombre_grupo,
    valor_dominio,
    orden
FROM public.parametros 
WHERE nombre_grupo ILIKE '%SOLICITUD%' OR valor_dominio ILIKE '%SOLICITUD%'
ORDER BY nombre_grupo, orden;

-- 5. SIMULACIÓN DE LA BÚSQUEDA API EXACTA
-- =====================================================
-- Esto simula exactamente lo que hace la API cuando buscas "ESTADO_S"
SELECT 
    'SIMULACIÓN API: BÚSQUEDA "ESTADO_S"' as consulta,
    nombre_grupo,
    valor_dominio,
    orden,
    vigente
FROM public.parametros 
WHERE (nombre_grupo ILIKE '%ESTADO_S%' OR valor_dominio ILIKE '%ESTADO_S%')
ORDER BY nombre_grupo ASC, orden ASC, valor_dominio ASC;

-- 6. BÚSQUEDA MEJORADA CON TÉRMINOS SEPARADOS
-- =====================================================
-- Una búsqueda más inteligente que separa "ESTADO_S" en "ESTADO" y "S"
SELECT 
    'BÚSQUEDA INTELIGENTE: "ESTADO_S" → "ESTADO" + "S"' as consulta,
    nombre_grupo,
    valor_dominio,
    orden
FROM public.parametros 
WHERE (
    nombre_grupo ILIKE '%ESTADO%' AND nombre_grupo ILIKE '%S%'
) OR (
    valor_dominio ILIKE '%ESTADO%' AND valor_dominio ILIKE '%S%'
)
ORDER BY nombre_grupo, orden;

-- 7. VERIFICAR SI EXISTE EL GRUPO EXACTO "ESTADOS_SOLICITUD"
-- =====================================================
SELECT 
    'VERIFICACIÓN: ¿EXISTE "ESTADOS_SOLICITUD"?' as consulta,
    nombre_grupo,
    COUNT(*) as cantidad
FROM public.parametros 
WHERE nombre_grupo = 'ESTADOS_SOLICITUD'
GROUP BY nombre_grupo;

-- RESUMEN FINAL
SELECT '🔍 DIAGNÓSTICO COMPLETADO' as status,
       'Revisar los resultados para identificar el problema de búsqueda' as mensaje;
