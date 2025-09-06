-- ============================================================================
-- AGREGAR CAMPO DESCRIPCIÓN A LA TABLA ORDENES_PAGO
-- ============================================================================
-- Este script agrega el campo "descripcion" a la tabla ordenes_pago
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. AGREGAR COLUMNA DESCRIPCION
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 2. AGREGAR COMENTARIO PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON COLUMN public.ordenes_pago.descripcion IS 'Descripción detallada de la orden de pago - campo adicional capturado en nueva solicitud';

-- 3. VERIFICAR ESTRUCTURA DE LA TABLA
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
