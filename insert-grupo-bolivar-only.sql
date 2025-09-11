-- ============================================================================
-- INSERTAR SOLO DATOS DEL GRUPO BOLÍVAR EN TABLA PARAMETROS
-- Script mínimo para insertar únicamente las empresas del Grupo Bolívar
-- ============================================================================

-- Verificar si la tabla parametros existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'parametros'
);

-- Eliminar datos existentes del grupo GRUPO_BOLIVAR (por si hay duplicados)
DELETE FROM public.parametros WHERE nombre_grupo = 'GRUPO_BOLIVAR';

-- Eliminar datos existentes del grupo CONFIGURACION_IVA (por si hay duplicados)
DELETE FROM public.parametros WHERE nombre_grupo = 'CONFIGURACION_IVA';

-- Insertar las 11 empresas del Grupo Bolívar
INSERT INTO public.parametros (
    nombre_grupo, 
    descripcion_grupo, 
    valor_dominio,
    orden,
    vigente
) VALUES
-- GRUPO_BOLIVAR (11 empresas)
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

-- CONFIGURACION_IVA (para que funcione el cálculo)
('CONFIGURACION_IVA', 'Porcentaje de IVA vigente en Colombia', '19', 1, 'S')
;

-- Verificar los datos insertados
SELECT 
    nombre_grupo,
    COUNT(*) as cantidad_registros,
    MIN(orden) as orden_minimo,
    MAX(orden) as orden_maximo
FROM public.parametros 
WHERE nombre_grupo IN ('GRUPO_BOLIVAR', 'CONFIGURACION_IVA')
GROUP BY nombre_grupo
ORDER BY nombre_grupo;

-- Mostrar todos los registros insertados
SELECT 
    id,
    nombre_grupo,
    valor_dominio,
    orden,
    vigente,
    created_at
FROM public.parametros 
WHERE nombre_grupo IN ('GRUPO_BOLIVAR', 'CONFIGURACION_IVA')
ORDER BY nombre_grupo, orden;

-- Mensaje de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ DATOS DEL GRUPO BOLIVAR INSERTADOS CORRECTAMENTE';
    RAISE NOTICE '   - 11 empresas del Grupo Bolívar';
    RAISE NOTICE '   - 1 configuración de IVA (19%)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 AHORA LA APLICACIÓN DEBE MOSTRAR LAS EMPRESAS REALES';
END $$;

