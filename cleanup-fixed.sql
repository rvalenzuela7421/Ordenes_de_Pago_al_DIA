-- ============================================================================
-- LIMPIEZA DE BASE DE DATOS - VERSIÓN SIN ERRORES
-- ============================================================================
-- Script optimizado que evita el error de VACUUM en transacciones

-- Limpiar órdenes de pago
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_pago') THEN
        RAISE NOTICE 'Limpiando ordenes_pago...';
        DELETE FROM public.ordenes_pago;
        RAISE NOTICE 'ordenes_pago limpiada: % registros eliminados', found;
    END IF;
END $$;

-- Limpiar audit logs
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        RAISE NOTICE 'Limpiando audit_logs...';
        DELETE FROM public.audit_logs;
        RAISE NOTICE 'audit_logs limpiada: % registros eliminados', found;
    END IF;
END $$;

-- Limpiar solicitudes_op (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'solicitudes_op') THEN
        RAISE NOTICE 'Limpiando solicitudes_op...';
        DELETE FROM public.solicitudes_op;
        RAISE NOTICE 'solicitudes_op limpiada: % registros eliminados', found;
    END IF;
END $$;

-- Reiniciar secuencias
DO $$ 
BEGIN
    -- Reiniciar secuencia de ordenes_pago si existe
    IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_schema = 'public' AND sequence_name = 'ordenes_pago_id_seq') THEN
        ALTER SEQUENCE public.ordenes_pago_id_seq RESTART WITH 1;
        RAISE NOTICE 'Secuencia ordenes_pago_id_seq reiniciada';
    END IF;
    
    -- Reiniciar secuencia de audit_logs si existe
    IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_schema = 'public' AND sequence_name = 'audit_logs_id_seq') THEN
        ALTER SEQUENCE public.audit_logs_id_seq RESTART WITH 1;
        RAISE NOTICE 'Secuencia audit_logs_id_seq reiniciada';
    END IF;
END $$;

-- Verificación final
DO $$ 
DECLARE
    ordenes_count int;
    usuarios_count int;
BEGIN
    -- Contar órdenes restantes
    SELECT COUNT(*) INTO ordenes_count FROM public.ordenes_pago;
    RAISE NOTICE 'Órdenes restantes después de limpieza: %', ordenes_count;
    
    -- Verificar usuarios mantenidos
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        SELECT COUNT(*) INTO usuarios_count FROM auth.users;
        RAISE NOTICE 'Usuarios mantenidos (NO eliminados): %', usuarios_count;
    END IF;
    
    RAISE NOTICE '✅ LIMPIEZA COMPLETADA EXITOSAMENTE';
END $$;

-- ============================================================================
-- RESUMEN
-- ============================================================================
SELECT 'LIMPIEZA COMPLETADA' as status, 
       'Se mantuvieron usuarios y datos de autenticación' as nota;
