-- ============================================
-- TABLA PARA SOLICITUDES DE ÓRDENES DE PAGO
-- Área Tributaria - Sistema COP
-- ============================================

-- Crear tabla solicitudes_op
CREATE TABLE IF NOT EXISTS public.solicitudes_op (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    numero_solicitud TEXT UNIQUE NOT NULL,
    
    -- Información principal de la solicitud
    acreedor TEXT NOT NULL,
    concepto TEXT NOT NULL CHECK (concepto IN (
        'Convenio de uso de red',
        'Reconocimiento y pago de comisiones por recaudo Leasing',
        'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing',
        'Costo de recaudo TRC',
        'Referenciación de clientes',
        'Bono cumplimiento penetraciones seguros voluntarios',
        'Retornos títulos de capitalización GanaMás'
    )),
    
    -- Información financiera
    valor_solicitud NUMERIC(15,2) NOT NULL CHECK (valor_solicitud > 0),
    iva NUMERIC(15,2) DEFAULT 0 CHECK (iva >= 0),
    total_solicitud NUMERIC(15,2) NOT NULL CHECK (total_solicitud > 0),
    
    -- Información adicional
    observaciones TEXT,
    tiene_distribuciones BOOLEAN DEFAULT FALSE,
    
    -- Estado de la solicitud
    estado TEXT NOT NULL DEFAULT 'solicitada' CHECK (estado IN (
        'solicitada',
        'en_revision',
        'aprobada',
        'devuelta',
        'generada',
        'pagada'
    )),
    
    -- Fechas
    fecha_solicitud DATE DEFAULT CURRENT_DATE,
    fecha_revision DATE,
    fecha_aprobacion DATE,
    fecha_generacion_op DATE,
    fecha_pago DATE,
    
    -- Relación con OP generada (opcional)
    numero_op TEXT,
    
    -- Metadatos adicionales (JSON para flexibilidad)
    metadata JSONB DEFAULT '{}',
    
    -- Auditoría
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Índices para consultas
    INDEX idx_solicitudes_op_numero (numero_solicitud),
    INDEX idx_solicitudes_op_estado (estado),
    INDEX idx_solicitudes_op_fecha (fecha_solicitud),
    INDEX idx_solicitudes_op_acreedor (acreedor),
    INDEX idx_solicitudes_op_concepto (concepto),
    INDEX idx_solicitudes_op_created_by (created_by)
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.solicitudes_op ENABLE ROW LEVEL SECURITY;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_solicitudes_op_updated_at 
    BEFORE UPDATE ON public.solicitudes_op 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- POLÍTICAS RLS PARA solicitudes_op
-- ============================================

-- Política para ver solicitudes
-- Los usuarios pueden ver todas las solicitudes según su rol
CREATE POLICY "Usuarios pueden ver solicitudes según su rol" 
ON public.solicitudes_op FOR SELECT 
USING (
    auth.role() = 'authenticated' AND (
        -- AdminCOP puede ver todas
        (auth.jwt() ->> 'role' = 'AdminCOP') OR
        -- OperacionCOP puede ver todas
        (auth.jwt() ->> 'role' = 'OperacionCOP') OR
        -- ConsultaCOP puede ver todas (solo lectura)
        (auth.jwt() ->> 'role' = 'ConsultaCOP') OR
        -- OperacionBSEG puede ver todas las de BSEG
        (auth.jwt() ->> 'role' = 'OperacionBSEG')
    )
);

-- Política para crear solicitudes
-- Solo OperacionBSEG puede crear solicitudes
CREATE POLICY "Solo OperacionBSEG puede crear solicitudes" 
ON public.solicitudes_op FOR INSERT 
WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.jwt() ->> 'role' = 'OperacionBSEG' AND
    created_by = auth.uid()
);

-- Política para actualizar solicitudes
-- AdminCOP y OperacionCOP pueden actualizar cualquier solicitud
-- OperacionBSEG puede actualizar solo si está en estado 'solicitada' o 'devuelta'
CREATE POLICY "Actualizar solicitudes según rol y estado" 
ON public.solicitudes_op FOR UPDATE 
USING (
    auth.role() = 'authenticated' AND (
        -- AdminCOP puede actualizar todas
        (auth.jwt() ->> 'role' = 'AdminCOP') OR
        -- OperacionCOP puede actualizar todas
        (auth.jwt() ->> 'role' = 'OperacionCOP') OR
        -- OperacionBSEG puede actualizar solo sus solicitudes en ciertos estados
        (auth.jwt() ->> 'role' = 'OperacionBSEG' AND 
         created_by = auth.uid() AND 
         estado IN ('solicitada', 'devuelta'))
    )
);

-- Política para eliminar (normalmente no se permite)
CREATE POLICY "Solo AdminCOP puede eliminar solicitudes" 
ON public.solicitudes_op FOR DELETE 
USING (
    auth.role() = 'authenticated' AND 
    auth.jwt() ->> 'role' = 'AdminCOP'
);

-- ============================================
-- TABLA PARA ARCHIVOS ADJUNTOS
-- ============================================

-- Tabla para manejar los archivos adjuntos de las solicitudes
CREATE TABLE IF NOT EXISTS public.solicitudes_op_archivos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    solicitud_id UUID REFERENCES public.solicitudes_op(id) ON DELETE CASCADE,
    
    -- Información del archivo
    nombre_archivo TEXT NOT NULL,
    tipo_archivo TEXT NOT NULL CHECK (tipo_archivo IN ('pdf', 'xlsx')),
    ruta_archivo TEXT, -- Ruta en el storage de Supabase o sistema de archivos
    tamaño_archivo INTEGER, -- Tamaño en bytes
    
    -- Metadatos
    descripcion TEXT,
    es_cuenta_cobro BOOLEAN DEFAULT FALSE,
    es_distribuciones BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    uploaded_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para archivos
ALTER TABLE public.solicitudes_op_archivos ENABLE ROW LEVEL SECURITY;

-- Política para archivos - seguir las mismas reglas que las solicitudes
CREATE POLICY "Acceso a archivos según acceso a solicitud" 
ON public.solicitudes_op_archivos FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.solicitudes_op s 
        WHERE s.id = solicitud_id AND
        (
            -- AdminCOP puede ver todos
            (auth.jwt() ->> 'role' = 'AdminCOP') OR
            -- OperacionCOP puede ver todos
            (auth.jwt() ->> 'role' = 'OperacionCOP') OR
            -- ConsultaCOP puede ver todos
            (auth.jwt() ->> 'role' = 'ConsultaCOP') OR
            -- OperacionBSEG puede ver todos de BSEG
            (auth.jwt() ->> 'role' = 'OperacionBSEG')
        )
    )
);

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función para generar número de solicitud automático
CREATE OR REPLACE FUNCTION generate_solicitud_number()
RETURNS TEXT AS $$
DECLARE
    year_suffix TEXT;
    sequence_num INTEGER;
    new_number TEXT;
BEGIN
    year_suffix := EXTRACT(YEAR FROM NOW())::TEXT;
    
    -- Obtener el siguiente número secuencial para este año
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(numero_solicitud FROM 'SOL-' || year_suffix || '-(.*)$') 
            AS INTEGER
        )
    ), 0) + 1 INTO sequence_num
    FROM public.solicitudes_op 
    WHERE numero_solicitud LIKE 'SOL-' || year_suffix || '-%';
    
    new_number := 'SOL-' || year_suffix || '-' || LPAD(sequence_num::TEXT, 6, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar el estado automáticamente
CREATE OR REPLACE FUNCTION update_solicitud_estado()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar fechas según el estado
    IF NEW.estado = 'en_revision' AND OLD.estado = 'solicitada' THEN
        NEW.fecha_revision = CURRENT_DATE;
    ELSIF NEW.estado = 'aprobada' AND OLD.estado = 'en_revision' THEN
        NEW.fecha_aprobacion = CURRENT_DATE;
    ELSIF NEW.estado = 'generada' AND OLD.estado = 'aprobada' THEN
        NEW.fecha_generacion_op = CURRENT_DATE;
    ELSIF NEW.estado = 'pagada' AND OLD.estado = 'generada' THEN
        NEW.fecha_pago = CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar estados automáticamente
CREATE TRIGGER trigger_update_solicitud_estado
    BEFORE UPDATE ON public.solicitudes_op
    FOR EACH ROW
    EXECUTE FUNCTION update_solicitud_estado();

-- ============================================
-- DATOS DE EJEMPLO (OPCIONAL)
-- ============================================

-- Insertar algunas solicitudes de ejemplo para testing
INSERT INTO public.solicitudes_op (
    numero_solicitud,
    acreedor,
    concepto,
    valor_solicitud,
    iva,
    total_solicitud,
    observaciones,
    tiene_distribuciones,
    estado,
    metadata,
    created_by
) VALUES 
(
    'SOL-2024-000001',
    'NT-860034313-DAVIVIENDA S.A.',
    'Convenio de uso de red',
    1500000.00,
    285000.00,
    1785000.00,
    'Solicitud para pago mensual convenio uso de red',
    false,
    'solicitada',
    '{"area": "tributaria", "tipo": "solicitud_op"}',
    (SELECT id FROM public.profiles WHERE role = 'OperacionBSEG' LIMIT 1)
),
(
    'SOL-2024-000002',
    'NT-860034313-DAVIVIENDA S.A.',
    'Reconocimiento y pago de comisiones por recaudo Leasing',
    2300000.00,
    437000.00,
    2737000.00,
    'Comisiones correspondientes al mes de enero 2024',
    true,
    'en_revision',
    '{"area": "tributaria", "tipo": "solicitud_op"}',
    (SELECT id FROM public.profiles WHERE role = 'OperacionBSEG' LIMIT 1)
);

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE public.solicitudes_op IS 'Tabla para almacenar las solicitudes de órdenes de pago del área tributaria';
COMMENT ON COLUMN public.solicitudes_op.numero_solicitud IS 'Número único de la solicitud generado automáticamente';
COMMENT ON COLUMN public.solicitudes_op.acreedor IS 'Empresa o entidad acreedora';
COMMENT ON COLUMN public.solicitudes_op.concepto IS 'Concepto específico de la solicitud según lista predefinida';
COMMENT ON COLUMN public.solicitudes_op.valor_solicitud IS 'Valor base de la solicitud sin IVA';
COMMENT ON COLUMN public.solicitudes_op.iva IS 'Valor del IVA aplicable';
COMMENT ON COLUMN public.solicitudes_op.total_solicitud IS 'Valor total de la solicitud (valor + IVA)';
COMMENT ON COLUMN public.solicitudes_op.tiene_distribuciones IS 'Indica si la solicitud requiere distribuciones (archivo XLSX)';
COMMENT ON COLUMN public.solicitudes_op.estado IS 'Estado actual de la solicitud en el flujo de proceso';
COMMENT ON COLUMN public.solicitudes_op.metadata IS 'Información adicional en formato JSON';

COMMENT ON TABLE public.solicitudes_op_archivos IS 'Tabla para almacenar los archivos adjuntos de las solicitudes';
COMMENT ON COLUMN public.solicitudes_op_archivos.tipo_archivo IS 'Tipo de archivo: pdf (cuenta de cobro) o xlsx (distribuciones)';
COMMENT ON COLUMN public.solicitudes_op_archivos.es_cuenta_cobro IS 'Indica si es el archivo de cuenta de cobro (PDF)';
COMMENT ON COLUMN public.solicitudes_op_archivos.es_distribuciones IS 'Indica si es el archivo de distribuciones (XLSX)';
