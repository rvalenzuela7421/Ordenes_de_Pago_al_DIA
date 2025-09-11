-- ============================================================================
-- RESTAURAR PARÁMETROS SIN ON CONFLICT
-- Versión corregida sin usar ON CONFLICT (evita errores de constraint)
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

-- 2. RESTAURAR DESDE BACKUP (SI EXISTE) - SIN DUPLICADOS
-- ============================================================================
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

-- 3. INSERTAR PARÁMETROS FALTANTES MANUALMENTE (SI NO EXISTEN)
-- ============================================================================

-- ESTADOS DE SOLICITUD
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Solicitada', 1, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ESTADOS_SOLICITUD' AND valor_dominio = 'Solicitada');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Devuelta', 2, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ESTADOS_SOLICITUD' AND valor_dominio = 'Devuelta');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Generada', 3, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ESTADOS_SOLICITUD' AND valor_dominio = 'Generada');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Aprobada', 4, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ESTADOS_SOLICITUD' AND valor_dominio = 'Aprobada');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'ESTADOS_SOLICITUD', 'Estados válidos para órdenes de pago', 'Pagada', 5, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ESTADOS_SOLICITUD' AND valor_dominio = 'Pagada');

-- TIPOS DE DOCUMENTO
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'CC', 1, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'TIPOS_DOCUMENTO' AND valor_dominio = 'CC');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'CE', 2, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'TIPOS_DOCUMENTO' AND valor_dominio = 'CE');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'NIT', 3, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'TIPOS_DOCUMENTO' AND valor_dominio = 'NIT');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'TI', 4, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'TIPOS_DOCUMENTO' AND valor_dominio = 'TI');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'TIPOS_DOCUMENTO', 'Tipos de documento de identidad válidos', 'PA', 5, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'TIPOS_DOCUMENTO' AND valor_dominio = 'PA');

-- PRIORIDADES
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'PRIORIDADES', 'Niveles de prioridad para órdenes de pago', 'Alta', 1, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'PRIORIDADES' AND valor_dominio = 'Alta');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'PRIORIDADES', 'Niveles de prioridad para órdenes de pago', 'Media', 2, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'PRIORIDADES' AND valor_dominio = 'Media');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'PRIORIDADES', 'Niveles de prioridad para órdenes de pago', 'Baja', 3, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'PRIORIDADES' AND valor_dominio = 'Baja');

-- CONFIGURACIÓN SISTEMA
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'MONEDA_BASE', 1, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'CONFIGURACION_SISTEMA' AND valor_dominio = 'MONEDA_BASE');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'COP', 2, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'CONFIGURACION_SISTEMA' AND valor_dominio = 'COP');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'ZONA_HORARIA', 3, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'CONFIGURACION_SISTEMA' AND valor_dominio = 'ZONA_HORARIA');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente)
SELECT 'CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'America/Bogota', 4, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'CONFIGURACION_SISTEMA' AND valor_dominio = 'America/Bogota');

-- 4. VERIFICAR RESULTADO FINAL
-- ============================================================================
SELECT 
    nombre_grupo,
    COUNT(*) as cantidad
FROM public.parametros 
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- 5. CONTAR TOTALES
-- ============================================================================
SELECT 
    COUNT(*) as total_parametros,
    COUNT(DISTINCT nombre_grupo) as grupos_diferentes
FROM public.parametros;

-- 6. MENSAJE DE CONFIRMACIÓN
-- ============================================================================
SELECT 'Todos los parámetros restaurados exitosamente sin errores de constraint' as resultado;

