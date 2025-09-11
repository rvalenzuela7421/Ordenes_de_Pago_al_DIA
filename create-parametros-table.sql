-- ============================================================================
-- CREAR TABLA PARAMETROS
-- Para almacenar parámetros de configuración del sistema con orden
-- ============================================================================

-- 1. CREAR LA TABLA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.parametros (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre_grupo TEXT NOT NULL CHECK (char_length(nombre_grupo) <= 60),
    descripcion_grupo TEXT CHECK (char_length(descripcion_grupo) <= 200),
    valor_dominio TEXT NOT NULL CHECK (char_length(valor_dominio) <= 60),
    orden INTEGER DEFAULT 0 NOT NULL,
    vigente TEXT NOT NULL CHECK (char_length(vigente) = 1 AND vigente IN ('S', 'N')),
    
    -- Auditoría
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. AÑADIR CONSTRAINT ÚNICO PARA EVITAR DUPLICADOS
-- ============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uk_parametros_grupo_valor' 
        AND table_name = 'parametros'
    ) THEN
        ALTER TABLE public.parametros 
        ADD CONSTRAINT uk_parametros_grupo_valor 
        UNIQUE (nombre_grupo, valor_dominio);
    END IF;
END $$;

-- 3. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_parametros_nombre_grupo 
ON public.parametros(nombre_grupo);

CREATE INDEX IF NOT EXISTS idx_parametros_vigente 
ON public.parametros(vigente);

CREATE INDEX IF NOT EXISTS idx_parametros_orden 
ON public.parametros(orden);

CREATE INDEX IF NOT EXISTS idx_parametros_nombre_vigente 
ON public.parametros(nombre_grupo, vigente);

CREATE INDEX IF NOT EXISTS idx_parametros_nombre_orden 
ON public.parametros(nombre_grupo, orden);

-- 4. CREAR TRIGGER PARA UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Eliminar el trigger si ya existe antes de crearlo
DROP TRIGGER IF EXISTS update_parametros_updated_at ON parametros;

CREATE TRIGGER update_parametros_updated_at 
    BEFORE UPDATE ON parametros 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. CONFIGURAR RLS (ROW LEVEL SECURITY)
-- ============================================================================
ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas si ya existen antes de crearlas
DROP POLICY IF EXISTS "Usuarios pueden leer parametros" ON public.parametros;
DROP POLICY IF EXISTS "Solo admins pueden modificar parametros" ON public.parametros;

-- Política para lectura: todos los usuarios autenticados pueden leer
CREATE POLICY "Usuarios pueden leer parametros"
ON public.parametros FOR SELECT
TO authenticated
USING (true);

-- Política para escritura: solo admins pueden escribir
CREATE POLICY "Solo admins pueden modificar parametros"
ON public.parametros FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('AdminCOP', 'OperacionCOP')
  )
);

-- 6. INSERTAR ALGUNOS PARÁMETROS DE EJEMPLO
-- ============================================================================
INSERT INTO public.parametros (
    nombre_grupo, 
    descripcion_grupo, 
    valor_dominio,
    orden,
    vigente
) VALUES 
('ESTADOS_SOLICITUD', 'Estados permitidos para las solicitudes de pago', 'Solicitada', 1, 'S'),
('ESTADOS_SOLICITUD', 'Estados permitidos para las solicitudes de pago', 'Devuelta', 2, 'S'),
('ESTADOS_SOLICITUD', 'Estados permitidos para las solicitudes de pago', 'Generada', 3, 'S'),
('ESTADOS_SOLICITUD', 'Estados permitidos para las solicitudes de pago', 'Aprobada', 4, 'S'),
('ESTADOS_SOLICITUD', 'Estados permitidos para las solicitudes de pago', 'Pagada', 5, 'S'),
('TIPOS_DOCUMENTO', 'Tipos de documento de identificación', 'CC', 1, 'S'),
('TIPOS_DOCUMENTO', 'Tipos de documento de identificación', 'CE', 2, 'S'),
('TIPOS_DOCUMENTO', 'Tipos de documento de identificación', 'NT', 3, 'S'),
('TIPOS_DOCUMENTO', 'Tipos de documento de identificación', 'PS', 4, 'S'),
('TIPOS_PERSONA', 'Tipos de persona para proveedores', 'J', 1, 'S'),
('TIPOS_PERSONA', 'Tipos de persona para proveedores', 'N', 2, 'S'),
('CONFIGURACION_IVA', 'Configuración de impuestos', '19', 1, 'S'),
('CONFIGURACION_SISTEMA', 'Configuraciones generales del sistema', 'MODO_DEMO', 1, 'N'),
('PRIORIDADES', 'Niveles de prioridad para solicitudes', 'Alta', 1, 'S'),
('PRIORIDADES', 'Niveles de prioridad para solicitudes', 'Media', 2, 'S'),
('PRIORIDADES', 'Niveles de prioridad para solicitudes', 'Baja', 3, 'S')
ON CONFLICT (nombre_grupo, valor_dominio) DO NOTHING;

-- 7. VERIFICAR LOS DATOS INSERTADOS
-- ============================================================================
SELECT 
    id,
    nombre_grupo,
    descripcion_grupo,
    valor_dominio,
    orden,
    vigente,
    created_at
FROM public.parametros
ORDER BY nombre_grupo, orden;

-- 8. VERIFICAR ESTRUCTURA DE LA TABLA
-- ============================================================================
SELECT 
    column_name, 
    data_type, 
    character_maximum_length,
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'parametros' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 9. VERIFICAR CONSTRAINTS
-- ============================================================================
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'parametros' 
    AND table_schema = 'public';

-- ============================================================================
-- NOTAS DE USO:
-- - vigente: 'S' = Sí (activo), 'N' = No (inactivo)
-- - nombre_grupo: agrupa parámetros relacionados
-- - valor_dominio: el valor específico del parámetro
-- - orden: controla la secuencia/prioridad de los parámetros
-- - descripcion_grupo: descripción del grupo de parámetros
-- ============================================================================
