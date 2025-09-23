-- ============================================================================
-- AGREGAR COLUMNA AREA_SOLICITANTE A TABLA ORDENES_PAGO
-- ============================================================================
-- Este script agrega el campo area_solicitante para solicitudes de servicios públicos
-- ============================================================================

-- Verificar si la columna ya existe
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND column_name = 'area_solicitante';

-- Agregar la columna area_solicitante si no existe
DO $$
BEGIN
    -- Verificar si la columna ya existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ordenes_pago' 
        AND column_name = 'area_solicitante'
    ) THEN
        -- Agregar la columna
        ALTER TABLE public.ordenes_pago 
        ADD COLUMN area_solicitante TEXT NULL;
        
        -- Agregar comentario explicativo
        COMMENT ON COLUMN public.ordenes_pago.area_solicitante IS 'Área solicitante para solicitudes de pago de servicios públicos. Opcional, solo se usa para tipo_solicitud = "Pago de Servicios Públicos"';
        
        RAISE NOTICE 'Columna area_solicitante agregada exitosamente a la tabla ordenes_pago';
    ELSE
        RAISE NOTICE 'La columna area_solicitante ya existe en la tabla ordenes_pago';
    END IF;
END $$;

-- Verificar la estructura final de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
ORDER BY ordinal_position;
