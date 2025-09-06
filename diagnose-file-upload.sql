-- ============================================================================
-- SCRIPT DE DIAGNÓSTICO - PROBLEMA DE ANEXOS EN SOLICITUDES
-- ============================================================================
-- Ejecutar en Supabase SQL Editor para diagnosticar el problema
-- ============================================================================

-- 1. VERIFICAR SI EXISTEN LOS CAMPOS NECESARIOS EN ordenes_pago
-- ============================================================================
SELECT 
    'Verificación de campos en ordenes_pago:' as diagnostico,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
  AND column_name IN ('archivo_pdf_url', 'archivo_xlsx_url', 'ind_distribuciones')
ORDER BY column_name;

-- 2. VERIFICAR SI EXISTE EL BUCKET DE STORAGE
-- ============================================================================
SELECT 
    'Verificación del bucket de storage:' as diagnostico,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'solicitudes-archivos';

-- 3. VERIFICAR POLÍTICAS RLS DEL STORAGE
-- ============================================================================
SELECT 
    'Políticas RLS de storage.objects:' as diagnostico,
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
ORDER BY cmd, policyname;

-- 4. BUSCAR LA SOLICITUD ESPECÍFICA MENCIONADA
-- ============================================================================
SELECT 
    'Datos de solicitud SOL-2025-512620:' as diagnostico,
    numero_solicitud,
    proveedor,
    concepto,
    ind_distribuciones,
    archivo_pdf_url,
    archivo_xlsx_url,
    fecha_solicitud,
    estado
FROM public.ordenes_pago 
WHERE numero_solicitud = 'SOL-2025-512620';

-- 5. VERIFICAR ÚLTIMAS SOLICITUDES CREADAS
-- ============================================================================
SELECT 
    'Últimas 5 solicitudes creadas:' as diagnostico,
    numero_solicitud,
    proveedor,
    ind_distribuciones,
    CASE 
        WHEN archivo_pdf_url IS NOT NULL THEN '✅ SI'
        ELSE '❌ NO'
    END as tiene_pdf,
    CASE 
        WHEN archivo_xlsx_url IS NOT NULL THEN '✅ SI' 
        ELSE '❌ NO'
    END as tiene_xlsx,
    fecha_solicitud
FROM public.ordenes_pago 
ORDER BY fecha_solicitud DESC 
LIMIT 5;

-- 6. VERIFICAR SI HAY ARCHIVOS EN EL STORAGE
-- ============================================================================
SELECT 
    'Archivos en storage bucket:' as diagnostico,
    COUNT(*) as total_archivos
FROM storage.objects 
WHERE bucket_id = 'solicitudes-archivos';

-- 7. CONTEO GENERAL DE REGISTROS CON ANEXOS
-- ============================================================================
SELECT 
    'Resumen de anexos en todas las solicitudes:' as diagnostico,
    COUNT(*) as total_solicitudes,
    COUNT(archivo_pdf_url) as solicitudes_con_pdf,
    COUNT(archivo_xlsx_url) as solicitudes_con_xlsx,
    COUNT(CASE WHEN ind_distribuciones = 'S' THEN 1 END) as solicitudes_con_distribuciones
FROM public.ordenes_pago;

-- ============================================================================
-- INTERPRETACIÓN DE RESULTADOS:
-- ============================================================================
-- 
-- Si alguna consulta no devuelve resultados:
-- 1. Primera consulta vacía → Los campos NO se agregaron (ejecutar update-table-distribuciones.sql)
-- 2. Segunda consulta vacía → El bucket NO existe (ejecutar setup-file-upload-simple.sql)
-- 3. Cuarta consulta vacía → La solicitud SOL-2025-512620 no existe
-- 4. Sexta consulta con count=0 → No hay archivos subidos al storage
--
-- Si los campos existen pero la solicitud no tiene URLs:
-- - Revisar logs del servidor para errores de upload
-- - Verificar permisos del bucket
-- - Probar proceso de creación de solicitud paso a paso
-- ============================================================================
