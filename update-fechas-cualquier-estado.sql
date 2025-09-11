-- Script MEJORADO para actualizar fecha_solicitud con fechas aleatorias
-- Busca registros con estado 'solicitada' en cualquier capitalización
-- Rango: desde ayer hasta máximo 2 meses hacia atrás

-- 1. VERIFICAR QUÉ REGISTROS COINCIDEN (cualquier capitalización)
-- =====================================================
SELECT 
  COUNT(*) as total_encontradas,
  MIN(fecha_solicitud) as fecha_min_actual,
  MAX(fecha_solicitud) as fecha_max_actual
FROM ordenes_pago 
WHERE LOWER(estado) = 'solicitada';

-- 2. VER ALGUNOS REGISTROS ACTUALES
-- =====================================================
SELECT id, fecha_solicitud, estado, proveedor 
FROM ordenes_pago 
WHERE LOWER(estado) = 'solicitada'
ORDER BY fecha_solicitud 
LIMIT 5;

-- 3. ACTUALIZAR FECHAS - FUNCIONA CON CUALQUIER CAPITALIZACIÓN
-- =====================================================
-- Usar LOWER() para hacer la comparación insensible a mayúsculas/minúsculas
UPDATE ordenes_pago 
SET fecha_solicitud = (
  CURRENT_DATE - 1 - (RANDOM() * 59)::INTEGER
)::TIMESTAMP WITH TIME ZONE
WHERE LOWER(estado) = 'solicitada';

-- 4. VERIFICAR LOS CAMBIOS REALIZADOS
-- =====================================================
SELECT 
  COUNT(*) as registros_actualizados,
  MIN(fecha_solicitud) as nueva_fecha_min,
  MAX(fecha_solicitud) as nueva_fecha_max,
  CURRENT_DATE - 1 as ayer,
  (CURRENT_DATE - INTERVAL '2 months')::DATE as hace_dos_meses
FROM ordenes_pago 
WHERE LOWER(estado) = 'solicitada';

-- 5. VER REGISTROS ACTUALIZADOS
-- =====================================================
SELECT id, fecha_solicitud, estado, proveedor 
FROM ordenes_pago 
WHERE LOWER(estado) = 'solicitada'
ORDER BY fecha_solicitud DESC 
LIMIT 10;

-- 6. VERIFICAR DISTRIBUCIÓN POR MES
-- =====================================================
SELECT 
  DATE_TRUNC('month', fecha_solicitud)::DATE as mes,
  COUNT(*) as cantidad_ordenes
FROM ordenes_pago 
WHERE LOWER(estado) = 'solicitada'
GROUP BY DATE_TRUNC('month', fecha_solicitud)
ORDER BY mes DESC;
