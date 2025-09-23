UPDATE public.ordenes_pago 
SET fecha_aprobada = fecha_op + INTERVAL '1 day' * (1 + (RANDOM() * 2)::INTEGER), estado = 'Aprobada'
WHERE id IN (
    SELECT id FROM public.ordenes_pago 
    WHERE tipo_solicitud = 'Pago de Servicios Públicos' AND estado = 'Generada'
    ORDER BY RANDOM() LIMIT 70
);
