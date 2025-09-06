-- ============================================================================
-- CONFIGURACIÓN COMPLETA PARA CARGA DE ARCHIVOS EN SOLICITUDES
-- ============================================================================
-- Este script configura todo lo necesario para la funcionalidad de archivos
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. AGREGAR CAMPOS PARA URLs DE ARCHIVOS A LA TABLA
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS archivo_pdf_url TEXT;

ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS archivo_xlsx_url TEXT;

-- 2. AGREGAR COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON COLUMN public.ordenes_pago.archivo_pdf_url IS 'URL del archivo PDF de cuenta de cobro subido a Supabase Storage';
COMMENT ON COLUMN public.ordenes_pago.archivo_xlsx_url IS 'URL del archivo XLSX de distribuciones subido a Supabase Storage';

-- 3. CREAR BUCKET DE STORAGE PARA ARCHIVOS (si no existe)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'solicitudes-archivos', 
  'solicitudes-archivos', 
  true,
  10485760, -- 10MB límite
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];

-- 4. CONFIGURAR POLÍTICAS RLS PARA EL BUCKET DE STORAGE
-- ============================================================================
-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Usuarios autenticados pueden subir archivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver archivos" ON storage.objects;
DROP POLICY IF EXISTS "Usuarios pueden eliminar sus archivos" ON storage.objects;

-- Política para subir archivos (INSERT)
CREATE POLICY "Usuarios autenticados pueden subir archivos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'solicitudes-archivos');

-- Política para ver archivos (SELECT)
CREATE POLICY "Usuarios autenticados pueden ver archivos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'solicitudes-archivos');

-- Política para eliminar archivos (DELETE) - solo el creador
CREATE POLICY "Usuarios pueden eliminar sus archivos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'solicitudes-archivos' AND auth.uid() = owner);

-- 5. HABILITAR RLS EN STORAGE.OBJECTS SI NO ESTÁ HABILITADO
-- ============================================================================
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. ACTUALIZAR INTERFACES TYPESCRIPT (INFORMACIÓN)
-- ============================================================================
-- Nota: Los siguientes cambios se han aplicado en el código TypeScript:
-- 
-- En lib/dashboard-data.ts - OrdenPago interface:
-- {
--   archivo_pdf_url?: string
--   archivo_xlsx_url?: string
-- }

-- 7. VERIFICAR ESTRUCTURA ACTUALIZADA DE LA TABLA
-- ============================================================================
SELECT 
    'Campos de archivos en ordenes_pago:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
  AND column_name IN ('archivo_pdf_url', 'archivo_xlsx_url')
ORDER BY column_name;

-- 8. VERIFICAR CONFIGURACIÓN DEL BUCKET
-- ============================================================================
SELECT 
    'Configuración del bucket:' as info,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'solicitudes-archivos';

-- 9. VERIFICAR POLÍTICAS RLS DEL STORAGE
-- ============================================================================
SELECT 
    'Políticas RLS de storage.objects:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND policyname LIKE '%archivos%'
ORDER BY cmd, policyname;

-- 10. PROBAR LA CONFIGURACIÓN CON UNA CONSULTA DE EJEMPLO
-- ============================================================================
SELECT 
    '✅ Configuración completa' as resultado,
    'Base de datos y storage configurados para carga de archivos' as detalle,
    (
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'ordenes_pago' 
          AND column_name IN ('archivo_pdf_url', 'archivo_xlsx_url')
    )::text || ' campos agregados' as campos,
    (
        SELECT COUNT(*) 
        FROM storage.buckets 
        WHERE id = 'solicitudes-archivos'
    )::text || ' bucket configurado' as storage;

-- ============================================================================
-- PRÓXIMOS PASOS MANUALES:
-- ============================================================================
-- 1. ✅ Script SQL ejecutado
-- 2. ✅ Código TypeScript actualizado
-- 3. 📋 Probar funcionalidad:
--    a) Crear nueva solicitud
--    b) Subir archivo PDF
--    c) Subir archivo XLSX (si tiene distribuciones)
--    d) Verificar que se guarden las URLs en la tabla
--    e) Verificar que los archivos se suban a Storage
-- ============================================================================
