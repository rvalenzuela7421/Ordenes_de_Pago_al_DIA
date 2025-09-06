-- ============================================================================
-- MODIFICACIONES SIMPLES DE TABLAS
-- ============================================================================

-- 1. ELIMINAR COLUMNAS DE ORDENES_PAGO
-- ============================================================================
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS centro_costos;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS centro_costo;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS cuenta_contable;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS forma_pago;

-- 2. AGREGAR COLUMNA total_op
-- ============================================================================
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS total_op NUMERIC(15,2) DEFAULT 0.00;

-- 3. CREAR TABLA ESTADOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.estados (
    id SERIAL PRIMARY KEY,
    estado VARCHAR(50) UNIQUE NOT NULL
);

-- Insertar estados
INSERT INTO public.estados (estado) VALUES
('Solicitada'),
('Devuelta'),
('Generada'),
('Aprobada'),
('Pagada')
ON CONFLICT (estado) DO NOTHING;

-- 4. VERIFICAR CAMBIOS
-- ============================================================================
SELECT 'CAMBIOS COMPLETADOS' as resultado;
SELECT COUNT(*) as estados_creados FROM public.estados;
