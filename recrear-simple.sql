-- ============================================================================
-- RECREAR TABLA PARAMETROS - VERSIÓN SIMPLE SIN ERRORES
-- Solución sin funciones complejas que puedan fallar
-- ============================================================================

-- 1. RESPALDAR DATOS SI EXISTEN
-- ============================================================================
DROP TABLE IF EXISTS public.parametros_backup;
CREATE TABLE public.parametros_backup AS 
SELECT * FROM public.parametros;

-- 2. ELIMINAR TABLA COMPLETAMENTE
-- ============================================================================
DROP TABLE IF EXISTS public.parametros CASCADE;

-- 3. RECREAR TABLA DESDE CERO
-- ============================================================================
CREATE TABLE public.parametros (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_grupo TEXT NOT NULL,
    descripcion_grupo TEXT,
    valor_dominio TEXT NOT NULL,
    orden INTEGER DEFAULT 0,
    vigente TEXT NOT NULL CHECK (vigente IN ('S', 'N')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SIN RLS DESDE EL INICIO
-- ============================================================================
ALTER TABLE public.parametros DISABLE ROW LEVEL SECURITY;

-- 5. INSERTAR LAS 11 EMPRESAS + IVA DIRECTAMENTE
-- ============================================================================
INSERT INTO public.parametros (nombre_grupo, descripcion_grupo, valor_dominio, orden, vigente) VALUES
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-901438242-SALUD BOLIVAR EPS S.A.S.', 1, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-860006359-CAPITALIZADORA BOLÍVAR S.A.', 2, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-860002503-COMPAÑÍA DE SEGUROS BOLÍVAR S.A.', 3, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-830025448-GRUPO BOLÍVAR S.A.', 4, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-900265163-INVERSIONES FINANCIERAS BOLÍVAR S.A.S.', 5, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-800020762-INVERSORA ANAGRAMA INVERANAGRAMA S.A.S.', 6, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-900265170-SOLUCIONES BOLIVAR S.A.S.', 7, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-860002180-SEGUROS COMERCIALES BOLÍVAR S.A.', 8, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-860076173-FUNDACION BOLIVAR DAVIVIENDA', 9, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-900311092-SERVICIOS BOLIVAR S.A.', 10, 'S'),
('GRUPO_BOLIVAR', 'Empresas que conforman al Grupo Bolívar', 'NT-901159545-SERVICIOS BOLIVAR FACILITIES', 11, 'S'),
('CONFIGURACION_IVA', 'Porcentaje de IVA vigente en Colombia', '19', 1, 'S');

-- 6. CREAR ÍNDICE BÁSICO
-- ============================================================================
CREATE INDEX idx_parametros_nombre_grupo ON public.parametros(nombre_grupo);

-- 7. VERIFICAR DATOS INSERTADOS
-- ============================================================================
SELECT 'GRUPO_BOLIVAR' as grupo, COUNT(*) as cantidad FROM public.parametros WHERE nombre_grupo = 'GRUPO_BOLIVAR';
SELECT 'CONFIGURACION_IVA' as grupo, COUNT(*) as cantidad FROM public.parametros WHERE nombre_grupo = 'CONFIGURACION_IVA';

-- 8. MOSTRAR TODAS LAS EMPRESAS
-- ============================================================================
SELECT 
    valor_dominio as empresa,
    orden
FROM public.parametros 
WHERE nombre_grupo = 'GRUPO_BOLIVAR'
ORDER BY orden;

-- 9. FORZAR REFRESH DE SUPABASE
-- ============================================================================
NOTIFY pgrst, 'reload schema';


