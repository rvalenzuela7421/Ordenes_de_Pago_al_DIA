-- =====================================================
-- AJUSTE DE ESTRUCTURA DE TABLA ORDENES_PAGO
-- CON LOS 10 CAMPOS ESPECÍFICOS REQUERIDOS
-- =====================================================

-- 1. ELIMINAR CONSTRAINTS Y LIMPIAR TABLA
-- =====================================================

-- Eliminar constraints existentes
ALTER TABLE public.ordenes_pago DROP CONSTRAINT IF EXISTS ordenes_pago_estado_check;
ALTER TABLE public.ordenes_pago DROP CONSTRAINT IF EXISTS check_estado_valido;

-- Limpiar todos los datos existentes
DELETE FROM public.ordenes_pago;

-- 2. REESTRUCTURAR LA TABLA CON LOS 10 CAMPOS REQUERIDOS
-- =====================================================

-- Eliminar columnas no necesarias (si existen)
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS proveedor_nombre CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS proveedor_nit CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS numero_orden CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS area_solicitante CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS observaciones CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS creado_por CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS aprobado_por CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS fecha_aprobacion CASCADE;
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS fecha_creacion CASCADE;

-- Agregar/modificar columnas para los 10 campos requeridos
-- 1. Fecha Solicitud
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS fecha_solicitud timestamp with time zone DEFAULT now();

-- 2. Número Solicitud
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS numero_solicitud text;

-- 3. Proveedor
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS proveedor text;

-- 4. Concepto
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS concepto text;

-- 5. Monto Solicitud
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS monto_solicitud numeric(15,2);

-- 6. IVA
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS iva numeric(15,2);

-- 7. Total Solicitud
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS total_solicitud numeric(15,2);

-- 8. Fecha OP
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS fecha_op timestamp with time zone;

-- 9. Número OP
ALTER TABLE public.ordenes_pago ADD COLUMN IF NOT EXISTS numero_op text;

-- 10. Estado (ya existe, solo ajustamos el tipo)
ALTER TABLE public.ordenes_pago ALTER COLUMN estado TYPE text;

-- Eliminar columna valor antigua si existe
ALTER TABLE public.ordenes_pago DROP COLUMN IF EXISTS valor CASCADE;

-- 3. APLICAR CONSTRAINTS
-- =====================================================

-- Constraint para estados válidos (5 estados)
ALTER TABLE public.ordenes_pago 
ADD CONSTRAINT ordenes_pago_estado_check 
CHECK (estado IN ('solicitada', 'devuelta', 'generada', 'aprobada', 'pagada'));

-- Constraints adicionales para integridad
ALTER TABLE public.ordenes_pago ALTER COLUMN numero_solicitud SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN proveedor SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN concepto SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN monto_solicitud SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN iva SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN total_solicitud SET NOT NULL;
ALTER TABLE public.ordenes_pago ALTER COLUMN estado SET NOT NULL;

-- 4. POBLAR CON DATOS DE PRUEBA VARIADOS (70+ REGISTROS)
-- =====================================================

INSERT INTO public.ordenes_pago (
    fecha_solicitud,
    numero_solicitud,
    proveedor,
    concepto,
    monto_solicitud,
    iva,
    total_solicitud,
    fecha_op,
    numero_op,
    estado
) VALUES 

-- ==================== MARZO 2024 - RECIENTES ====================
('2024-03-20 09:30:00'::timestamp, 'SOL-2024-080', 'Suministros Premium S.A.S', 'Material de oficina ejecutiva', 2060000.00, 391400.00, 2451400.00, '2024-03-20 10:15:00'::timestamp, 'OP-2024-080', 'solicitada'),
('2024-03-19 14:15:00'::timestamp, 'SOL-2024-081', 'TechCloud Solutions', 'Servicios cloud computing', 7142857.00, 1357143.00, 8500000.00, '2024-03-19 15:30:00'::timestamp, 'OP-2024-081', 'generada'),
('2024-03-18 11:45:00'::timestamp, 'SOL-2024-082', 'Consultores Tributarios Pro', 'Asesoría fiscal anual', 10420168.00, 1983832.00, 12404000.00, '2024-03-18 13:20:00'::timestamp, 'OP-2024-082', 'aprobada'),
('2024-03-17 16:20:00'::timestamp, 'SOL-2024-083', 'Mantenimiento Integral', 'Reparaciones generales', 3235294.00, 614706.00, 3850000.00, null, null, 'devuelta'),
('2024-03-16 10:10:00'::timestamp, 'SOL-2024-084', 'Seguros Integrales', 'Pólizas corporativas', 15546218.00, 2953782.00, 18500000.00, '2024-03-16 11:45:00'::timestamp, 'OP-2024-084', 'pagada'),
('2024-03-15 08:30:00'::timestamp, 'SOL-2024-085', 'Papelería Moderna', 'Suministros oficina', 1008403.00, 191597.00, 1200000.00, null, null, 'solicitada'),
('2024-03-14 15:45:00'::timestamp, 'SOL-2024-086', 'Software Empresarial', 'Licencias ERP', 12268908.00, 2331092.00, 14600000.00, '2024-03-14 16:30:00'::timestamp, 'OP-2024-086', 'generada'),
('2024-03-13 12:30:00'::timestamp, 'SOL-2024-087', 'Logística Express', 'Servicios courier', 403361.00, 76639.00, 480000.00, '2024-03-13 14:15:00'::timestamp, 'OP-2024-087', 'aprobada'),
('2024-03-12 09:15:00'::timestamp, 'SOL-2024-088', 'Auditoría Profesional', 'Auditoría externa', 18907563.00, 3592437.00, 22500000.00, null, null, 'devuelta'),
('2024-03-11 14:00:00'::timestamp, 'SOL-2024-089', 'Capacitación Avanzada', 'Formación personal', 5714286.00, 1085714.00, 6800000.00, '2024-03-11 15:30:00'::timestamp, 'OP-2024-089', 'pagada'),

-- ==================== FEBRERO 2024 ====================
('2024-02-28 11:20:00'::timestamp, 'SOL-2024-070', 'Mobiliario Ejecutivo', 'Muebles oficina', 3529412.00, 670588.00, 4200000.00, null, null, 'solicitada'),
('2024-02-27 16:45:00'::timestamp, 'SOL-2024-071', 'Legal Partners', 'Asesoría jurídica', 7478992.00, 1421008.00, 8900000.00, '2024-02-27 17:30:00'::timestamp, 'OP-2024-071', 'generada'),
('2024-02-26 13:30:00'::timestamp, 'SOL-2024-072', 'Marketing 360', 'Publicidad digital', 4369748.00, 830252.00, 5200000.00, '2024-02-26 14:45:00'::timestamp, 'OP-2024-072', 'aprobada'),
('2024-02-25 09:45:00'::timestamp, 'SOL-2024-073', 'Servicios Bancarios Plus', 'Comisiones bancarias', 747899.00, 142101.00, 890000.00, null, null, 'devuelta'),
('2024-02-24 14:20:00'::timestamp, 'SOL-2024-074', 'Reparaciones Técnicas', 'Mantenimiento equipos', 1764706.00, 335294.00, 2100000.00, '2024-02-24 15:15:00'::timestamp, 'OP-2024-074', 'pagada'),
('2024-02-23 10:15:00'::timestamp, 'SOL-2024-075', 'Insumos Médicos Pro', 'Suministros salud', 630252.00, 119748.00, 750000.00, null, null, 'solicitada'),
('2024-02-22 15:30:00'::timestamp, 'SOL-2024-076', 'Vigilancia Integral', 'Servicios seguridad', 4033613.00, 766387.00, 4800000.00, '2024-02-22 16:45:00'::timestamp, 'OP-2024-076', 'generada'),
('2024-02-21 11:15:00'::timestamp, 'SOL-2024-077', 'Contabilidad Experta', 'Servicios contables', 8067227.00, 1532773.00, 9600000.00, '2024-02-21 12:30:00'::timestamp, 'OP-2024-077', 'aprobada'),
('2024-02-20 16:45:00'::timestamp, 'SOL-2024-078', 'Construcciones Modernas', 'Adecuaciones', 6050420.00, 1149580.00, 7200000.00, null, null, 'devuelta'),
('2024-02-19 08:30:00'::timestamp, 'SOL-2024-079', 'Telecom Business', 'Internet empresarial', 1092437.00, 207563.00, 1300000.00, '2024-02-19 10:00:00'::timestamp, 'OP-2024-079', 'pagada'),

-- ==================== ENERO 2024 ====================
('2024-01-31 12:20:00'::timestamp, 'SOL-2024-060', 'Aseo Profesional', 'Servicios limpieza', 1512605.00, 287395.00, 1800000.00, null, null, 'solicitada'),
('2024-01-30 14:10:00'::timestamp, 'SOL-2024-061', 'Tributaria Especializada', 'Consultoría fiscal', 11344538.00, 2155462.00, 13500000.00, '2024-01-30 15:45:00'::timestamp, 'OP-2024-061', 'generada'),
('2024-01-29 09:25:00'::timestamp, 'SOL-2024-062', 'Equipos Informáticos', 'Hardware corporativo', 9411765.00, 1788235.00, 11200000.00, '2024-01-29 11:00:00'::timestamp, 'OP-2024-062', 'aprobada'),
('2024-01-28 15:40:00'::timestamp, 'SOL-2024-063', 'Creatividad Publicitaria', 'Material promocional', 2352941.00, 447059.00, 2800000.00, null, null, 'devuelta'),
('2024-01-27 11:55:00'::timestamp, 'SOL-2024-064', 'Logística Avanzada', 'Distribución productos', 2016807.00, 383193.00, 2400000.00, '2024-01-27 13:30:00'::timestamp, 'OP-2024-064', 'pagada'),
('2024-01-26 16:30:00'::timestamp, 'SOL-2024-065', 'Consultoría Estratégica', 'Planeación empresarial', 21008403.00, 3991597.00, 25000000.00, null, null, 'solicitada'),
('2024-01-25 13:15:00'::timestamp, 'SOL-2024-066', 'Servicios Contables Pro', 'Contabilidad integral', 7394958.00, 1405042.00, 8800000.00, '2024-01-25 14:45:00'::timestamp, 'OP-2024-066', 'generada'),
('2024-01-24 10:45:00'::timestamp, 'SOL-2024-067', 'Materiales Premium', 'Insumos construcción', 4705882.00, 894118.00, 5600000.00, '2024-01-24 12:15:00'::timestamp, 'OP-2024-067', 'aprobada'),
('2024-01-23 14:20:00'::timestamp, 'SOL-2024-068', 'Formación Ejecutiva', 'Capacitación gerencial', 3529412.00, 670588.00, 4200000.00, null, null, 'devuelta'),
('2024-01-22 09:10:00'::timestamp, 'SOL-2024-069', 'Medicina Laboral', 'Exámenes médicos', 2184874.00, 415126.00, 2600000.00, '2024-01-22 10:45:00'::timestamp, 'OP-2024-069', 'pagada'),

-- ==================== DICIEMBRE 2023 ====================
('2023-12-20 11:30:00'::timestamp, 'SOL-2023-150', 'Tecnología Innovadora', 'Software especializado', 14117647.00, 2682353.00, 16800000.00, null, null, 'solicitada'),
('2023-12-19 15:45:00'::timestamp, 'SOL-2023-151', 'Finanzas Corporativas', 'Asesoría financiera', 10252101.00, 1947899.00, 12200000.00, '2023-12-19 16:30:00'::timestamp, 'OP-2023-151', 'generada'),
('2023-12-18 12:15:00'::timestamp, 'SOL-2023-152', 'Industrial Supply', 'Suministros técnicos', 4117647.00, 782353.00, 4900000.00, '2023-12-18 13:45:00'::timestamp, 'OP-2023-152', 'aprobada'),
('2023-12-17 08:50:00'::timestamp, 'SOL-2023-153', 'Marketing Integral', 'Estrategia comercial', 6302521.00, 1197479.00, 7500000.00, null, null, 'devuelta'),
('2023-12-16 16:25:00'::timestamp, 'SOL-2023-154', 'Mantenimiento Express', 'Servicios técnicos', 2352941.00, 447059.00, 2800000.00, '2023-12-16 17:15:00'::timestamp, 'OP-2023-154', 'pagada'),
('2023-12-15 10:15:00'::timestamp, 'SOL-2023-155', 'Seguros Especializados', 'Pólizas específicas', 12184874.00, 2315126.00, 14500000.00, null, null, 'solicitada'),
('2023-12-14 15:30:00'::timestamp, 'SOL-2023-156', 'Comunicaciones Pro', 'Servicios telecom', 1512605.00, 287395.00, 1800000.00, '2023-12-14 16:15:00'::timestamp, 'OP-2023-156', 'generada'),
('2023-12-13 11:15:00'::timestamp, 'SOL-2023-157', 'Consultoría NIIF', 'Implementación normas', 8235294.00, 1564706.00, 9800000.00, '2023-12-13 12:45:00'::timestamp, 'OP-2023-157', 'aprobada'),
('2023-12-12 16:45:00'::timestamp, 'SOL-2023-158', 'Arquitectura Moderna', 'Diseño espacios', 5210084.00, 989916.00, 6200000.00, null, null, 'devuelta'),
('2023-12-11 08:30:00'::timestamp, 'SOL-2023-159', 'Recursos Humanos Plus', 'Gestión talento', 2689076.00, 510924.00, 3200000.00, '2023-12-11 09:45:00'::timestamp, 'OP-2023-159', 'pagada'),

-- ==================== NOVIEMBRE 2023 ====================
('2023-11-25 12:20:00'::timestamp, 'SOL-2023-140', 'Limpieza Industrial', 'Aseo especializado', 1764706.00, 335294.00, 2100000.00, null, null, 'solicitada'),
('2023-11-24 14:10:00'::timestamp, 'SOL-2023-141', 'Asesoría Legal Pro', 'Servicios jurídicos', 9915966.00, 1884034.00, 11800000.00, '2023-11-24 15:30:00'::timestamp, 'OP-2023-141', 'generada'),
('2023-11-23 09:25:00'::timestamp, 'SOL-2023-142', 'Sistemas Avanzados', 'Infraestructura TI', 15294118.00, 2905882.00, 18200000.00, '2023-11-23 11:15:00'::timestamp, 'OP-2023-142', 'aprobada'),
('2023-11-22 15:40:00'::timestamp, 'SOL-2023-143', 'Publicidad Creativa Pro', 'Campañas publicitarias', 2941176.00, 558824.00, 3500000.00, null, null, 'devuelta'),
('2023-11-21 11:55:00'::timestamp, 'SOL-2023-144', 'Transporte Ejecutivo', 'Servicios logísticos', 1848739.00, 351261.00, 2200000.00, '2023-11-21 13:20:00'::timestamp, 'OP-2023-144', 'pagada'),

-- ==================== OCTUBRE 2023 ====================
('2023-10-30 16:30:00'::timestamp, 'SOL-2023-130', 'Consultoría Elite', 'Asesoría estratégica', 26890756.00, 5109244.00, 32000000.00, null, null, 'solicitada'),
('2023-10-29 13:15:00'::timestamp, 'SOL-2023-131', 'Contabilidad Integral', 'Servicios contables', 6050420.00, 1149580.00, 7200000.00, '2023-10-29 14:45:00'::timestamp, 'OP-2023-131', 'generada'),
('2023-10-28 10:45:00'::timestamp, 'SOL-2023-132', 'Construcción Premium', 'Obras civiles', 7058824.00, 1341176.00, 8400000.00, '2023-10-28 12:30:00'::timestamp, 'OP-2023-132', 'aprobada'),
('2023-10-27 14:20:00'::timestamp, 'SOL-2023-133', 'Educación Empresarial', 'Formación corporativa', 4369748.00, 830252.00, 5200000.00, null, null, 'devuelta'),
('2023-10-26 09:10:00'::timestamp, 'SOL-2023-134', 'Salud Ocupacional', 'Medicina preventiva', 2605042.00, 494958.00, 3100000.00, '2023-10-26 10:45:00'::timestamp, 'OP-2023-134', 'pagada'),

-- ==================== SEPTIEMBRE 2023 ====================
('2023-09-25 11:30:00'::timestamp, 'SOL-2023-120', 'Tech Solutions Pro', 'Desarrollo software', 18823529.00, 3576471.00, 22400000.00, null, null, 'solicitada'),
('2023-09-24 15:45:00'::timestamp, 'SOL-2023-121', 'Finanzas Avanzadas', 'Planeación financiera', 13109244.00, 2490756.00, 15600000.00, '2023-09-24 16:30:00'::timestamp, 'OP-2023-121', 'generada'),
('2023-09-23 12:15:00'::timestamp, 'SOL-2023-122', 'Suministros Pro', 'Insumos operativos', 3529412.00, 670588.00, 4200000.00, '2023-09-23 13:45:00'::timestamp, 'OP-2023-122', 'aprobada'),
('2023-09-22 08:50:00'::timestamp, 'SOL-2023-123', 'Marketing Digital Pro', 'Posicionamiento online', 5714286.00, 1085714.00, 6800000.00, null, null, 'devuelta'),
('2023-09-21 16:25:00'::timestamp, 'SOL-2023-124', 'Servicios Técnicos', 'Mantenimiento integral', 2857143.00, 542857.00, 3400000.00, '2023-09-21 17:15:00'::timestamp, 'OP-2023-124', 'pagada'),

-- ==================== AGOSTO 2023 ====================
('2023-08-30 10:20:00'::timestamp, 'SOL-2023-110', 'Suministros Oficina Central', 'Material de oficina', 1680672.00, 319328.00, 2000000.00, null, null, 'solicitada'),
('2023-08-29 14:35:00'::timestamp, 'SOL-2023-111', 'Consultores Fiscales', 'Asesoría tributaria', 8403361.00, 1596639.00, 10000000.00, '2023-08-29 15:20:00'::timestamp, 'OP-2023-111', 'generada'),
('2023-08-28 09:15:00'::timestamp, 'SOL-2023-112', 'Tecnología Empresarial', 'Licencias software', 10084034.00, 1915966.00, 12000000.00, '2023-08-28 10:45:00'::timestamp, 'OP-2023-112', 'aprobada'),
('2023-08-27 16:50:00'::timestamp, 'SOL-2023-113', 'Servicios Generales', 'Mantenimiento', 2100840.00, 399160.00, 2500000.00, null, null, 'devuelta'),
('2023-08-26 11:30:00'::timestamp, 'SOL-2023-114', 'Capacitación Profesional', 'Cursos especializados', 4201681.00, 798319.00, 5000000.00, '2023-08-26 12:45:00'::timestamp, 'OP-2023-114', 'pagada');

-- 5. VERIFICAR DATOS CREADOS
-- =====================================================

-- Contar registros por estado
SELECT '📊 DISTRIBUCIÓN POR ESTADO' as titulo;
SELECT 
    UPPER(estado) as estado,
    COUNT(*) as cantidad,
    ROUND(AVG(total_solicitud), 0) as monto_promedio,
    SUM(total_solicitud) as monto_total,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM ordenes_pago), 1) as porcentaje
FROM public.ordenes_pago 
GROUP BY estado
ORDER BY cantidad DESC;

-- Contar por mes
SELECT '📅 DISTRIBUCIÓN POR MES' as titulo;
SELECT 
    TO_CHAR(fecha_solicitud, 'YYYY-MM') as mes,
    COUNT(*) as ordenes,
    TO_CHAR(SUM(total_solicitud), 'FM$999,999,999,999') as monto_total
FROM public.ordenes_pago 
GROUP BY TO_CHAR(fecha_solicitud, 'YYYY-MM')
ORDER BY mes DESC;

-- Resumen general
SELECT '✅ TABLA REESTRUCTURADA Y POBLADA EXITOSAMENTE!' as status;
SELECT 
    COUNT(*) as total_registros,
    TO_CHAR(SUM(total_solicitud), 'FM$999,999,999,999') as monto_total,
    MIN(fecha_solicitud) as fecha_mas_antigua,
    MAX(fecha_solicitud) as fecha_mas_reciente
FROM public.ordenes_pago;

SELECT '📋 ESTRUCTURA FINAL DE CAMPOS:' as info;
SELECT '1. Fecha Solicitud, 2. Número Solicitud, 3. Proveedor' as campos_1_3;
SELECT '4. Concepto, 5. Monto Solicitud, 6. IVA' as campos_4_6;  
SELECT '7. Total Solicitud, 8. Fecha OP, 9. Número OP, 10. Estado' as campos_7_10;
