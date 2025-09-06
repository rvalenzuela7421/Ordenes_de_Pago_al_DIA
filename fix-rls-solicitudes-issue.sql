-- ============================================================================
-- SOLUCIÓN PARA PROBLEMA RLS EN CREACIÓN DE SOLICITUDES
-- ============================================================================
-- Este script arregla el problema de Row Level Security para solicitudes
-- Ejecutar en Supabase SQL Editor
-- ============================================================================

-- 1. AGREGAR CAMPO CREADO_POR SI NO EXISTE (para compatibilidad con políticas)
-- ============================================================================
ALTER TABLE public.ordenes_pago 
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES auth.users(id);

-- 2. ELIMINAR POLÍTICAS RLS EXISTENTES QUE CAUSAN PROBLEMAS
-- ============================================================================
DROP POLICY IF EXISTS "authenticated_users_insert_orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Crear órdenes según rol" ON public.ordenes_pago;
DROP POLICY IF EXISTS "authenticated_users_select_orders" ON public.ordenes_pago;
DROP POLICY IF EXISTS "Ver órdenes según rol" ON public.ordenes_pago;

-- 3. CREAR POLÍTICAS RLS SIMPLIFICADAS PARA SOLICITUDES
-- ============================================================================

-- Permitir a todos los usuarios autenticados VER órdenes
CREATE POLICY "usuarios_autenticados_ver_ordenes" ON public.ordenes_pago
    FOR SELECT TO authenticated USING (true);

-- Permitir a todos los usuarios autenticados CREAR solicitudes
CREATE POLICY "usuarios_autenticados_crear_solicitudes" ON public.ordenes_pago
    FOR INSERT TO authenticated WITH CHECK (
        -- Verificar que el usuario esté autenticado
        auth.uid() IS NOT NULL
        -- Si existe el campo creado_por, debe coincidir con el usuario actual
        AND (creado_por IS NULL OR creado_por = auth.uid())
    );

-- Permitir ACTUALIZAR solo a los creadores o roles específicos
CREATE POLICY "usuarios_pueden_actualizar_ordenes" ON public.ordenes_pago
    FOR UPDATE TO authenticated USING (
        -- El creador puede actualizar
        (creado_por = auth.uid()) 
        OR 
        -- O usuarios con roles específicos
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('AdminCOP', 'OperacionCOP')
        )
    );

-- 4. COMENTAR PARA VERIFICACIÓN
-- ============================================================================
COMMENT ON POLICY "usuarios_autenticados_ver_ordenes" ON public.ordenes_pago 
IS 'Permite a todos los usuarios autenticados ver órdenes de pago';

COMMENT ON POLICY "usuarios_autenticados_crear_solicitudes" ON public.ordenes_pago 
IS 'Permite a todos los usuarios autenticados crear solicitudes de OP';

COMMENT ON POLICY "usuarios_pueden_actualizar_ordenes" ON public.ordenes_pago 
IS 'Permite actualizar órdenes al creador o roles AdminCOP/OperacionCOP';

-- 5. VERIFICAR QUE LAS POLÍTICAS FUNCIONAN
-- ============================================================================
SELECT 
    'Políticas RLS actuales:' as info,
    policyname,
    cmd
FROM pg_policies 
WHERE tablename = 'ordenes_pago';

-- 6. MOSTRAR ESTRUCTURA FINAL DE LA TABLA
-- ============================================================================
SELECT 
    'Campos de la tabla ordenes_pago:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'ordenes_pago' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
