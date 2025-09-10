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
  
  // 4. IVA (respetando "IVA" o "Iva" exacto)
  ivaEspecifico: /(?:^|\n|\s)(?:IVA|Iva)(?:\s*\([0-9]+%?\))?\s*(?:\n|\s)*\$?\s*([\d,\.]+)/g,
  
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
    
    // Extraer la sección después de "DEBE A:" hasta "Por concepto de"
    const seccionAcreedorMatch = text.match(/DEBE\s+A:\s*(.*?)(?:Por\s+concepto\s+de|$)/i)
    let seccionAcreedor = seccionAcreedorMatch ? seccionAcreedorMatch[1] : ''
    
    console.log('📋 Analizando sección acreedor después de "DEBE A:":', seccionAcreedor.substring(0, 200).replace(/\s+/g, ' '))
    
    // Base de datos de acreedores disponibles
    const acreedoresDisponibles = [
      {
        nit: '8600343137',
        nitFormateado: '860.034.313-7',
        nombre: 'DAVIVIENDA S.A.',
        codigo: 'NT-860034313-7-DAVIVIENDA S.A.',
        palabrasClave: ['davivienda']
      },
      {
        nit: '8600025032',
        nitFormateado: '860.002.503-2',
        nombre: 'COMPAÑÍA SEGUROS BOLÍVAR S.A.',
        codigo: 'NT-860002503-2-COMPAÑÍA SEGUROS BOLÍVAR S.A.',
        palabrasClave: ['compañía', 'seguros', 'bolivar', 'bolívar']
      },
      {
        nit: '8300254487',
        nitFormateado: '830.025.448-7',
        nombre: 'GRUPO BOLÍVAR S.A.',
        codigo: 'NT-830025448-7-GRUPO BOLÍVAR S.A.',
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
      const acreedorMatch = text.match(PATTERNS.acreedor)
      if (acreedorMatch && acreedorMatch[1]) {
        const nombreExtraido = acreedorMatch[1]
          .replace(/nit[\s\.].*$/gi, '') // Remover NIT si está en la misma línea
          .trim()
        
        // Crear resultado básico sin NIT específico
        result.acreedor = nombreExtraido
        result.extractedFields.push('acreedor')
        console.log('✅ Acreedor extraído (fallback):', result.acreedor)
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
        nit: '8600025032',
        nitFormateado: '860.002.503-2', 
        nombre: 'COMPAÑÍA SEGUROS BOLÍVAR S.A.',
        codigo: 'NT-860002503-2-COMPAÑÍA SEGUROS BOLÍVAR S.A.',
        palabrasClave: ['compañia', 'compañía', 'seguros', 'bolivar', 'bolívar']
      },
      {
        nit: '8600343137',
        nitFormateado: '860.034.313-7',
        nombre: 'DAVIVIENDA S.A.',
        codigo: 'NT-860034313-7-DAVIVIENDA S.A.',
        palabrasClave: ['davivienda', 'banco']
      },
      {
        nit: '8300254487',
        nitFormateado: '830.025.448-7',
        nombre: 'GRUPO BOLÍVAR S.A.',
        codigo: 'NT-830025448-7-GRUPO BOLÍVAR S.A.',
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
    
    // PARTE 2: Párrafo completo que inicia con "Por concepto de"
    console.log('📋 Parte 2: Buscando párrafo "Por concepto de"...')
    let parte2 = ''
    
    // Usar los mismos patrones que usamos para extraer concepto
    const parrafoPatternsDescripcion = [
      // Párrafo completo hasta dos puntos (:)
      /Por\s+concepto\s+de\s+([^:]+:?)/gi,
      // Párrafo hasta salto de línea doble o final
      /Por\s+concepto\s+de\s+([^\n\r]+(?:\n[^\n\r]+)*?)(?:\n\s*\n|$)/gi,
      // Párrafo hasta encontrar una línea que empiece con mayúscula (nueva sección)
      /Por\s+concepto\s+de\s+(.*?)(?=\n[A-ZÁÉÍÓÚÑ]|$)/gi,
      // Fallback simple para una sola línea
      /Por\s+concepto\s+de\s*([^\n\r]+)/gi
    ]
    
    for (const pattern of parrafoPatternsDescripcion) {
      const match = text.match(pattern)
      if (match && match[0]) {
        parte2 = match[0].trim()
        console.log('✅ Parte 2 encontrada:', parte2.substring(0, 100) + '...')
        break
      }
    }
    
    if (!parte2) {
      console.log('❌ Parte 2 no encontrada')
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
      console.log('📄 Descripción final (primeros 200 chars):', result.descripcion.substring(0, 200) + '...')
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

    // CRITERIO 6: EXTRACCIÓN DE IVA (Valor específico del PDF) ✅
    console.log('6️⃣ Extrayendo valor del IVA...')
    
    // Buscar líneas que contengan "IVA" con valores monetarios
    console.log('📋 Buscando líneas que contengan "IVA"...')
    const ivaPatronEspecifico = /(?:^|[\s\n\r])IVA(?:\s*\([0-9]+%?\))?\s*\$?\s*([\d,\.]+)/gim
    const ivaMatches = Array.from(text.matchAll(ivaPatronEspecifico))
    console.log(`📊 Matches de "IVA" encontrados: ${ivaMatches.length}`)
    
    let valoresIvaEncontrados: number[] = []
    
    if (ivaMatches.length > 0) {
      for (let i = 0; i < ivaMatches.length; i++) {
        const match = ivaMatches[i]
        console.log(`🔍 Match ${i+1}: "${match[0].replace(/[\r\n]/g, ' ').trim()}"`)
        
        if (match[1]) {
          console.log(`💰 Valor crudo encontrado: "${match[1]}"`)
          
          // Aplicar limpieza de formato colombiano
          const valorLimpio = cleanNumericValue(match[1])
          const valorNum = parseFloat(valorLimpio)
          console.log(`🧮 Después de limpiar: "${match[1]}" -> "${valorLimpio}" -> ${valorNum}`)
          
          // Validación: El valor debe ser > 0
          if (valorNum > 0) { // Solo acepta valores mayores a cero
            valoresIvaEncontrados.push(valorNum)
            console.log(`✅ Valor IVA válido agregado: $${Math.round(valorNum).toLocaleString('es-CO')}`)
          } else {
            console.log(`❌ Valor inválido (≤ 0): ${valorNum}`)
          }
        }
      }
    }

    // Selección: Si hay múltiples matches, tomar el valor más grande
    let ivaFinalEncontrado: number | null = null
    
    if (valoresIvaEncontrados.length > 0) {
      const valorMaximoIva = Math.max(...valoresIvaEncontrados)
      ivaFinalEncontrado = Math.round(valorMaximoIva) // Número entero redondeado
      
      console.log(`🎯 Seleccionado valor IVA más grande de ${valoresIvaEncontrados.length} encontrados:`)
      console.log(`💸 Valores IVA encontrados: ${valoresIvaEncontrados.map(v => `$${Math.round(v).toLocaleString('es-CO')}`).join(', ')}`)
      console.log(`✅ Valor IVA final: $${ivaFinalEncontrado.toLocaleString('es-CO')}`)
    } else {
      console.log('❌ No se encontraron valores de IVA válidos')
    }
    
    // ASIGNACIÓN FINAL: Si el valor del IVA es mayor a cero, tieneIVA = true, sino tieneIVA = false
    if (ivaFinalEncontrado !== null && ivaFinalEncontrado > 0) {
      result.tieneIVA = true  // "S" en el formulario
      result.valorIVA = ivaFinalEncontrado
      result.extractedFields.push('tieneIVA')
      result.extractedFields.push('valorIVA')
      console.log(`✅ RESULTADO IVA: tieneIVA=true, valorIVA=$${result.valorIVA.toLocaleString('es-CO')}`)
    } else {
      result.tieneIVA = false // "N" en el formulario
      result.valorIVA = null
      console.log('✅ RESULTADO IVA: tieneIVA=false, valorIVA=null')
    }

    // CRITERIO 7: EXTRACCIÓN DE TOTAL SOLICITUD (Valor total final con IVA incluido) ✅
    console.log('7️⃣ Extrayendo valor total de la solicitud...')
    
    // Buscar específicamente "TOTAL" (todo en mayúsculas)
    console.log('📋 Buscando patrón "TOTAL" (todo en mayúsculas)...')
    
    // Múltiples patrones para diferentes formatos
    const totalPatrones = [
      // 1. TOTAL $X,XXX,XXX
      /(?:^|[\s\n\r])TOTAL\s*\$?\s*([\d,\.]+)/gm,
      // 2. TOTAL: $X,XXX,XXX  
      /(?:^|[\s\n\r])TOTAL:\s*\$?\s*([\d,\.]+)/gm,
      // 3. TOTAL $X,XXX,XXX (espacios múltiples)
      /(?:^|[\s\n\r])TOTAL\s+\$?\s*([\d,\.]+)/gm,
      // 4. ^TOTAL $X,XXX,XXX (inicio de línea)
      /^TOTAL\s*\$?\s*([\d,\.]+)/gm
    ]
    
    let valoresTotalEncontrados: number[] = []
    
    for (let i = 0; i < totalPatrones.length; i++) {
      const patron = totalPatrones[i]
      const matches = Array.from(text.matchAll(patron))
      
      console.log(`📊 Patrón ${i+1} encontró ${matches.length} matches`)
      
      if (matches.length > 0) {
        for (let j = 0; j < matches.length; j++) {
          const match = matches[j]
          console.log(`🔍 Patrón ${i+1}, Match ${j+1}: "${match[0].replace(/[\r\n]/g, ' ').trim()}"`)
          
          if (match[1]) {
            console.log(`💰 Valor crudo encontrado: "${match[1]}"`)
            
            // Aplicar limpieza de formato colombiano
            const valorLimpio = cleanNumericValue(match[1])
            const valorNum = parseFloat(valorLimpio)
            console.log(`🧮 Después de limpiar: "${match[1]}" -> "${valorLimpio}" -> ${valorNum}`)
            
            // Validación: El valor debe ser > 0
            if (valorNum > 0) {
              valoresTotalEncontrados.push(valorNum)
              console.log(`✅ Valor TOTAL válido agregado: $${Math.round(valorNum).toLocaleString('es-CO')}`)
            } else {
              console.log(`❌ Valor inválido (≤ 0): ${valorNum}`)
            }
          }
        }
      }
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
