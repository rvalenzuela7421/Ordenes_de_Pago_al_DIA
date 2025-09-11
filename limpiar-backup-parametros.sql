-- ============================================================================
-- LIMPIAR TABLA BACKUP DE PARAMETROS
-- Elimina la tabla de backup ya que los parámetros están restaurados
-- ============================================================================

-- 1. VERIFICAR QUE LA TABLA PRINCIPAL TIENE TODOS LOS PARÁMETROS
-- ============================================================================
SELECT 'Verificando tabla principal antes de eliminar backup...' as accion;

SELECT 
    nombre_grupo,
    COUNT(*) as cantidad
FROM public.parametros 
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 2. MOSTRAR CONTENIDO DEL BACKUP (ÚLTIMO VISTAZO)
-- ============================================================================
SELECT 'Contenido del backup que se eliminará:' as info;

SELECT 
    nombre_grupo,
    COUNT(*) as cantidad
FROM public.parametros_backup 
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 3. ELIMINAR TABLA BACKUP COMPLETAMENTE
-- ============================================================================
DROP TABLE IF EXISTS public.parametros_backup CASCADE;

-- 4. VERIFICAR QUE SE ELIMINÓ CORRECTAMENTE
-- ============================================================================
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'parametros_backup' 
              AND table_schema = 'public'
        ) THEN 'La tabla backup AÚN EXISTE'
        ELSE 'Tabla backup ELIMINADA correctamente'
    END as resultado;

-- 5. CONFIRMAR ESTADO FINAL DE LA TABLA PRINCIPAL
-- ============================================================================
SELECT 
    COUNT(*) as total_parametros,
    COUNT(DISTINCT nombre_grupo) as grupos_diferentes,
    STRING_AGG(DISTINCT nombre_grupo, ', ' ORDER BY nombre_grupo) as grupos_disponibles
FROM public.parametros;

-- 6. MENSAJE DE CONFIRMACIÓN
-- ============================================================================
SELECT 'Tabla backup eliminada - Parámetros restaurados completamente en tabla principal' as resultado_final;

