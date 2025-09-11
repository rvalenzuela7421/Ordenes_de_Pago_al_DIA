-- ============================================================================
-- DISTRIBUIR EMPRESAS EQUITATIVAMENTE EN ORDENES_PAGO
-- Asigna las primeras 5 empresas de GRUPO_BOLIVAR de manera equitativa
-- ============================================================================

-- 1. VERIFICAR DISTRIBUCIÓN ACTUAL
-- ============================================================================
SELECT 
    compania_receptora,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
GROUP BY compania_receptora
ORDER BY cantidad DESC;

-- 2. OBTENER LAS PRIMERAS 5 EMPRESAS DEL GRUPO_BOLIVAR
-- ============================================================================
SELECT 
    orden,
    valor_dominio
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND vigente = 'S'
ORDER BY orden 
LIMIT 5;

-- 3. DISTRIBUIR EQUITATIVAMENTE USANDO ROW_NUMBER (FUNCIONA CON UUID)
-- ============================================================================
WITH ordenes_numeradas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
  FROM public.ordenes_pago
),
empresas_bolivar AS (
  SELECT 
    valor_dominio,
    orden,
    ROW_NUMBER() OVER (ORDER BY orden) as empresa_num
  FROM public.parametros 
  WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
    AND vigente = 'S' 
  ORDER BY orden 
  LIMIT 5
)
UPDATE public.ordenes_pago 
SET compania_receptora = empresas_bolivar.valor_dominio
FROM ordenes_numeradas, empresas_bolivar
WHERE public.ordenes_pago.id = ordenes_numeradas.id
  AND empresas_bolivar.empresa_num = ((ordenes_numeradas.row_num - 1) % 5) + 1;

-- 4. VERIFICAR NUEVA DISTRIBUCIÓN
-- ============================================================================
SELECT 
    compania_receptora,
    COUNT(*) as cantidad_ordenes,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago), 1) as porcentaje
FROM public.ordenes_pago 
GROUP BY compania_receptora
ORDER BY cantidad_ordenes DESC;

-- 5. MOSTRAR ALGUNAS ÓRDENES PARA VERIFICAR
-- ============================================================================
WITH ordenes_con_numero AS (
  SELECT 
    id,
    proveedor,
    compania_receptora,
    estado,
    monto_solicitud,
    ROW_NUMBER() OVER (ORDER BY created_at, id) as row_num
  FROM public.ordenes_pago
)
SELECT 
    id,
    proveedor,
    compania_receptora,
    estado,
    monto_solicitud,
    ((row_num - 1) % 5) + 1 as grupo_asignado
FROM ordenes_con_numero 
ORDER BY row_num 
LIMIT 10;

-- 6. ESTADÍSTICAS FINALES
-- ============================================================================
SELECT 
    COUNT(*) as total_ordenes,
    COUNT(DISTINCT compania_receptora) as empresas_diferentes,
    (SELECT id FROM public.ordenes_pago ORDER BY created_at, id LIMIT 1) as id_minimo,
    (SELECT id FROM public.ordenes_pago ORDER BY created_at DESC, id DESC LIMIT 1) as id_maximo
FROM public.ordenes_pago;

-- 7. MENSAJE DE CONFIRMACIÓN
-- ============================================================================
SELECT 'Empresas distribuidas equitativamente usando ROW_NUMBER y MOD 5 (compatible con UUID)' as resultado;
