-- ============================================================================
-- GENERAR 150 SOLICITUDES DE PAGO DE SERVICIOS PÚBLICOS
-- ============================================================================
-- Este script genera 150 solicitudes de "Pago de Servicios Públicos" con:
-- - Fechas aleatorias entre 2024-2025
-- - Distribución variada de conceptos, áreas, autorizadores y acreedores
-- - Montos hasta $5.000.000 con algunos con IVA
-- - Reutiliza el último PDF subido
-- ============================================================================

-- 1. OBTENER EL ÚLTIMO PDF SUBIDO PARA REUTILIZAR
-- ============================================================================
-- Consultar el último archivo PDF subido
SELECT archivo_pdf_url 
FROM public.ordenes_pago 
WHERE archivo_pdf_url IS NOT NULL 
ORDER BY created_at DESC 
LIMIT 1;

-- 2. GENERAR LAS 150 SOLICITUDES CON DATOS VARIABLES
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
    -- Fecha aleatoria entre 2024-01-01 y 2025-12-31
    fechas.fecha_sol as fecha_solicitud,
    
    -- Número de solicitud secuencial
    'SOL-' || 
    CASE 
        WHEN generate_series <= 75 THEN '2024-' || LPAD((generate_series + 200)::text, 3, '0')
        ELSE '2025-' || LPAD((generate_series - 75)::text, 3, '0')
    END as numero_solicitud,
    
    -- Tipo de solicitud fijo
    'Pago de Servicios Públicos' as tipo_solicitud,
    
    -- Fecha documento cobro = MISMA fecha solicitud (como pide el usuario)
    fechas.fecha_sol as fecha_cuenta_cobro,
    
    -- Compañía receptora (rotar entre las 5 primeras de GRUPO_BOLIVAR)
    CASE (generate_series % 5)
        WHEN 0 THEN 'NT-860066444-SALUD TOTAL EPS S.A.'
        WHEN 1 THEN 'NT-830037248-SEGUROS BOLIVAR S.A.'
        WHEN 2 THEN 'NT-901438242-SALUD BOLIVAR EPS S.A.S.'
        WHEN 3 THEN 'NT-860524335-BANCO DAVIVIENDA S.A.'
        ELSE 'NT-901237355-BOLIVAR VALORES S.A. COMISIONISTA DE BOLSA'
    END as compania_receptora,
    
    -- Proveedor = Acreedor (del grupo ACREEDORES_PSP)
    CASE (generate_series % 8)
        WHEN 0 THEN 'NT-830037248-Codensa S.A. E.S.P.'
        WHEN 1 THEN 'NT-860063875-Enel Colombia S.A. E.S.P.'
        WHEN 2 THEN 'NT-800007813-Vanti S.A. ESP'
        WHEN 3 THEN 'NT-899999094-Empresa de Acueducto y Alcantarillado de Bogotá-ESP'
        WHEN 4 THEN 'NT-899999115-Empresa de Telecomunicaciones de Bogotá, S.A. E.S.P. - ETB'
        WHEN 5 THEN 'NT-800153993-Comunicación Celular S.A. - CLARO'
        WHEN 6 THEN 'NT-830122566-Colombia Telecomunicaciones S.A. - MOVISTAR'
        ELSE 'NT-830114921-Colombia Movil S.A. E.S.P. - Tigo UNE'
    END as proveedor,
    
    -- Concepto (del grupo SERVICIOS_PUBLICOS)
    CASE (generate_series % 5)
        WHEN 0 THEN 'Energía'
        WHEN 1 THEN 'Acueducto y Alcantarillado'
        WHEN 2 THEN 'Gas Natural Domiciliario'
        WHEN 3 THEN 'Internet'
        ELSE 'Telefonía Celular'
    END as concepto,
    
    -- Cálculos coherentes de monto, IVA y total
    montos.monto_base as monto_solicitud,
    montos.iva_calculado as iva,
    totales.total_calculado as total_solicitud,
    
    -- Área solicitante (del grupo AREAS_SOLICITANTES_PSP)
    CASE (generate_series % 10)
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
    
    -- Autorizador (del grupo AUTORIZADOR_PSP)
    CASE (generate_series % 9)
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
    
    -- Estado inicial
    'Solicitada' as estado,
    
    -- Sin distribuciones (no obligatorio para servicios públicos)
    'N' as ind_distribuciones,
    
    -- Reutilizar el último PDF subido (obtener dinámicamente)
    COALESCE(
        (SELECT archivo_pdf_url 
         FROM public.ordenes_pago 
         WHERE archivo_pdf_url IS NOT NULL 
         ORDER BY created_at DESC 
         LIMIT 1),
        'https://placeholder-pdf-url.com/servicios-publicos.pdf'
    ) as archivo_pdf_url,
    
    -- Timestamps actuales
    NOW() as created_at,
    NOW() as updated_at

FROM generate_series(1, 150),
-- Sub-consulta para generar fechas consistentes
LATERAL (
    SELECT ('2024-01-01'::date + (RANDOM() * 730)::integer) as fecha_sol
) fechas,
-- Sub-consulta para cálculos coherentes de montos
LATERAL (
    SELECT 
        base_amount.monto_base,
        CASE 
            WHEN RANDOM() < 0.6 THEN 
                (base_amount.monto_base * 0.19)::numeric(15,2)
            ELSE 0::numeric(15,2)
        END as iva_calculado
    FROM (
        SELECT (RANDOM() * 4950000 + 50000)::numeric(15,2) as monto_base
    ) base_amount
) montos,
-- Sub-consulta para calcular total
LATERAL (
    SELECT (montos.monto_base + montos.iva_calculado) as total_calculado
) totales;

-- 3. VERIFICAR LOS RESULTADOS
-- ============================================================================

-- Contar solicitudes creadas
SELECT COUNT(*) as total_servicios_publicos
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos';

-- Distribución por concepto
SELECT 
    concepto,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY concepto
ORDER BY cantidad DESC;

-- Distribución por área solicitante
SELECT 
    area_solicitante,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY area_solicitante
ORDER BY cantidad DESC;

-- Distribución por autorizador
SELECT 
    autorizador,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY autorizador
ORDER BY cantidad DESC;

-- Distribución por acreedor/proveedor
SELECT 
    proveedor,
    COUNT(*) as cantidad,
    ROUND(COUNT(*) * 100.0 / 150, 1) as porcentaje
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY proveedor
ORDER BY cantidad DESC;

-- Estadísticas de montos
SELECT 
    COUNT(*) as total_solicitudes,
    MIN(monto_solicitud) as monto_minimo,
    MAX(monto_solicitud) as monto_maximo,
    AVG(monto_solicitud) as monto_promedio,
    SUM(monto_solicitud) as monto_total,
    COUNT(CASE WHEN iva > 0 THEN 1 END) as con_iva,
    COUNT(CASE WHEN iva = 0 THEN 1 END) as sin_iva
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos';

-- Distribución por año
SELECT 
    EXTRACT(YEAR FROM fecha_solicitud) as año,
    COUNT(*) as cantidad
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
GROUP BY EXTRACT(YEAR FROM fecha_solicitud)
ORDER BY año;

-- Mostrar primeras 5 solicitudes como muestra
SELECT 
    numero_solicitud,
    fecha_solicitud::date,
    concepto,
    proveedor,
    area_solicitante,
    autorizador,
    monto_solicitud,
    iva,
    total_solicitud,
    estado
FROM public.ordenes_pago 
WHERE tipo_solicitud = 'Pago de Servicios Públicos'
ORDER BY created_at
LIMIT 5;

-- ============================================================================
-- SCRIPT COMPLETADO
-- ============================================================================
-- ✅ 150 solicitudes de "Pago de Servicios Públicos" generadas
-- ✅ Fechas aleatorias 2024-2025
-- ✅ Montos hasta $5.000.000 con IVA variado
-- ✅ Distribución en conceptos, áreas, autorizadores y acreedores
-- ✅ Reutiliza último PDF subido
-- ✅ Estados establecidos como "Solicitada"
-- ============================================================================
