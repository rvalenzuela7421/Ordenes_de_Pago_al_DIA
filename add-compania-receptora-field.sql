-- ============================================================================
-- AGREGAR CAMPO COMPANIA_RECEPTORA A TABLA ORDENES_PAGO
-- Este campo almacenará la empresa del Grupo Bolívar asociada a cada orden
-- ============================================================================

-- 1. VERIFICAR LA ESTRUCTURA ACTUAL DE LA TABLA
-- ============================================================================
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. AGREGAR EL NUEVO CAMPO (INICIALMENTE NULLABLE)
-- ============================================================================
-- Campo para almacenar el valor completo de la empresa (ej: NT-901438242-SALUD BOLIVAR EPS S.A.S.)
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS compania_receptora TEXT;

-- 3. AGREGAR COMENTARIO AL CAMPO
-- ============================================================================
COMMENT ON COLUMN public.ordenes_pago.compania_receptora 
IS 'Empresa del Grupo Bolívar que recibe la orden de pago. Valor desde tabla parametros grupo GRUPO_BOLIVAR';

-- 4. ASIGNAR VALORES ALEATORIOS DE GRUPO_BOLIVAR A REGISTROS EXISTENTES
-- ============================================================================
-- Actualizar registros existentes con empresas aleatorias del GRUPO_BOLIVAR
UPDATE public.ordenes_pago 
SET compania_receptora = (
    SELECT valor_dominio 
    FROM public.parametros 
    WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
      AND vigente = 'S'
    ORDER BY RANDOM() 
    LIMIT 1
)
WHERE compania_receptora IS NULL;

-- 5. HACER EL CAMPO OBLIGATORIO (NOT NULL)
-- ============================================================================
-- Una vez que todos los registros tienen valor, hacer el campo requerido
ALTER TABLE public.ordenes_pago 
ALTER COLUMN compania_receptora SET NOT NULL;

-- 6. VERIFICAR QUE EL CAMPO SE AGREGÓ CORRECTAMENTE
-- ============================================================================
SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public' 
  AND column_name = 'compania_receptora';

-- 7. MOSTRAR ALGUNAS ÓRDENES PARA VER LA NUEVA ESTRUCTURA
-- ============================================================================
SELECT 
    id,
    proveedor,
    compania_receptora,
    estado,
    monto_solicitud,
    fecha_solicitud
FROM public.ordenes_pago 
LIMIT 5;

-- 8. ESTADÍSTICAS DE DISTRIBUCIÓN DE EMPRESAS ASIGNADAS
-- ============================================================================
SELECT 
    compania_receptora,
    COUNT(*) as cantidad_ordenes,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago), 2) as porcentaje
FROM public.ordenes_pago 
GROUP BY compania_receptora
ORDER BY cantidad_ordenes DESC;

-- 9. CONTAR TOTAL DE ÓRDENES CON COMPAÑÍA RECEPTORA
-- ============================================================================
SELECT 
    COUNT(*) as total_ordenes,
    COUNT(CASE WHEN compania_receptora IS NOT NULL THEN 1 END) as con_compania,
    COUNT(CASE WHEN compania_receptora IS NULL THEN 1 END) as sin_compania
FROM public.ordenes_pago;

-- 10. MENSAJE DE CONFIRMACIÓN
-- ============================================================================
SELECT 'Campo compania_receptora agregado como OBLIGATORIO con valores aleatorios de GRUPO_BOLIVAR' as resultado;