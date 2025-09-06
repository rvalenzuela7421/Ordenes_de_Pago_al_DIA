-- ============================================================================
-- CONFIGURACIÓN SIMPLE PARA CARGA DE ARCHIVOS EN SOLICITUDES
-- ============================================================================
-- Script sin operaciones que requieren permisos de propietario
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. AGREGAR CAMPOS PARA URLs DE ARCHIVOS A LA TABLA ordenes_pago
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS archivo_pdf_url TEXT;

ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS archivo_xlsx_url TEXT;

-- 2. AGREGAR CAMPO creado_por SI NO EXISTE (para RLS)
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES auth.users(id);

-- 3. AGREGAR COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON COLUMN public.ordenes_pago.archivo_pdf_url IS 'URL del archivo PDF de cuenta de cobro subido a Supabase Storage';
COMMENT ON COLUMN public.ordenes_pago.archivo_xlsx_url IS 'URL del archivo XLSX de distribuciones subido a Supabase Storage';
COMMENT ON COLUMN public.ordenes_pago.creado_por IS 'ID del usuario que creó la solicitud';

-- 4. CREAR BUCKET DE STORAGE PARA ARCHIVOS (PÚBLICO - sin RLS complejo)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'solicitudes-archivos', 
  'solicitudes-archivos', 
  true,  -- Bucket público para simplificar permisos
  10485760, -- 10MB límite
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];

-- 5. ACTUALIZAR POLÍTICAS RLS PARA ordenes_pago (SIMPLIFICADAS)
-- ============================================================================
-- Eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "All authenticated users can view orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "OperacionCOP can create orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Ver órdenes según rol" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Crear órdenes según rol" ON public.ordenes_pago;
DROP POLICY IF EXISTS "authenticated_users_select_orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "authenticated_users_insert_orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "authenticated_users_update_orders" ON public.ordenes_pago;

-- Crear políticas simples y permisivas
CREATE POLICY "authenticated_users_select_orders" 
ON public.ordenes_pago FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "authenticated_users_insert_orders" 
ON public.ordenes_pago FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = creado_por);

CREATE POLICY "authenticated_users_update_orders" 
ON public.ordenes_pago FOR UPDATE 
TO authenticated 
USING (auth.uid() = creado_por);

-- 6. HABILITAR RLS EN ordenes_pago SI NO ESTÁ HABILITADO
-- ============================================================================
ALTER TABLE public.ordenes_pago ENABLE ROW LEVEL SECURITY;

-- 7. VERIFICAR ESTRUCTURA ACTUALIZADA DE LA TABLA
-- ============================================================================
SELECT 
    'Campos agregados a ordenes_pago:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
  AND column_name IN ('archivo_pdf_url', 'archivo_xlsx_url', 'creado_por')
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

-- 9. VERIFICAR POLÍTICAS RLS DE ordenes_pago
-- ============================================================================
SELECT 
    'Políticas RLS de ordenes_pago:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'ordenes_pago' 
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- 10. PROBAR LA CONFIGURACIÓN
-- ============================================================================
SELECT 
    '✅ Configuración completa (versión simple)' as resultado,
    'Base de datos configurada para carga de archivos con bucket público' as detalle,
    (
        SELECT COUNT(*) 
        FROM information_schema.columns 
        WHERE table_name = 'ordenes_pago' 
          AND column_name IN ('archivo_pdf_url', 'archivo_xlsx_url', 'creado_por')
    )::text || ' campos agregados' as campos,
    (
        SELECT COUNT(*) 
        FROM storage.buckets 
        WHERE id = 'solicitudes-archivos'
    )::text || ' bucket configurado' as storage;

-- ============================================================================
-- NOTAS IMPORTANTES:
-- ============================================================================
-- 1. Este script usa un bucket PÚBLICO para evitar problemas de permisos RLS
-- 2. Los archivos serán accesibles vía URL pública, pero esto es aceptable
--    para documentos de soporte como PDFs y Excel
-- 3. Si necesitas mayor seguridad, configura las políticas de storage.objects
--    manualmente desde el Dashboard de Supabase
-- ============================================================================

-- ============================================================================
-- PRÓXIMOS PASOS:
-- ============================================================================
-- 1. ✅ Ejecutar este script SQL
-- 2. 📋 Probar funcionalidad de carga de archivos
-- 3. 📋 Verificar que las solicitudes se crean correctamente
-- ============================================================================
