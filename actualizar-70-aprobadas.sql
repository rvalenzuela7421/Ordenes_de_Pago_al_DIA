-- Actualizar 70 solicitudes de servicios públicos de "Generada" a "Aprobada"

UPDATE public.ordenes_pago 
SET 
    fecha_aprobada = fecha_op + INTERVAL '1 day' * (1 + (RANDOM() * 2)::INTEGER),
    estado = 'Aprobada'
WHERE id IN (
    SELECT id 
    FROM public.ordenes_pago 
    WHERE tipo_solicitud = 'Pago de Servicios Públicos'
      AND estado = 'Generada'
      AND fecha_op IS NOT NULL
    ORDER BY RANDOM()
    LIMIT 70
);

-- Verificar resultado
SELECT COUNT(*) FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos' AND estado = 'Aprobada';
