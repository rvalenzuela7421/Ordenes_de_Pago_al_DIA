-- ============================================================================
-- LIMPIEZA RÁPIDA - SOLO DATOS TRANSACCIONALES
-- ============================================================================
-- Script simple para limpiar rápidamente los datos sin afectar usuarios

-- LIMPIAR ÓRDENES DE PAGO
DELETE FROM public.ordenes_pago;

-- LIMPIAR LOGS DE AUDITORÍA (si existe)
DELETE FROM public.audit_logs WHERE true;

-- LIMPIAR SOLICITUDES (si existe)  
DELETE FROM public.solicitudes_op WHERE true;

-- REINICIAR SECUENCIAS
ALTER SEQUENCE IF EXISTS public.ordenes_pago_id_seq RESTART WITH 1;

-- VERIFICAR
SELECT 'LIMPIEZA RÁPIDA COMPLETADA' as resultado;
SELECT COUNT(*) as ordenes_restantes FROM public.ordenes_pago;
SELECT COUNT(*) as usuarios_mantenidos FROM auth.users;

-- NOTA: Ejecutar por separado después si es necesario:
-- VACUUM;
-- ANALYZE;
