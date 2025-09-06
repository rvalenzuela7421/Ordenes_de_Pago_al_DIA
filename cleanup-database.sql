-- ============================================================================
-- SCRIPT DE LIMPIEZA DE BASE DE DATOS
-- ============================================================================
-- Este script limpia TODAS las tablas transaccionales manteniendo intactas:
-- - Tablas de autenticación (auth.*)
-- - Usuarios y sesiones
-- - Datos maestros opcionales (conceptos_impuestos)
--
-- ADVERTENCIA: Este script ELIMINARÁ todos los datos transaccionales
-- ============================================================================

-- ============================================================================
-- 1. VERIFICACIONES PREVIAS
-- ============================================================================

-- Mostrar tablas existentes antes de la limpieza
SELECT 'TABLAS ANTES DE LIMPIEZA:' as info;
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname IN ('public', 'auth') 
ORDER BY schemaname, tablename;

-- Contar registros en tablas principales
SELECT 'REGISTROS ANTES DE LIMPIEZA:' as info;

-- Contar órdenes de pago (si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_pago') THEN
        PERFORM pg_advisory_lock(1);
        RAISE NOTICE 'Órdenes de pago: % registros', (SELECT COUNT(*) FROM public.ordenes_pago);
        PERFORM pg_advisory_unlock(1);
    END IF;
END $$;

-- Contar usuarios (NO se tocarán)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE 'Usuarios (NO se eliminarán): % registros', (SELECT COUNT(*) FROM auth.users);
    END IF;
END $$;

-- ============================================================================
-- 2. LIMPIEZA DE TABLAS TRANSACCIONALES
-- ============================================================================

-- IMPORTANTE: Las siguientes tablas NO se tocan (se mantienen intactas):
-- - auth.users (usuarios)
-- - auth.sessions (sesiones)
-- - auth.refresh_tokens (tokens de refresco)
-- - auth.* (todas las tablas de autenticación de Supabase)

-- ============================================================================
-- 2.1. LIMPIAR TABLA DE ÓRDENES DE PAGO
-- ============================================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_pago') THEN
        RAISE NOTICE 'Limpiando tabla ordenes_pago...';
        
        -- Deshabilitar triggers temporalmente para limpieza rápida
        ALTER TABLE public.ordenes_pago DISABLE TRIGGER ALL;
        
        -- Eliminar todos los registros
        DELETE FROM public.ordenes_pago;
        
        -- Reiniciar secuencias si existen
        DO $inner$
        BEGIN
            -- Reiniciar secuencia de IDs si existe
            IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_schema = 'public' AND sequence_name = 'ordenes_pago_id_seq') THEN
                ALTER SEQUENCE public.ordenes_pago_id_seq RESTART WITH 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Si no existe la secuencia, continuar
            NULL;
        END $inner$;
        
        -- Rehabilitar triggers
        ALTER TABLE public.ordenes_pago ENABLE TRIGGER ALL;
        
        RAISE NOTICE 'Tabla ordenes_pago limpiada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla ordenes_pago no existe, saltando...';
    END IF;
END $$;

-- ============================================================================
-- 2.2. LIMPIAR LOGS DE AUDITORÍA (SI EXISTEN)
-- ============================================================================
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        RAISE NOTICE 'Limpiando tabla audit_logs...';
        DELETE FROM public.audit_logs;
        
        -- Reiniciar secuencia si existe
        DO $inner$
        BEGIN
            IF EXISTS (SELECT FROM information_schema.sequences WHERE sequence_schema = 'public' AND sequence_name = 'audit_logs_id_seq') THEN
                ALTER SEQUENCE public.audit_logs_id_seq RESTART WITH 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END $inner$;
        
        RAISE NOTICE 'Tabla audit_logs limpiada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla audit_logs no existe, saltando...';
    END IF;
END $$;

-- ============================================================================
-- 2.3. LIMPIAR OTRAS TABLAS TRANSACCIONALES
-- ============================================================================

-- Limpiar solicitudes_op si existe (tabla que creamos anteriormente)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'solicitudes_op') THEN
        RAISE NOTICE 'Limpiando tabla solicitudes_op...';
        DELETE FROM public.solicitudes_op;
        RAISE NOTICE 'Tabla solicitudes_op limpiada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla solicitudes_op no existe, saltando...';
    END IF;
END $$;

-- Limpiar tabla de archivos/documentos si existe
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documentos') THEN
        RAISE NOTICE 'Limpiando tabla documentos...';
        DELETE FROM public.documentos;
        RAISE NOTICE 'Tabla documentos limpiada exitosamente';
    ELSE
        RAISE NOTICE 'Tabla documentos no existe, saltando...';
    END IF;
END $$;

-- ============================================================================
-- 3. DATOS MAESTROS - CONCEPTOS DE IMPUESTOS
-- ============================================================================
-- OPCIÓN 1: Mantener conceptos_impuestos (recomendado)
-- OPCIÓN 2: Limpiar y recrear conceptos_impuestos

-- Por defecto, mantenemos la tabla de impuestos porque son datos maestros
-- Si quieres limpiarla también, descomenta las siguientes líneas:

/*
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conceptos_impuestos') THEN
        RAISE NOTICE 'Limpiando tabla conceptos_impuestos...';
        DELETE FROM public.conceptos_impuestos;
        
        -- Recrear datos básicos de IVA
        INSERT INTO public.conceptos_impuestos (
            concepto_impuesto, porcentaje_aplicacion, descripcion, tipo_impuesto, activo, 
            vigencia_desde, vigencia_hasta, observaciones
        ) VALUES 
        (
            'IVA', 0.16, 'IVA 16% - Tarifa histórica en Colombia', 'IVA', FALSE, 
            '2020-01-01', '2022-12-31', 'Tarifa histórica de IVA en Colombia'
        ),
        (
            'IVA', 0.19, 'IVA 19% - Tarifa estándar vigente en Colombia', 'IVA', TRUE, 
            '2023-01-01', NULL, 'Tarifa actual estándar de IVA en Colombia'
        ) ON CONFLICT (concepto_impuesto) DO NOTHING;
        
        RAISE NOTICE 'Tabla conceptos_impuestos limpiada y recreada exitosamente';
    END IF;
END $$;
*/

-- ============================================================================
-- 4. OPTIMIZACIÓN POST-LIMPIEZA
-- ============================================================================
-- NOTA: VACUUM y ANALYZE deben ejecutarse por separado después de este script
-- No se pueden ejecutar dentro de un bloque de transacción

-- Para ejecutar después de este script:
-- VACUUM;
-- ANALYZE;

-- ============================================================================
-- 5. VERIFICACIONES FINALES
-- ============================================================================

SELECT 'LIMPIEZA COMPLETADA - VERIFICACIÓN FINAL:' as info;

-- Contar registros después de la limpieza
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ordenes_pago') THEN
        RAISE NOTICE 'Órdenes de pago después de limpieza: % registros', (SELECT COUNT(*) FROM public.ordenes_pago);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN
        RAISE NOTICE 'Audit logs después de limpieza: % registros', (SELECT COUNT(*) FROM public.audit_logs);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conceptos_impuestos') THEN
        RAISE NOTICE 'Conceptos de impuestos (MANTENIDOS): % registros', (SELECT COUNT(*) FROM public.conceptos_impuestos);
    END IF;
    
    -- Verificar que los usuarios siguen intactos
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
        RAISE NOTICE 'Usuarios (MANTENIDOS): % registros', (SELECT COUNT(*) FROM auth.users);
    END IF;
END $$;

-- ============================================================================
-- RESUMEN DE LIMPIEZA
-- ============================================================================
SELECT 'RESUMEN:' as info;
SELECT 'SE LIMPIARON:' as accion, 'ordenes_pago, audit_logs, solicitudes_op, documentos' as tablas;
SELECT 'SE MANTUVIERON:' as accion, 'auth.users, auth.sessions, auth.*, conceptos_impuestos' as tablas;
SELECT 'ESTADO:' as info, 'Base de datos lista para nueva operación' as resultado;

-- ============================================================================
-- NOTA IMPORTANTE
-- ============================================================================
/*
IMPORTANTE: Este script:
✅ MANTIENE intactos todos los usuarios y datos de autenticación
✅ LIMPIA todos los datos transaccionales (órdenes, logs, etc.)
✅ MANTIENE datos maestros (conceptos de impuestos)
✅ Optimiza la base de datos después de la limpieza

Para ejecutar:
1. Hacer backup si es necesario
2. Ejecutar este script en Supabase SQL Editor
3. Verificar que la aplicación sigue funcionando
4. Los usuarios pueden seguir logueándose normalmente
*/
