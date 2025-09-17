import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import * as pdfParse from 'pdf-parse'

// Configuración para el manejo de archivos
export const config = {
  api: {
    bodyParser: false,
  },
}

// Interface unificada para los datos extraídos del PDF
interface ExtractedPDFData {
  fechaCuentaCobro: string | null        // Fecha de la cuenta de cobro en formato dd-mm-yyyy
  companiaReceptora: string | null       // Compañía receptora
  acreedor: string | null                // Acreedor
  concepto: string | null                // Concepto
  descripcion: string | null             // Descripción completa
  valorSolicitud: number | null          // Valor solicitud (numérico)
  tieneIVA: boolean                      // ¿Tiene IVA?
  valorIVA: number | null                // Valor IVA (numérico)
  valorTotalSolicitud: number | null     // Valor total solicitud (numérico)
  
  // Metadatos
  success: boolean
  confidence: 'high' | 'medium' | 'low'
  extractedFields: string[]
}

// Lista de conceptos válidos del sistema
const CONCEPTOS_VALIDOS = [
  'Convenio de uso de red',
  'Reconocimiento y pago de comisiones por recaudo Leasing',
  'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing', 
  'Costo de recaudo TRC',
  'Referenciación de clientes',
  'Bono cumplimiento penetraciones seguros voluntarios',
  'Retornos títulos de capitalización GanaMás'
]

// Patrones de regex según los criterios específicos del usuario
const PATTERNS = {
  // 1. CUENTA DE COBRO (para descripción - primera línea)
  cuentaCobro: /CUENTA\s+DE\s+COBRO\s+(?:No\.?\s*|N[oº]\.?\s*)([0-9\-A-Z]+)/gi,
  
  // 2. ACREEDOR (después de "DEBE A:")
  acreedor: /(?:DEBE\s+A:?|ACREEDOR:?)\s*\n?\s*([^\n\r]{5,80})/gi,
  
  // 3. TOTAL (respetando mayúsculas - "Total" exacto)
  totalEspecifico: /(?:^|\n|\s)Total\s*\$?\s*([\d,\.]+)/g,

  // 3b. TOTAL FINAL (todo mayúsculas "TOTAL")
  totalFinal: /(?:^|\n|\s)TOTAL\s*\$?\s*([\d,\.]+)/g,
  
  // 4. IVA - PATRÓN ESPECÍFICO PARA "IVA (19%)" CON DIAGNÓSTICOS AVANZADOS
  ivaEspecifico: /IVA\s*\(19%\)\s*\$?\s*([\d,\.]+)/gi,
  
  // 5. NÚMEROS DE FACTURA - ELIMINADO POR CAUSAR EXTRACCIONES INCORRECTAS
  
  // 6. CONCEPTOS específicos con patrones flexibles
  conceptosPatrones: [
    { concepto: 'Convenio de uso de red', patron: /convenio\s+de\s+uso\s+de\s+red/gi },
    { concepto: 'Reconocimiento y pago de comisiones por recaudo Leasing', patron: /(?:reconocimiento\s+y\s+pago\s+de\s+)?comisiones\s+por\s+recaudo\s+leasing/gi },
    { concepto: 'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing', patron: /comisiones\s+por\s+recaudo\s+vida\s+deudores\s+leasing/gi },
    { concepto: 'Costo de recaudo TRC', patron: /costo\s+de\s+recaudo\s+trc/gi },
    { concepto: 'Referenciación de clientes', patron: /referenciación\s+de\s+clientes/gi },
    { concepto: 'Bono cumplimiento penetraciones seguros voluntarios', patron: /bono\s+cumplimiento\s+penetraciones\s+seguros\s+voluntarios/gi },
    { concepto: 'Retornos títulos de capitalización GanaMás', patron: /retornos\s+títulos\s+de\s+capitalización\s+ganamás/gi }
  ]
}

function cleanNumericValue(value: string): string {
  // Limpiar valor numérico: manejar formato colombiano (1,234,567.89 o 1.234.567,89)
  let cleaned = value.replace(/[^\d,\.]/g, '')
  
  // Si tiene tanto comas como puntos, determinar cuál es el separador decimal
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Si el último separador es una coma, es formato europeo (1.234.567,89)
    const lastComma = cleaned.lastIndexOf(',')
    const lastDot = cleaned.lastIndexOf('.')
    
    if (lastComma > lastDot) {
      // Formato: 1.234.567,89 -> convertir a 1234567.89
      cleaned = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      // Formato: 1,234,567.89 -> convertir a 1234567.89
      cleaned = cleaned.replace(/,/g, '')
    }
  } else if (cleaned.includes(',')) {
    // Solo comas - puede ser separador de miles o decimal
    const commaCount = (cleaned.match(/,/g) || []).length
    if (commaCount === 1 && cleaned.length - cleaned.lastIndexOf(',') <= 3) {
      // Probablemente separador decimal
      cleaned = cleaned.replace(',', '.')
    } else {
      // Probablemente separadores de miles
      cleaned = cleaned.replace(/,/g, '')
    }
  }
  
  console.log(`🧮 Limpiando valor: "${value}" -> "${cleaned}"`)
  return cleaned
}

function extractDataFromText(text: string): ExtractedPDFData {
  const result: ExtractedPDFData = {
    fechaCuentaCobro: null,
    companiaReceptora: null,
    acreedor: null,
    concepto: null,
    descripcion: null,
    valorSolicitud: null,
    tieneIVA: false,
    valorIVA: null,
    valorTotalSolicitud: null,
    success: true,
    confidence: 'low',
    extractedFields: []
  }

  try {
    console.log('🔍 === NUEVA LÓGICA DE EXTRACCIÓN SEGÚN CRITERIOS ===')
    
    // CRITERIO 1: Fecha de la cuenta de cobro ✅
    console.log('1️⃣ Extrayendo fecha de la cuenta de cobro...')
    
    // Patrones de fecha específicos para documentos de cuenta de cobro
    const fechaPatterns = [
      /(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/gi,                      // "23 de July de 2025" (patrón principal)
      /(\d{1,2})\s+(\w+)\s+(\d{4})/gi,                                // "23 July 2025"
      /fecha[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/gi,           // "Fecha: dd/mm/yyyy"
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,                       // "dd/mm/yyyy" o "dd-mm-yyyy"
      /emisi[óo]n[:\s]*(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/gi,     // "Emisión: dd/mm/yyyy"
      /cobro.*?(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/gi,             // "cobro dd/mm/yyyy"
    ]
    
    const meses: {[key: string]: string} = {
      // Español
      'enero': '01', 'febrero': '02', 'marzo': '03', 'abril': '04',
      'mayo': '05', 'junio': '06', 'julio': '07', 'agosto': '08',
      'septiembre': '09', 'octubre': '10', 'noviembre': '11', 'diciembre': '12',
      // Inglés (por si aparecen mezclados)
      'january': '01', 'february': '02', 'march': '03', 'april': '04',
      'may': '05', 'june': '06', 'july': '07', 'august': '08',
      'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }
    
    // Buscar la fecha en las primeras líneas del documento (donde suele aparecer)
    const primeras500Chars = text.substring(0, 500)
    console.log('📄 Buscando fecha en las primeras líneas del documento...')
    
    for (let i = 0; i < fechaPatterns.length; i++) {
      const pattern = fechaPatterns[i]
      // Resetear el índice de regex para cada búsqueda
      pattern.lastIndex = 0
      
      const fechaMatch = primeras500Chars.match(pattern)
      if (fechaMatch && fechaMatch.length > 0) {
        console.log(`🔍 Patrón ${i+1} encontró: "${fechaMatch[0]}"`)
        
        // Ejecutar el patrón de nuevo para obtener los grupos
        pattern.lastIndex = 0
        const grupos = pattern.exec(fechaMatch[0])
        
        if (grupos) {
          let dia, mes, año
          
          // Determinar el tipo de patrón y extraer componentes
          if (pattern.source.includes('de\\s+(\\w+)\\s+de')) {
            // Patrón: "23 de July de 2025"
            dia = grupos[1]
            mes = meses[grupos[2].toLowerCase()] || '01'
            año = grupos[3]
            console.log(`📅 Formato "dd de mes de yyyy": día=${dia}, mes=${grupos[2]}→${mes}, año=${año}`)
          } else if (pattern.source === '(\\d{1,2})\\s+(\\w+)\\s+(\\d{4})') {
            // Patrón: "23 July 2025"
            dia = grupos[1]
            mes = meses[grupos[2].toLowerCase()] || '01'
            año = grupos[3]
            console.log(`📅 Formato "dd mes yyyy": día=${dia}, mes=${grupos[2]}→${mes}, año=${año}`)
          } else {
            // Patrones numéricos: dd/mm/yyyy, dd-mm-yyyy, etc.
            dia = grupos[1]
            mes = grupos[2]
            año = grupos[3]
            console.log(`📅 Formato numérico: día=${dia}, mes=${mes}, año=${año}`)
          }
          
          // Normalizar formato
          dia = dia.padStart(2, '0')
          if (mes.length === 1) {
            mes = mes.padStart(2, '0')
          }
          
          // Asegurar año de 4 dígitos
          if (año.length === 2) {
            año = parseInt(año) > 50 ? `19${año}` : `20${año}`
          }
          
          // Validar que sea una fecha válida
          const fechaNum = new Date(`${año}-${mes}-${dia}`)
          if (fechaNum instanceof Date && !isNaN(fechaNum.getTime())) {
            const fechaFinal = `${dia}-${mes}-${año}`
            result.fechaCuentaCobro = fechaFinal
            result.extractedFields.push('fechaCuentaCobro')
            console.log('✅ Fecha de cuenta de cobro extraída:', fechaFinal)
            break
          } else {
            console.log('❌ Fecha inválida:', `${dia}-${mes}-${año}`)
          }
        }
      }
    }

    // CRITERIO 2: DETECCIÓN DE ACREEDOR (Auto-detección) ✅
    console.log('2️⃣ Detectando Acreedor...')
    
    // DIAGNÓSTICO DETALLADO: Mostrar más contexto del texto
    console.log('🔍 DIAGNÓSTICO ACREEDOR - Buscando "DEBE A:" en el texto...')
    const debeAIndex = text.indexOf('DEBE A:')
    const debeAIndexCaseInsensitive = text.toLowerCase().indexOf('debe a:')
    console.log(`📍 "DEBE A:" encontrado en posición: ${debeAIndex}`)
    console.log(`📍 "debe a:" (case insensitive) encontrado en posición: ${debeAIndexCaseInsensitive}`)
    
    if (debeAIndex >= 0 || debeAIndexCaseInsensitive >= 0) {
      const contextStart = Math.max(0, Math.max(debeAIndex, debeAIndexCaseInsensitive) - 50)
      const contextEnd = Math.min(text.length, Math.max(debeAIndex, debeAIndexCaseInsensitive) + 200)
      console.log('📄 Contexto alrededor de "DEBE A:":', text.substring(contextStart, contextEnd).replace(/\s+/g, ' '))
    } else {
      console.log('❌ No se encontró "DEBE A:" en el texto')
      console.log('📄 Primeros 500 caracteres del documento:', text.substring(0, 500).replace(/\s+/g, ' '))
    }
    
    // Extraer la sección después de "DEBE A:" hasta "Por concepto de"
    const seccionAcreedorMatch = text.match(/DEBE\s+A:\s*([\s\S]*?)(?:Por\s+concepto\s+de|$)/i)
    let seccionAcreedor = seccionAcreedorMatch ? seccionAcreedorMatch[1] : ''
    
    console.log(`📋 Sección acreedor extraída (${seccionAcreedor.length} chars):`, seccionAcreedor.substring(0, 300).replace(/\s+/g, ' '))
    
    // Base de datos de acreedores disponibles
    const acreedoresDisponibles = [
      {
        nit: '860034313',
        nitFormateado: '860.034.313',
        nombre: 'DAVIVIENDA S.A.',
        codigo: 'NT-860034313-DAVIVIENDA S.A.',
        palabrasClave: ['davivienda']
      },
      {
        nit: '860002503',
        nitFormateado: '860.002.503',
        nombre: 'COMPAÑÍA DE SEGUROS BOLÍVAR S.A.',
        codigo: 'NT-860002503-COMPAÑÍA DE SEGUROS BOLÍVAR S.A.',
        palabrasClave: ['compañía', 'de', 'seguros', 'bolivar', 'bolívar']
      },
      {
        nit: '830025448',
        nitFormateado: '830.025.448',
        nombre: 'GRUPO BOLÍVAR S.A.',
        codigo: 'NT-830025448-GRUPO BOLÍVAR S.A.',
        palabrasClave: ['grupo', 'bolivar', 'bolívar']
      }
    ]
    
    let acreedorEncontrado = null
    
    // PRIMERA BÚSQUEDA: Por NIT
    console.log('🔍 Primera búsqueda: Por NIT del acreedor...')
    
    const nitPatternsAcreedor = [
      /NIT\.?\s*(\d{3}\.?\d{3}\.?\d{3}[-\.]?\d)/gi,
      /(\d{3}\.?\d{3}\.?\d{3}[-\.]?\d)/g
    ]
    
    for (const pattern of nitPatternsAcreedor) {
      let match
      while ((match = pattern.exec(seccionAcreedor)) !== null) {
        const nitEncontrado = match[1] || match[0]
        const nitLimpio = nitEncontrado.replace(/[\.\-\s]/g, '')
        console.log(`🔢 NIT acreedor encontrado: "${nitEncontrado}" → limpio: "${nitLimpio}"`)
        
        // Buscar coincidencia con acreedores disponibles
        for (const acreedor of acreedoresDisponibles) {
          if (acreedor.nit === nitLimpio || acreedor.nitFormateado === nitEncontrado) {
            acreedorEncontrado = acreedor
            console.log(`✅ Acreedor encontrado por NIT: ${acreedor.nombre}`)
            break
          }
        }
        
        if (acreedorEncontrado) break
        
        if (!pattern.global) break
      }
      if (acreedorEncontrado) break
    }
    
    // SEGUNDA BÚSQUEDA: Por nombre/palabras clave (si NIT falla)
    if (!acreedorEncontrado) {
      console.log('🔍 Segunda búsqueda: Por nombre del acreedor...')
      
      const seccionNormalizada = seccionAcreedor.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      
      for (const acreedor of acreedoresDisponibles) {
      let coincidencias = 0
        const palabrasEncontradas: string[] = []
        
        for (const palabra of acreedor.palabrasClave) {
          const palabraNormalizada = palabra.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
          
          if (seccionNormalizada.includes(palabraNormalizada)) {
          coincidencias++
            palabrasEncontradas.push(palabra)
          }
        }
        
        console.log(`🔤 ${acreedor.nombre}: ${coincidencias} coincidencias [${palabrasEncontradas.join(', ')}]`)
        
        // Se requiere al menos 1 coincidencia para acreedores (más estricto)
        if (coincidencias >= 1) {
          acreedorEncontrado = acreedor
          console.log(`✅ Acreedor encontrado por nombre: ${acreedor.nombre}`)
          break
        }
      }
    }
    
    // FALLBACK: Método regex básico (si auto-detección falla)
    if (!acreedorEncontrado) {
      console.log('🔍 Fallback: Método regex básico...')
      
      // Intentar múltiples patrones de fallback (SIN limitaciones de caracteres)
      const fallbackPatterns = [
        /(?:DEBE\s+A:?|ACREEDOR:?)\s*\n?\s*([^\n\r]+)/gi,  // Patrón básico hasta fin de línea
        /DEBE\s+A\s*:?\s*(.*?)(?:\n.*?NIT|Por\s+concepto|$)/gi, // Hasta NIT o "Por concepto"
        /DEBE\s+A\s*:?\s*(.*?)(?:\n\n|Por\s+concepto)/gi  // Hasta doble salto o "Por concepto"
      ]
      
      for (let i = 0; i < fallbackPatterns.length; i++) {
        console.log(`🎯 Probando patrón fallback ${i+1}...`)
        const acreedorMatch = text.match(fallbackPatterns[i])
        console.log(`📊 Patrón ${i+1} encontró ${acreedorMatch?.length || 0} matches`)
        
        if (acreedorMatch && acreedorMatch.length > 0) {
          for (let j = 0; j < acreedorMatch.length; j++) {
            console.log(`🔍 Match ${j+1}:`, acreedorMatch[j].trim())
          }
          
          if (acreedorMatch[1]) {
            const nombreExtraido = acreedorMatch[1]
              .replace(/nit[\s\.].*$/gi, '') // Remover NIT si está en la misma línea
              .replace(/\s+/g, ' ') // Limpiar espacios múltiples
              .trim()
            
            if (nombreExtraido.trim()) {
              // Crear resultado básico sin NIT específico (basado en contenido, no en longitud)
              result.acreedor = nombreExtraido
              result.extractedFields.push('acreedor')
              console.log('✅ Acreedor extraído (fallback):', result.acreedor)
              break
            } else {
              console.log(`❌ Nombre vacío después de limpieza: "${nombreExtraido}"`)
            }
          }
        }
      }
      
      if (!result.acreedor) {
        console.log('❌ FALLBACK FALLÓ: No se pudo extraer acreedor con ningún patrón')
      }
    } else {
      // Asignar resultado de auto-detección
      result.acreedor = acreedorEncontrado.codigo
      result.extractedFields.push('acreedor')
      console.log('✅ Acreedor identificado (auto-detección):', acreedorEncontrado.codigo)
    }

    // Encontrar dónde termina el acreedor para extraer el "cuerpo" después
    let cuerpoTexto = text
    const debeAMatch = text.match(/DEBE\s+A:.*?(?=Por\s+concepto\s+de)/i)
    if (debeAMatch) {
      const posicionFinal = text.indexOf(debeAMatch[0]) + debeAMatch[0].length
      cuerpoTexto = text.substring(posicionFinal)
      console.log('📝 Cuerpo extraído después del acreedor (primeros 200 chars):', cuerpoTexto.substring(0, 200))
    }

    // CRITERIO 2.5: DETECCIÓN DE COMPAÑÍA RECEPTORA (Auto-detección del Grupo Bolívar) ✅
    console.log('2️⃣.5 Detectando Compañía Receptora del Grupo Bolívar...')
    
    // Extraer el encabezado antes de "DEBE A:"
    const encabezadoMatch = text.match(/^(.*?)DEBE\s+A:/i)
    let encabezado = encabezadoMatch ? encabezadoMatch[1] : text.substring(0, 1000)
    
    console.log('📋 Analizando encabezado antes de "DEBE A:":', encabezado.substring(0, 200).replace(/\s+/g, ' '))
    
    // Definir empresas del Grupo Bolívar con sus NITs y palabras clave
    const empresasGrupoBolivar = [
      {
        nit: '8600021807',
        nitFormateado: '860.002.180-7',
        nombre: 'CONSTRUCTORA BOLÍVAR S.A.',
        codigo: 'NT-860002180-7-CONSTRUCTORA BOLÍVAR S.A.',
        palabrasClave: ['constructora', 'bolivar', 'bolívar']
      },
      {
        nit: '860002503',
        nitFormateado: '860.002.503', 
        nombre: 'COMPAÑÍA DE SEGUROS BOLÍVAR S.A.',
        codigo: 'NT-860002503-COMPAÑÍA DE SEGUROS BOLÍVAR S.A.',
        palabrasClave: ['compañia', 'compañía', 'de', 'seguros', 'bolivar', 'bolívar']
      },
      {
        nit: '860034313',
        nitFormateado: '860.034.313',
        nombre: 'DAVIVIENDA S.A.',
        codigo: 'NT-860034313-DAVIVIENDA S.A.',
        palabrasClave: ['davivienda', 'banco']
      },
      {
        nit: '830025448',
        nitFormateado: '830.025.448',
        nombre: 'GRUPO BOLÍVAR S.A.',
        codigo: 'NT-830025448-GRUPO BOLÍVAR S.A.',
        palabrasClave: ['grupo', 'bolivar', 'bolívar']
      },
      {
        nit: '8300749405',
        nitFormateado: '830.074.940-5',
        nombre: 'SEGUROS BOLÍVAR S.A.',
        codigo: 'NT-830074940-5-SEGUROS BOLÍVAR S.A.',
        palabrasClave: ['seguros', 'bolivar', 'bolívar']
      }
    ]
    
    let companiaEncontrada = null
    
    // PRIMERA BÚSQUEDA: Por NIT
    console.log('🔍 Primera búsqueda: Por NIT...')
    
    // Buscar patrones de NIT en el encabezado
    const nitPatternsCompania = [
      /NIT\.?\s*N[oº]?\.?\s*(\d{3}\.?\d{3}\.?\d{3}[-\.]?\d)/gi,
      /NIT[:\s\.]*(\d{3}\.?\d{3}\.?\d{3}[-\.]?\d)/gi,
      /(\d{3}\.?\d{3}\.?\d{3}[-\.]?\d)/g
    ]
    
    for (const pattern of nitPatternsCompania) {
      let match
      while ((match = pattern.exec(encabezado)) !== null) {
        const nitEncontrado = match[1] || match[0]
        // Limpiar el NIT (quitar puntos y guiones)
        const nitLimpio = nitEncontrado.replace(/[\.\-\s]/g, '')
        console.log(`🔢 NIT encontrado: "${nitEncontrado}" → limpio: "${nitLimpio}"`)
        
        // Buscar coincidencia con empresas del Grupo Bolívar
        for (const empresa of empresasGrupoBolivar) {
          if (empresa.nit === nitLimpio || empresa.nitFormateado === nitEncontrado) {
            companiaEncontrada = empresa
            console.log(`✅ Compañía encontrada por NIT: ${empresa.nombre}`)
            break
          }
        }
        
        if (companiaEncontrada) break
        
        // Evitar bucle infinito si no es global
        if (!pattern.global) break
      }
      if (companiaEncontrada) break
    }
    
    // SEGUNDA BÚSQUEDA: Por nombre/palabras clave (si NIT falla)
    if (!companiaEncontrada) {
      console.log('🔍 Segunda búsqueda: Por nombre/palabras clave...')
      
      // Normalizar texto del encabezado
      const encabezadoNormalizado = encabezado.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
      
      for (const empresa of empresasGrupoBolivar) {
        let coincidencias = 0
        const palabrasEncontradas: string[] = []
        
        for (const palabra of empresa.palabrasClave) {
          const palabraNormalizada = palabra.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
          
          if (encabezadoNormalizado.includes(palabraNormalizada)) {
            coincidencias++
            palabrasEncontradas.push(palabra)
          }
        }
        
        console.log(`🔤 ${empresa.nombre}: ${coincidencias} coincidencias [${palabrasEncontradas.join(', ')}]`)
        
        // Se requieren al menos 2 coincidencias para considerar válida la empresa
        if (coincidencias >= 2) {
          companiaEncontrada = empresa
          console.log(`✅ Compañía encontrada por nombre: ${empresa.nombre}`)
          break
        }
      }
    }
    
    // Asignar resultado
    if (companiaEncontrada) {
      result.companiaReceptora = companiaEncontrada.codigo
      result.extractedFields.push('companiaReceptora')
      console.log('✅ Compañía receptora identificada:', companiaEncontrada.codigo)
    } else {
      console.log('❌ No se pudo identificar la compañía receptora del Grupo Bolívar')
    }

    // CRITERIO 3: EXTRACCIÓN DE CONCEPTO (Nueva lógica mejorada) ✅
    console.log('3️⃣ Extrayendo concepto del documento...')
    
    // MÉTODO PRINCIPAL: Buscar el párrafo completo que inicia con "Por concepto de"
    console.log('🔍 Método principal: Buscando párrafo "Por concepto de"...')
    
    // Patrón mejorado para capturar párrafos completos que pueden abarcar múltiples líneas
    const parrafoPatterns = [
      // Párrafo completo hasta dos puntos (:)
      /Por\s+concepto\s+de\s+([^:]+:?)/gi,
      // Párrafo hasta salto de línea doble o final
      /Por\s+concepto\s+de\s+([^\n\r]+(?:\n[^\n\r]+)*?)(?:\n\s*\n|$)/gi,
      // Párrafo hasta encontrar una línea que empiece con mayúscula (nueva sección)
      /Por\s+concepto\s+de\s+(.*?)(?=\n[A-ZÁÉÍÓÚÑ]|$)/gi,
      // Fallback simple para una sola línea
      /Por\s+concepto\s+de\s*([^\n\r]+)/gi
    ]
    
    let parrafoPorConcepto = null
    
    for (const pattern of parrafoPatterns) {
      const match = text.match(pattern)
      if (match && match[0]) {
        parrafoPorConcepto = match[0].trim()
        console.log('📋 Párrafo "Por concepto de" encontrado:', parrafoPorConcepto)
        break
      }
    }
    
    if (parrafoPorConcepto) {
      // COMPARACIÓN CON CONCEPTOS VÁLIDOS
      console.log('🔍 Comparando párrafo con conceptos válidos del sistema...')
      
      // Función para normalizar texto (minúsculas, sin acentos, espacios limpios)
      const normalizar = (texto: string): string => {
        return texto.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
          .replace(/\s+/g, ' ')
          .trim()
      }
      
      const parrafoNormalizado = normalizar(parrafoPorConcepto)
      console.log('📝 Párrafo normalizado:', parrafoNormalizado.substring(0, 150) + '...')
      
      // Verificar cada concepto válido
      for (const concepto of CONCEPTOS_VALIDOS) {
        const conceptoNormalizado = normalizar(concepto)
        
        console.log(`   🔎 Verificando concepto: "${concepto}"`)
        console.log(`   📝 Concepto normalizado: "${conceptoNormalizado}"`)
        
        // Verificar si el concepto está contenido en el párrafo
        if (parrafoNormalizado.includes(conceptoNormalizado)) {
          result.concepto = concepto
          result.extractedFields.push('concepto')
          console.log('✅ CONCEPTO ENCONTRADO EN PÁRRAFO "Por concepto de":', concepto)
          console.log('📍 Párrafo completo:', parrafoPorConcepto)
          break
        } else {
          console.log(`   ❌ "${concepto}" NO está contenido en el párrafo`)
        }
      }
    } else {
      console.log('❌ No se encontró párrafo "Por concepto de"')
    }
    
    // FALLBACK: Si no encuentra párrafo "Por concepto de", usar patrones regex en todo el documento
    if (!result.concepto) {
      console.log('🔍 Fallback: Usando patrones regex en todo el documento...')
      
      for (const { concepto, patron } of PATTERNS.conceptosPatrones) {
        const conceptoMatch = text.match(patron)
        if (conceptoMatch) {
          result.concepto = concepto
          result.extractedFields.push('concepto')
          console.log('✅ Concepto encontrado (fallback regex):', concepto)
          console.log('📍 Match encontrado:', conceptoMatch[0])
          break
        } else {
          console.log(`   ❌ Patrón "${patron}" no encontrado para "${concepto}"`)
        }
      }
      
      if (!result.concepto) {
        console.log('❌ No se pudo extraer concepto con ningún método')
      }
    }

    // CRITERIO 4: GENERACIÓN DE DESCRIPCIÓN (Combinando 3 partes) ✅
    console.log('4️⃣ Generando descripción completa...')
    
    // PARTE 1: Línea completa que contiene "CUENTA DE COBRO"
    console.log('📋 Parte 1: Buscando línea "CUENTA DE COBRO"...')
    const lineaCuentaCobroMatch = text.match(/^.*CUENTA\s+DE\s+COBRO.*$/gim)
    let parte1 = ''
    
    if (lineaCuentaCobroMatch && lineaCuentaCobroMatch[0]) {
      parte1 = lineaCuentaCobroMatch[0].trim()
      console.log('✅ Parte 1 encontrada:', parte1)
    } else {
      console.log('❌ Parte 1 no encontrada')
    }
    
    // PARTE 2: El párrafo COMPLETO que comienza con "Por concepto de" (basado en contenido, NO por longitud)
    console.log('📋 Parte 2: Extrayendo párrafo COMPLETO "Por concepto de" basado en su contenido natural...')
    let parte2 = ''
    
    // MÉTODO 1: Buscar línea por línea para encontrar la que comienza con "Por concepto de"
    const lineas = text.split('\n')
    for (let i = 0; i < lineas.length; i++) {
      const lineaLimpia = lineas[i].trim()
      if (lineaLimpia.toLowerCase().startsWith('por concepto de')) {
        console.log('🎯 Línea inicial encontrada:', lineaLimpia)
        let parrafoCompleto = lineaLimpia
        
        // Si la línea no termina con : o . , buscar continuación en líneas siguientes
        if (!lineaLimpia.endsWith(':') && !lineaLimpia.endsWith('.')) {
          console.log('📝 Línea no terminada, buscando continuación...')
          
          // Buscar en líneas siguientes hasta encontrar el final del párrafo
          for (let j = i + 1; j < lineas.length; j++) {
            const siguienteLinea = lineas[j].trim()
            
            // Si la línea está vacía, parar
            if (!siguienteLinea) {
              console.log('📋 Línea vacía encontrada - fin del párrafo')
              break
            }
            
            // Si la línea siguiente empieza con mayúscula (nueva sección), parar
            if (siguienteLinea.match(/^[A-ZÁÉÍÓÚÑ][a-z]/)) {
              console.log('📋 Nueva sección detectada - fin del párrafo')
              break
            }
            
            // Agregar la línea al párrafo
            parrafoCompleto += ' ' + siguienteLinea
            console.log(`📎 Línea ${j + 1} agregada:`, siguienteLinea)
            
            // Si esta línea termina con : o . , parar
            if (siguienteLinea.endsWith(':') || siguienteLinea.endsWith('.')) {
              console.log('🎯 Final del párrafo encontrado')
              break
            }
          }
        }
        
        parte2 = parrafoCompleto
        console.log('✅ Parte 2 encontrada (párrafo completo):', parte2)
        break
      }
    }
    
    // MÉTODO 2: Fallback con patrón regex para capturar párrafo "Por concepto de" (multi-línea si es necesario)
    if (!parte2) {
      console.log('🔍 Fallback: Buscando párrafo "Por concepto de" con regex multi-línea...')
      const patterns = [
        // Patrón 1: Párrafo completo hasta dos puntos (captura TODO el contenido)
        /Por\s+concepto\s+de[\s\S]*?:/gi,
        // Patrón 2: Párrafo completo hasta punto final (captura TODO el contenido)  
        /Por\s+concepto\s+de[\s\S]*?\./gi,
        // Patrón 3: Hasta final de línea (sin limitaciones artificiales)
        /Por\s+concepto\s+de[^\n\r]*/i
      ]
      
      for (const pattern of patterns) {
        const match = text.match(pattern)
        if (match && match[0]) {
          parte2 = match[0].trim()
          console.log('✅ Parte 2 encontrada (fallback):', parte2)
          break
        }
      }
      
      if (!parte2) {
        console.log('❌ Parte 2 no encontrada con ningún método')
      }
    }
    
    // PARTE 3: ELIMINADA por solicitud del usuario
    console.log('📋 Parte 3: Eliminada - Solo se usarán Parte 1 y Parte 2')
    let parte3 = '' // Se mantiene vacía intencionalmente
    
    // CONSTRUIR DESCRIPCIÓN FINAL combinando las 2 partes (Parte 3 eliminada)
    console.log('🔨 Construyendo descripción final...')
    
    if (parte1 || parte2) {
      let descripcionFinal = []
      
      // Agregar cada parte que exista
      if (parte1) {
        descripcionFinal.push(parte1)
        console.log('✅ Añadida Parte 1 (CUENTA DE COBRO)')
      }
      
      if (parte2) {
        descripcionFinal.push(parte2)
        console.log('✅ Añadida Parte 2 (Por concepto de)')
      }
      
      // Combinar con saltos de línea dobles
      result.descripcion = descripcionFinal.join('\n\n').trim()
      result.extractedFields.push('descripcion')
      
      console.log(`✅ Descripción generada con ${descripcionFinal.length} partes (Parte 3 eliminada)`)
      console.log('📄 Descripción final completa:', result.descripcion)
    } else {
      console.log('❌ No se pudo generar descripción - ninguna parte encontrada')
    }

    // CRITERIO 5: EXTRACCIÓN DE VALOR SOLICITUD (Total sin IVA) ✅
    console.log('5️⃣ Extrayendo valor de solicitud...')
    
    // Buscar específicamente "Total" (primera letra mayúscula, resto minúscula)
    console.log('📋 Buscando patrón "Total" (mayúscula inicial)...')
    const totalPatronEspecifico = /(?:^|[\s\n\r])Total\s*\$?\s*([\d,\.]+)/gm
    const totalMatches = Array.from(text.matchAll(totalPatronEspecifico))
    console.log(`📊 Matches de "Total" encontrados: ${totalMatches.length}`)
    
    let valoresEncontrados: number[] = []
    
    if (totalMatches.length > 0) {
      for (let i = 0; i < totalMatches.length; i++) {
        const match = totalMatches[i]
        console.log(`🔍 Match ${i+1}: "${match[0].replace(/[\r\n]/g, ' ').trim()}"`)
        
        if (match[1]) {
          console.log(`💰 Valor crudo encontrado: "${match[1]}"`)
          
          // Aplicar limpieza de formato colombiano
          const valorLimpio = cleanNumericValue(match[1])
          const valorNum = parseFloat(valorLimpio)
          console.log(`🧮 Después de limpiar: "${match[1]}" -> "${valorLimpio}" -> ${valorNum}`)
          
          // Validación: El valor debe ser > 0
          if (valorNum > 0) {
            valoresEncontrados.push(valorNum)
            console.log(`✅ Valor válido agregado: $${Math.round(valorNum).toLocaleString('es-CO')}`)
            } else {
            console.log(`❌ Valor inválido (≤ 0): ${valorNum}`)
          }
        }
      }
    }
    
    // Selección: Si hay múltiples matches, tomar el valor más grande
    if (valoresEncontrados.length > 0) {
      const valorMaximo = Math.max(...valoresEncontrados)
      result.valorSolicitud = Math.round(valorMaximo) // Número entero redondeado
      result.extractedFields.push('valorSolicitud')
      
      console.log(`🎯 Seleccionado valor más grande de ${valoresEncontrados.length} encontrados:`)
      console.log(`💸 Valores encontrados: ${valoresEncontrados.map(v => `$${Math.round(v).toLocaleString('es-CO')}`).join(', ')}`)
      console.log(`✅ Valor Solicitud final: $${result.valorSolicitud.toLocaleString('es-CO')}`)
    } else {
      console.log('❌ No se encontraron valores válidos después de "Total"')
    }

    // CRITERIO 6: EXTRACCIÓN DE IVA - NUEVA LÓGICA ESPECÍFICA ✅
    console.log('6️⃣ Extrayendo valor del IVA usando patrón específico...')
    
    // PATRÓN ESPECÍFICO: Buscar exactamente "IVA (19%)" seguido del valor
    // Ejemplo del documento: "IVA (19%)                $ 1,104,885,787"
    // El patrón capturará: 1,104,885,787
    console.log('🔍 Buscando patrón exacto: "IVA (19%)" seguido del valor monetario')
    
  // DIAGNÓSTICO SIMPLIFICADO
  console.log('🔍 === ANÁLISIS INICIAL DEL PDF ===')
  console.log(`📄 Longitud total del texto: ${text.length} caracteres`)
  console.log('================================================')
  
  // DIAGNÓSTICO ESPECÍFICO: Mostrar líneas exactas que contienen "Total" y "IVA"
  console.log('🔍 === DIAGNÓSTICO DE LÍNEAS CRÍTICAS ===')
  const lineasTexto = text.split('\n')
  lineasTexto.forEach((linea, index) => {
    const lineaTrim = linea.trim()
    if (lineaTrim.includes('Total') || lineaTrim.includes('IVA') || lineaTrim.includes('TOTAL')) {
      console.log(`📍 Línea ${index + 1}: "${linea}"`)
      console.log(`   🔤 Caracteres: [${Array.from(linea).map(c => `${c.charCodeAt(0)}`).join(', ')}]`)
      console.log(`   📏 Longitud: ${linea.length} caracteres`)
    }
  })
  console.log('=================================================')
    
    // NUEVA ESTRATEGIA BASADA EN CONTEXTO: 
    // El IVA está entre la línea "Total" (primera letra mayúscula) y "TOTAL" (todo mayúsculas)
    console.log('🎯 Nueva estrategia: Buscar IVA entre líneas "Total" y "TOTAL"')
    
    const todasLasLineas = text.split('\n')
    console.log(`📄 Total de líneas en el documento: ${todasLasLineas.length}`)
    
    // PASO 1: Encontrar índices de las líneas "Total" y "TOTAL"
    let indiceTotal = -1    // Línea con "Total" (primera mayúscula)
    let indiceTOTAL = -1    // Línea con "TOTAL" (todo mayúsculas)
    
    for (let i = 0; i < todasLasLineas.length; i++) {
      const linea = todasLasLineas[i].trim()
      
      // Buscar "Total" (primera letra mayúscula, resto minúsculas)
      if (linea.includes('Total') && !linea.includes('TOTAL')) {
        indiceTotal = i
        console.log(`📍 Línea "Total" encontrada en índice ${i}: "${linea}"`)
      }
      
      // Buscar "TOTAL" (todo mayúsculas)
      if (linea.includes('TOTAL')) {
        indiceTOTAL = i
        console.log(`📍 Línea "TOTAL" encontrada en índice ${i}: "${linea}"`)
      }
    }
    
    console.log(`📊 Rangos encontrados: Total=${indiceTotal}, TOTAL=${indiceTOTAL}`)
    
    let valorIVAEncontrado: number | null = null
    let lineaEncontrada = -1
    let patronExitoso = -1
    
    // PASO 2: Si encontramos ambas líneas, buscar IVA en el rango entre ellas
    if (indiceTotal !== -1 && indiceTOTAL !== -1 && indiceTotal < indiceTOTAL) {
      console.log(`🔍 Buscando IVA entre líneas ${indiceTotal + 1} y ${indiceTOTAL + 1}`)
      
      // PATRONES ESPECÍFICOS para una línea que contenga IVA (19%)
      const patronesIVALinea = [
        // Patrón 1: IVA (19%) seguido del valor
        /IVA\s*\(19%\)\s*\$?\s*([\d,\.]+)/i,
        
        // Patrón 2: Con espacios no-breaking 
        /IVA[\s\u00A0]*\(19%\)[\s\u00A0]*\$?[\s\u00A0]*([\d,\.]+)/i,
        
        // Patrón 3: Con tabs y espacios múltiples
        /IVA[\s\t]*\(19%\)[\s\t]*\$?[\s\t]*([\d,\.]+)/i,
        
        // Patrón 4: Muy flexible para caracteres especiales
        /IVA[^0-9A-Za-z]*\(19%\)[^0-9A-Za-z]*\$?[^0-9]*([\d,\.]+)/i,
        
        // Patrón 5: Buscar número grande después de IVA (19%)
        /IVA.*\(19%\).*?([\d,\.]{7,})/i
      ]
      
    // Buscar IVA solo en el rango entre "Total" y "TOTAL"
    for (let i = indiceTotal + 1; i < indiceTOTAL; i++) {
      const linea = todasLasLineas[i]
      console.log(`🔍 Revisando línea ${i + 1} en rango: "${linea.trim()}"`)
      
      // NUEVA ESTRATEGIA: Buscar "IVA (19%)" y luego el valor en líneas siguientes
      if (linea.includes('IVA') && linea.includes('19%')) {
        console.log(`   💡 Línea contiene "IVA (19%)", buscando valor...`)
        
        // MÉTODO 1: Intentar extraer valor de la misma línea (casos donde sí está junto)
        for (let j = 0; j < patronesIVALinea.length; j++) {
          const patron = patronesIVALinea[j]
          const match = linea.match(patron)
          
          console.log(`   🧪 Patrón ${j + 1} (misma línea):`, match ? `MATCH: "${match[0]}"` : 'Sin coincidencias')
          
          if (match && match[1]) {
            console.log(`      💰 Valor extraído de misma línea: "${match[1]}"`)
            
            // Limpiar y convertir el valor numérico
            const valorLimpio = cleanNumericValue(match[1])
            const valorNum = parseFloat(valorLimpio)
            
            console.log(`      📊 Valor limpio: "${valorLimpio}" -> ${valorNum}`)
            
            // Validar que sea un número válido y mayor a 0
            if (!isNaN(valorNum) && valorNum > 0) {
              valorIVAEncontrado = Math.round(valorNum)
              lineaEncontrada = i + 1
              patronExitoso = j + 1
              
              console.log(`      ✅ VALOR IVA ENCONTRADO (misma línea): $${valorIVAEncontrado.toLocaleString('es-CO')}`)
              console.log(`      📋 Línea: ${lineaEncontrada}, Patrón: ${patronExitoso}`)
              
              // Salir de bucles - encontramos el valor
              break
            }
          }
        }
        
        // MÉTODO 2: Si no se encontró en la misma línea, buscar en líneas siguientes
        if (!valorIVAEncontrado) {
          console.log(`   🔍 No encontrado en misma línea, buscando en líneas siguientes...`)
          
          // Buscar en las siguientes 3 líneas máximo
          for (let lineaSiguiente = i + 1; lineaSiguiente <= Math.min(i + 3, indiceTOTAL - 1); lineaSiguiente++) {
            const lineaValor = todasLasLineas[lineaSiguiente]
            console.log(`      📍 Revisando línea siguiente ${lineaSiguiente + 1}: "${lineaValor.trim()}"`)
            
            // Patrones para buscar solo valores monetarios
            const patronesValorSolo = [
              /\$\s*([\d,\.]+)/i,                    // $ seguido de número
              /^\s*([\d,\.]{5,})\s*$/i,              // Solo números (mínimo 5 dígitos)
              /^\s*\$?\s*([\d,\.]{5,})\s*$/i,       // Opcional $ seguido de números
            ]
            
            for (let k = 0; k < patronesValorSolo.length; k++) {
              const patronValor = patronesValorSolo[k]
              const matchValor = lineaValor.match(patronValor)
              
              console.log(`         🧪 Patrón valor ${k + 1}:`, matchValor ? `MATCH: "${matchValor[0]}"` : 'Sin coincidencias')
              
              if (matchValor && matchValor[1]) {
                console.log(`         💰 Valor extraído de línea siguiente: "${matchValor[1]}"`)
                
                // Limpiar y convertir el valor numérico
                const valorLimpio = cleanNumericValue(matchValor[1])
                const valorNum = parseFloat(valorLimpio)
                
                console.log(`         📊 Valor limpio: "${valorLimpio}" -> ${valorNum}`)
                
                // Validar que sea un número válido y mayor a 0
                if (!isNaN(valorNum) && valorNum > 0) {
                  valorIVAEncontrado = Math.round(valorNum)
                  lineaEncontrada = lineaSiguiente + 1
                  patronExitoso = k + 1
                  
                  console.log(`         ✅ VALOR IVA ENCONTRADO (línea siguiente): $${valorIVAEncontrado.toLocaleString('es-CO')}`)
                  console.log(`         📋 IVA en línea ${i + 1}, Valor en línea ${lineaEncontrada}, Patrón: ${patronExitoso}`)
                  
                  // Salir de todos los bucles
                  break
                }
              }
            }
            
            // Si encontramos valor, salir del bucle de líneas siguientes
            if (valorIVAEncontrado) {
              break
            }
          }
        }
        
        // MÉTODO 3: Si no se encontró adelante, buscar en líneas anteriores (NUEVO)
        if (!valorIVAEncontrado) {
          console.log(`   🔍 No encontrado adelante, buscando en líneas ANTERIORES...`)
          
          // Buscar en las 3 líneas anteriores máximo
          for (let lineaAnterior = Math.max(indiceTotal + 1, i - 3); lineaAnterior < i; lineaAnterior++) {
            const lineaValor = todasLasLineas[lineaAnterior]
            console.log(`      📍 Revisando línea anterior ${lineaAnterior + 1}: "${lineaValor.trim()}"`)
            
            // Patrones para buscar solo valores monetarios
            const patronesValorSolo = [
              /\$\s*([\d,\.]+)/i,                    // $ seguido de número
              /^\s*([\d,\.]{3,})\s*$/i,              // Solo números (mínimo 3 dígitos para $24,585)
              /^\s*\$?\s*([\d,\.]{3,})\s*$/i,       // Opcional $ seguido de números
              /([\d,\.]{3,})\s*$/i,                 // Número al final de línea
            ]
            
            for (let k = 0; k < patronesValorSolo.length; k++) {
              const patronValor = patronesValorSolo[k]
              const matchValor = lineaValor.match(patronValor)
              
              console.log(`         🧪 Patrón anterior ${k + 1}:`, matchValor ? `MATCH: "${matchValor[0]}"` : 'Sin coincidencias')
              
              if (matchValor && matchValor[1]) {
                console.log(`         💰 Valor extraído de línea anterior: "${matchValor[1]}"`)
                
                // Limpiar y convertir el valor numérico
                const valorLimpio = cleanNumericValue(matchValor[1])
                const valorNum = parseFloat(valorLimpio)
                
                console.log(`         📊 Valor limpio: "${valorLimpio}" -> ${valorNum}`)
                
                // Validar que sea un número válido y mayor a 0, pero no demasiado grande
                if (!isNaN(valorNum) && valorNum > 0 && valorNum < 100000000) {
                  valorIVAEncontrado = Math.round(valorNum)
                  lineaEncontrada = lineaAnterior + 1
                  patronExitoso = k + 1
                  
                  console.log(`         ✅ VALOR IVA ENCONTRADO (línea anterior): $${valorIVAEncontrado.toLocaleString('es-CO')}`)
                  console.log(`         📋 Valor en línea ${lineaEncontrada}, IVA en línea ${i + 1}, Patrón: ${patronExitoso}`)
                  
                  // Salir de todos los bucles
                  break
                }
              }
            }
            
            // Si encontramos valor, salir del bucle de líneas anteriores
            if (valorIVAEncontrado) {
              break
            }
          }
        }
        
        // Si encontramos valor (cualquier método), salir del bucle principal
        if (valorIVAEncontrado) {
          break
        }
      }
    }
  } else {
      console.log('❌ No se encontraron las líneas "Total" y "TOTAL" para definir el rango')
      console.log('🔍 Mostrando primeras 15 líneas para diagnóstico:')
      todasLasLineas.slice(0, 15).forEach((linea, index) => {
        console.log(`  ${(index + 1).toString().padStart(2, '0')}: "${linea.trim()}"`)
      })
    }
    
    // RESULTADO FINAL
    if (valorIVAEncontrado) {
      console.log(`🏆 ÉXITO FINAL: Valor IVA extraído = $${valorIVAEncontrado.toLocaleString('es-CO')}`)
      console.log(`📋 Encontrado en línea ${lineaEncontrada} usando patrón ${patronExitoso}`)
    } else {
      console.log('❌ No se pudo extraer el valor del IVA de ninguna línea')
      
      // DIAGNÓSTICO: Mostrar líneas que contienen IVA pero no 19%
      console.log('🔍 === DIAGNÓSTICO: LÍNEAS CON SOLO "IVA" ===')
      const lineasSoloIVA = todasLasLineas.filter(linea => linea.toLowerCase().includes('iva'))
      if (lineasSoloIVA.length > 0) {
        console.log(`📄 Encontradas ${lineasSoloIVA.length} líneas con "IVA":`)
        lineasSoloIVA.forEach((linea, index) => {
          console.log(`  ${index + 1}. "${linea.trim()}"`)
        })
      } else {
        console.log('📄 No se encontraron líneas con "IVA" en el documento')
        console.log('🔍 Mostrando primeras 10 líneas del PDF:')
        todasLasLineas.slice(0, 10).forEach((linea, index) => {
          console.log(`    ${(index + 1).toString().padStart(2, '0')}: "${linea.trim()}"`)
        })
      }
      console.log('=============================================')
      
      // MÉTODO 4: BÚSQUEDA GLOBAL DE VALORES IVA (NUEVO)
      console.log('🌍 === MÉTODO 4: BÚSQUEDA GLOBAL DE IVA EN TODO EL DOCUMENTO ===')
      console.log('💡 El valor del IVA puede estar fuera del rango Total-TOTAL')
      
      // Buscar valores que puedan ser IVA en todo el documento
      const patronesIVAGlobal = [
        /\$\s*([\d,\.]+)/g,                    // Todos los valores con $
        /^\s*([\d,\.]{5,})\s*$/gm,             // Números solos de 5+ dígitos
      ]
      
      const valoresEncontrados = []
      
      for (let p = 0; p < patronesIVAGlobal.length; p++) {
        const patron = patronesIVAGlobal[p]
        const matches = Array.from(text.matchAll(patron))
        
        console.log(`🔍 Patrón global ${p + 1}: ${matches.length} valores encontrados`)
        
        matches.forEach((match, index) => {
          const valorBruto = match[1]
          const valorLimpio = cleanNumericValue(valorBruto)
          const valorNum = parseFloat(valorLimpio)
          
          console.log(`   💰 Valor ${index + 1}: "${match[0]}" → limpio: ${valorLimpio} → número: ${valorNum}`)
          
          // Filtrar valores que puedan ser IVA (solo mayor a 0)
          if (!isNaN(valorNum) && valorNum > 0) {
            // Calcular si es aproximadamente 19% del valor solicitud
            const valorSolicitudNum = result.valorSolicitud || 0
            const ivaEsperado = valorSolicitudNum * 0.19
            const diferencia = Math.abs(valorNum - ivaEsperado)
            const porcentajeDiferencia = ivaEsperado > 0 ? diferencia / ivaEsperado * 100 : 100
            
            console.log(`      📊 Verificando si ${valorNum} es IVA de ${valorSolicitudNum}:`)
            console.log(`      🧮 IVA esperado (19%): ${Math.round(ivaEsperado)}`)
            console.log(`      📈 Diferencia: ${Math.round(diferencia)} (${porcentajeDiferencia.toFixed(1)}%)`)
            
            valoresEncontrados.push({
              valor: valorNum,
              diferencia: diferencia,
              porcentaje: porcentajeDiferencia,
              match: match[0]
            })
          }
        })
      }
      
      // Ordenar por menor diferencia con el IVA esperado
      valoresEncontrados.sort((a, b) => a.diferencia - b.diferencia)
      
      console.log(`📋 Valores candidatos a IVA encontrados: ${valoresEncontrados.length}`)
      
      if (valoresEncontrados.length > 0) {
        const mejorCandidato = valoresEncontrados[0]
        
        // Aceptar el mejor candidato (cualquier valor > 0)
        valorIVAEncontrado = Math.round(mejorCandidato.valor)
        console.log(`🏆 MEJOR CANDIDATO ENCONTRADO: $${valorIVAEncontrado.toLocaleString('es-CO')}`)
        console.log(`📊 Match original: "${mejorCandidato.match}"`)
        console.log(`📈 Diferencia con IVA esperado: ${mejorCandidato.porcentaje.toFixed(1)}%`)
        console.log(`✅ ACEPTADO: Cualquier valor > 0 es válido como IVA`)
      }
      
      console.log('================================================================')
    }
    
    // ASIGNACIÓN FINAL: Configurar resultado basado en si se encontró IVA
    if (valorIVAEncontrado !== null && valorIVAEncontrado > 0) {
      result.tieneIVA = true
      result.valorIVA = valorIVAEncontrado
      result.extractedFields.push('tieneIVA')
      result.extractedFields.push('valorIVA')
      
      console.log(`✅ RESULTADO IVA FINAL: tieneIVA=true, valorIVA=$${result.valorIVA ? result.valorIVA.toLocaleString('es-CO') : 'N/A'}`)
      console.log('🎯 ¡El IVA será enviado al frontend!')
    } else {
      result.tieneIVA = false
      result.valorIVA = null
      console.log('❌ RESULTADO IVA FINAL: tieneIVA=false, valorIVA=null')
      console.log('⚠️ NO se encontró patrón "IVA (19%)" válido')
    }

    // CRITERIO 7: EXTRACCIÓN DE TOTAL SOLICITUD (Valor total final con IVA incluido) ✅
    console.log('7️⃣ Extrayendo valor total de la solicitud...')
    
    // NUEVA LÓGICA MEJORADA: Buscar específicamente líneas que contengan "TOTAL" en mayúsculas
    console.log('🔍 Buscando líneas que contengan exactamente "TOTAL" (todo en mayúsculas)...')
    
    // Dividir el texto en líneas y buscar las que contienen "TOTAL"
    const lineasTotal = text.split('\n').filter(linea => linea.includes('TOTAL'))
    console.log(`📊 Líneas que contienen "TOTAL" encontradas: ${lineasTotal.length}`)
    
    let valoresTotalEncontrados: number[] = []
    
    if (lineasTotal.length > 0) {
      console.log('📋 Analizando líneas con "TOTAL":')
      
      lineasTotal.forEach((linea, index) => {
        console.log(`  ${index + 1}. "${linea.trim()}"`)
        
        // PATRONES ESPECÍFICOS para extraer valor después de "TOTAL"
        const patronesTotalEspecificos = [
          // Patrón 1: TOTAL $ 123,456,789
          /\bTOTAL\s*\$\s*([\d,\.]+)/i,
          // Patrón 2: TOTAL: $ 123,456,789
          /\bTOTAL:\s*\$\s*([\d,\.]+)/i,
          // Patrón 3: TOTAL 123,456,789 (sin $)
          /\bTOTAL\s+([\d,\.]+)/i,
          // Patrón 4: TOTAL: 123,456,789 (sin $)
          /\bTOTAL:\s+([\d,\.]+)/i,
          // Patrón 5: Solo TOTAL seguido de espacios y número
          /\bTOTAL\s*:?\s*\$?\s*([\d,\.]{4,})/i
        ]
        
        let valorEncontradoEnLinea: number | null = null
        
        for (let i = 0; i < patronesTotalEspecificos.length; i++) {
          const patron = patronesTotalEspecificos[i]
          const match = linea.match(patron)
          
          if (match && match[1]) {
            console.log(`    🔍 Patrón ${i + 1} encontró: "${match[0]}"`)
            
            const valorLimpio = cleanNumericValue(match[1])
            const valorNum = parseFloat(valorLimpio)
            
            console.log(`    📊 Valor extraído: "${match[1]}" -> ${valorNum}`)
            
            // VALIDACIÓN: El valor debe ser > 1000 (valores significativos)
            if (valorNum > 1000) {
              valorEncontradoEnLinea = valorNum
              console.log(`    ⭐ Valor TOTAL válido encontrado: $${Math.round(valorNum).toLocaleString('es-CO')}`)
              break // Salir del loop, ya encontramos un valor válido
            } else {
              console.log(`    ❌ Valor muy pequeño (≤ 1000): ${valorNum}`)
            }
          }
        }
        
        if (valorEncontradoEnLinea) {
          valoresTotalEncontrados.push(valorEncontradoEnLinea)
          console.log(`    ✅ Valor TOTAL final para esta línea: $${Math.round(valorEncontradoEnLinea).toLocaleString('es-CO')}`)
        } else {
          console.log(`    ❌ No se encontró valor TOTAL válido en esta línea`)
        }
      })
    } else {
      console.log('❌ No se encontraron líneas que contengan "TOTAL"')
    }
    
    // Selección: Si hay múltiples matches, tomar el valor más grande
    if (valoresTotalEncontrados.length > 0) {
      const valorMaximoTotal = Math.max(...valoresTotalEncontrados)
      result.valorTotalSolicitud = Math.round(valorMaximoTotal) // Número entero redondeado
      result.extractedFields.push('valorTotalSolicitud')
      
      console.log(`🎯 Seleccionado valor TOTAL más grande de ${valoresTotalEncontrados.length} encontrados:`)
      console.log(`💸 Valores TOTAL encontrados: ${valoresTotalEncontrados.map(v => `$${Math.round(v).toLocaleString('es-CO')}`).join(', ')}`)
      console.log(`✅ Valor Total Solicitud final: $${result.valorTotalSolicitud.toLocaleString('es-CO')}`)
    } else {
      console.log('❌ No se encontraron valores de TOTAL válidos')
      
      // FALLBACK: Calcular como suma si no se encuentra TOTAL directo
      console.log('🔄 Usando fallback: calculando como Valor Solicitud + Valor IVA...')
      if (result.valorSolicitud !== null) {
        const valorBase = result.valorSolicitud
        const valorIVA = result.valorIVA || 0
        result.valorTotalSolicitud = valorBase + valorIVA
        result.extractedFields.push('valorTotalSolicitud')
        console.log(`✅ Valor Total Solicitud calculado (fallback): $${result.valorTotalSolicitud.toLocaleString('es-CO')}`)
      }
    }
    
    // Calcular confianza basada en campos extraídos
    const fieldsCount = result.extractedFields.length
    if (fieldsCount >= 5) {
      result.confidence = 'high'
    } else if (fieldsCount >= 3) {
      result.confidence = 'medium'
    } else {
      result.confidence = 'low'
    }

    console.log(`✅ === EXTRACCIÓN COMPLETADA ===`)
    console.log(`📊 Campos extraídos (${fieldsCount}): ${result.extractedFields.join(', ')}`)
    console.log(`📈 Confianza: ${result.confidence}`)
    
  // RESUMEN FINAL DE TODOS LOS VALORES QUE SE ENVÍAN AL FRONTEND
  console.log('🚀 === DATOS QUE SE ENVÍAN AL FRONTEND ===')
  console.log(`  📅 fechaCuentaCobro: ${result.fechaCuentaCobro}`)
  console.log(`  🏢 companiaReceptora: ${result.companiaReceptora}`)
  console.log(`  👤 acreedor: ${result.acreedor}`)
  console.log(`  📝 concepto: ${result.concepto}`)
  console.log(`  📄 descripcion: ${result.descripcion ? result.descripcion.substring(0, 100) + '...' : null}`)
  console.log(`  💰 valorSolicitud: ${result.valorSolicitud}`)
  console.log(`  ✅ tieneIVA: ${result.tieneIVA}`)
  console.log(`  💸 valorIVA: ${result.valorIVA}`)
  console.log(`  🧾 valorTotalSolicitud: ${result.valorTotalSolicitud}`)
  console.log('================================================')
  
  // LOGS CRÍTICOS PARA DEBUGGING DEL PROBLEMA DE DESCONEXIÓN
  console.log('🔥 === RESPUESTA HTTP QUE SE ENVÍA AL FRONTEND ===')
  console.log('🎯 TIMESTAMP:', new Date().toISOString())
  console.log('📦 JSON RESPONSE:', JSON.stringify(result, null, 2))
  console.log('💥 SI ESTE LOG NO APARECE EN EL FRONTEND, HAY PROBLEMA DE CACHÉ')
  console.log('=======================================================')
    
  } catch (error) {
    console.error('❌ Error durante extracción:', error)
    result.success = false
    result.confidence = 'low'
  }

  return result
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Configurar formidable para parsear archivos
    const form = formidable({
      maxFiles: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB máximo
      keepExtensions: true,
    })

    // Parsear la request
    const [fields, files] = await form.parse(req)
    
    const fileArray = files.pdf
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ 
        error: 'No se encontró archivo PDF para procesar' 
      })
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray

    // Validar que sea PDF
    if (file.mimetype !== 'application/pdf') {
      return res.status(400).json({ 
        error: 'El archivo debe ser un PDF válido' 
      })
    }

    console.log('🔍 Procesando PDF para extracción de datos:', file.originalFilename)

    // Leer el archivo PDF
    const fileBuffer = fs.readFileSync(file.filepath)
    
    // Extraer texto del PDF
    const pdfData = await pdfParse(fileBuffer)
    const extractedText = pdfData.text

    console.log('📄 Texto extraído del PDF (primeros 500 chars):', extractedText.substring(0, 500))
    console.log('📄 Texto completo para análisis:', extractedText.length > 500 ? '...(texto más largo, buscando IVA en todo el contenido)' : extractedText)

    // Procesar el texto y extraer datos estructurados
    const extractedData = extractDataFromText(extractedText)

    console.log('✨ Datos extraídos:', {
      fields: extractedData.extractedFields,
      confidence: extractedData.confidence,
      success: extractedData.success,
      valorTotalSolicitud: extractedData.valorTotalSolicitud
    })

    // Limpiar archivo temporal
    fs.unlinkSync(file.filepath)

    // Responder con los datos extraídos
    res.status(200).json(extractedData)

  } catch (error) {
    console.error('Error en extract-pdf-data API:', error)
    res.status(500).json({ 
      error: 'Error procesando el archivo PDF',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
