-- ============================================================================
-- EJEMPLOS DE USO DEL NUEVO CAMPO DESCRIPCION_DETALLE
-- Script para agregar información detallada a algunos parámetros existentes
-- ============================================================================

-- 1. VERIFICAR PARÁMETROS EXISTENTES ANTES DE ACTUALIZAR
-- ============================================================================
SELECT 
    nombre_grupo,
    valor_dominio,
    descripcion_grupo,
    descripcion_detalle,
    vigente
FROM public.parametros 
WHERE nombre_grupo IN ('GRUPO_BOLIVAR', 'ESTADOS_SOLICITUD', 'CONFIGURACION_IVA')
ORDER BY nombre_grupo, orden;

-- 2. ACTUALIZAR ALGUNOS PARÁMETROS CON INFORMACIÓN DETALLADA
-- ============================================================================

-- Empresas del Grupo Bolívar con información adicional
UPDATE public.parametros 
SET descripcion_detalle = 'Empresa líder en el sector salud, ofrece servicios de atención médica, hospitalarios y ambulatorios a nivel nacional con más de 2 millones de afiliados.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%SALUD BOLIVAR EPS%';

UPDATE public.parametros 
SET descripcion_detalle = 'Compañía especializada en seguros de vida, accidentes personales y productos de capitalización con más de 80 años de experiencia en el mercado colombiano.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%CAPITALIZADORA BOLÍVAR%';

UPDATE public.parametros 
SET descripcion_detalle = 'Aseguradora líder en seguros generales: automóviles, hogar, comerciales, responsabilidad civil y riesgos industriales. Fundada en 1940.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%COMPAÑÍA DE SEGUROS BOLÍVAR%';

UPDATE public.parametros 
SET descripcion_detalle = 'Holding principal del grupo empresarial, coordina las operaciones estratégicas de todas las compañías subsidiarias del conglomerado financiero.'
WHERE nombre_grupo = 'GRUPO_BOLIVAR' 
  AND valor_dominio LIKE '%GRUPO BOLÍVAR S.A.%';

-- Estados de solicitud con explicaciones detalladas
UPDATE public.parametros 
SET descripcion_detalle = 'Estado inicial de toda solicitud. La solicitud ha sido creada en el sistema pero aún no ha sido revisada ni procesada por el equipo de operaciones. Requiere validación de documentos y aprobación.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Solicitada';

UPDATE public.parametros 
SET descripcion_detalle = 'La solicitud fue revisada y se encontraron inconsistencias, documentos faltantes o información incorrecta. Debe ser corregida y reenviada por el solicitante antes de continuar el proceso.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Devuelta';

UPDATE public.parametros 
SET descripcion_detalle = 'La solicitud pasó todas las validaciones y se ha generado la orden de pago correspondiente. El documento está listo para firma y procesamiento por parte del área financiera.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Generada';

UPDATE public.parametros 
SET descripcion_detalle = 'La orden de pago fue aprobada por el supervisor autorizado. El pago está autorizado y se procederá con la ejecución según los términos y fechas establecidas.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Aprobada';

UPDATE public.parametros 
SET descripcion_detalle = 'El pago fue ejecutado exitosamente. Los recursos fueron transferidos al beneficiario y el proceso se considera completado. Se genera comprobante de pago automáticamente.'
WHERE nombre_grupo = 'ESTADOS_SOLICITUD' 
  AND valor_dominio = 'Pagada';

-- Configuración de IVA con detalles técnicos
UPDATE public.parametros 
SET descripcion_detalle = 'Tarifa estándar del Impuesto al Valor Agregado (IVA) según Estatuto Tributario colombiano. Aplica para la mayoría de bienes y servicios gravados. Vigente según Ley 1943 de 2018.'
WHERE nombre_grupo = 'CONFIGURACION_IVA' 
  AND valor_dominio = '19';

-- 3. VERIFICAR LAS ACTUALIZACIONES REALIZADAS
-- ============================================================================
SELECT 
    nombre_grupo,
    valor_dominio,
    LEFT(descripcion_detalle, 100) || '...' as descripcion_preview,
    CHAR_LENGTH(descripcion_detalle) as longitud_caracteres,
    vigente
FROM public.parametros 
WHERE descripcion_detalle IS NOT NULL
ORDER BY nombre_grupo, orden;

-- 4. ESTADÍSTICAS DESPUÉS DE LA ACTUALIZACIÓN
-- ============================================================================
SELECT 
    'Total parámetros' as descripcion,
    COUNT(*) as cantidad
FROM public.parametros

UNION ALL

SELECT 
    'Con descripción detalle',
    COUNT(*)
FROM public.parametros
WHERE descripcion_detalle IS NOT NULL AND descripcion_detalle != ''

UNION ALL

SELECT 
    'Sin descripción detalle',
    COUNT(*)
FROM public.parametros
WHERE descripcion_detalle IS NULL OR descripcion_detalle = ''

UNION ALL

SELECT 
    'Promedio caracteres descripción',
    ROUND(AVG(CHAR_LENGTH(descripcion_detalle)))
FROM public.parametros
WHERE descripcion_detalle IS NOT NULL AND descripcion_detalle != '';

-- ============================================================================
-- NOTAS DE USO DEL CAMPO DESCRIPCION_DETALLE:
-- ============================================================================
-- ✅ Casos de uso sugeridos:
-- • Explicaciones detalladas de parámetros complejos
-- • Instrucciones específicas para el uso del parámetro  
-- • Información histórica o legal relevante
-- • Configuraciones técnicas detalladas
-- • Referencias a normativas o documentación externa
-- 
-- ✅ Mejores prácticas:
-- • Mantener texto descriptivo y útil
-- • No exceder los 500 caracteres
-- • Usar para información que realmente agregue valor
-- • Actualizar cuando cambien las regulaciones
-- 
-- ✅ Beneficios:
-- • Mayor contexto para los usuarios del sistema
-- • Mejor comprensión de los parámetros
-- • Facilita mantenimiento y documentación
-- • Reduce consultas de soporte técnico
-- ============================================================================
