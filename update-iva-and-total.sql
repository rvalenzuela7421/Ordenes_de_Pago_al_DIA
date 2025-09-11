-- =====================================================
-- SCRIPT PARA ACTUALIZAR IVA Y TOTAL SOLICITUD
-- =====================================================
-- 
-- PROPÓSITO:
-- 1. Calcular y actualizar el campo "iva" como 19% del "monto_solicitud"
-- 2. Calcular y actualizar el campo "total_solicitud" como suma de "monto_solicitud" + "iva"
--
-- TABLA OBJETIVO: ordenes_pago
-- CAMPOS A ACTUALIZAR: iva, total_solicitud
--
-- =====================================================

-- Mostrar información ANTES de los cambios
SELECT 
  'ANTES DE LOS CAMBIOS' as status,
  COUNT(*) as total_registros,
  SUM(monto_solicitud) as suma_monto_solicitud,
  SUM(iva) as suma_iva_actual,
  SUM(total_solicitud) as suma_total_actual
FROM ordenes_pago;

-- =====================================================
-- PASO 1: ACTUALIZAR CAMPO IVA (19% del monto_solicitud)
-- =====================================================

UPDATE ordenes_pago 
SET iva = ROUND(monto_solicitud * 0.19, 2)
WHERE monto_solicitud IS NOT NULL 
  AND monto_solicitud > 0;

-- Verificar actualización del IVA
SELECT 
  'DESPUÉS DE ACTUALIZAR IVA' as status,
  COUNT(*) as registros_actualizados,
  SUM(monto_solicitud) as suma_monto_solicitud,
  SUM(iva) as suma_iva_nueva,
  AVG(iva / monto_solicitud * 100) as porcentaje_iva_promedio
FROM ordenes_pago 
WHERE monto_solicitud > 0;

-- =====================================================
-- PASO 2: ACTUALIZAR CAMPO TOTAL_SOLICITUD (monto_solicitud + iva)
-- =====================================================

UPDATE ordenes_pago 
SET total_solicitud = ROUND(monto_solicitud + iva, 2)
WHERE monto_solicitud IS NOT NULL 
  AND iva IS NOT NULL;

-- =====================================================
-- VERIFICACIÓN FINAL DE RESULTADOS
-- =====================================================

-- Mostrar resumen DESPUÉS de todos los cambios
SELECT 
  'DESPUÉS DE TODOS LOS CAMBIOS' as status,
  COUNT(*) as total_registros,
  SUM(monto_solicitud) as suma_monto_solicitud,
  SUM(iva) as suma_iva_final,
  SUM(total_solicitud) as suma_total_final,
  ROUND(AVG(iva / monto_solicitud * 100), 2) as porcentaje_iva_promedio
FROM ordenes_pago
WHERE monto_solicitud > 0;

-- Verificar que las sumas son correctas (total = monto + iva)
SELECT 
  'VERIFICACIÓN DE COHERENCIA' as status,
  COUNT(*) as registros_verificados,
  COUNT(CASE WHEN ABS(total_solicitud - (monto_solicitud + iva)) < 0.01 THEN 1 END) as registros_correctos,
  COUNT(CASE WHEN ABS(total_solicitud - (monto_solicitud + iva)) >= 0.01 THEN 1 END) as registros_con_diferencias
FROM ordenes_pago
WHERE monto_solicitud IS NOT NULL 
  AND iva IS NOT NULL 
  AND total_solicitud IS NOT NULL;

-- Mostrar algunos ejemplos de registros para verificación manual
SELECT 
  id,
  numero_op,
  monto_solicitud,
  iva,
  total_solicitud,
  ROUND(monto_solicitud * 0.19, 2) as iva_calculado,
  ROUND(monto_solicitud + iva, 2) as total_calculado,
  estado
FROM ordenes_pago 
WHERE monto_solicitud > 0
ORDER BY id 
LIMIT 10;

-- =====================================================
-- REPORTE FINAL POR ESTADO
-- =====================================================

SELECT 
  estado,
  COUNT(*) as cantidad,
  SUM(monto_solicitud) as total_monto_solicitud,
  SUM(iva) as total_iva,
  SUM(total_solicitud) as total_con_iva,
  ROUND(AVG(iva / monto_solicitud * 100), 2) as porcentaje_iva_promedio
FROM ordenes_pago 
WHERE monto_solicitud > 0
GROUP BY estado
ORDER BY cantidad DESC;

-- =====================================================
-- LOGS DE AUDITORÍA
-- =====================================================

SELECT 
  CURRENT_TIMESTAMP as fecha_ejecucion,
  'Script IVA y Total ejecutado exitosamente' as mensaje,
  COUNT(*) as registros_procesados
FROM ordenes_pago;
