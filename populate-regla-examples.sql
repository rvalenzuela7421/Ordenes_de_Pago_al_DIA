-- ============================================================================
-- EJEMPLOS DE USO DEL NUEVO CAMPO REGLA
-- Script para agregar reglas y configuraciones a algunos parámetros existentes
-- ============================================================================

-- 1. VERIFICAR PARÁMETROS EXISTENTES ANTES DE ACTUALIZAR
-- ============================================================================
SELECT 
    nombre_grupo,
    valor_dominio,
    descripcion_grupo,
    regla,
    vigente
FROM public.parametros 
WHERE nombre_grupo IN ('GRUPO_BOLIVAR', 'ESTADOS_SOLICITUD', 'CONFIGURACION_IVA')
ORDER BY nombre_grupo, orden;

-- 2. ACTUALIZAR ALGUNOS PARÁMETROS CON REGLAS ESPECÍFICAS
-- ============================================================================

-- Empresas del Grupo Bolívar con reglas de configuración
UPDATE public.parametros 
SET regla = 'Validar que el NIT coincida con 901438242. Requiere autorización especial para pagos superiores a $50.000.000. Centro de costos: SALUD-001.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%SALUD BOLIVAR EPS%';

UPDATE public.parametros 
SET regla = 'Pagos deben incluir certificación de retención en la fuente. Monto mínimo $100.000. Requiere código de autorización SAC.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%CAPITALIZADORA BOLÍVAR%';

UPDATE public.parametros 
SET regla = 'Verificar pólizas activas antes del pago. Aplicar retención del 4% para servicios. Centro de costos: SEG-002.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%COMPAÑÍA DE SEGUROS BOLÍVAR%';

UPDATE public.parametros 
SET regla = 'Pagos requieren doble autorización. Generar informe ejecutivo mensual. Código presupuestal: GRP-001-2024.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%GRUPO BOLÍVAR S.A.%';

-- Estados de solicitud con reglas de flujo de trabajo
UPDATE public.parametros 
SET regla = 'Auto-asignar al primer operador disponible. Notificar por email. SLA: 2 horas hábiles para primera revisión. Prioridad según monto.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Solicitada';

UPDATE public.parametros 
SET regla = 'Permitir máximo 3 devoluciones por solicitud. Generar notificación automática al solicitante. Incluir comentarios específicos obligatorios.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Devuelta';

UPDATE public.parametros 
SET regla = 'Generar PDF automáticamente. Asignar número consecutivo. Enviar copia al área contable. Bloquear modificaciones posteriores.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Generada';

UPDATE public.parametros 
SET regla = 'Requiere firma digital del supervisor. Validar límites de autorización por perfil. Registro en auditoría obligatorio.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Aprobada';

UPDATE public.parametros 
SET regla = 'Generar comprobante automático. Actualizar flujo de caja. Notificar a beneficiario. Archivar documentos soporte por 5 años.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Pagada';

-- Configuración de IVA con reglas de aplicación
UPDATE public.parametros 
SET regla = 'Aplicar solo a bienes y servicios gravados según Art. 468 ET. Excluir productos de canasta familiar. Validar RUT del proveedor.'
WHERE nombre_grupo = 'CONFIGURACION_IVA' 
  AND valor_dominio = '19';

-- Reglas adicionales para tipos de documento
UPDATE public.parametros 
SET regla = 'Validar dígito de verificación. Longitud: 8-10 dígitos. Obligatorio para personas mayores de 18 años.'
WHERE nombre_grupo = 'TIPOS_DOCUMENTO' 
  AND valor_dominio = 'CC';

UPDATE public.parametros 
SET regla = 'Validar vigencia del documento. Requiere certificación migratoria. Longitud: 6-12 caracteres alfanuméricos.'
WHERE nombre_grupo = 'TIPOS_DOCUMENTO' 
  AND valor_dominio = 'CE';

-- 3. VERIFICAR LAS ACTUALIZACIONES REALIZADAS
-- ============================================================================
SELECT 
    nombre_grupo,
    valor_dominio,
    LEFT(regla, 100) || '...' as regla_preview,
    CHAR_LENGTH(regla) as longitud_caracteres,
    vigente
FROM public.parametros 
WHERE regla IS NOT NULL
ORDER BY nombre_grupo, orden;

-- 4. ESTADÍSTICAS DESPUÉS DE LA ACTUALIZACIÓN
-- ============================================================================
SELECT 
    'Total parámetros' as descripcion,
    COUNT(*) as cantidad
FROM public.parametros

UNION ALL

SELECT 
    'Con regla definida',
    COUNT(*)
FROM public.parametros
WHERE regla IS NOT NULL AND regla != ''

UNION ALL

SELECT 
    'Sin regla definida',
    COUNT(*)
FROM public.parametros
WHERE regla IS NULL OR regla = ''

UNION ALL

SELECT 
    'Promedio caracteres regla',
    ROUND(AVG(CHAR_LENGTH(regla)))
FROM public.parametros
WHERE regla IS NOT NULL AND regla != ''

UNION ALL

SELECT 
    'Regla más larga (caracteres)',
    MAX(CHAR_LENGTH(regla))
FROM public.parametros
WHERE regla IS NOT NULL;

-- ============================================================================
-- CASOS DE USO DEL CAMPO REGLA:
-- ============================================================================
-- ✅ Casos de uso principales:
-- • Reglas de validación específicas para cada parámetro
-- • Configuraciones de flujo de trabajo
-- • Límites y restricciones de negocio
-- • Códigos de autorización y centros de costo
-- • Procedimientos especiales por tipo de parámetro
-- 
-- ✅ Ejemplos prácticos:
-- • "Validar NIT antes del pago"
-- • "Requiere autorización doble para montos > $X"
-- • "Aplicar retención según tipo de proveedor"  
-- • "Generar notificación automática en estado X"
-- • "SLA máximo de Y horas para procesamiento"
-- 
-- ✅ Beneficios operativos:
-- • Automatización de validaciones complejas
-- • Estandarización de procedimientos
-- • Reducción de errores manuales
-- • Mayor trazabilidad de procesos
-- • Facilita configuración sin código
-- ============================================================================
