-- ============================================================================
-- INSERTAR PARAMETROS PARA AREAS_SOLICITANTES_PSP
-- ============================================================================
-- Este script inserta las áreas solicitantes para Pago de Servicios Públicos
-- Grupo: AREAS_SOLICITANTES_PSP
-- ============================================================================

-- Verificar si el grupo AREAS_SOLICITANTES_PSP ya existe
SELECT COUNT(*) FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP';

-- Insertar las áreas solicitantes en orden alfabético si no existen
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Construcciones y Mantenimiento', 1, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Construcciones y Mantenimiento');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Departamento de Procesamiento de Datos', 2, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Departamento de Procesamiento de Datos');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Dirección Administrativa ARL', 3, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Dirección Administrativa ARL');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Gerencia Administrativa', 4, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Gerencia Administrativa');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Gerencia El Libertador - Admtiva', 5, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Gerencia El Libertador - Admtiva');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Oficina Santa Marta', 6, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Oficina Santa Marta');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Sucursal Cartagena', 7, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Sucursal Cartagena');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Sucursal Ibagué', 8, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Sucursal Ibagué');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Sucursal Manizales', 9, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Sucursal Manizales');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AREAS_SOLICITANTES_PSP', 'Lista de áreas de las compañías que registran solicitudes de pago de servicios públicos.', 'Sucursal Pereira', 10, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' AND valor_dominio = 'Sucursal Pereira');

-- Verificar los datos insertados
SELECT * FROM public.parametros WHERE nombre_grupo = 'AREAS_SOLICITANTES_PSP' ORDER BY orden;
