-- ============================================================================
-- GENERAR 150 SOLICITUDES DE TIPO SERVICIOS PÚBLICOS
-- ============================================================================
-- Script para crear 150 solicitudes de servicios públicos en tabla solicitudes_op
-- Adaptado a la estructura real de la tabla del área tributaria
-- Fecha: 2025-09-23
-- 
-- CARACTERÍSTICAS IMPLEMENTADAS:
-- ✅ Coherencia concepto-acreedor:
--    • Acueducto y Alcantarillado → Solo EAAB
--    • Energía → Codensa o Enel Colombia (alternando)
--    • Gas Natural Domiciliario → Solo Vanti
--    • Internet/Telefonía Celular → ETB, Claro, Movistar o Tigo UNE
-- ✅ Observaciones realistas con formato de factura
-- ✅ Fechas aleatorias 2024-2025, mismo día para solicitud y documento
-- ✅ Valores hasta $5,000,000, algunos con IVA 19%
-- ✅ Archivos PDF reutilizando último subido
-- ============================================================================

-- NOTA IMPORTANTE:
-- La tabla solicitudes_op actual tiene una restricción CHECK en el campo concepto
-- que no incluye servicios públicos. Primero necesitamos modificar esta restricción.

-- ============================================================================
-- 1. MODIFICAR RESTRICCIÓN DE CONCEPTOS PARA INCLUIR SERVICIOS PÚBLICOS
-- ============================================================================

-- Eliminar restricción actual del concepto
ALTER TABLE public.solicitudes_op DROP CONSTRAINT IF EXISTS solicitudes_op_concepto_check;

-- Crear nueva restricción que incluya servicios públicos
ALTER TABLE public.solicitudes_op ADD CONSTRAINT solicitudes_op_concepto_check 
CHECK (concepto IN (
    -- Conceptos originales del área tributaria
    'Convenio de uso de red',
    'Reconocimiento y pago de comisiones por recaudo Leasing',
    'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
    'Costo de recaudo TRC',
    'Referenciación de clientes',
    'Bono cumplimiento penetraciones seguros voluntarios',
    'Retornos títulos de capitalización GanaMás',
    -- Nuevos conceptos para servicios públicos
    'Energía',
    'Acueducto y Alcantarillado',
    'Gas Natural Domiciliario',
    'Internet',
    'Telefonía Celular'
));

-- ============================================================================
-- 2. OBTENER ÚLTIMO ARCHIVO PDF SUBIDO PARA REUTILIZAR
-- ============================================================================

-- Consultar el último archivo PDF de cuenta de cobro para reutilizar
WITH ultimo_pdf AS (
    SELECT ruta_archivo 
    FROM public.solicitudes_op_archivos 
    WHERE tipo_archivo = 'pdf' 
      AND es_cuenta_cobro = TRUE 
      AND ruta_archivo IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
),

-- ============================================================================
-- 3. GENERAR DATOS PARA LAS 150 SOLICITUDES
-- ============================================================================

datos_solicitudes AS (
    SELECT 
        generate_series as seq,
        
        -- Fechas aleatorias entre 2024-01-01 y 2025-12-31
        (DATE '2024-01-01' + (RANDOM() * (DATE '2025-12-31' - DATE '2024-01-01'))::INT)::DATE as fecha_sol,
        
        -- Número de solicitud con formato SOL-YYYY-XXXXXX
        'SOL-' || 
        EXTRACT(YEAR FROM (DATE '2024-01-01' + (RANDOM() * (DATE '2025-12-31' - DATE '2024-01-01'))::INT)::DATE)::text ||
        '-' || LPAD((200 + generate_series)::text, 6, '0') as num_solicitud,
        
        -- Montos aleatorios entre $50,000 y $5,000,000
        (RANDOM() * 4950000 + 50000)::numeric(15,2) as monto_base,
        
        -- Factor de IVA: 30% de las solicitudes tendrán IVA 19%, 70% sin IVA
        CASE 
            WHEN RANDOM() < 0.3 THEN 0.19 
            ELSE 0.0 
        END as factor_iva
        
    FROM generate_series(1, 150)
)

-- ============================================================================
-- 4. INSERTAR LAS 150 SOLICITUDES DE SERVICIOS PÚBLICOS
-- ============================================================================

INSERT INTO public.solicitudes_op (
    numero_solicitud,
    concepto,
    acreedor,
    valor_solicitud,
    iva,
    total_solicitud,
    observaciones,
    tiene_distribuciones,
    estado,
    fecha_solicitud,
    metadata,
    created_at,
    updated_at
)
SELECT 
    d.num_solicitud as numero_solicitud,
    
    -- Definir el concepto primero para determinar el acreedor coherente
    CASE (d.seq % 5)
        WHEN 0 THEN 'Energía'
        WHEN 1 THEN 'Acueducto y Alcantarillado'
        WHEN 2 THEN 'Gas Natural Domiciliario'
        WHEN 3 THEN 'Internet'
        ELSE 'Telefonía Celular'
    END as concepto,
    
    -- Acreedor coherente según el concepto del servicio
    CASE 
        -- 1. Acueducto y Alcantarillado → Solo EAAB
        WHEN (d.seq % 5) = 1 THEN 'NT-899999094-Empresa de Acueducto y Alcantarillado de Bogotá-ESP'
        
        -- 2. Energía → Codensa o Enel (alternar)
        WHEN (d.seq % 5) = 0 THEN 
            CASE (d.seq % 2)
                WHEN 0 THEN 'NT-830037248-Codensa S.A. E.S.P.'
                ELSE 'NT-860063875-Enel Colombia S.A. E.S.P.'
            END
        
        -- 3. Gas Natural → Solo Vanti
        WHEN (d.seq % 5) = 2 THEN 'NT-800007813-Vanti S.A. ESP'
        
        -- 4. Internet y Telefonía Celular → ETB, CLARO, MOVISTAR o Tigo UNE (rotar entre 4)
        ELSE 
            CASE (d.seq % 4)
                WHEN 0 THEN 'NT-899999115-Empresa de Telecomunicaciones de Bogotá, S.A. E.S.P. - ETB'
                WHEN 1 THEN 'NT-800153993-Comunicación Celular S.A. - CLARO'
                WHEN 2 THEN 'NT-830122566-Colombia Telecomunicaciones S.A. - MOVISTAR'
                ELSE 'NT-830114921-Colombia Movil S.A. E.S.P. - Tigo UNE'
            END
    END as acreedor,
    
    -- Cálculos financieros coherentes
    d.monto_base as valor_solicitud,
    (d.monto_base * d.factor_iva)::numeric(15,2) as iva,
    (d.monto_base * (1 + d.factor_iva))::numeric(15,2) as total_solicitud,
    
    -- Observaciones con formato de factura realista
    'Factura: ' || (10000000 + (RANDOM() * 89999999)::INT)::text ||
    E'\nPeríodo facturado: ' || 
    to_char(d.fecha_sol - INTERVAL '2 months', 'MON/DD/YYYY') || ' - ' ||
    to_char(d.fecha_sol - INTERVAL '1 month', 'MON/DD/YYYY') ||
    E'\nPago oportuno: ' || 
    to_char(d.fecha_sol + INTERVAL '15 days', 'MON/DD/YYYY') ||
    E'\nSuspensión: ' || 
    to_char(d.fecha_sol + INTERVAL '20 days', 'MON/DD/YYYY') as observaciones,
    
    -- Distribuciones: 20% de las solicitudes tendrán distribuciones
    (RANDOM() < 0.2) as tiene_distribuciones,
    
    -- Estado inicial
    'solicitada' as estado,
    
    -- Fecha de solicitud (misma que fecha del documento como solicita el usuario)
    d.fecha_sol as fecha_solicitud,
    
    -- Metadata con información adicional
    jsonb_build_object(
        'tipo_solicitud', 'Pago de Servicios Públicos',
        'generado_automaticamente', true,
        'fecha_generacion', NOW(),
        'lote_generacion', 'SERVICIOS_PUBLICOS_150_' || to_char(NOW(), 'YYYYMMDDHH24MISS')
    ) as metadata,
    
    -- Timestamps
    NOW() as created_at,
    NOW() as updated_at

FROM datos_solicitudes d, ultimo_pdf up;

-- ============================================================================
-- 5. INSERTAR ARCHIVOS PDF PARA TODAS LAS SOLICITUDES
-- ============================================================================

-- Insertar archivo PDF de cuenta de cobro para cada solicitud creada
INSERT INTO public.solicitudes_op_archivos (
    solicitud_id,
    nombre_archivo,
    tipo_archivo,
    ruta_archivo,
    tamaño_archivo,
    descripcion,
    es_cuenta_cobro,
    es_distribuciones,
    created_at
)
SELECT 
    s.id as solicitud_id,
    'cuenta_cobro_' || s.numero_solicitud || '.pdf' as nombre_archivo,
    'pdf' as tipo_archivo,
    
    -- Usar el último PDF subido o un placeholder
    COALESCE(
        (SELECT ruta_archivo FROM public.solicitudes_op_archivos 
         WHERE tipo_archivo = 'pdf' AND es_cuenta_cobro = TRUE AND ruta_archivo IS NOT NULL 
         ORDER BY created_at DESC LIMIT 1),
        'https://storage.supabase.co/placeholder/servicios-publicos.pdf'
    ) as ruta_archivo,
    
    -- Tamaño estimado del archivo (entre 100KB y 500KB)
    (RANDOM() * 400000 + 100000)::INTEGER as tamaño_archivo,
    
    'Cuenta de cobro de servicios públicos - Generada automáticamente' as descripcion,
    TRUE as es_cuenta_cobro,
    FALSE as es_distribuciones,
    NOW() as created_at
    
FROM public.solicitudes_op s 
WHERE s.metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND s.metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%';

-- ============================================================================
-- 6. INSERTAR ARCHIVOS XLSX PARA SOLICITUDES CON DISTRIBUCIONES
-- ============================================================================

-- Insertar archivo XLSX de distribuciones solo para solicitudes que lo requieran
INSERT INTO public.solicitudes_op_archivos (
    solicitud_id,
    nombre_archivo,
    tipo_archivo,
    ruta_archivo,
    tamaño_archivo,
    descripcion,
    es_cuenta_cobro,
    es_distribuciones,
    created_at
)
SELECT 
    s.id as solicitud_id,
    'distribuciones_' || s.numero_solicitud || '.xlsx' as nombre_archivo,
    'xlsx' as tipo_archivo,
    'https://storage.supabase.co/placeholder/distribuciones-servicios-publicos.xlsx' as ruta_archivo,
    
    -- Tamaño estimado para archivo Excel (entre 20KB y 100KB)
    (RANDOM() * 80000 + 20000)::INTEGER as tamaño_archivo,
    
    'Archivo de distribuciones contables - Servicios públicos' as descripcion,
    FALSE as es_cuenta_cobro,
    TRUE as es_distribuciones,
    NOW() as created_at
    
FROM public.solicitudes_op s 
WHERE s.metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND s.metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%'
  AND s.tiene_distribuciones = TRUE;

-- ============================================================================
-- 7. REPORTES Y ESTADÍSTICAS DE LAS SOLICITUDES GENERADAS
-- ============================================================================

-- Resumen general
SELECT 
    '📋 RESUMEN GENERAL' as categoria,
    COUNT(*) as total_solicitudes,
    SUM(valor_solicitud)::numeric(15,2) as valor_total_solicitudes,
    SUM(iva)::numeric(15,2) as iva_total,
    SUM(total_solicitud)::numeric(15,2) as total_general,
    COUNT(CASE WHEN iva > 0 THEN 1 END) as solicitudes_con_iva,
    COUNT(CASE WHEN tiene_distribuciones THEN 1 END) as solicitudes_con_distribuciones
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%';

-- Distribución por concepto de servicio
SELECT 
    '🔌 POR CONCEPTO DE SERVICIO' as categoria,
    concepto,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%'
GROUP BY concepto
ORDER BY cantidad DESC;

-- Distribución por acreedor/proveedor (coherente con concepto)
SELECT 
    '🏪 POR ACREEDOR' as categoria,
    acreedor,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%'
GROUP BY acreedor
ORDER BY cantidad DESC;

-- Verificación de coherencia concepto-acreedor
SELECT 
    '🔗 COHERENCIA CONCEPTO-ACREEDOR' as categoria,
    concepto,
    acreedor,
    COUNT(*) as cantidad
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%'
GROUP BY concepto, acreedor
ORDER BY concepto, cantidad DESC;

-- Distribución por año de solicitud
SELECT 
    '📅 POR AÑO DE SOLICITUD' as categoria,
    EXTRACT(YEAR FROM fecha_solicitud)::text as año,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%'
GROUP BY EXTRACT(YEAR FROM fecha_solicitud)
ORDER BY año DESC;

-- Distribución por mes (últimos 12 meses)
SELECT 
    '📆 POR MES' as categoria,
    to_char(fecha_solicitud, 'YYYY-MM') as año_mes,
    COUNT(*) as cantidad,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%'
GROUP BY to_char(fecha_solicitud, 'YYYY-MM')
ORDER BY año_mes DESC;

-- Estadísticas de IVA
SELECT 
    '💰 ESTADÍSTICAS DE IVA' as categoria,
    COUNT(CASE WHEN iva > 0 THEN 1 END) as solicitudes_con_iva,
    COUNT(CASE WHEN iva = 0 THEN 1 END) as solicitudes_sin_iva,
    ROUND(AVG(CASE WHEN iva > 0 THEN (iva/valor_solicitud)*100 ELSE 0 END), 2) as porcentaje_iva_promedio,
    SUM(iva)::numeric(15,2) as total_iva_cobrado
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%';

-- Estadísticas de archivos adjuntos
SELECT 
    '📎 ARCHIVOS ADJUNTOS' as categoria,
    COUNT(DISTINCT s.id) as total_solicitudes,
    COUNT(CASE WHEN a.es_cuenta_cobro THEN 1 END) as archivos_pdf,
    COUNT(CASE WHEN a.es_distribuciones THEN 1 END) as archivos_xlsx,
    ROUND(AVG(a.tamaño_archivo) / 1024, 0) as tamaño_promedio_kb
FROM public.solicitudes_op s
LEFT JOIN public.solicitudes_op_archivos a ON s.id = a.solicitud_id
WHERE s.metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND s.metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%';

-- Verificar rangos de valores
SELECT 
    '📊 RANGOS DE VALORES' as categoria,
    MIN(valor_solicitud)::numeric(15,2) as valor_minimo,
    MAX(valor_solicitud)::numeric(15,2) as valor_maximo,
    ROUND(AVG(valor_solicitud), 2) as valor_promedio,
    ROUND(STDDEV(valor_solicitud), 2) as desviacion_estandar
FROM public.solicitudes_op 
WHERE metadata->>'tipo_solicitud' = 'Pago de Servicios Públicos'
  AND metadata->>'lote_generacion' LIKE 'SERVICIOS_PUBLICOS_150_%';

-- ============================================================================
-- 8. MENSAJE DE FINALIZACIÓN
-- ============================================================================

SELECT 
    '🎉 GENERACIÓN COMPLETADA' as estado,
    '150 solicitudes de servicios públicos creadas exitosamente' as mensaje,
    'Lote: SERVICIOS_PUBLICOS_150_' || to_char(NOW(), 'YYYYMMDDHH24MISS') as lote_generacion,
    NOW() as fecha_completacion;
