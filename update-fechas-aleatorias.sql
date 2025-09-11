-- Script para actualizar fecha_solicitud con fechas aleatorias
-- Solo para registros con estado 'solicitada' (minúsculas)
-- Rango: desde ayer hasta máximo 2 meses hacia atrás

-- Primero, verificar cuántos registros tienen estado 'solicitada'
SELECT 
  COUNT(*) as total_solicitadas,
  MIN(fecha_solicitud) as fecha_min_actual,
  MAX(fecha_solicitud) as fecha_max_actual
FROM ordenes_pago 
WHERE estado = 'solicitada';

-- Ver algunos registros actuales
SELECT id, fecha_solicitud, estado, proveedor 
FROM ordenes_pago 
WHERE estado = 'solicitada' 
ORDER BY fecha_solicitud 
LIMIT 5;

-- Actualizar las fechas de solicitud con valores aleatorios
-- Rango: desde ayer (CURRENT_DATE - 1) hasta 2 meses atrás (aproximadamente 60 días)
UPDATE ordenes_pago 
SET fecha_solicitud = (
  CURRENT_DATE - 1 - (RANDOM() * 59)::INTEGER
)::DATE
WHERE estado = 'solicitada';

-- Verificar los cambios realizados
SELECT 
  COUNT(*) as registros_actualizados,
  MIN(fecha_solicitud) as nueva_fecha_min,
  MAX(fecha_solicitud) as nueva_fecha_max,
  CURRENT_DATE - 1 as ayer,
  (CURRENT_DATE - INTERVAL '2 months')::DATE as hace_dos_meses
FROM ordenes_pago 
WHERE estado = 'solicitada';

-- Ver algunos registros actualizados
SELECT id, fecha_solicitud, estado, proveedor 
FROM ordenes_pago 
WHERE estado = 'solicitada' 
ORDER BY fecha_solicitud DESC 
LIMIT 10;

-- Verificar distribución por mes
SELECT 
  DATE_TRUNC('month', fecha_solicitud)::DATE as mes,
  COUNT(*) as cantidad_ordenes
FROM ordenes_pago 
WHERE estado = 'solicitada'
GROUP BY DATE_TRUNC('month', fecha_solicitud)
ORDER BY mes DESC;
