UPDATE public.ordenes_pago 
SET fecha_pago = fecha_aprobada + INTERVAL '1 day' * (1 + (RANDOM() * 2)::INTEGER), estado = 'Pagada'
WHERE id IN (
    SELECT id FROM public.ordenes_pago 
    WHERE tipo_solicitud = 'Pago de Servicios Públicos' AND estado = 'Aprobada'
    ORDER BY RANDOM() LIMIT 50
);
