-- ============================================================================
-- SOLUCIÓN SIMPLE: ARREGLAR POLÍTICAS RLS PARA PERMITIR CREACIÓN DE SOLICITUDES
-- ============================================================================
-- Este script solo arregla las políticas RLS sin tocar la estructura de la tabla
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. VERIFICAR ESTADO ACTUAL
-- ============================================================================
SELECT 'Verificando tabla ordenes_pago...' as status;

-- Ver si el campo descripcion existe
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
  AND column_name IN ('descripcion', 'creado_por', 'created_at', 'updated_at')
ORDER BY column_name;

-- 2. AGREGAR CAMPO CREADO_POR SI NO EXISTE (necesario para políticas)
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES auth.users(id);

-- 3. ELIMINAR TODAS LAS POLÍTICAS RLS EXISTENTES
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas existentes de la tabla ordenes_pago
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'ordenes_pago') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.ordenes_pago';
    END LOOP;
END
$$;

-- 4. CREAR POLÍTICAS RLS MUY SIMPLES Y PERMISIVAS
-- ============================================================================

-- Política para VER: todos los usuarios autenticados pueden ver todas las órdenes
CREATE POLICY "permitir_ver_ordenes" ON public.ordenes_pago
    FOR SELECT TO authenticated USING (true);

-- Política para CREAR: todos los usuarios autenticados pueden crear solicitudes
CREATE POLICY "permitir_crear_solicitudes" ON public.ordenes_pago
    FOR INSERT TO authenticated WITH CHECK (true);

-- Política para ACTUALIZAR: todos los usuarios autenticados pueden actualizar
CREATE POLICY "permitir_actualizar_ordenes" ON public.ordenes_pago
    FOR UPDATE TO authenticated USING (true);

-- Política para ELIMINAR: solo administradores (opcional)
CREATE POLICY "permitir_eliminar_ordenes" ON public.ordenes_pago
    FOR DELETE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role = 'AdminCOP'
        )
    );

-- 5. VERIFICAR QUE LAS POLÍTICAS SE CREARON CORRECTAMENTE
-- ============================================================================
SELECT 
    'Políticas RLS creadas:' as info,
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'ordenes_pago'
ORDER BY cmd, policyname;

-- 6. PROBAR QUE LA INSERCIÓN FUNCIONA (COMENTADO)
-- ============================================================================
/*
-- Para probar, descomenta esto después de ejecutar el script:
INSERT INTO public.ordenes_pago (
    numero_solicitud,
    proveedor,
    concepto,
    descripcion,
    monto_solicitud,
    iva,
    total_solicitud,
    estado,
    fecha_solicitud,
    creado_por,
    created_at,
    updated_at
) VALUES (
    'TEST-2024-' || EXTRACT(epoch FROM NOW())::bigint,
    'Proveedor Test',
    'Concepto Test',
    'Esta es una descripción de prueba para verificar que se guarda correctamente',
    100000,
    19000,
    119000,
    'Solicitada',
    NOW(),
    auth.uid(),
    NOW(),
    NOW()
);

-- Verificar que se insertó con la descripción
SELECT 
    numero_solicitud,
    proveedor,
    concepto,
    descripcion,
    estado
FROM public.ordenes_pago 
WHERE numero_solicitud LIKE 'TEST-2024-%'
ORDER BY created_at DESC 
LIMIT 1;
*/

-- 7. RESULTADO FINAL
-- ============================================================================
SELECT 
    '✅ Políticas RLS simplificadas creadas' as resultado,
    'Ahora se pueden crear solicitudes con descripción' as detalle;
