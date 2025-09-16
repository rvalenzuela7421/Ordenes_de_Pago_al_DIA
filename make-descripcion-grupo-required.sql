-- ============================================================================
-- HACER CAMPO DESCRIPCION_GRUPO OBLIGATORIO EN TABLA PARAMETROS
-- Actualizar constraint para que sea NOT NULL y agregar valores por defecto
-- ============================================================================

-- 1. VERIFICAR ESTRUCTURA ACTUAL ANTES DEL CAMBIO
-- ============================================================================
SELECT 
    table_name,
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'parametros' 
    AND table_schema = 'public'
    AND column_name IN ('nombre_grupo', 'descripcion_grupo', 'valor_dominio')
ORDER BY ordinal_position;

-- 2. VERIFICAR REGISTROS CON DESCRIPCION_GRUPO NULL O VACÍA
-- ============================================================================
SELECT 
    COUNT(*) as total_registros,
    COUNT(descripcion_grupo) as con_descripcion,
    COUNT(*) - COUNT(descripcion_grupo) as sin_descripcion
FROM public.parametros;

-- Mostrar registros que necesitan actualización
SELECT 
    id,
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    created_at
FROM public.parametros 
WHERE descripcion_grupo IS NULL 
   OR descripcion_grupo = ''
   OR LENGTH(TRIM(descripcion_grupo)) = 0
ORDER BY nombre_grupo, orden;

-- 3. ACTUALIZAR REGISTROS CON DESCRIPCION_GRUPO VACÍA
-- ============================================================================
-- Actualizar registros sin descripción con valor por defecto basado en el grupo
UPDATE public.parametros 
SET descripcion_grupo = CASE 
    WHEN nombre_grupo = 'GRUPO_BOLIVAR' THEN 'Empresas que conforman al Grupo Bolívar'
    WHEN nombre_grupo = 'ESTADOS_SOLICITUD' THEN 'Estados permitidos para las solicitudes de pago'
    WHEN nombre_grupo = 'CONFIGURACION_IVA' THEN 'Configuración de impuestos y valores agregados'
    WHEN nombre_grupo = 'TIPOS_DOCUMENTO' THEN 'Tipos de documento de identificación válidos'
    WHEN nombre_grupo = 'TIPOS_PERSONA' THEN 'Tipos de persona para clasificación de proveedores'
    WHEN nombre_grupo = 'CONFIGURACION_SISTEMA' THEN 'Configuraciones generales del sistema'
    WHEN nombre_grupo = 'PRIORIDADES' THEN 'Niveles de prioridad para procesamiento de solicitudes'
    WHEN nombre_grupo = 'TIPO_SOLICITUD_PAGO' THEN 'Tipos de solicitud de pago disponibles en el sistema'
    WHEN nombre_grupo = 'ACREEDORES' THEN 'Proveedores y acreedores autorizados para pagos'
    WHEN nombre_grupo = 'CONCEPTOS_PAGO' THEN 'Conceptos válidos para solicitudes de pago'
    ELSE CONCAT('Parámetros de configuración para ', nombre_grupo)
END
WHERE descripcion_grupo IS NULL 
   OR descripcion_grupo = ''
   OR LENGTH(TRIM(descripcion_grupo)) = 0;

-- 4. VERIFICAR ACTUALIZACIÓN
-- ============================================================================
SELECT 
    COUNT(*) as total_después,
    COUNT(descripcion_grupo) as con_descripción_después,
    COUNT(*) - COUNT(descripcion_grupo) as sin_descripción_después
FROM public.parametros;

-- 5. AGREGAR CONSTRAINT NOT NULL AL CAMPO
-- ============================================================================
DO $$ 
BEGIN
    -- Verificar si el constraint ya existe o si hay valores NULL
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parametros' 
          AND column_name = 'descripcion_grupo' 
          AND is_nullable = 'NO'
    ) THEN
        -- Agregar constraint NOT NULL
        ALTER TABLE public.parametros 
        ALTER COLUMN descripcion_grupo SET NOT NULL;
        
        RAISE NOTICE 'Constraint NOT NULL agregado a descripcion_grupo exitosamente';
    ELSE
        RAISE NOTICE 'El campo descripcion_grupo ya es NOT NULL';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Error al agregar constraint NOT NULL: %. Verificar que no existan valores NULL.', SQLERRM;
END $$;

-- 6. VERIFICAR CONSTRAINT APLICADO
-- ============================================================================
SELECT 
    column_name, 
    is_nullable,
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'parametros' 
  AND table_schema = 'public'
  AND column_name = 'descripcion_grupo';

-- 7. VERIFICAR ALGUNOS REGISTROS ACTUALIZADOS
-- ============================================================================
SELECT 
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    vigente
FROM public.parametros 
ORDER BY nombre_grupo, orden
LIMIT 20;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Este script actualiza registros existentes con valores por defecto
-- 2. Agrega constraint NOT NULL para evitar futuros valores vacíos
-- 3. Es compatible con la validación del código frontend/backend
-- 4. Los valores por defecto se basan en patrones comunes de cada grupo
-- 5. Después de ejecutar, todos los nuevos registros requerirán descripcion_grupo
-- 
-- ⚠️  IMPORTANTE: 
-- - Ejecutar en entorno de desarrollo primero
-- - Hacer backup antes de ejecutar en producción
-- - Verificar que no hay valores NULL antes del constraint
-- ============================================================================
