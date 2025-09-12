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
    nombre_parametro, 
    valor_dominio, 
    vigente, 
    orden
) VALUES 
-- 1. Pago de Arriendos
('TIPO_SOLICITUD_PAGO', 'PAGO_ARRIENDOS', 'Pago de Arriendos', 'S', 1),

-- 2. Pago de Comisiones Bancarias  
('TIPO_SOLICITUD_PAGO', 'PAGO_COMISIONES_BANCARIAS', 'Pago de Comisiones Bancarias', 'S', 2),

-- 3. Pago de Divisas
('TIPO_SOLICITUD_PAGO', 'PAGO_DIVISAS', 'Pago de Divisas', 'S', 3),

-- 4. Pago de Impuestos
('TIPO_SOLICITUD_PAGO', 'PAGO_IMPUESTOS', 'Pago de Impuestos', 'S', 4),

-- 5. Pago de Servicios Públicos
('TIPO_SOLICITUD_PAGO', 'PAGO_SERVICIOS_PUBLICOS', 'Pago de Servicios Públicos', 'S', 5);

-- Verificar inserción exitosa
SELECT 'DESPUÉS DE INSERTAR' as momento, COUNT(*) as total_parametros 
FROM public.parametros 
WHERE nombre_grupo = 'TIPO_SOLICITUD_PAGO';

-- Mostrar todos los tipos de solicitud creados
SELECT 
    id,
    nombre_grupo,
    nombre_parametro,
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

-- Log de auditoría
INSERT INTO public.audit_log (
    tabla_afectada,
    accion,
    descripcion,
    usuario,
    timestamp
) VALUES (
    'parametros',
    'INSERT',
    'Creación de 5 tipos de solicitud de pago: Arriendos, Comisiones Bancarias, Divisas, Impuestos, Servicios Públicos',
    'sistema',
    NOW()
) ON CONFLICT DO NOTHING;

-- Mensaje final
SELECT '✅ TIPOS DE SOLICITUD DE PAGO CREADOS EXITOSAMENTE' as status,
       'Los 5 tipos están disponibles para usar en Nueva Solicitud' as mensaje;
