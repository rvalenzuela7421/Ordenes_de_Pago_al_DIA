-- ============================================================================
-- DISTRIBUIR EMPRESAS SIMPLE - COMPATIBLE UUID
-- Script simplificado sin funciones problemáticas para UUID
-- ============================================================================

-- 1. VERIFICAR DISTRIBUCIÓN ACTUAL
-- ============================================================================
SELECT 
    compania_receptora,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE compania_receptora IS NOT NULL
GROUP BY compania_receptora
ORDER BY cantidad DESC;

-- 2. DISTRIBUIR EQUITATIVAMENTE USANDO ROW_NUMBER
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

-- 3. VERIFICAR NUEVA DISTRIBUCIÓN
-- ============================================================================
SELECT 
    compania_receptora,
    COUNT(*) as cantidad_ordenes,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago), 1) as porcentaje
FROM public.ordenes_pago 
GROUP BY compania_receptora
ORDER BY cantidad_ordenes DESC;

-- 4. CONTAR TOTALES SIMPLES
-- ============================================================================
SELECT 
    COUNT(*) as total_ordenes,
    COUNT(DISTINCT compania_receptora) as empresas_diferentes
FROM public.ordenes_pago;

-- 5. MENSAJE DE CONFIRMACIÓN
-- ============================================================================
SELECT 'Distribución completada usando ROW_NUMBER - Compatible con UUID' as resultado;

