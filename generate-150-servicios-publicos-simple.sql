-- ============================================================================
-- GENERAR 150 SOLICITUDES DE PAGO DE SERVICIOS PÚBLICOS - VERSIÓN SIMPLE
-- ============================================================================
-- Script alternativo más simple usando CTE (WITH) en lugar de LATERAL
-- ============================================================================

-- 1. OBTENER EL ÚLTIMO PDF SUBIDO
-- ============================================================================
-- Consultar el último archivo PDF subido para reutilizar
WITH ultimo_pdf AS (
    SELECT archivo_pdf_url 
    FROM public.ordenes_pago 
    WHERE archivo_pdf_url IS NOT NULL 
    ORDER BY created_at DESC 
    LIMIT 1
),

-- 2. DATOS ALEATORIOS PARA LAS 150 SOLICITUDES
-- ============================================================================
datos_solicitudes AS (
    SELECT 
        generate_series as seq,
        -- Fecha aleatoria entre 2024-01-01 y 2025-12-31
        ('2024-01-01'::date + (RANDOM() * 730)::integer) as fecha_sol,
        -- Número solicitud
        'SOL-' || 
        CASE 
            WHEN generate_series <= 75 THEN '2024-' || LPAD((generate_series + 200)::text, 3, '0')
            ELSE '2025-' || LPAD((generate_series - 75)::text, 3, '0')
        END as num_solicitud,
        -- Monto base aleatorio
        (RANDOM() * 4950000 + 50000)::numeric(15,2) as monto_base,
        -- IVA - 60% probabilidad de tener IVA
        CASE WHEN RANDOM() < 0.6 THEN 0.19 ELSE 0 END as factor_iva
    FROM generate_series(1, 150)
)

-- 3. INSERTAR LAS 150 SOLICITUDES
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
    d.fecha_sol as fecha_cuenta_cobro, -- MISMA fecha que solicitud
    
    -- Compañía receptora (5 empresas GRUPO_BOLIVAR)
    CASE (d.seq % 5)
        WHEN 0 THEN 'NT-860066444-SALUD TOTAL EPS S.A.'
        WHEN 1 THEN 'NT-830037248-SEGUROS BOLIVAR S.A.'
        WHEN 2 THEN 'NT-901438242-SALUD BOLIVAR EPS S.A.S.'
        WHEN 3 THEN 'NT-860524335-BANCO DAVIVIENDA S.A.'
        ELSE 'NT-901237355-BOLIVAR VALORES S.A. COMISIONISTA DE BOLSA'
    END as compania_receptora,
    
    -- Proveedor/Acreedor (8 empresas ACREEDORES_PSP)
    CASE (d.seq % 8)
        WHEN 0 THEN 'NT-830037248-Codensa S.A. E.S.P.'
        WHEN 1 THEN 'NT-860063875-Enel Colombia S.A. E.S.P.'
        WHEN 2 THEN 'NT-800007813-Vanti S.A. ESP'
        WHEN 3 THEN 'NT-899999094-Empresa de Acueducto y Alcantarillado de Bogotá-ESP'
        WHEN 4 THEN 'NT-899999115-Empresa de Telecomunicaciones de Bogotá, S.A. E.S.P. - ETB'
        WHEN 5 THEN 'NT-800153993-Comunicación Celular S.A. - CLARO'
        WHEN 6 THEN 'NT-830122566-Colombia Telecomunicaciones S.A. - MOVISTAR'
        ELSE 'NT-830114921-Colombia Movil S.A. E.S.P. - Tigo UNE'
    END as proveedor,
    
    -- Concepto (5 servicios públicos)
    CASE (d.seq % 5)
        WHEN 0 THEN 'Energía'
        WHEN 1 THEN 'Acueducto y Alcantarillado'
        WHEN 2 THEN 'Gas Natural Domiciliario'
        WHEN 3 THEN 'Internet'
        ELSE 'Telefonía Celular'
    END as concepto,
    
    -- Cálculos coherentes de montos
    d.monto_base as monto_solicitud,
    (d.monto_base * d.factor_iva)::numeric(15,2) as iva,
    (d.monto_base * (1 + d.factor_iva))::numeric(15,2) as total_solicitud,
    
    -- Área solicitante (10 áreas)
    CASE (d.seq % 10)
        WHEN 0 THEN 'Construcciones y Mantenimiento'
        WHEN 1 THEN 'Departamento de Procesamiento de Datos'
        WHEN 2 THEN 'Dirección Administrativa ARL'
        WHEN 3 THEN 'Gerencia Administrativa'
        WHEN 4 THEN 'Gerencia El Libertador - Admtiva'
        WHEN 5 THEN 'Oficina Santa Marta'
        WHEN 6 THEN 'Sucursal Cartagena'
        WHEN 7 THEN 'Sucursal Ibagué'
        WHEN 8 THEN 'Sucursal Manizales'
        ELSE 'Sucursal Pereira'
    END as area_solicitante,
    
    -- Autorizador (9 autorizadores)
    CASE (d.seq % 9)
        WHEN 0 THEN '41571-Daniel Barrera'
        WHEN 1 THEN '27023-Germán Ricardo Sánchez'
        WHEN 2 THEN '1032476388-Jaime Capera'
        WHEN 3 THEN '80274-Jeimy Carolina Muñoz Farfán'
        WHEN 4 THEN '1032426572-Jhoana Carolina Arias'
        WHEN 5 THEN '78965-Leidy Gómez'
        WHEN 6 THEN '32246-María de los Ángeles Castro'
        WHEN 7 THEN '42753-Samuel Murillo Ariza'
        ELSE '16659-Wilson Sacristán'
    END as autorizador,
    
    'Solicitada' as estado,
    'N' as ind_distribuciones,
    COALESCE(up.archivo_pdf_url, 'https://placeholder-pdf-url.com/servicios-publicos.pdf') as archivo_pdf_url,
    NOW() as created_at,
    NOW() as updated_at

FROM datos_solicitudes d, ultimo_pdf up;

-- 4. REPORTES DE VERIFICACIÓN
-- ============================================================================

-- Contar total de servicios públicos
SELECT 
    '🎯 SOLICITUDES CREADAS' as resultado,
    COUNT(*) as total_servicios_publicos
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos';

-- Distribución por concepto (5 servicios)
SELECT 
    '📊 POR CONCEPTO' as categoria,
    concepto,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago WHERE tipo_solicitud = 'Pago de Servicios Públicos'), 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY concepto
ORDER BY cantidad DESC;

-- Distribución por área (10 áreas)
SELECT 
    '🏢 POR ÁREA' as categoria,
    area_solicitante,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago WHERE tipo_solicitud = 'Pago de Servicios Públicos'), 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY area_solicitante
ORDER BY cantidad DESC;

-- Distribución por autorizador (9 autorizadores)
SELECT 
    '👤 POR AUTORIZADOR' as categoria,
    autorizador,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago WHERE tipo_solicitud = 'Pago de Servicios Públicos'), 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY autorizador
ORDER BY cantidad DESC;

-- Distribución por acreedor (8 acreedores)
SELECT 
    '🏪 POR ACREEDOR' as categoria,
    proveedor,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago WHERE tipo_solicitud = 'Pago de Servicios Públicos'), 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY proveedor
ORDER BY cantidad DESC;

-- Estadísticas financieras
SELECT 
    '💰 ESTADÍSTICAS FINANCIERAS' as categoria,
    COUNT(*) as total_solicitudes,
    MIN(monto_solicitud) as monto_minimo,
    MAX(monto_solicitud) as monto_maximo,
    ROUND(AVG(monto_solicitud)::numeric, 2) as monto_promedio,
    SUM(monto_solicitud) as total_monto_solicitado,
    SUM(iva) as total_iva,
    SUM(total_solicitud) as gran_total,
    COUNT(CASE WHEN iva > 0 THEN 1 END) as solicitudes_con_iva,
    COUNT(CASE WHEN iva = 0 THEN 1 END) as solicitudes_sin_iva
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos';

-- Distribución por año
SELECT 
    '📅 POR AÑO' as categoria,
    EXTRACT(YEAR FROM fecha_solicitud) as año,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM public.ordenes_pago WHERE tipo_solicitud = 'Pago de Servicios Públicos'), 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY EXTRACT(YEAR FROM fecha_solicitud)
ORDER BY año;

-- Mostrar muestra de 10 solicitudes
SELECT 
    '📋 MUESTRA (10 PRIMERAS)' as categoria,
    numero_solicitud,
    fecha_solicitud::date,
    concepto,
    SUBSTRING(proveedor, 1, 30) || '...' as proveedor_resumido,
    area_solicitante,
    SUBSTRING(autorizador, 1, 20) || '...' as autorizador_resumido,
    monto_solicitud,
    iva,
    total_solicitud,
    estado
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
ORDER BY created_at
LIMIT 10;

-- ============================================================================
-- 🎉 SCRIPT COMPLETADO EXITOSAMENTE
-- ============================================================================
-- ✅ 150 solicitudes "Pago de Servicios Públicos" creadas
-- ✅ Distribución equitativa en todos los parámetros
-- ✅ Fechas aleatorias entre 2024-2025
-- ✅ Montos realistas hasta $5,000,000
-- ✅ 60% con IVA, 40% sin IVA
-- ✅ Último PDF reutilizado automáticamente
-- ============================================================================
