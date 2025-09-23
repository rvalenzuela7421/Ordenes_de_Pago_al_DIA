-- ============================================================================
-- INSERTAR PARAMETROS PARA AUTORIZADOR_PSP
-- ============================================================================
-- Este script inserta los autorizadores para Pago de Servicios Públicos
-- Grupo: AUTORIZADOR_PSP
-- ============================================================================

-- Verificar si el grupo AUTORIZADOR_PSP ya existe
SELECT COUNT(*) FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP';

-- Insertar los autorizadores en orden alfabético si no existen
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '41571-Daniel Barrera', 1, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '41571-Daniel Barrera');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '27023-Germán Ricardo Sánchez', 2, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '27023-Germán Ricardo Sánchez');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '1032476388-Jaime Capera', 3, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '1032476388-Jaime Capera');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '80274-Jeimy Carolina Muñoz Farfán', 4, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '80274-Jeimy Carolina Muñoz Farfán');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '1032426572-Jhoana Carolina Arias', 5, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '1032426572-Jhoana Carolina Arias');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '78965-Leidy Gómez', 6, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '78965-Leidy Gómez');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '32246-María de los Ángeles Castro', 7, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '32246-María de los Ángeles Castro');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '42753-Samuel Murillo Ariza', 8, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '42753-Samuel Murillo Ariza');

INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) 
SELECT 'AUTORIZADOR_PSP', 'Lista de personas autorizadas para aprobar pago de servicios públicos.', '16659-Wilson Sacristán', 9, 'S'
WHERE NOT EXISTS (SELECT 1 FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' AND valor_dominio = '16659-Wilson Sacristán');

-- Verificar los datos insertados
SELECT * FROM public.parametros WHERE nombre_grupo = 'AUTORIZADOR_PSP' ORDER BY orden;
