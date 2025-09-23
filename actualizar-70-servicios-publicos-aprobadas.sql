-- ============================================================================
-- ACTUALIZAR 70 SOLICITUDES DE SERVICIOS PÚBLICOS A "APROBADA"
-- ============================================================================

-- Actualizar 70 solicitudes aleatorias de servicios públicos de "Generada" a "Aprobada"
WITH solicitudes_generadas AS (
    SELECT 
        id,
        numero_solicitud,
        fecha_op
    FROM public.ordenes_pago 
    WHERE tipo_solicitud = 'Pago de Servicios Públicos'
      AND estado = 'Generada'
      AND fecha_op IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 70
)
UPDATE public.ordenes_pago 
SET 
    fecha_aprobada = sg.fecha_op + INTERVAL '1 day' * (1 + (RANDOM() * 2)::INTEGER),
    estado = 'Aprobada'
FROM solicitudes_generadas sg
WHERE ordenes_pago.id = sg.id;

-- Verificar que se actualizaron correctamente
SELECT 
    COUNT(*) as solicitudes_actualizadas,
    'Estado cambiado a Aprobada' as cambio
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND estado = 'Aprobada'
  AND fecha_aprobada IS NOT NULL;
