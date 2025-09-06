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

// Interfaces para los datos extraídos
interface ExtractedData {
  acreedor?: string
  concepto?: string
  descripcion?: string
  valorSolicitud?: string
  tieneIVA?: boolean
  ivaEspecifico?: string  // Valor específico de IVA extraído del PDF
  proveedor?: string
  numeroFactura?: string
  fechaFactura?: string
  success: boolean
  confidence: 'high' | 'medium' | 'low'
  extractedFields: string[]
  rawText?: string
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
  
  // 4. IVA (respetando "IVA" o "Iva" exacto)
  ivaEspecifico: /(?:^|\n|\s)(?:IVA|Iva)(?:\s*\([0-9]+%?\))?\s*(?:\n|\s)*\$?\s*([\d,\.]+)/g,
  
  // 5. NÚMEROS DE FACTURA
  numeroFactura: /(?:factura|cuenta de cobro|factura no|cuenta no|no)[\s\:\.]*([0-9\-A-Z]{3,20})/gi,
  
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

function extractDataFromText(text: string): ExtractedData {
  const result: ExtractedData = {
    success: true,
    confidence: 'low',
    extractedFields: []
  }

  try {
    console.log('🔍 === NUEVA LÓGICA DE EXTRACCIÓN SEGÚN CRITERIOS ===')
    
    // CRITERIO 1: Acreedor (ya funciona bien) ✅
    console.log('1️⃣ Extrayendo acreedor...')
    const acreedorMatch = text.match(PATTERNS.acreedor)
    if (acreedorMatch && acreedorMatch[1]) {
      result.acreedor = acreedorMatch[1]
        .replace(/nit[\s\.].*$/gi, '') // Remover NIT si está en la misma línea
        .trim()
      result.extractedFields.push('acreedor')
      console.log('✅ Acreedor extraído:', result.acreedor)
    }

    // Encontrar dónde termina el acreedor para extraer el "cuerpo" después
    let cuerpoTexto = text
    if (acreedorMatch) {
      const posicionAcreedor = text.indexOf(acreedorMatch[0])
      if (posicionAcreedor !== -1) {
        cuerpoTexto = text.substring(posicionAcreedor + acreedorMatch[0].length)
        console.log('📝 Cuerpo extraído (primeros 200 chars):', cuerpoTexto.substring(0, 200))
      }
    }

    // CRITERIO 2: Buscar concepto en el cuerpo vs listado de conceptos
    console.log('2️⃣ Buscando concepto en el cuerpo del documento...')
    for (const { concepto, patron } of PATTERNS.conceptosPatrones) {
      const conceptoMatch = cuerpoTexto.match(patron)
      if (conceptoMatch) {
        result.concepto = concepto
        result.extractedFields.push('concepto')
        console.log('✅ Concepto encontrado:', concepto)
        break
      }
    }

    // CRITERIO 3: Descripción = renglón completo "CUENTA DE COBRO" + texto del concepto
    console.log('3️⃣ Generando descripción...')
    
    // Buscar la línea completa que comienza con "CUENTA DE COBRO"
    const lineaCuentaCobroMatch = text.match(/^.*CUENTA\s+DE\s+COBRO.*$/gim)
    let primeraLinea = ''
    
    if (lineaCuentaCobroMatch && lineaCuentaCobroMatch[0]) {
      primeraLinea = lineaCuentaCobroMatch[0].trim()
      console.log('✅ Primera línea de descripción:', primeraLinea)
    }
    
    // NUEVA LÓGICA: Extraer 3 partes separadas para la descripción
    
    // PARTE 2: Buscar la línea específica que empieza con "Por concepto de"
    let lineaPorConcepto = ''
    const lineaConceptoMatch = text.match(/^.*Por\s+concepto\s+de[^\n\r]*$/gim)
    if (lineaConceptoMatch && lineaConceptoMatch[0]) {
      lineaPorConcepto = lineaConceptoMatch[0].trim()
      console.log('✅ Línea "Por concepto de" encontrada:', lineaPorConcepto.substring(0, 100) + '...')
    }
    
    // PARTE 3: Buscar todo el contenido DESPUÉS de la línea "Por concepto de" hasta "Total"
    let contenidoDespues = ''
    if (lineaPorConcepto) {
      console.log('🔍 DEBUG: lineaPorConcepto encontrada:', lineaPorConcepto.substring(0, 80) + '...')
      
      // Encontrar la posición donde termina la línea "Por concepto de"
      const indexFinConcepto = text.indexOf(lineaPorConcepto) + lineaPorConcepto.length
      const textoRestante = text.substring(indexFinConcepto)
      console.log('🔍 DEBUG: Texto restante después de lineaPorConcepto (primeros 200 chars):', textoRestante.substring(0, 200))
      
      // Extraer desde ahí hasta "Cordialmente" o hasta el final si no encuentra patrón de fin
      const contenidoMatch = textoRestante.match(/[\s\S]*?(?=Cordialmente|$)/i)
      console.log('🔍 DEBUG: contenidoMatch encontrado?', contenidoMatch ? 'SÍ' : 'NO')
      if (contenidoMatch && contenidoMatch[0]) {
        console.log('🔍 DEBUG: contenidoMatch[0] crudo (primeros 300 chars):', contenidoMatch[0].substring(0, 300))
        
        contenidoDespues = contenidoMatch[0]
          .replace(/[\r]+/g, '') // Eliminar \r
          .replace(/^.*NIT.*$/gim, '') // Eliminar líneas que contengan NIT
          // MANTENER valores numéricos para formato tabular
          .replace(/([A-Za-z][A-Za-z\s&\-0-9]+?)\s+([\d,\.]+)/gm, '$1\t\t\t\t\t$2') // Producto + TABS + Valor
          .replace(/\n\s*/g, '\n') // Limpiar espacios después de saltos
          .replace(/\n\s*\n/g, '\n') // Eliminar líneas vacías múltiples
          .trim()
        console.log('✅ Contenido después de "Por concepto de" hasta "Total" CON VALORES:', contenidoDespues.substring(0, 200) + '...')
      } else {
        console.log('❌ No se pudo extraer contenido después de "Por concepto de"')
      }
    }
    
    // Si no se encontró "Por concepto de", usar fallback con el cuerpo general
    let segundaLinea = ''
    if (!lineaPorConcepto && cuerpoTexto) {
      segundaLinea = cuerpoTexto
        .replace(/[\r]+/g, '')
        .replace(/^.*NIT.*$/gim, '')
        // MANTENER valores numéricos para formato tabular
        .replace(/([A-Za-z][A-Za-z\s&\-0-9]+?)\s+([\d,\.]+)/gm, '$1\t\t\t\t\t$2') // Producto + TABS + Valor
        .replace(/\n\s*/g, '\n')
        .replace(/\n\s*\n/g, '\n')
        .trim()
      console.log('✅ Usando cuerpo general como fallback SIN NIT PERO CON VALORES TABULADOS')
    }
    
    // CONSTRUIR DESCRIPCIÓN CON LAS 3 PARTES
    if (primeraLinea) {
      if (lineaPorConcepto && contenidoDespues) {
        // Caso ideal: tenemos las 3 partes
        result.descripcion = `${primeraLinea}\n${lineaPorConcepto}\n${contenidoDespues}`
        console.log('✅ Descripción construida con 3 partes separadas CON TABLA DE VALORES')
      } else if (lineaPorConcepto) {
        // Solo tenemos primera línea + línea "Por concepto de"
        result.descripcion = `${primeraLinea}\n${lineaPorConcepto}`
        console.log('✅ Descripción construida con 2 partes (falta tabla de productos)')
      } else if (segundaLinea) {
        // Fallback: usar el método anterior
        result.descripcion = `${primeraLinea}\n${segundaLinea}`
        console.log('✅ Descripción construida con fallback CON TABLA DE VALORES')
      } else {
        // Solo primera línea
        result.descripcion = primeraLinea
        console.log('✅ Descripción solo con primera línea')
      }
      result.extractedFields.push('descripcion')
    }

    // CRITERIO 4: Vr.Solicitud = valor después de "Total" (respetando mayúsculas)
    console.log('4️⃣ Buscando valor después de "Total"...')
    const totalMatches = Array.from(text.matchAll(PATTERNS.totalEspecifico))
    console.log(`📋 Matches de "Total": ${totalMatches.length}`)
    
    if (totalMatches.length > 0) {
      for (const match of totalMatches) {
        console.log('🔍 Match "Total" encontrado:', match[0].replace(/[\r\n]/g, ' '))
        if (match[1]) {
          const valorLimpio = cleanNumericValue(match[1])
          const valorNum = parseFloat(valorLimpio)
          console.log('💰 Valor extraído después de "Total":', match[1], '->', valorNum)
          
          if (valorNum > 1000) { // Valor razonable
            result.valorSolicitud = Math.round(valorNum).toString()
            result.extractedFields.push('valorSolicitud')
            console.log('✅ Valor Solicitud asignado:', result.valorSolicitud)
            break
          }
        }
      }
    }

    // CRITERIO 5: IVA = valor después de "IVA"/"Iva" + marcar check + recalcular
    console.log('5️⃣ Buscando valor después de "IVA"/"Iva"...')
    
    // Buscar patrones específicos de IVA
    const ivaMatches = Array.from(text.matchAll(PATTERNS.ivaEspecifico))
    console.log(`📋 Matches directos de "IVA": ${ivaMatches.length}`)
    
    let ivaEncontrado: number | null = null
    
    if (ivaMatches.length > 0) {
      for (const match of ivaMatches) {
        console.log('🔍 Match "IVA" encontrado:', match[0].replace(/[\r\n]/g, ' '))
        if (match[1]) {
          const ivaLimpio = cleanNumericValue(match[1])
          const ivaNum = parseFloat(ivaLimpio)
          console.log('💰 Valor IVA extraído después de "IVA":', match[1], '->', ivaNum)
          
          if (ivaNum > 1000) { // Valor IVA razonable
            // Tomar el valor más grande encontrado
            if (ivaEncontrado === null || ivaNum > ivaEncontrado) {
              ivaEncontrado = ivaNum
              console.log('✅ Nuevo IVA específico seleccionado:', ivaEncontrado)
            }
          }
        }
      }
    }

    // Si no se encontró IVA directamente, buscar por análisis del contexto
    if (ivaEncontrado === null && result.valorSolicitud) {
      console.log('🔍 No se encontró IVA directamente, buscando por análisis de contexto...')
      const valorBase = parseFloat(result.valorSolicitud)
      const ivaEsperado = valorBase * 0.19 // 19% esperado
      
      // Buscar todos los números significativos en el texto
      const numerosEnTexto = text.match(/\$?\s*([\d,\.]{6,})/g) || [] // Mínimo 6 dígitos
      console.log('🔢 Números encontrados en el texto:', numerosEnTexto.length)
      
      for (const numeroTexto of numerosEnTexto) {
        const numeroLimpio = cleanNumericValue(numeroTexto)
        const numero = parseFloat(numeroLimpio)
        
        if (numero > 100000 && numero !== valorBase) { // Evitar el valor base mismo
          const diferencia = Math.abs(numero - ivaEsperado)
          const porcentajeDiferencia = diferencia / ivaEsperado
          
          // Si está dentro del 20% del IVA esperado (más tolerante)
          if (porcentajeDiferencia < 0.20) {
            console.log(`🎯 IVA encontrado por contexto: ${numeroTexto} -> ${numero} (esperado: ${ivaEsperado.toFixed(0)})`)
            ivaEncontrado = numero
            break
          }
        }
      }
    }

    if (ivaEncontrado !== null) {
      result.tieneIVA = true
      result.ivaEspecifico = Math.round(ivaEncontrado).toString()
      result.extractedFields.push('tieneIVA')
      result.extractedFields.push('ivaEspecifico')
      console.log('✅ IVA específico encontrado:', result.ivaEspecifico)
    } else {
      console.log('❌ No se pudo extraer valor de IVA')
    }

    // 6. Extraer número de factura/cuenta
    const facturaMatch = text.match(PATTERNS.numeroFactura)
    if (facturaMatch) {
      result.numeroFactura = facturaMatch[1].trim()
      result.extractedFields.push('numeroFactura')
      console.log('✅ Número de factura:', result.numeroFactura)
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
      success: extractedData.success
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
