-- ============================================================================
-- INSERTAR PARAMETROS PARA ACREEDORES_PSP
-- ============================================================================
-- Este script inserta los acreedores para Pago de Servicios Públicos
-- Grupo: ACREEDORES_PSP
-- ============================================================================

-- Verificar si el grupo ACREEDORES_PSP ya existe
SELECT COUNT(*) FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP';

-- Insertar los acreedores en orden alfabético por nombre si no existen
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-830037248-Codensa S.A. E.S.P.', 1, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-830037248-Codensa S.A. E.S.P.');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-830114921-Colombia Movil S.A. E.S.P. - Tigo UNE', 2, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-830114921-Colombia Movil S.A. E.S.P. - Tigo UNE');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-830122566-Colombia Telecomunicaciones S.A. - MOVISTAR', 3, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-830122566-Colombia Telecomunicaciones S.A. - MOVISTAR');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-800153993-Comunicación Celular S.A. - CLARO', 4, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-800153993-Comunicación Celular S.A. - CLARO');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-899999094-Empresa de Acueducto y Alcantarillado de Bogotá-ESP', 5, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-899999094-Empresa de Acueducto y Alcantarillado de Bogotá-ESP');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-899999115-Empresa de Telecomunicaciones de Bogotá, S.A. E.S.P. - ETB', 6, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-899999115-Empresa de Telecomunicaciones de Bogotá, S.A. E.S.P. - ETB');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-860063875-Enel Colombia S.A. E.S.P.', 7, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-860063875-Enel Colombia S.A. E.S.P.');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'ACREEDORES_PSP', 'Lista de acreedores para pago de servicios públicos.', 'NT-800007813-Vanti S.A. ESP', 8, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' AND valor_dominio = 'NT-800007813-Vanti S.A. ESP');

-- Verificar los datos insertados
SELECT * FROM public.parametros WHERE nombre_grupo = 'ACREEDORES_PSP' ORDER BY orden;
