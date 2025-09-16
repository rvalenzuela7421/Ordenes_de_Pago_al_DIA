-- ============================================================================
-- AGREGAR CAMPO REGLA A TABLA PARAMETROS
-- Campo tipo texto de 500 caracteres para reglas y configuraciones adicionales
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
-- Agregar campo regla de 500 caracteres (opcional)
ALTER TABLE public.parametros 
ADD COLUMN IF NOT EXISTS regla VARCHAR(500);

-- 3. AGREGAR COMENTARIO AL CAMPO
-- ============================================================================
COMMENT ON COLUMN public.parametros.regla IS 'Reglas y configuraciones adicionales para el parámetro (máximo 500 caracteres)';

-- 4. CREAR ÍNDICE PARA BÚSQUEDAS EN EL NUEVO CAMPO (OPCIONAL)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_parametros_regla 
ON public.parametros(regla) 
WHERE regla IS NOT NULL;

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
    regla,  -- <- NUEVO CAMPO
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
    'Registros con regla',
    COUNT(*)
FROM public.parametros
WHERE regla IS NOT NULL AND regla != ''

UNION ALL

SELECT 
    'Registros sin regla',
    COUNT(*)
FROM public.parametros
WHERE regla IS NULL OR regla = '';

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. El campo regla es OPCIONAL (NULL permitido)
-- 2. Máximo 500 caracteres como solicitado
-- 3. Se puede usar para reglas de negocio, validaciones, 
--    configuraciones especiales, etc.
-- 4. El índice ayudará con búsquedas si el campo se usa frecuentemente
-- 5. Compatibilidad: Los registros existentes no se ven afectados
-- ============================================================================
