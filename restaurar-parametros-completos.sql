-- ============================================================================
-- RESTAURAR TODOS LOS PARÁMETROS DESDE BACKUP
-- Recupera todos los parámetros que estaban en la tabla original
-- ============================================================================

-- 1. VERIFICAR QUE EXISTE EL BACKUP
-- ============================================================================
SELECT 'Verificando backup...' as accion;

SELECT 
    nombre_grupo,
    COUNT(*) as cantidad
FROM public.parametros_backup 
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 2. INSERTAR TODOS LOS PARÁMETROS DESDE BACKUP (EXCEPTO DUPLICADOS)
-- ============================================================================
-- Insertar solo los que no existen actualmente
INSERT INTO public.parametros (
    nombre_grupo,
    descripcion_grupo, 
    valor_dominio,
    orden,
    vigente,
    created_at,
    updated_at
)
SELECT 
    b.nombre_grupo,
    b.descripcion_grupo,
    b.valor_dominio,
    b.orden,
    b.vigente,
    b.created_at,
    b.updated_at
FROM public.parametros_backup b
WHERE NOT EXISTS (
    SELECT 1 
    FROM public.parametros p 
    WHERE p.nombre_grupo = b.nombre_grupo 
      AND p.valor_dominio = b.valor_dominio
);

-- 3. ALTERNATIVAMENTE: INSERTAR PARÁMETROS FALTANTES MANUALMENTE
-- ============================================================================
-- Si no existe backup, insertar los parámetros estándar:

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) VALUES
-- ESTADOS DE SOLICITUD
('ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Solicitada', 1, 'S'),
('ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Devuelta', 2, 'S'),
('ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Generada', 3, 'S'),
('ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Aprobada', 4, 'S'),
('ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Pagada', 5, 'S'),

-- TIPOS DE DOCUMENTO
('TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'CC', 1, 'S'),
('TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'CE', 2, 'S'), 
('TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'NIT', 3, 'S'),
('TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'TI', 4, 'S'),
('TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'PA', 5, 'S'),

-- PRIORIDADES
('PRIORIDADES', 'Niveles de prioridad para órdenes de pago', 'Alta', 1, 'S'),
('PRIORIDADES', 'Niveles de prioridad para órdenes de pago', 'Media', 2, 'S'),
('PRIORIDADES', 'Niveles de prioridad para órdenes de pago', 'Baja', 3, 'S'),

-- CONFIGURACIÓN SISTEMA
('CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'MONEDA_BASE', 1, 'S'),
('CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'COP', 2, 'S'),
('CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'ZONA_HORARIA', 3, 'S'),
('CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'America/Bogota', 4, 'S')

ON CONFLICT (nombre_grupo, valor_dominio) DO NOTHING;

-- 4. VERIFICAR RESULTADO FINAL
-- ============================================================================
SELECT 
    nombre_grupo,
    COUNT(*) as cantidad,
    STRING_AGG(valor_dominio, ', ' ORDER BY orden) as valores
FROM public.parametros 
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 5. MOSTRAR TOTALES POR GRUPO
-- ============================================================================
SELECT 
    COUNT(*) as total_parametros,
    COUNT(DISTINCT nombre_grupo) as grupos_diferentes
FROM public.parametros;

-- 6. MENSAJE DE CONFIRMACIÓN
-- ============================================================================
SELECT 'Parámetros restaurados completamente desde backup + nuevos parámetros' as resultado;


