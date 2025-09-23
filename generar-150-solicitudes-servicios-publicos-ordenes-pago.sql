-- ============================================================================
-- GENERAR 150 SOLICITUDES DE SERVICIOS PÚBLICOS EN TABLA ORDENES_PAGO
-- ============================================================================
-- Script para crear 150 solicitudes de servicios públicos
-- Adaptado a la tabla ordenes_pago existente con coherencia concepto-acreedor
-- Fecha: 2025-09-23
-- 
-- CARACTERÍSTICAS IMPLEMENTADAS:
-- ✅ Coherencia concepto-acreedor:
--    • Acueducto y Alcantarillado → Solo EAAB
--    • Energía → Codensa o Enel Colombia (alternando)
--    • Gas Natural Domiciliario → Solo Vanti
--    • Internet/Telefonía Celular → ETB, Claro, Movistar o Tigo UNE
-- ✅ Descripción realista con formato de factura
-- ✅ Fechas aleatorias 2024-2025, mismo día para solicitud y documento
-- ✅ Valores hasta $5,000,000, algunos con IVA 19%
-- ✅ Archivo PDF reutilizando último subido
-- ============================================================================

-- ============================================================================
-- 1. OBTENER ÚLTIMO ARCHIVO PDF PARA REUTILIZAR
-- ============================================================================

-- Consultar el último archivo PDF subido para reutilizar
WITH ultimo_pdf AS (
    SELECT archivo_pdf_url 
    FROM public.ordenes_pago 
    WHERE archivo_pdf_url IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
),

-- ============================================================================
-- 2. GENERAR DATOS PARA LAS 150 SOLICITUDES
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
-- 3. INSERTAR LAS 150 SOLICITUDES DE SERVICIOS PÚBLICOS
-- ============================================================================

INSERT INTO public.ordenes_pago (
    fecha_solicitud,
    numero_solicitud,
    tipo_solicitud,
    fecha_cuenta_cobro,
    compania_receptora,
    proveedor,
    concepto,
    monto_solicitud,
    iva,
    total_solicitud,
    descripcion,
    area_solicitante,
    autorizador,
    estado,
    ind_distribuciones,
    archivo_pdf_url,
    created_at,
    updated_at
)
SELECT 
    d.fecha_sol as fecha_solicitud,
    d.num_solicitud as numero_solicitud,
    'Pago de Servicios Públicos' as tipo_solicitud,
    d.fecha_sol as fecha_cuenta_cobro, -- MISMA fecha que solicitud como solicitaste
    
    -- Compañía receptora: Distribuir entre las empresas del Grupo Bolívar
    CASE (d.seq % 5)
        WHEN 0 THEN 'NT-860066444-SALUD TOTAL EPS S.A.'
        WHEN 1 THEN 'NT-830037248-SEGUROS BOLIVAR S.A.'
        WHEN 2 THEN 'NT-901438242-SALUD BOLIVAR EPS S.A.S.'
        WHEN 3 THEN 'NT-860524335-BANCO DAVIVIENDA S.A.'
        ELSE 'NT-901237355-BOLIVAR VALORES S.A. COMISIONISTA DE BOLSA'
    END as compania_receptora,
    
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
    END as proveedor,
    
    -- Cálculos financieros coherentes
    d.monto_base as monto_solicitud,
    (d.monto_base * d.factor_iva)::numeric(15,2) as iva,
    (d.monto_base * (1 + d.factor_iva))::numeric(15,2) as total_solicitud,
    
    -- Descripción con formato de factura realista
    'Factura: ' || (10000000 + (RANDOM() * 89999999)::INT)::text ||
    E'\nPeríodo facturado: ' || 
    to_char(d.fecha_sol - INTERVAL '2 months', 'MON/DD/YYYY') || ' - ' ||
    to_char(d.fecha_sol - INTERVAL '1 month', 'MON/DD/YYYY') ||
    E'\nPago oportuno: ' || 
    to_char(d.fecha_sol + INTERVAL '15 days', 'MON/DD/YYYY') ||
    E'\nSuspensión: ' || 
    to_char(d.fecha_sol + INTERVAL '20 days', 'MON/DD/YYYY') as descripcion,
    
    -- Área solicitante: Distribuir entre diferentes áreas
    CASE (d.seq % 10)
        WHEN 0 THEN 'ADMINISTRATIVO'
        WHEN 1 THEN 'FINANCIERO'
        WHEN 2 THEN 'TECNOLOGIA'
        WHEN 3 THEN 'JURIDICO'
        WHEN 4 THEN 'RECURSOS HUMANOS'
        WHEN 5 THEN 'COMERCIAL'
        WHEN 6 THEN 'OPERACIONES'
        WHEN 7 THEN 'CONTABILIDAD'
        WHEN 8 THEN 'AUDITORIA'
        ELSE 'GERENCIA GENERAL'
    END as area_solicitante,
    
    -- Autorizador: Distribuir entre diferentes autorizadores
    CASE (d.seq % 9)
        WHEN 0 THEN 'Carlos Mendoza'
        WHEN 1 THEN 'Ana García'
        WHEN 2 THEN 'Luis Rodríguez'
        WHEN 3 THEN 'María Fernández'
        WHEN 4 THEN 'José Martínez'
        WHEN 5 THEN 'Carmen López'
        WHEN 6 THEN 'Roberto Silva'
        WHEN 7 THEN 'Patricia Vargas'
        ELSE 'Miguel Torres'
    END as autorizador,
    
    -- Estado inicial
    'Solicitada' as estado,
    
    -- Distribuciones: 20% de las solicitudes tendrán distribuciones
    CASE WHEN (RANDOM() < 0.2) THEN 'S' ELSE 'N' END as ind_distribuciones,
    
    -- PDF: Reutilizar el último subido o usar placeholder
    COALESCE(
        up.archivo_pdf_url,
        'https://storage.supabase.co/placeholder/servicios-publicos.pdf'
    ) as archivo_pdf_url,
    
    -- Timestamps
    NOW() as created_at,
    NOW() as updated_at

FROM datos_solicitudes d, ultimo_pdf up;

-- ============================================================================
-- 4. REPORTES Y ESTADÍSTICAS DE LAS SOLICITUDES GENERADAS
-- ============================================================================

-- Resumen general
SELECT 
    '📋 RESUMEN GENERAL' as categoria,
    COUNT(*) as total_solicitudes,
    SUM(monto_solicitud)::numeric(15,2) as valor_total_solicitudes,
    SUM(iva)::numeric(15,2) as iva_total,
    SUM(total_solicitud)::numeric(15,2) as total_general,
    COUNT(CASE WHEN iva > 0 THEN 1 END) as solicitudes_con_iva,
    COUNT(CASE WHEN ind_distribuciones = 'S' THEN 1 END) as solicitudes_con_distribuciones
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes';

-- Distribución por concepto de servicio
SELECT 
    '🔌 POR CONCEPTO DE SERVICIO' as categoria,
    concepto,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY concepto
ORDER BY cantidad DESC;

-- Verificación de coherencia concepto-acreedor
SELECT 
    '🔗 COHERENCIA CONCEPTO-ACREEDOR' as categoria,
    concepto,
    proveedor,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY concepto, proveedor
ORDER BY concepto, cantidad DESC;

-- Distribución por acreedor/proveedor
SELECT 
    '🏪 POR ACREEDOR' as categoria,
    proveedor,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY proveedor
ORDER BY cantidad DESC;

-- Distribución por compañía receptora
SELECT 
    '🏢 POR COMPAÑÍA RECEPTORA' as categoria,
    compania_receptora,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY compania_receptora
ORDER BY cantidad DESC;

-- Distribución por área solicitante
SELECT 
    '🏢 POR ÁREA SOLICITANTE' as categoria,
    area_solicitante,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY area_solicitante
ORDER BY cantidad DESC;

-- Distribución por autorizador
SELECT 
    '👤 POR AUTORIZADOR' as categoria,
    autorizador,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY autorizador
ORDER BY cantidad DESC;

-- Distribución por año de solicitud
SELECT 
    '📅 POR AÑO DE SOLICITUD' as categoria,
    EXTRACT(YEAR FROM fecha_solicitud)::text as año,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY EXTRACT(YEAR FROM fecha_solicitud)
ORDER BY año DESC;

-- Distribución por mes (últimos 12 meses)
SELECT 
    '📆 POR MES' as categoria,
    to_char(fecha_solicitud, 'YYYY-MM') as año_mes,
    COUNT(*) as cantidad,
    SUM(total_solicitud)::numeric(15,2) as valor_total
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
GROUP BY to_char(fecha_solicitud, 'YYYY-MM')
ORDER BY año_mes DESC;

-- Estadísticas de IVA
SELECT 
    '💰 ESTADÍSTICAS DE IVA' as categoria,
    COUNT(CASE WHEN iva > 0 THEN 1 END) as solicitudes_con_iva,
    COUNT(CASE WHEN iva = 0 THEN 1 END) as solicitudes_sin_iva,
    ROUND(AVG(CASE WHEN iva > 0 THEN (iva/monto_solicitud)*100 ELSE 0 END), 2) as porcentaje_iva_promedio,
    SUM(iva)::numeric(15,2) as total_iva_cobrado
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes';

-- Verificar rangos de valores
SELECT 
    '📊 RANGOS DE VALORES' as categoria,
    MIN(monto_solicitud)::numeric(15,2) as valor_minimo,
    MAX(monto_solicitud)::numeric(15,2) as valor_maximo,
    ROUND(AVG(monto_solicitud), 2) as valor_promedio,
    ROUND(STDDEV(monto_solicitud), 2) as desviacion_estandar
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes';

-- Muestra de registros creados
SELECT 
    '📄 MUESTRA DE SOLICITUDES CREADAS' as categoria,
    numero_solicitud,
    concepto,
    proveedor,
    monto_solicitud,
    iva,
    total_solicitud,
    area_solicitante,
    autorizador,
    LEFT(descripcion, 50) || '...' as descripcion_muestra
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
  AND numero_solicitud LIKE 'SOL-%-00020%'
  AND fecha_solicitud >= CURRENT_DATE - INTERVAL '5 minutes'
ORDER BY numero_solicitud
LIMIT 10;

-- ============================================================================
-- 5. MENSAJE DE FINALIZACIÓN
-- ============================================================================

SELECT 
    '🎉 GENERACIÓN COMPLETADA' as estado,
    '150 solicitudes de servicios públicos creadas exitosamente en tabla ordenes_pago' as mensaje,
    'Números de solicitud: SOL-YYYY-000201 a SOL-YYYY-000350' as rango_solicitudes,
    NOW() as fecha_completacion;
