-- =====================================================
-- SCRIPT: Crear Tipo de Solicitud de Pago en Parámetros
-- DESCRIPCIÓN: Inserta los tipos de solicitud de pago
-- TABLA: public.parametros
-- GRUPO: TIPO_SOLICITUD_PAGO
-- =====================================================

-- Verificar estado actual antes de insertar
SELECT 'ANTES DE INSERTAR' as momento, COUNT(*) as total_parametros 
FROM public.parametros 
WHERE nombre_grupo = 'TIPO_SOLICITUD_PAGO';

-- Insertar tipos de solicitud de pago en orden específico
INSERT INTO public.parametros (
    nombre_grupo, 
    descripcion_grupo, 
    valor_dominio, 
    vigente, 
    orden
) VALUES 
-- 1. Pago de Arriendos
('TIPO_SOLICITUD_PAGO', 'Tipos de solicitud de pago disponibles en el sistema', 'Pago de Arriendos', 'S', 1),

-- 2. Pago de Comisiones Bancarias  
('TIPO_SOLICITUD_PAGO', 'Tipos de solicitud de pago disponibles en el sistema', 'Pago de Comisiones Bancarias', 'S', 2),

-- 3. Pago de Divisas
('TIPO_SOLICITUD_PAGO', 'Tipos de solicitud de pago disponibles en el sistema', 'Pago de Divisas', 'S', 3),

-- 4. Pago de Impuestos
('TIPO_SOLICITUD_PAGO', 'Tipos de solicitud de pago disponibles en el sistema', 'Pago de Impuestos', 'S', 4),

-- 5. Pago de Servicios Públicos
('TIPO_SOLICITUD_PAGO', 'Tipos de solicitud de pago disponibles en el sistema', 'Pago de Servicios Públicos', 'S', 5);

-- Verificar inserción exitosa
SELECT 'DESPUÉS DE INSERTAR' as momento, COUNT(*) as total_parametros 
FROM public.parametros 
WHERE nombre_grupo = 'TIPO_SOLICITUD_PAGO';

-- Mostrar todos los tipos de solicitud creados
SELECT 
    id,
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    vigente,
    orden,
    created_at
FROM public.parametros 
WHERE nombre_grupo = 'TIPO_SOLICITUD_PAGO'
ORDER BY orden ASC;

-- Verificar integridad de datos
SELECT 
    'TIPO_SOLICITUD_PAGO' as grupo,
    COUNT(*) as total_registros,
    COUNT(CASE WHEN vigente = 'S' THEN 1 END) as registros_vigentes,
    MIN(orden) as orden_minimo,
    MAX(orden) as orden_maximo
FROM public.parametros 
WHERE nombre_grupo = 'TIPO_SOLICITUD_PAGO';

-- Mensaje final
SELECT '✅ TIPOS DE SOLICITUD DE PAGO CREADOS EXITOSAMENTE' as status,
       'Los 5 tipos están disponibles para usar en Nueva Solicitud' as mensaje;
