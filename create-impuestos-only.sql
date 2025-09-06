-- ============================================================================
-- CREAR SOLO TABLA DE IMPUESTOS (para usar con ordenes_pago existente)
-- ============================================================================
-- Ejecutar en Supabase SQL Editor
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

-- 2. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_concepto ON public.conceptos_impuestos (concepto_impuesto);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_tipo ON public.conceptos_impuestos (tipo_impuesto);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_vigencia ON public.conceptos_impuestos (vigencia_desde, vigencia_hasta);

-- 3. HABILITAR RLS
ALTER TABLE public.conceptos_impuestos ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICA SIMPLE: Todos pueden leer
CREATE POLICY "Todos pueden leer impuestos" ON public.conceptos_impuestos
    FOR SELECT USING (auth.role() = 'authenticated');

-- 5. DATOS INICIALES DE IVA
-- IVA 19% actual
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
    'Tarifa actual estándar de IVA en Colombia'
) ON CONFLICT (concepto_impuesto) DO NOTHING;

-- IVA 16% histórico
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
    'IVA 16% - Tarifa durante pandemia COVID-19', 
    'IVA', 
    TRUE, 
    '2020-01-01', 
    '2022-12-31', 
    'Tarifa histórica COVID-19'
) ON CONFLICT (concepto_impuesto) DO NOTHING;

-- 6. FUNCIÓN get_iva_vigente
CREATE OR REPLACE FUNCTION public.get_iva_vigente()
RETURNS TABLE (
    concepto_impuesto TEXT,
    porcentaje_aplicacion NUMERIC,
    descripcion TEXT,
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
        ci.concepto_impuesto,
        ci.porcentaje_aplicacion,
        ci.descripcion,
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

-- ============================================================================
-- VERIFICAR
-- ============================================================================
-- SELECT * FROM public.get_iva_vigente();
-- SELECT * FROM public.conceptos_impuestos ORDER BY vigencia_desde;

-- ✅ Listo: Tabla de impuestos creada, funciona con ordenes_pago existente
