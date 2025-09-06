-- ============================================================================
-- AGREGAR CAMPOS PARA ARCHIVOS ADJUNTOS EN ORDENES_PAGO
-- ============================================================================
-- Este script agrega campos para almacenar URLs de archivos adjuntos
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. AGREGAR COLUMNAS PARA ARCHIVOS
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS archivo_pdf_url TEXT;

ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS archivo_xlsx_url TEXT;

-- 2. AGREGAR COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================================================
COMMENT ON COLUMN public.ordenes_pago.archivo_pdf_url IS 'URL del archivo PDF de cuenta de cobro subido a Supabase Storage';
COMMENT ON COLUMN public.ordenes_pago.archivo_xlsx_url IS 'URL del archivo XLSX de distribuciones subido a Supabase Storage';

-- 3. CREAR BUCKET EN SUPABASE STORAGE (si no existe)
-- ============================================================================
-- Nota: Este comando debe ejecutarse desde el código, no desde SQL
-- INSERT INTO storage.buckets (id, name, public) VALUES ('solicitudes-archivos', 'solicitudes-archivos', true)
-- ON CONFLICT (id) DO NOTHING;

-- 4. VERIFICAR ESTRUCTURA ACTUALIZADA
-- ============================================================================
SELECT 
    'Campos de archivos agregados:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
  AND column_name IN ('archivo_pdf_url', 'archivo_xlsx_url')
ORDER BY column_name;

-- 5. VERIFICAR TODOS LOS CAMPOS DE LA TABLA
-- ============================================================================
SELECT 
    'Estructura completa de ordenes_pago:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
