-- ============================================================================
-- MODIFICAR TABLA ordenes_pago - Flujo Completo Solicitud → OP → Pago
-- ============================================================================
-- Este script ajusta la tabla existente para manejar todo el flujo
-- Ejecutar en Supabase SQL Editor paso a paso
-- ============================================================================

-- 1. ELIMINAR CAMPOS NO NECESARIOS
-- ============================================================================
-- Eliminar campos: centro_costo, cuenta_contable, forma_pago
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS centro_costo CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS cuenta_contable CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS forma_pago CASCADE;

-- También eliminar otros campos que no están en la lista final
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS user_id CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS creado_por CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS aprobado_por CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS observaciones CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS area_solicitante CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS metadata CASCADE;

-- 2. AGREGAR CAMPOS NUEVOS
-- ============================================================================
-- total_op (nuevo campo)
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS total_op NUMERIC(15, 2);

-- fecha_aprobacion_op (nuevo campo)
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS fecha_aprobacion_op TIMESTAMP WITH TIME ZONE;

-- fecha_pago (si no existe)
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS fecha_pago TIMESTAMP WITH TIME ZONE;

-- created_at y updated_at (si no existen)
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. ASEGURAR TIPOS DE DATOS CORRECTOS
-- ============================================================================
-- Asegurar que todos los campos tengan el tipo correcto
ALTER TABLE public.ordenes_pago ALTER COLUMN id TYPE UUID;
ALTER TABLE public.ordenes_pago ALTER COLUMN fecha_solicitud TYPE TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ordenes_pago ALTER COLUMN numero_solicitud TYPE TEXT;
ALTER TABLE public.ordenes_pago ALTER COLUMN proveedor TYPE TEXT;
ALTER TABLE public.ordenes_pago ALTER COLUMN concepto TYPE TEXT;
ALTER TABLE public.ordenes_pago ALTER COLUMN monto_solicitud TYPE NUMERIC(15, 2);
ALTER TABLE public.ordenes_pago ALTER COLUMN iva TYPE NUMERIC(15, 2);
ALTER TABLE public.ordenes_pago ALTER COLUMN total_solicitud TYPE NUMERIC(15, 2);
ALTER TABLE public.ordenes_pago ALTER COLUMN fecha_op TYPE TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ordenes_pago ALTER COLUMN numero_op TYPE TEXT;
ALTER TABLE public.ordenes_pago ALTER COLUMN total_op TYPE NUMERIC(15, 2);
ALTER TABLE public.ordenes_pago ALTER COLUMN fecha_aprobacion_op TYPE TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ordenes_pago ALTER COLUMN fecha_pago TYPE TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ordenes_pago ALTER COLUMN estado TYPE TEXT;
ALTER TABLE public.ordenes_pago ALTER COLUMN created_at TYPE TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ordenes_pago ALTER COLUMN updated_at TYPE TIMESTAMP WITH TIME ZONE;

-- 4. ESTABLECER CAMPOS OBLIGATORIOS (NOT NULL)
-- ============================================================================
-- Solo los campos esenciales deben ser NOT NULL
ALTER TABLE public.ordenes_pago ALTER COLUMN id SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN fecha_solicitud SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN numero_solicitud SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN proveedor SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN concepto SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN monto_solicitud SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN iva SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN total_solicitud SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN estado SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN updated_at SET NOT NULL;

-- 5. ESTABLECER VALORES POR DEFECTO
-- ============================================================================
-- Asegurar valores por defecto
ALTER TABLE public.ordenes_pago ALTER COLUMN id SET DEFAULT uuid_generate_v4();
ALTER TABLE public.ordenes_pago ALTER COLUMN fecha_solicitud SET DEFAULT NOW();
ALTER TABLE public.ordenes_pago ALTER COLUMN iva SET DEFAULT 0.00;
ALTER TABLE public.ordenes_pago ALTER COLUMN estado SET DEFAULT 'Solicitada';
ALTER TABLE public.ordenes_pago ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE public.ordenes_pago ALTER COLUMN updated_at SET DEFAULT NOW();

-- 6. ACTUALIZAR DATOS EXISTENTES ANTES DEL CONSTRAINT
-- ============================================================================
-- Actualizar estados existentes de minúsculas a mayúscula inicial
UPDATE public.ordenes_pago SET estado = 'Solicitada' WHERE estado = 'solicitada';
UPDATE public.ordenes_pago SET estado = 'Devuelta' WHERE estado = 'devuelta';
UPDATE public.ordenes_pago SET estado = 'Generada' WHERE estado = 'generada';
UPDATE public.ordenes_pago SET estado = 'Aprobada' WHERE estado = 'aprobada';
UPDATE public.ordenes_pago SET estado = 'Pagada' WHERE estado = 'pagada';

-- También actualizar estados que podrían existir con otros nombres
UPDATE public.ordenes_pago SET estado = 'Solicitada' WHERE estado = 'pendiente';
UPDATE public.ordenes_pago SET estado = 'Aprobada' WHERE estado = 'aprovada'; -- typo común
UPDATE public.ordenes_pago SET estado = 'Devuelta' WHERE estado = 'rechazada';

-- 7. CONSTRAINT PARA ESTADOS VÁLIDOS
-- ============================================================================
-- Eliminar constraint anterior si existe
ALTER TABLE public.ordenes_pago DROP CONSTRAINT IF EXISTS ordenes_pago_estado_check;
ALTER TABLE public.ordenes_pago DROP CONSTRAINT IF EXISTS check_estado_valido;

-- Crear nuevo constraint con los 5 estados únicos
ALTER TABLE public.ordenes_pago 
ADD CONSTRAINT ordenes_pago_estado_check 
CHECK (estado IN (
    'Solicitada',        -- Solicitud creada
    'Devuelta',          -- Solicitud devuelta para corrección
    'Generada',          -- OP generada
    'Aprobada',          -- OP aprobada para pago
    'Pagada'             -- OP pagada y completada
));

-- 8. ÍNDICES PARA RENDIMIENTO
-- ============================================================================
-- Recrear índices importantes
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_numero_solicitud ON public.ordenes_pago (numero_solicitud);
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_proveedor ON public.ordenes_pago (proveedor);
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_estado ON public.ordenes_pago (estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_fecha_solicitud ON public.ordenes_pago (fecha_solicitud);
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_numero_op ON public.ordenes_pago (numero_op);
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_fecha_op ON public.ordenes_pago (fecha_op);

-- 9. TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ============================================================================
-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Crear trigger
DROP TRIGGER IF EXISTS trigger_ordenes_pago_updated_at ON public.ordenes_pago;
CREATE TRIGGER trigger_ordenes_pago_updated_at
    BEFORE UPDATE ON public.ordenes_pago
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 10. TABLA DE IMPUESTOS (si no existe)
-- ============================================================================
-- Incluir la tabla de impuestos en el mismo script
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

-- Índices para conceptos_impuestos
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_concepto ON public.conceptos_impuestos (concepto_impuesto);
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_tipo ON public.conceptos_impuestos (tipo_impuesto);

-- RLS para conceptos_impuestos
ALTER TABLE public.conceptos_impuestos ENABLE ROW LEVEL SECURITY;

-- Eliminar política si existe antes de crearla
DROP POLICY IF EXISTS "Todos pueden leer impuestos" ON public.conceptos_impuestos;

-- Crear nueva política
CREATE POLICY "Todos pueden leer impuestos" ON public.conceptos_impuestos
    FOR SELECT USING (auth.role() = 'authenticated');

-- Datos iniciales de IVA
INSERT INTO public.conceptos_impuestos (
    concepto_impuesto, porcentaje_aplicacion, descripcion, tipo_impuesto, activo, 
    vigencia_desde, vigencia_hasta, observaciones
) VALUES (
    'IVA', 0.19, 'IVA 19% - Tarifa estándar vigente en Colombia', 'IVA', TRUE, 
    '2023-01-01', NULL, 'Tarifa actual estándar de IVA en Colombia'
) ON CONFLICT (concepto_impuesto) DO NOTHING;

-- 11. FUNCIÓN get_iva_vigente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_iva_vigente()
RETURNS TABLE (
    concepto_impuesto TEXT,
    porcentaje_aplicacion NUMERIC,
    descripcion TEXT,
    vigencia_desde DATE,
    vigencia_hasta DATE,
    observaciones TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        ci.concepto_impuesto, ci.porcentaje_aplicacion, ci.descripcion,
        ci.vigencia_desde, ci.vigencia_hasta, ci.observaciones
    FROM public.conceptos_impuestos ci
    WHERE ci.concepto_impuesto = 'IVA' AND ci.tipo_impuesto = 'IVA' AND ci.activo = TRUE
        AND ci.vigencia_desde <= CURRENT_DATE
        AND (ci.vigencia_hasta IS NULL OR ci.vigencia_hasta >= CURRENT_DATE)
    ORDER BY ci.vigencia_desde DESC LIMIT 1;
END;
$$;

-- ============================================================================
-- VERIFICACIONES FINALES
-- ============================================================================
-- Mostrar estructura final de la tabla
SELECT 'ESTRUCTURA FINAL - ordenes_pago:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ordenes_pago'
ORDER BY ordinal_position;

-- Mostrar estados válidos
SELECT 'ESTADOS VÁLIDOS:' as info;
SELECT UNNEST(ARRAY[
    'Solicitada', 'Devuelta', 'Generada', 'Aprobada', 'Pagada'
]) as estados_flujo;

-- Contar registros existentes
SELECT 'REGISTROS EXISTENTES:' as info, COUNT(*) as total FROM public.ordenes_pago;

-- ============================================================================
-- COMPLETADO ✅
-- ============================================================================
-- Tabla ordenes_pago modificada con los 16 campos en el orden especificado:
-- 1. id, 2. fecha_solicitud, 3. numero_solicitud, 4. proveedor, 5. concepto,
-- 6. monto_solicitud, 7. iva, 8. total_solicitud, 9. fecha_op, 10. numero_op,
-- 11. total_op, 12. fecha_aprobacion_op, 13. fecha_pago, 14. estado, 
-- 15. created_at, 16. updated_at
-- ============================================================================
