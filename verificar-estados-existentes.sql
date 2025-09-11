-- Script para verificar qué estados existen en la tabla ordenes_pago
-- y luego actualizar las fechas correctamente

-- 1. VERIFICAR QUÉ ESTADOS EXISTEN EXACTAMENTE
-- =====================================================
SELECT 
  estado,
  COUNT(*) as cantidad,
  MIN(fecha_solicitud) as fecha_min,
  MAX(fecha_solicitud) as fecha_max
FROM ordenes_pago 
GROUP BY estado 
ORDER BY cantidad DESC;

-- 2. VERIFICAR TODOS LOS REGISTROS (PRIMEROS 10)
-- =====================================================
SELECT id, fecha_solicitud, estado, proveedor 
FROM ordenes_pago 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. BUSCAR REGISTROS SIMILARES A 'SOLICITADA' (cualquier capitalización)
-- =====================================================
SELECT 
  estado,
  COUNT(*) as cantidad
FROM ordenes_pago 
WHERE LOWER(estado) = 'solicitada'
GROUP BY estado;

-- 4. VER ALGUNOS REGISTROS CON ESTADO SIMILAR A SOLICITADA
-- =====================================================
SELECT id, fecha_solicitud, estado, proveedor 
FROM ordenes_pago 
WHERE LOWER(estado) LIKE '%solicit%'
ORDER BY fecha_solicitud 
LIMIT 10;

-- 5. CONTAR TOTAL DE REGISTROS
-- =====================================================
SELECT COUNT(*) as total_registros FROM ordenes_pago;
