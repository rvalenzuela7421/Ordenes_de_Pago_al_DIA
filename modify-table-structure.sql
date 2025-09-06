-- ============================================================================
-- MODIFICACIÓN DE ESTRUCTURA DE TABLAS
-- ============================================================================
-- 1. Modificar tabla ordenes_pago
-- 2. Crear tabla estados
-- ============================================================================

-- ============================================================================
-- 1. MODIFICAR TABLA ORDENES_PAGO
-- ============================================================================

-- 1.1 Eliminar columnas innecesarias (si existen)
-- ----------------------------------------------------------------------------

-- Eliminar centro_costos (verificar si existe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'ordenes_pago' 
               AND column_name = 'centro_costos') THEN
        RAISE NOTICE 'Eliminando columna centro_costos...';
        ALTER TABLE public.ordenes_pago DROP COLUMN centro_costos;
        RAISE NOTICE 'Columna centro_costos eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna centro_costos no existe, saltando...';
    END IF;
END $$;

-- Eliminar centro_costo (por si tiene nombre similar)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'ordenes_pago' 
               AND column_name = 'centro_costo') THEN
        RAISE NOTICE 'Eliminando columna centro_costo...';
        ALTER TABLE public.ordenes_pago DROP COLUMN centro_costo;
        RAISE NOTICE 'Columna centro_costo eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna centro_costo no existe, saltando...';
    END IF;
END $$;

-- Eliminar cuenta_contable
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'ordenes_pago' 
               AND column_name = 'cuenta_contable') THEN
        RAISE NOTICE 'Eliminando columna cuenta_contable...';
        ALTER TABLE public.ordenes_pago DROP COLUMN cuenta_contable;
        RAISE NOTICE 'Columna cuenta_contable eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna cuenta_contable no existe, saltando...';
    END IF;
END $$;

-- Eliminar forma_pago
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' 
               AND table_name = 'ordenes_pago' 
               AND column_name = 'forma_pago') THEN
        RAISE NOTICE 'Eliminando columna forma_pago...';
        ALTER TABLE public.ordenes_pago DROP COLUMN forma_pago;
        RAISE NOTICE 'Columna forma_pago eliminada exitosamente';
    ELSE
        RAISE NOTICE 'Columna forma_pago no existe, saltando...';
    END IF;
END $$;

-- 1.2 Agregar campo total_op después de numero_op
-- ----------------------------------------------------------------------------

-- Verificar si la columna total_op ya existe
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'ordenes_pago' 
                   AND column_name = 'total_op') THEN
        RAISE NOTICE 'Agregando columna total_op...';
        
        -- Agregar la columna total_op como NUMERIC con precisión para valores monetarios
        ALTER TABLE public.ordenes_pago 
        ADD COLUMN total_op NUMERIC(15,2) DEFAULT 0.00;
        
        -- Agregar comentario a la columna
        COMMENT ON COLUMN public.ordenes_pago.total_op IS 'Valor total de la orden de pago';
        
        RAISE NOTICE 'Columna total_op agregada exitosamente';
    ELSE
        RAISE NOTICE 'Columna total_op ya existe, saltando...';
    END IF;
END $$;

-- ============================================================================
-- 2. CREAR TABLA DE ESTADOS
-- ============================================================================

-- Crear tabla estados si no existe
CREATE TABLE IF NOT EXISTS public.estados (
    id SERIAL PRIMARY KEY,
    estado VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    orden_visualizacion INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentarios para la tabla
COMMENT ON TABLE public.estados IS 'Catálogo de estados para el flujo de órdenes de pago';
COMMENT ON COLUMN public.estados.id IS 'Identificador único del estado';
COMMENT ON COLUMN public.estados.estado IS 'Nombre del estado (único)';
COMMENT ON COLUMN public.estados.descripcion IS 'Descripción detallada del estado';
COMMENT ON COLUMN public.estados.activo IS 'Indica si el estado está activo';
COMMENT ON COLUMN public.estados.orden_visualizacion IS 'Orden para mostrar los estados en la UI';

-- Insertar los estados del flujo
INSERT INTO public.estados (estado, descripcion, orden_visualizacion) VALUES
('Solicitada', 'Solicitud de OP creada, pendiente de revisión', 1),
('Devuelta', 'Solicitud devuelta para corrección o información adicional', 2),
('Generada', 'Orden de pago generada, pendiente de aprobación', 3),
('Aprobada', 'Orden de pago aprobada, lista para pago', 4),
('Pagada', 'Orden de pago ejecutada y completada', 5)
ON CONFLICT (estado) DO NOTHING;

-- ============================================================================
-- 3. HABILITAR RLS PARA TABLA ESTADOS
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.estados ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan leer estados
DROP POLICY IF EXISTS "Usuarios pueden leer estados" ON public.estados;
CREATE POLICY "Usuarios pueden leer estados" ON public.estados
    FOR SELECT USING (auth.role() = 'authenticated');

-- Solo ciertos roles pueden modificar estados (opcional)
DROP POLICY IF EXISTS "Solo admin puede modificar estados" ON public.estados;
CREATE POLICY "Solo admin puede modificar estados" ON public.estados
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.uid() = auth.users.id 
            AND (auth.users.raw_user_meta_data->>'role' = 'admin' 
                 OR auth.users.raw_user_meta_data->>'perfil' = 'admin')
        )
    );

-- ============================================================================
-- 4. FUNCIÓN PARA ACTUALIZAR updated_at EN TABLA ESTADOS
-- ============================================================================

-- Crear trigger para updated_at en estados
DROP TRIGGER IF EXISTS trigger_estados_updated_at ON public.estados;
CREATE TRIGGER trigger_estados_updated_at
    BEFORE UPDATE ON public.estados
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. ÍNDICES PARA RENDIMIENTO
-- ============================================================================

-- Índices en tabla ordenes_pago (si no existen)
CREATE INDEX IF NOT EXISTS idx_ordenes_pago_total_op ON public.ordenes_pago (total_op);

-- Índices en tabla estados
CREATE INDEX IF NOT EXISTS idx_estados_estado ON public.estados (estado);
CREATE INDEX IF NOT EXISTS idx_estados_activo ON public.estados (activo);
CREATE INDEX IF NOT EXISTS idx_estados_orden ON public.estados (orden_visualizacion);

-- ============================================================================
-- 6. VERIFICACIONES FINALES
-- ============================================================================

-- Mostrar estructura final de ordenes_pago
SELECT 'ESTRUCTURA TABLA ordenes_pago:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'ordenes_pago'
ORDER BY ordinal_position;

-- Mostrar contenido de tabla estados
SELECT 'ESTADOS DISPONIBLES:' as info;
SELECT id, estado, descripcion, orden_visualizacion, activo 
FROM public.estados 
ORDER BY orden_visualizacion;

-- Contar registros
SELECT 'CONTEO DE REGISTROS:' as info;
SELECT 
    (SELECT COUNT(*) FROM public.ordenes_pago) as ordenes_pago,
    (SELECT COUNT(*) FROM public.estados) as estados;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
SELECT 'CAMBIOS REALIZADOS:' as resumen;
SELECT 'ELIMINADAS DE ordenes_pago:' as accion, 'centro_costos, cuenta_contable, forma_pago' as columnas;
SELECT 'AGREGADA A ordenes_pago:' as accion, 'total_op (NUMERIC)' as columnas;
SELECT 'TABLA CREADA:' as accion, 'estados (id, estado, descripcion...)' as tabla;
SELECT 'ESTADOS INSERTADOS:' as accion, 'Solicitada, Devuelta, Generada, Aprobada, Pagada' as estados;
