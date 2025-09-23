-- ============================================================================
-- CREAR PARÁMETROS PARA SERVICIOS PÚBLICOS
-- ============================================================================
-- Script para crear el grupo SERVICIOS_PUBLICOS con los servicios solicitados
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. INSERTAR PARÁMETROS DEL GRUPO SERVICIOS_PUBLICOS
-- ============================================================================

INSERT INTO public.parametros (
    nombre_grupo,
    descripcion_grupo, 
    valor_dominio,
    orden,
    vigente,
    created_at,
    updated_at
) VALUES 
-- Acueducto y Alcantarillado (orden 1)
('SERVICIOS_PUBLICOS', 'Listado de Servicios Públicos para Órdenes de Pago', 'Acueducto y Alcantarillado', 1, 'S', NOW(), NOW()),

-- Energía (orden 2)  
('SERVICIOS_PUBLICOS', 'Listado de Servicios Públicos para Órdenes de Pago', 'Energía', 2, 'S', NOW(), NOW()),

-- Gas Natural Domiciliario (orden 3)
('SERVICIOS_PUBLICOS', 'Listado de Servicios Públicos para Órdenes de Pago', 'Gas Natural Domiciliario', 3, 'S', NOW(), NOW()),

-- Internet (orden 4)
('SERVICIOS_PUBLICOS', 'Listado de Servicios Públicos para Órdenes de Pago', 'Internet', 4, 'S', NOW(), NOW()),

-- Telefonía Celular (orden 5)
('SERVICIOS_PUBLICOS', 'Listado de Servicios Públicos para Órdenes de Pago', 'Telefonía Celular', 5, 'S', NOW(), NOW());

-- 2. VERIFICAR RESULTADOS
-- ============================================================================

-- Consulta para verificar que los parámetros se crearon correctamente
SELECT 
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    orden,
    vigente,
    created_at
FROM public.parametros 
WHERE nombre_grupo = 'SERVICIOS_PUBLICOS'
ORDER BY orden ASC;

-- Contar total de servicios públicos
SELECT 
    COUNT(*) as total_servicios_publicos
FROM public.parametros 
WHERE nombre_grupo = 'SERVICIOS_PUBLICOS' 
AND vigente = 'S';
