-- ============================================================================
-- AGREGAR COLUMNA AUTORIZADOR A TABLA ORDENES_PAGO
-- ============================================================================
-- Este script agrega el campo autorizador para solicitudes de servicios públicos
-- ============================================================================

-- Verificar si la columna ya existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND column_name = 'autorizador';

-- Agregar la columna autorizador si no existe
DO $$
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ordenes_pago' 
        AND column_name = 'autorizador'
    ) THEN
        -- Agregar la columna
        ALTER TABLE public.ordenes_pago 
        ADD COLUMN autorizador TEXT NULL;
        
        -- Agregar comentario explicativo
        COMMENT ON COLUMN public.ordenes_pago.autorizador IS 'Persona autorizada para aprobar solicitudes de pago de servicios públicos. Opcional, solo se usa para tipo_solicitud = "Pago de Servicios Públicos"';
        
        RAISE NOTICE 'Columna autorizador agregada exitosamente a la tabla ordenes_pago';
    ELSE
        RAISE NOTICE 'La columna autorizador ya existe en la tabla ordenes_pago';
    END IF;
END $$;

-- Verificar la estructura final de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
ORDER BY ordinal_position;
