-- ============================================================================
-- SETUP COMPLETO: Base de datos para OPs al DÍA - Sistema de Solicitudes
-- ============================================================================
-- Ejecutar en Supabase SQL Editor paso a paso
-- ============================================================================

-- 1. CREAR TABLA solicitudes_op (para el área de Tributaria)
CREATE TABLE IF NOT EXISTS public.solicitudes_op (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_solicitud TEXT UNIQUE NOT NULL,
    acreedor TEXT NOT NULL,
    concepto TEXT NOT NULL,
    valor_solicitud NUMERIC(15, 2) NOT NULL,
    tiene_iva BOOLEAN DEFAULT FALSE,
    concepto_iva TEXT,
    porcentaje_iva NUMERIC(5, 4) DEFAULT 0.00,
    iva NUMERIC(15, 2) DEFAULT 0.00,
    total_solicitud NUMERIC(15, 2) NOT NULL,
    observaciones TEXT,
    tiene_distribuciones BOOLEAN DEFAULT FALSE,
    url_anexo_pdf TEXT,
    url_anexo_xlsx TEXT,
    estado TEXT NOT NULL DEFAULT 'solicitada' CHECK (estado IN ('solicitada', 'aprobada', 'rechazada', 'generada')),
    fecha_solicitud DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 2. ÍNDICES para tabla solicitudes_op
CREATE INDEX IF NOT EXISTS idx_solicitudes_op_numero ON public.solicitudes_op (numero_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_op_acreedor ON public.solicitudes_op (acreedor);
CREATE INDEX IF NOT EXISTS idx_solicitudes_op_estado ON public.solicitudes_op (estado);
CREATE INDEX IF NOT EXISTS idx_solicitudes_op_fecha ON public.solicitudes_op (fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_solicitudes_op_created_by ON public.solicitudes_op (created_by);

-- 3. HABILITAR RLS para solicitudes_op
ALTER TABLE public.solicitudes_op ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS para solicitudes_op
-- OperacionTRIB puede crear solicitudes
CREATE POLICY "OperacionTRIB puede crear solicitudes" ON public.solicitudes_op
    FOR INSERT WITH CHECK (auth.uid() = created_by AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'OperacionTRIB');

-- Usuarios pueden ver sus propias solicitudes
CREATE POLICY "Usuarios pueden ver sus propias solicitudes" ON public.solicitudes_op
    FOR SELECT USING (auth.uid() = created_by);

-- AdminCOP y OperacionCOP pueden ver todas las solicitudes
CREATE POLICY "AdminCOP y OperacionCOP pueden ver todas las solicitudes" ON public.solicitudes_op
    FOR SELECT USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('AdminCOP', 'OperacionCOP'));

-- AdminCOP y OperacionCOP pueden actualizar solicitudes
CREATE POLICY "AdminCOP y OperacionCOP pueden actualizar solicitudes" ON public.solicitudes_op
    FOR UPDATE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('AdminCOP', 'OperacionCOP'));

-- AdminCOP puede eliminar solicitudes
CREATE POLICY "AdminCOP puede eliminar solicitudes" ON public.solicitudes_op
    FOR DELETE USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AdminCOP');

-- ============================================================================
-- TABLA DE IMPUESTOS
-- ============================================================================

-- 5. CREAR TABLA conceptos_impuestos
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

-- 6. ÍNDICES para conceptos_impuestos
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_concepto ON public.conceptos_impuestos (concepto_impuesto);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_tipo ON public.conceptos_impuestos (tipo_impuesto);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_activo ON public.conceptos_impuestos (activo);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_vigencia ON public.conceptos_impuestos (vigencia_desde, vigencia_hasta);

-- 7. HABILITAR RLS para conceptos_impuestos
ALTER TABLE public.conceptos_impuestos ENABLE ROW LEVEL SECURITY;

-- 8. POLÍTICAS RLS para conceptos_impuestos
-- Todos los usuarios autenticados pueden leer los conceptos de impuestos
CREATE POLICY "Todos pueden leer conceptos de impuestos" ON public.conceptos_impuestos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Solo AdminCOP puede gestionar conceptos de impuestos
CREATE POLICY "AdminCOP puede gestionar conceptos de impuestos" ON public.conceptos_impuestos
    FOR ALL USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AdminCOP') 
    WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'AdminCOP');

-- ============================================================================
-- DATOS INICIALES
-- ============================================================================

-- 9. INSERTAR DATOS INICIALES DE IVA
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

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- 10. FUNCIÓN para obtener IVA vigente
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

-- 11. FUNCIÓN para actualizar timestamp updated_at automáticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 12. TRIGGERS para actualizar updated_at
DROP TRIGGER IF EXISTS trigger_solicitudes_op_updated_at ON public.solicitudes_op;
CREATE TRIGGER trigger_solicitudes_op_updated_at
    BEFORE UPDATE ON public.solicitudes_op
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_conceptos_impuestos_updated_at ON public.conceptos_impuestos;
CREATE TRIGGER trigger_conceptos_impuestos_updated_at
    BEFORE UPDATE ON public.conceptos_impuestos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- VERIFICACIONES FINALES
-- ============================================================================

-- Verificar que las tablas se crearon correctamente
-- SELECT 'solicitudes_op' as tabla, count(*) as registros FROM public.solicitudes_op
-- UNION ALL
-- SELECT 'conceptos_impuestos' as tabla, count(*) as registros FROM public.conceptos_impuestos;

-- Verificar IVA vigente actual
-- SELECT * FROM public.get_iva_vigente();

-- Verificar permisos RLS
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename IN ('solicitudes_op', 'conceptos_impuestos');

-- ============================================================================
-- DATOS DE PRUEBA (OPCIONAL - Solo para desarrollo)
-- ============================================================================

-- Insertar una solicitud de prueba (descomenta si necesitas datos de prueba)
/*
INSERT INTO public.solicitudes_op (
    numero_solicitud,
    acreedor,
    concepto,
    valor_solicitud,
    tiene_iva,
    iva,
    total_solicitud,
    observaciones,
    created_by,
    metadata
) VALUES (
    'SOL-2024-PRUEBA',
    'NT-860034313-DAVIVIENDA S.A.',
    'Convenio de uso de red',
    1000000.00,
    true,
    190000.00,
    1190000.00,
    'Solicitud de prueba creada automáticamente',
    (SELECT id FROM public.profiles WHERE email LIKE '%@%' LIMIT 1),
    '{"tipo": "prueba", "version": "1.0"}'
);
*/

-- ============================================================================
-- FINALIZADO
-- ============================================================================
-- 🎉 Base de datos configurada correctamente para OPs al DÍA
-- 📋 Tablas creadas: solicitudes_op, conceptos_impuestos
-- 🔒 Políticas RLS configuradas
-- 📊 Datos iniciales de IVA insertados
-- ⚡ Funciones auxiliares creadas
-- ============================================================================
