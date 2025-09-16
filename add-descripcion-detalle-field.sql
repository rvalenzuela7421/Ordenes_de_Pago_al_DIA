-- ============================================================================
-- AGREGAR CAMPO DESCRIPCION_DETALLE A TABLA PARAMETROS
-- Campo tipo texto de 500 caracteres para información detallada adicional
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
ORDER BY ordinal_position;

-- 2. AGREGAR EL NUEVO CAMPO
-- ============================================================================
-- Agregar campo descripcion_detalle de 500 caracteres (opcional)
ALTER TABLE public.parametros 
ADD COLUMN IF NOT EXISTS descripcion_detalle VARCHAR(500);

-- 3. AGREGAR COMENTARIO AL CAMPO
-- ============================================================================
COMMENT ON COLUMN public.parametros.descripcion_detalle IS 'Información detallada adicional para el parámetro (máximo 500 caracteres)';

-- 4. CREAR ÍNDICE PARA BÚSQUEDAS EN EL NUEVO CAMPO (OPCIONAL)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_parametros_descripcion_detalle 
ON public.parametros(descripcion_detalle) 
WHERE descripcion_detalle IS NOT NULL;

-- 5. VERIFICAR ESTRUCTURA DESPUÉS DEL CAMBIO
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
ORDER BY ordinal_position;

-- 6. MOSTRAR TODOS LOS REGISTROS PARA VERIFICAR
-- ============================================================================
SELECT 
    id,
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    descripcion_detalle,  -- <- NUEVO CAMPO
    orden,
    vigente,
    created_at
FROM public.parametros
ORDER BY nombre_grupo, orden, valor_dominio
LIMIT 10;

-- 7. ESTADÍSTICAS DEL NUEVO CAMPO
-- ============================================================================
SELECT 
    'Total registros' as descripcion,
    COUNT(*) as cantidad
FROM public.parametros

UNION ALL

SELECT 
    'Registros con descripcion_detalle',
    COUNT(*)
FROM public.parametros
WHERE descripcion_detalle IS NOT NULL AND descripcion_detalle != ''

UNION ALL

SELECT 
    'Registros sin descripcion_detalle',
    COUNT(*)
FROM public.parametros
WHERE descripcion_detalle IS NULL OR descripcion_detalle = '';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. El campo descripcion_detalle es OPCIONAL (NULL permitido)
-- 2. Máximo 500 caracteres como solicitado
-- 3. Se puede usar para información adicional, instrucciones, 
--    configuraciones complejas, etc.
-- 4. El índice ayudará con búsquedas si el campo se usa frecuentemente
-- 5. Compatibilidad: Los registros existentes no se ven afectados
-- ============================================================================
