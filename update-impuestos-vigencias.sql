-- ============================================
-- ACTUALIZACIÓN TABLA IMPUESTOS CON VIGENCIAS
-- Sistema COP - Manejo dinámico de IVA por fechas
-- ============================================

-- Agregar nuevos campos a la tabla existente
ALTER TABLE public.conceptos_impuestos 
ADD COLUMN IF NOT EXISTS vigencia_desde DATE,
ADD COLUMN IF NOT EXISTS vigencia_hasta DATE,
ADD COLUMN IF NOT EXISTS observaciones TEXT;

-- Crear índices para mejorar performance en consultas por vigencia
CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_vigencia 
ON public.conceptos_impuestos(concepto_impuesto, vigencia_desde, vigencia_hasta);

CREATE INDEX IF NOT EXISTS idx_conceptos_impuestos_vigente_actual 
ON public.conceptos_impuestos(concepto_impuesto, activo) 
WHERE vigencia_hasta IS NULL OR vigencia_hasta >= CURRENT_DATE;

-- ============================================
-- LIMPIAR DATOS ANTERIORES Y CREAR NUEVOS
-- ============================================

-- Limpiar registros de IVA anteriores para evitar duplicados
DELETE FROM public.conceptos_impuestos 
WHERE concepto_impuesto LIKE 'IVA%' OR tipo_impuesto = 'IVA';

-- Insertar nuevos registros de IVA con vigencias específicas
INSERT INTO public.conceptos_impuestos (
    concepto_impuesto,
    porcentaje_aplicacion,
    descripcion,
    tipo_impuesto,
    activo,
    vigencia_desde,
    vigencia_hasta,
    observaciones
) VALUES 
-- IVA 16% (período histórico)
(
    'IVA',
    0.16,
    'Impuesto al Valor Agregado - Tarifa histórica 16%',
    'IVA',
    true,
    '2020-01-01',
    '2022-12-31',
    'Tarifa vigente durante el período de pandemia COVID-19'
),
-- IVA 19% (período actual - sin fecha fin)
(
    'IVA',
    0.19,
    'Impuesto al Valor Agregado - Tarifa actual 19%',
    'IVA',
    true,
    '2023-01-01',
    NULL,
    'Tarifa actual vigente desde enero 2023'
);

-- ============================================
-- FUNCIÓN PARA OBTENER IVA VIGENTE
-- ============================================

-- Función para obtener el porcentaje de IVA vigente en una fecha específica
CREATE OR REPLACE FUNCTION get_iva_vigente(fecha_consulta DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    porcentaje NUMERIC,
    descripcion TEXT,
    vigencia_desde DATE,
    vigencia_hasta DATE,
    observaciones TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ci.porcentaje_aplicacion,
        ci.descripcion,
        ci.vigencia_desde,
        ci.vigencia_hasta,
        ci.observaciones
    FROM public.conceptos_impuestos ci
    WHERE ci.concepto_impuesto = 'IVA'
    AND ci.tipo_impuesto = 'IVA'
    AND ci.activo = true
    AND ci.vigencia_desde <= fecha_consulta
    AND (ci.vigencia_hasta IS NULL OR ci.vigencia_hasta >= fecha_consulta)
    ORDER BY ci.vigencia_desde DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Función simplificada para obtener solo el porcentaje actual
CREATE OR REPLACE FUNCTION get_porcentaje_iva_actual()
RETURNS NUMERIC AS $$
DECLARE
    porcentaje_actual NUMERIC;
BEGIN
    SELECT porcentaje_aplicacion INTO porcentaje_actual
    FROM public.conceptos_impuestos
    WHERE concepto_impuesto = 'IVA'
    AND tipo_impuesto = 'IVA'
    AND activo = true
    AND vigencia_desde <= CURRENT_DATE
    AND (vigencia_hasta IS NULL OR vigencia_hasta >= CURRENT_DATE)
    ORDER BY vigencia_desde DESC
    LIMIT 1;
    
    -- Si no encuentra vigencia actual, devolver 19% como fallback
    RETURN COALESCE(porcentaje_actual, 0.19);
END;
$$ LANGUAGE plpgsql;

-- Función para calcular IVA con fecha específica
CREATE OR REPLACE FUNCTION calcular_iva_fecha(
    valor_base NUMERIC,
    fecha_calculo DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    iva_calculado NUMERIC,
    porcentaje_aplicado NUMERIC,
    descripcion_tarifa TEXT
) AS $$
DECLARE
    info_iva RECORD;
    iva_resultado NUMERIC;
BEGIN
    -- Obtener información del IVA vigente
    SELECT * INTO info_iva FROM get_iva_vigente(fecha_calculo);
    
    -- Si no encuentra IVA vigente, usar 19% por defecto
    IF info_iva IS NULL THEN
        iva_resultado := valor_base * 0.19;
        RETURN QUERY SELECT 
            ROUND(iva_resultado, 2),
            0.19::NUMERIC,
            'IVA 19% (por defecto)'::TEXT;
    ELSE
        iva_resultado := valor_base * info_iva.porcentaje;
        RETURN QUERY SELECT 
            ROUND(iva_resultado, 2),
            info_iva.porcentaje,
            info_iva.descripcion;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ACTUALIZAR FUNCIÓN DE TRIGGER PARA SOLICITUDES
-- ============================================

-- Actualizar la función que calcula IVA automáticamente en solicitudes
CREATE OR REPLACE FUNCTION auto_calculate_iva_solicitudes()
RETURNS TRIGGER AS $$
DECLARE
    info_iva RECORD;
BEGIN
    -- Si tiene IVA habilitado
    IF NEW.tiene_iva = true THEN
        -- Obtener IVA vigente para la fecha actual
        SELECT * INTO info_iva FROM get_iva_vigente(CURRENT_DATE);
        
        -- Si encontró IVA vigente
        IF info_iva IS NOT NULL THEN
            NEW.concepto_iva := 'IVA';
            NEW.porcentaje_iva := info_iva.porcentaje;
            NEW.iva := ROUND(NEW.valor_solicitud * info_iva.porcentaje, 2);
        ELSE
            -- Fallback: usar 19%
            NEW.concepto_iva := 'IVA';
            NEW.porcentaje_iva := 0.19;
            NEW.iva := ROUND(NEW.valor_solicitud * 0.19, 2);
        END IF;
    ELSE
        -- Sin IVA
        NEW.iva := 0;
        NEW.porcentaje_iva := 0;
        NEW.concepto_iva := NULL;
    END IF;
    
    -- Recalcular total
    NEW.total_solicitud := NEW.valor_solicitud + NEW.iva;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recrear el trigger (por si hubo cambios)
DROP TRIGGER IF EXISTS trigger_auto_calculate_iva_solicitudes ON public.solicitudes_op;
CREATE TRIGGER trigger_auto_calculate_iva_solicitudes
    BEFORE INSERT OR UPDATE ON public.solicitudes_op
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_iva_solicitudes();

-- ============================================
-- VISTA ÚTIL PARA CONSULTAS
-- ============================================

-- Crear vista para consultar histórico de IVA fácilmente
CREATE OR REPLACE VIEW vista_historico_iva AS
SELECT 
    concepto_impuesto,
    (porcentaje_aplicacion * 100)::TEXT || '%' AS porcentaje_display,
    porcentaje_aplicacion,
    descripcion,
    vigencia_desde,
    vigencia_hasta,
    CASE 
        WHEN vigencia_hasta IS NULL THEN 'VIGENTE'
        WHEN vigencia_hasta >= CURRENT_DATE THEN 'VIGENTE'
        ELSE 'VENCIDO'
    END AS estado_vigencia,
    observaciones,
    -- Calcular duración en días
    CASE 
        WHEN vigencia_hasta IS NULL THEN 
            CURRENT_DATE - vigencia_desde
        ELSE 
            vigencia_hasta - vigencia_desde + 1
    END AS duracion_dias
FROM public.conceptos_impuestos
WHERE concepto_impuesto = 'IVA'
AND tipo_impuesto = 'IVA'
AND activo = true
ORDER BY vigencia_desde DESC;

-- ============================================
-- COMENTARIOS Y DOCUMENTACIÓN ACTUALIZADA
-- ============================================

COMMENT ON COLUMN public.conceptos_impuestos.vigencia_desde IS 'Fecha de inicio de vigencia del impuesto';
COMMENT ON COLUMN public.conceptos_impuestos.vigencia_hasta IS 'Fecha de fin de vigencia (NULL = sin fecha límite)';
COMMENT ON COLUMN public.conceptos_impuestos.observaciones IS 'Notas adicionales sobre el impuesto y su contexto';

COMMENT ON FUNCTION get_iva_vigente(DATE) IS 'Obtiene la información completa del IVA vigente en una fecha específica';
COMMENT ON FUNCTION get_porcentaje_iva_actual() IS 'Obtiene solo el porcentaje de IVA vigente actual';
COMMENT ON FUNCTION calcular_iva_fecha(NUMERIC, DATE) IS 'Calcula el IVA para un valor base en una fecha específica';

COMMENT ON VIEW vista_historico_iva IS 'Vista para consultar fácilmente el histórico de tarifas de IVA';

-- ============================================
-- EJEMPLOS DE USO Y PRUEBAS
-- ============================================

/*
-- Consultar IVA vigente actual
SELECT * FROM get_iva_vigente();

-- Consultar IVA vigente en fecha específica (período histórico)
SELECT * FROM get_iva_vigente('2021-06-15');

-- Obtener solo el porcentaje actual
SELECT get_porcentaje_iva_actual();

-- Calcular IVA para $1,000,000 hoy
SELECT * FROM calcular_iva_fecha(1000000);

-- Calcular IVA para $1,000,000 en 2021 (debería usar 16%)
SELECT * FROM calcular_iva_fecha(1000000, '2021-06-15');

-- Ver histórico completo
SELECT * FROM vista_historico_iva;

-- Probar el trigger automático
INSERT INTO public.solicitudes_op (
    numero_solicitud,
    acreedor,
    concepto,
    valor_solicitud,
    tiene_iva,
    created_by
) VALUES (
    'SOL-2024-TEST-IVA',
    'NT-860034313-DAVIVIENDA S.A.',
    'Convenio de uso de red',
    1000000,
    true,
    (SELECT id FROM public.profiles WHERE role = 'OperacionBSEG' LIMIT 1)
);
-- Debería calcular automáticamente IVA al 19% = $190,000
*/

-- ============================================
-- VALIDAR IMPLEMENTACIÓN
-- ============================================

-- Verificar que se crearon los registros correctamente
SELECT 
    concepto_impuesto,
    (porcentaje_aplicacion * 100) || '%' as porcentaje,
    vigencia_desde,
    vigencia_hasta,
    observaciones,
    CASE 
        WHEN vigencia_hasta IS NULL OR vigencia_hasta >= CURRENT_DATE THEN 'VIGENTE'
        ELSE 'VENCIDO'
    END as estado
FROM public.conceptos_impuestos 
WHERE concepto_impuesto = 'IVA'
ORDER BY vigencia_desde;

-- Probar función de IVA actual
SELECT 
    'Porcentaje IVA actual: ' || (get_porcentaje_iva_actual() * 100) || '%' as resultado;

COMMIT;
