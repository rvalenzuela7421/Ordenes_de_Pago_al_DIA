-- ============================================================================
-- ACTUALIZAR 100 SOLICITUDES DE SERVICIOS PÚBLICOS - VERSION SIMPLE
-- ============================================================================

-- Actualizar las 100 solicitudes de servicios públicos más antiguas
WITH solicitudes_antiguas AS (
    SELECT 
        id,
        numero_solicitud,
        fecha_solicitud,
        ROW_NUMBER() OVER (ORDER BY fecha_solicitud ASC) as row_num
    FROM public.ordenes_pago 
    WHERE tipo_solicitud = 'Pago de Servicios Públicos'
      AND estado = 'Solicitada'
    ORDER BY fecha_solicitud ASC
    LIMIT 100
)
UPDATE public.ordenes_pago 
SET 
    fecha_op = sa.fecha_solicitud + INTERVAL '1 day' * (1 + (RANDOM() * 2)::INTEGER),
    numero_op = 'OP-' || EXTRACT(YEAR FROM sa.fecha_solicitud)::text || '-' || LPAD(sa.row_num::text, 5, '0'),
    estado = 'Generada'
FROM solicitudes_antiguas sa
WHERE ordenes_pago.id = sa.id;

-- Verificar que se actualizaron correctamente
SELECT 
    COUNT(*) as solicitudes_actualizadas,
    'Estado cambiado a Generada' as cambio
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Generada'
  AND fecha_op IS NOT NULL
  AND numero_op IS NOT NULL;
