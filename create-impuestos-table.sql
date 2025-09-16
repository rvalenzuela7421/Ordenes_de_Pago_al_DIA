-- ============================================
-- TABLA PARA MANEJO DE IMPUESTOS
-- Sistema COP - Cálculo automático de IVA
-- ============================================

-- Crear tabla de conceptos de impuestos
CREATE TABLE IF NOT EXISTS public.conceptos_impuestos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    
    -- Información del impuesto
    concepto_impuesto TEXT NOT NULL UNIQUE,
    porcentaje_aplicacion NUMERIC(5,4) NOT NULL CHECK (porcentaje_aplicacion >= 0 AND porcentaje_aplicacion <= 1),
    
    -- Información adicional
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    tipo_impuesto TEXT DEFAULT 'IVA' CHECK (tipo_impuesto IN ('IVA', 'RETEFUENTE', 'RETEICA', 'RETEIVA', 'OTROS')),
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    
    -- Índices
    INDEX idx_conceptos_impuestos_concepto (concepto_impuesto),
    INDEX idx_conceptos_impuestos_activo (activo),
    INDEX idx_conceptos_impuestos_tipo (tipo_impuesto)
);

-- Habilitar RLS
ALTER TABLE public.conceptos_impuestos ENABLE ROW LEVEL SECURITY;

-- Trigger para updated_at
CREATE TRIGGER update_conceptos_impuestos_updated_at 
    BEFORE UPDATE ON public.conceptos_impuestos 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLÍTICAS RLS PARA conceptos_impuestos
-- ============================================

-- Política para lectura - todos los usuarios autenticados pueden leer
CREATE POLICY "Todos pueden ver conceptos de impuestos activos" 
ON public.conceptos_impuestos FOR SELECT 
USING (
    auth.role() = 'authenticated' AND activo = true
);

-- Política para administrar - solo AdminCOP puede crear/modificar
CREATE POLICY "Solo AdminCOP puede administrar conceptos de impuestos" 
ON public.conceptos_impuestos FOR ALL
USING (
    auth.role() = 'authenticated' AND 
    auth.jwt() ->> 'role' = 'AdminCOP'
);

-- ============================================
-- DATOS INICIALES DE IMPUESTOS
-- ============================================

-- Insertar conceptos de impuestos comunes en Colombia
INSERT INTO public.conceptos_impuestos (
    concepto_impuesto,
    porcentaje_aplicacion,
    descripcion,
    tipo_impuesto,
    activo
) VALUES 
-- IVA estándar
('IVA 19%', 0.19, 'Impuesto al Valor Agregado tarifa general', 'IVA', true),
('IVA 5%', 0.05, 'Impuesto al Valor Agregado tarifa reducida', 'IVA', true),
('IVA 0%', 0.00, 'Exento de IVA', 'IVA', true),

-- Retenciones comunes
('Retención en la Fuente 3.5%', 0.035, 'Retención en la fuente servicios profesionales', 'RETEFUENTE', true),
('Retención en la Fuente 2%', 0.02, 'Retención en la fuente servicios generales', 'RETEFUENTE', true),
('Retención en la Fuente 1%', 0.01, 'Retención en la fuente compras generales', 'RETEFUENTE', true),

-- ReteICA
('ReteICA 0.414%', 0.00414, 'Retención de Industria y Comercio Bogotá', 'RETEICA', true),
('ReteICA 0.966%', 0.00966, 'Retención de Industria y Comercio servicios', 'RETEICA', true),

-- ReteIVA
('ReteIVA 15%', 0.15, 'Retención del IVA', 'RETEIVA', true)

ON CONFLICT (concepto_impuesto) DO NOTHING;

-- ============================================
-- FUNCIONES ÚTILES PARA CÁLCULO DE IMPUESTOS
-- ============================================

-- Función para obtener el porcentaje de IVA por defecto
CREATE OR REPLACE FUNCTION get_iva_default_percentage()
RETURNS NUMERIC AS $$
DECLARE
    porcentaje NUMERIC;
BEGIN
    SELECT porcentaje_aplicacion INTO porcentaje
    FROM public.conceptos_impuestos
    WHERE concepto_impuesto = 'IVA 19%' AND activo = true;
    
    RETURN COALESCE(porcentaje, 0.19); -- 19% por defecto
END;
$$ LANGUAGE plpgsql;

-- Función para calcular IVA
CREATE OR REPLACE FUNCTION calcular_iva(
    valor_base NUMERIC,
    concepto_iva TEXT DEFAULT 'IVA 19%'
)
RETURNS NUMERIC AS $$
DECLARE
    porcentaje NUMERIC;
    iva_calculado NUMERIC;
BEGIN
    -- Obtener el porcentaje del concepto especificado
    SELECT porcentaje_aplicacion INTO porcentaje
    FROM public.conceptos_impuestos
    WHERE concepto_impuesto = concepto_iva AND activo = true AND tipo_impuesto = 'IVA';
    
    -- Si no encuentra el concepto, usar 19% por defecto
    IF porcentaje IS NULL THEN
        porcentaje := 0.19;
    END IF;
    
    -- Calcular el IVA
    iva_calculado := valor_base * porcentaje;
    
    -- Redondear a 2 decimales
    RETURN ROUND(iva_calculado, 2);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener todos los conceptos de IVA activos
CREATE OR REPLACE FUNCTION get_conceptos_iva_activos()
RETURNS TABLE (
    id UUID,
    concepto_impuesto TEXT,
    porcentaje_aplicacion NUMERIC,
    descripcion TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.id,
        ci.concepto_impuesto,
        ci.porcentaje_aplicacion,
        ci.descripcion
    FROM public.conceptos_impuestos ci
    WHERE ci.tipo_impuesto = 'IVA' 
    AND ci.activo = true
    ORDER BY ci.porcentaje_aplicacion DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ACTUALIZAR TABLA SOLICITUDES_OP
-- ============================================

-- Agregar campos adicionales a la tabla de solicitudes para manejar impuestos
ALTER TABLE public.solicitudes_op 
ADD COLUMN IF NOT EXISTS tiene_iva BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS concepto_iva TEXT REFERENCES public.conceptos_impuestos(concepto_impuesto),
ADD COLUMN IF NOT EXISTS porcentaje_iva NUMERIC(5,4) DEFAULT 0;

-- Agregar índice para el concepto de IVA
CREATE INDEX IF NOT EXISTS idx_solicitudes_op_concepto_iva 
ON public.solicitudes_op(concepto_iva);

-- Función trigger para calcular automáticamente IVA en solicitudes
CREATE OR REPLACE FUNCTION auto_calculate_iva_solicitudes()
RETURNS TRIGGER AS $$
DECLARE
    porcentaje NUMERIC := 0;
BEGIN
    -- Si tiene IVA y hay un concepto especificado
    IF NEW.tiene_iva = true AND NEW.concepto_iva IS NOT NULL THEN
        -- Obtener el porcentaje del concepto
        SELECT porcentaje_aplicacion INTO porcentaje
        FROM public.conceptos_impuestos
        WHERE concepto_impuesto = NEW.concepto_iva AND activo = true;
        
        -- Si no encuentra el concepto, usar 19% por defecto
        IF porcentaje IS NULL THEN
            porcentaje := 0.19;
            NEW.concepto_iva := 'IVA 19%';
        END IF;
        
        -- Calcular IVA
        NEW.porcentaje_iva := porcentaje;
        NEW.iva := ROUND(NEW.valor_solicitud * porcentaje, 2);
    ELSE
        -- Sin IVA
        NEW.iva := 0;
        NEW.porcentaje_iva := 0;
        NEW.concepto_iva := NULL;
    END IF;
    
    -- Recalcular total
    NEW.total_solicitud := NEW.valor_solicitud + NEW.iva;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para calcular IVA automáticamente
CREATE TRIGGER trigger_auto_calculate_iva_solicitudes
    BEFORE INSERT OR UPDATE ON public.solicitudes_op
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_iva_solicitudes();

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.conceptos_impuestos IS 'Tabla para definir los diferentes conceptos de impuestos y sus porcentajes de aplicación';
COMMENT ON COLUMN public.conceptos_impuestos.concepto_impuesto IS 'Nombre descriptivo del impuesto (ej: IVA 19%, Retención 3.5%)';
COMMENT ON COLUMN public.conceptos_impuestos.porcentaje_aplicacion IS 'Porcentaje como decimal (ej: 0.19 para 19%, 0.035 para 3.5%)';
COMMENT ON COLUMN public.conceptos_impuestos.tipo_impuesto IS 'Categoría del impuesto (IVA, RETEFUENTE, RETEICA, etc.)';

COMMENT ON COLUMN public.solicitudes_op.tiene_iva IS 'Indica si la solicitud debe incluir cálculo de IVA';
COMMENT ON COLUMN public.solicitudes_op.concepto_iva IS 'Concepto de IVA aplicado (referencia a tabla de impuestos)';
COMMENT ON COLUMN public.solicitudes_op.porcentaje_iva IS 'Porcentaje de IVA aplicado para auditoría';

COMMENT ON FUNCTION calcular_iva(NUMERIC, TEXT) IS 'Función para calcular el IVA basado en un valor base y concepto de impuesto';
COMMENT ON FUNCTION get_conceptos_iva_activos() IS 'Función para obtener todos los conceptos de IVA disponibles y activos';

-- ============================================
-- EJEMPLO DE USO
-- ============================================

/*
-- Ejemplo: Calcular IVA para una solicitud de $1,000,000
SELECT calcular_iva(1000000, 'IVA 19%'); -- Resultado: 190000.00

-- Obtener conceptos de IVA disponibles
SELECT * FROM get_conceptos_iva_activos();

-- Ejemplo de inserción de solicitud con IVA
INSERT INTO public.solicitudes_op (
    numero_solicitud,
    acreedor,
    concepto,
    valor_solicitud,
    tiene_iva,
    concepto_iva,
    observaciones,
    created_by
) VALUES (
    'SOL-2024-TEST',
    'NT-860034313-DAVIVIENDA S.A.',
    'Convenio de uso de red',
    1000000,
    true,
    'IVA 19%',
    'Ejemplo con IVA calculado automáticamente',
    (SELECT id FROM public.profiles WHERE role = 'OperacionBSEG' LIMIT 1)
);
-- El trigger calculará automáticamente:
-- iva = 190000.00
-- total_solicitud = 1190000.00
*/
