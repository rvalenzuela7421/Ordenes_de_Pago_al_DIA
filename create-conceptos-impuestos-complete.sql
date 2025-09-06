-- ============================================================================
-- SCRIPT COMPLETO: TABLA conceptos_impuestos para OPs al DÍA
-- ============================================================================
-- Este script crea la tabla de conceptos de impuestos con datos iniciales
-- Ejecutar en Supabase SQL Editor paso a paso
-- ============================================================================

-- 1. CREAR TABLA conceptos_impuestos
CREATE TABLE IF NOT EXISTS public.conceptos_impuestos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    concepto_impuesto TEXT UNIQUE NOT NULL,
    porcentaje_aplicacion NUMERIC(5, 4) NOT NULL,
    descripcion TEXT,
    tipo_impuesto TEXT NOT NULL DEFAULT 'IVA',
    activo BOOLEAN DEFAULT TRUE,
    vigencia_desde DATE,
    vigencia_hasta DATE,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CREAR ÍNDICES para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_concepto ON public.conceptos_impuestos (concepto_impuesto);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_tipo ON public.conceptos_impuestos (tipo_impuesto);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_activo ON public.conceptos_impuestos (activo);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_vigencia ON public.conceptos_impuestos (vigencia_desde, vigencia_hasta);

-- 3. HABILITAR RLS (Row Level Security)
ALTER TABLE public.conceptos_impuestos ENABLE ROW LEVEL SECURITY;

-- 4. CREAR POLÍTICAS RLS
-- Todos los usuarios autenticados pueden leer los conceptos de impuestos
CREATE POLICY "Todos los usuarios autenticados pueden leer conceptos de impuestos" ON public.conceptos_impuestos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Solo AdminCOP puede gestionar conceptos de impuestos (INSERT, UPDATE, DELETE)
CREATE POLICY "AdminCOP puede gestionar conceptos de impuestos" ON public.conceptos_impuestos
    FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AdminCOP') 
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AdminCOP');

-- 5. INSERTAR DATOS INICIALES DE IVA
-- IVA 16% histórico (período COVID-19: 2020-2022)
INSERT INTO public.conceptos_impuestos (
    concepto_impuesto, 
    porcentaje_aplicacion, 
    descripcion, 
    tipo_impuesto, 
    activo, 
    vigencia_desde, 
    vigencia_hasta, 
    observaciones
) VALUES (
    'IVA_16_HISTORICO', 
    0.16, 
    'IVA 16% - Tarifa vigente durante el período de pandemia COVID-19', 
    'IVA', 
    TRUE, 
    '2020-01-01', 
    '2022-12-31', 
    'Tarifa histórica vigente durante COVID-19 (Ley 2010 de 2019)'
) ON CONFLICT (concepto_impuesto) DO NOTHING;

-- IVA 19% actual (desde enero 2023)
INSERT INTO public.conceptos_impuestos (
    concepto_impuesto, 
    porcentaje_aplicacion, 
    descripcion, 
    tipo_impuesto, 
    activo, 
    vigencia_desde, 
    vigencia_hasta, 
    observaciones
) VALUES (
    'IVA', 
    0.19, 
    'IVA 19% - Tarifa estándar vigente en Colombia', 
    'IVA', 
    TRUE, 
    '2023-01-01', 
    NULL, 
    'Tarifa actual estándar de IVA en Colombia (Ley 1943 de 2018)'
) ON CONFLICT (concepto_impuesto) DO NOTHING;

-- 6. CREAR FUNCIÓN para obtener IVA vigente (opcional)
CREATE OR REPLACE FUNCTION public.get_iva_vigente()
RETURNS TABLE (
    id UUID,
    concepto_impuesto TEXT,
    porcentaje_aplicacion NUMERIC,
    descripcion TEXT,
    tipo_impuesto TEXT,
    activo BOOLEAN,
    vigencia_desde DATE,
    vigencia_hasta DATE,
    observaciones TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.id,
        ci.concepto_impuesto,
        ci.porcentaje_aplicacion,
        ci.descripcion,
        ci.tipo_impuesto,
        ci.activo,
        ci.vigencia_desde,
        ci.vigencia_hasta,
        ci.observaciones
    FROM
        public.conceptos_impuestos ci
    WHERE
        ci.concepto_impuesto = 'IVA'
        AND ci.tipo_impuesto = 'IVA'
        AND ci.activo = TRUE
        AND ci.vigencia_desde <= CURRENT_DATE
        AND (ci.vigencia_hasta IS NULL OR ci.vigencia_hasta >= CURRENT_DATE)
    ORDER BY
        ci.vigencia_desde DESC
    LIMIT 1;
END;
$$;

-- 7. FUNCIÓN para actualizar timestamp updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 8. CREAR TRIGGER para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_conceptos_impuestos_updated_at ON public.conceptos_impuestos;
CREATE TRIGGER trigger_conceptos_impuestos_updated_at
    BEFORE UPDATE ON public.conceptos_impuestos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- VERIFICACIÓN: Consultas para verificar que todo funciona
-- ============================================================================

-- Consultar todos los conceptos de impuestos
-- SELECT * FROM public.conceptos_impuestos ORDER BY vigencia_desde;

-- Consultar IVA vigente actual
-- SELECT * FROM public.get_iva_vigente();

-- Verificar que el IVA 19% esté activo
-- SELECT concepto_impuesto, porcentaje_aplicacion, descripcion, vigencia_desde, vigencia_hasta 
-- FROM public.conceptos_impuestos 
-- WHERE concepto_impuesto = 'IVA' AND activo = true;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Ejecutar este script completo en Supabase SQL Editor
-- 2. El IVA actual (19%) no tiene fecha de fin (NULL) por lo que siempre estará vigente
-- 3. La función get_iva_vigente() devuelve automáticamente el IVA válido para la fecha actual
-- 4. Las políticas RLS aseguran que solo usuarios autenticados puedan leer y solo AdminCOP pueda modificar
-- 5. Los índices optimizan las consultas por concepto, tipo y vigencia
-- ============================================================================
