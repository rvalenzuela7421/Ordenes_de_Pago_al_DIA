"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getEmpresasGrupoBolivar, type EmpresaGrupoBolivar, getIVAVigente } from '@/lib/parametros-data'
import Link from 'next/link'

// Usando EmpresaGrupoBolivar de parametros-data.ts

const ACREEDORES = [
  { value: 'NT-860034313-DAVIVIENDA S.A.', label: 'NT-860034313-DAVIVIENDA S.A.' }
]

const CONCEPTOS = [
  { value: 'Convenio de uso de red', label: 'Convenio de uso de red' },
  { value: 'Reconocimiento y pago de comisiones por recaudo Leasing', label: 'Reconocimiento y pago de comisiones por recaudo Leasing' },
  { value: 'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing', label: 'Reconocimiento y pago de comisiones por recaudo Vida Deudores Leasing' },
  { value: 'Costo de recaudo TRC', label: 'Costo de recaudo TRC' },
  { value: 'Referenciación de clientes', label: 'Referenciación de clientes' },
  { value: 'Bono cumplimiento penetraciones seguros voluntarios', label: 'Bono cumplimiento penetraciones seguros voluntarios' },
  { value: 'Retornos títulos de capitalización GanaMás', label: 'Retornos títulos de capitalización GanaMás' }
]

interface FormData {
  fechaCuentaCobro: string
  proveedor: string
  acreedor: string
  concepto: string
  descripcion: string
  valorSolicitud: string
  tieneIVA: boolean
  iva: string
  totalSolicitud: string
}

interface IVAVigente {
  concepto: string
  porcentaje: number
  descripcion: string
  vigencia_desde: string | null
  vigencia_hasta: string | null
  observaciones: string
}

export default function NuevaSolicitudPage() {
  const [empresasGrupoBolivar, setEmpresasGrupoBolivar] = useState<EmpresaGrupoBolivar[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  
  const [formData, setFormData] = useState<FormData>({
    fechaCuentaCobro: '',
    proveedor: '', // Usuario debe seleccionar
    acreedor: '', // Usuario debe seleccionar
    concepto: '',
    descripcion: '',
    valorSolicitud: '',
    tieneIVA: false,
    iva: '',
    totalSolicitud: ''
  })
  
  const [archivoPDF, setArchivoPDF] = useState<File | null>(null)
  const [archivoXLSX, setArchivoXLSX] = useState<File | null>(null)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [fileUrls, setFileUrls] = useState<{pdf?: string, xlsx?: string}>({})
  const [loading, setLoading] = useState(false)
  const [loadingIVA, setLoadingIVA] = useState(true)
  const [extractingPDFData, setExtractingPDFData] = useState(false)
  const [pdfDataExtracted, setPdfDataExtracted] = useState(false)
  const [extractionConfidence, setExtractionConfidence] = useState<'high' | 'medium' | 'low' | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [numeroSolicitudCreada, setNumeroSolicitudCreada] = useState<string>('')
  const [ivaVigente, setIVAVigente] = useState<IVAVigente | null>(null)
  const [showPDFExtractionDialog, setShowPDFExtractionDialog] = useState(false)
  const [pendingPDFFile, setPendingPDFFile] = useState<File | null>(null)
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [extractedData, setExtractedData] = useState<any>(null)
  const router = useRouter()

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarIVAVigente()
    cargarEmpresasGrupoBolivar()
  }, [])

  // Cargar IVA vigente desde tabla parametros
  const cargarIVAVigente = async () => {
    try {
      setLoadingIVA(true)
      console.log('💰 Cargando IVA vigente desde parámetros...')
      
      const { iva, error } = await getIVAVigente()
      
      if (error) {
        console.warn('⚠️ Error al cargar IVA desde parámetros:', error)
      }
      
      const porcentajeIVA = iva / 100 // Convertir de 19 a 0.19
      
      setIVAVigente({
        concepto: 'IVA',
        porcentaje: porcentajeIVA,
        descripcion: `IVA ${iva}% ${error ? '(fallback)' : '(desde parámetros)'}`,
        vigencia_desde: null,
        vigencia_hasta: null,
        observaciones: error ? 'Valor por defecto por error' : 'Obtenido de tabla parametros'
      })
      
      console.log('✅ IVA vigente configurado:', `${iva}%`)
      
    } catch (error) {
      console.error('💥 Error inesperado cargando IVA vigente:', error)
      // Fallback completo en caso de error
      setIVAVigente({
        concepto: 'IVA',
        porcentaje: 0.19,
        descripcion: 'IVA 19% (fallback completo)',
        vigencia_desde: null,
        vigencia_hasta: null,
        observaciones: 'Error completo al cargar datos'
      })
    } finally {
      setLoadingIVA(false)
    }
  }

  // Cargar empresas del Grupo Bolívar desde tabla parametros
  const cargarEmpresasGrupoBolivar = async () => {
    try {
      setLoadingEmpresas(true)
      console.log('🏢 Cargando empresas del Grupo Bolívar desde parámetros...')
      
      const { empresas, count, error } = await getEmpresasGrupoBolivar(true)
      
      if (error) {
        console.error('❌ Error al cargar empresas del Grupo Bolívar:', error)
        throw new Error(error)
      }
      
      if (empresas && empresas.length > 0) {
        setEmpresasGrupoBolivar(empresas)
        console.log('✅ Empresas del Grupo Bolívar cargadas:', count)
        console.log('📋 Usuario debe seleccionar compañía receptora')
        
      } else {
        console.error('❌ No se encontraron empresas del Grupo Bolívar en la base de datos')
        setEmpresasGrupoBolivar([])
        // No establecer proveedor por defecto - el usuario debe seleccionar
      }
    } catch (error) {
      console.error('💥 Error inesperado cargando empresas del Grupo Bolívar:', error)
      setEmpresasGrupoBolivar([])
      // No usar fallbacks - mostrar error real al usuario
    } finally {
      setLoadingEmpresas(false)
    }
  }

  // Calcular automáticamente IVA y total
  const calcularIVAyTotal = (valor: string, tieneIVA: boolean) => {
    const valorNum = parseFloat(valor) || 0
    const porcentajeIVA = ivaVigente?.porcentaje || 0
    const ivaCalculado = tieneIVA ? valorNum * porcentajeIVA : 0
    const total = valorNum + ivaCalculado
    
    return {
      iva: ivaCalculado.toString(),
      total: total.toString()
    }
  }

  const handleValorChange = (value: string) => {
    // Permitir solo números
    const sanitized = value.replace(/[^0-9]/g, '')
    setFormData(prev => {
      const { iva, total } = calcularIVAyTotal(sanitized, prev.tieneIVA)
      return {
        ...prev,
        valorSolicitud: sanitized,
        iva,
        totalSolicitud: total
      }
    })
  }

  const handleIVAToggle = (checked: boolean) => {
    setFormData(prev => {
      const { iva, total } = calcularIVAyTotal(prev.valorSolicitud, checked)
      return {
        ...prev,
        tieneIVA: checked,
        iva,
        totalSolicitud: total
      }
    })
  }

  // Función para extraer datos del PDF
  const extractPDFData = async (file: File) => {
    try {
      setExtractingPDFData(true)
      const formData = new FormData()
      formData.append('pdf', file)

      console.log('🔍 Extrayendo datos del PDF:', file.name)

      const response = await fetch('/api/extract-pdf-data', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error extrayendo datos del PDF')
      }

      console.log('✨ Datos extraídos:', data)

      // Mostrar modal de validación antes de aplicar los datos
      if (data.success && data.extractedFields.length > 0) {
        console.log('📋 Datos extraídos recibidos - mostrando modal de validación')
        setExtractedData(data)
        setShowValidationModal(true)
        setPdfDataExtracted(true)
        setExtractionConfidence(data.confidence)
      } else {
        console.log('ℹ️ No se pudieron extraer datos útiles del PDF')
      }

    } catch (error) {
      console.error('Error extrayendo datos del PDF:', error)
      setErrors(prev => ({ 
        ...prev, 
        pdfExtraction: 'No se pudieron extraer datos del PDF. Puede continuar llenando los campos manualmente.' 
      }))
    } finally {
      setExtractingPDFData(false)
    }
  }

  // Función para aplicar los datos validados al formulario
  const applyExtractedDataToForm = (data: any) => {
    console.log('✅ Aplicando datos validados al formulario')
    
    setFormData(prev => {
          const newFormData = { ...prev }
          
          // ✨ USAR NUEVA ESTRUCTURA ORGANIZADA SI ESTÁ DISPONIBLE
          if (data.newSolicitud) {
            console.log('✨ Usando nueva estructura organizada newSolicitud')
            const solicitud = data.newSolicitud
            
            // 1. Fecha Cuenta de Cobro (convertir de DD-MM-YYYY a YYYY-MM-DD)
            if (solicitud.fechaCuentaCobro) {
              // Convertir formato DD-MM-YYYY a YYYY-MM-DD para input date HTML
              const fechaParts = solicitud.fechaCuentaCobro.split('-')
              if (fechaParts.length === 3) {
                const fechaFormatoHTML = `${fechaParts[2]}-${fechaParts[1]}-${fechaParts[0]}` // YYYY-MM-DD
                newFormData.fechaCuentaCobro = fechaFormatoHTML
                console.log('✨ Fecha Cuenta de Cobro convertida:', `${solicitud.fechaCuentaCobro} → ${fechaFormatoHTML}`)
              } else {
                // Fallback si el formato no es el esperado
                newFormData.fechaCuentaCobro = solicitud.fechaCuentaCobro
                console.log('⚠️ Fecha Cuenta de Cobro (formato no esperado):', solicitud.fechaCuentaCobro)
              }
            }
            
            // 2. Compañía Receptora
            if (solicitud.companiaReceptora) {
              newFormData.proveedor = solicitud.companiaReceptora
              console.log('✨ Compañía Receptora auto-seleccionada:', solicitud.companiaReceptora)
            }
            
            // 3. Acreedor  
            if (solicitud.acreedor) {
              newFormData.acreedor = solicitud.acreedor
              console.log('✨ Acreedor auto-seleccionado:', solicitud.acreedor)
            }
            
            // 6. Concepto
            if (solicitud.concepto) {
              newFormData.concepto = solicitud.concepto
              console.log('✨ Concepto auto-seleccionado:', solicitud.concepto)
            }
            
            // 7. Descripción
            if (solicitud.descripcion) {
              newFormData.descripcion = solicitud.descripcion
              console.log('✨ Descripción generada automáticamente')
            }
            
            // 4. Valor de Solicitud + 5. IVA
            if (solicitud.valorSolicitud && solicitud.valorSolicitud > 0) {
              newFormData.valorSolicitud = solicitud.valorSolicitud.toString()
              newFormData.tieneIVA = solicitud.tieneIVA || false
              
              console.log('✨ Valor Solicitud extraído:', solicitud.valorSolicitud)
              console.log('✨ Tiene IVA:', solicitud.tieneIVA)
              
              // Calcular IVA y total basado en lo extraído
              if (solicitud.tieneIVA) {
                // Si hay un valor específico de IVA extraído del PDF, usarlo
                if (data.ivaEspecifico) {
                  const ivaEspecifico = parseFloat(data.ivaEspecifico)
                  newFormData.iva = Math.round(ivaEspecifico).toString()
                  newFormData.totalSolicitud = (solicitud.valorSolicitud + ivaEspecifico).toString()
                  console.log(`✨ Usando IVA específico del PDF: $${Math.round(ivaEspecifico)}`)
                } else {
                  // Calcular IVA automáticamente
                  const { iva, total } = calcularIVAyTotal(newFormData.valorSolicitud, true)
                  newFormData.iva = iva
                  newFormData.totalSolicitud = total
                  console.log('✨ IVA calculado automáticamente')
                }
              } else {
                // Sin IVA
                const { iva, total } = calcularIVAyTotal(newFormData.valorSolicitud, false)
                newFormData.iva = iva
                newFormData.totalSolicitud = total
                console.log('✨ Sin IVA - total igual al valor base')
              }
            }
            
          } else {
            // 🔄 USAR ESTRUCTURA LEGACY PARA COMPATIBILIDAD
            console.log('🔄 Usando estructura legacy por compatibilidad')
            
            // Poblar compañía receptora si se detectó automáticamente
            if (data.proveedor) {
              newFormData.proveedor = data.proveedor
              console.log('✨ Compañía Receptora auto-seleccionada (legacy):', data.proveedor)
            }
            
            // Poblar acreedor si se detectó
            if (data.acreedor) {
              newFormData.acreedor = data.acreedor
            }
            
            // Poblar concepto si se detectó
            if (data.concepto) {
              newFormData.concepto = data.concepto
            }
            
            // Poblar descripción si se generó
            if (data.descripcion) {
              newFormData.descripcion = data.descripcion
            }
            
            // Poblar valor si se detectó
            if (data.valorSolicitud) {
              const valorNum = parseFloat(data.valorSolicitud)
              if (valorNum > 0) {
                newFormData.valorSolicitud = Math.round(valorNum).toString()
                
                // Si se detectó IVA, marcarlo y usar valor específico si está disponible
                if (data.tieneIVA) {
                  newFormData.tieneIVA = true
                  
                  // Si hay un valor específico de IVA extraído del PDF, usarlo
                  if (data.ivaEspecifico) {
                    const ivaEspecifico = parseFloat(data.ivaEspecifico)
                    newFormData.iva = Math.round(ivaEspecifico).toString()
                    newFormData.totalSolicitud = (valorNum + ivaEspecifico).toString()
                    console.log(`✨ Usando IVA específico del PDF (legacy): $${Math.round(ivaEspecifico)}`)
                  } else {
                    // Calcular IVA automáticamente si no se encontró valor específico
                    const { iva, total } = calcularIVAyTotal(newFormData.valorSolicitud, true)
                    newFormData.iva = iva
                    newFormData.totalSolicitud = total
                  }
                } else {
                  // Sin IVA - calcular total solo con valor base
                  const { iva, total } = calcularIVAyTotal(newFormData.valorSolicitud, false)
                  newFormData.iva = iva
                  newFormData.totalSolicitud = total
                }
              }
            }
          }
          
          return newFormData
        })

        // Mostrar mensaje de éxito
        const fieldsCount = data.extractedFields.length
        console.log(`✅ Se aplicaron ${fieldsCount} campos validados al formulario con confianza ${data.confidence}`)
  }

  // Función para confirmar y aplicar los datos extraídos
  const handleConfirmExtractedData = () => {
    if (extractedData) {
      applyExtractedDataToForm(extractedData)
      setShowValidationModal(false)
      setExtractedData(null)
      console.log('✅ Datos validados aplicados al formulario')
    }
  }

  // Función para rechazar los datos extraídos
  const handleRejectExtractedData = () => {
    setShowValidationModal(false)
    setExtractedData(null)
    setPdfDataExtracted(false)
    setExtractionConfidence(null)
    console.log('❌ Datos extraídos rechazados - formulario sin cambios')
  }

  const handlePDFChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setArchivoPDF(file)
      setErrors(prev => ({ ...prev, archivoPDF: '', pdfExtraction: '' }))
      setPdfDataExtracted(false)
      setExtractionConfidence(null)
      
      // Guardar el archivo pendiente y mostrar diálogo de confirmación
      setPendingPDFFile(file)
      setShowPDFExtractionDialog(true)
    } else {
      setErrors(prev => ({ ...prev, archivoPDF: 'Solo se permiten archivos PDF' }))
    }
  }

  const handleXLSXChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.name.endsWith('.xlsx'))) {
      setArchivoXLSX(file)
      setErrors(prev => ({ ...prev, archivoXLSX: '' }))
    } else {
      setErrors(prev => ({ ...prev, archivoXLSX: 'Solo se permiten archivos XLSX' }))
    }
  }

  // Función para verificar si todos los campos obligatorios están completos
  const isFormComplete = () => {
    // Verificar compañía receptora y acreedor obligatorios
    if (!formData.proveedor.trim() || !formData.acreedor.trim()) return false
    
    // Verificar campos de texto obligatorios
    if (!formData.concepto.trim()) return false
    
    // Verificar valor solicitud
    const valor = parseFloat(formData.valorSolicitud)
    if (!formData.valorSolicitud || isNaN(valor) || valor <= 0) return false
    
    // Verificar archivo PDF obligatorio
    if (!archivoPDF) return false
    
    // Verificar archivo XLSX obligatorio (siempre requerido)
    if (!archivoXLSX) return false
    
    return true
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.proveedor.trim()) {
      newErrors.proveedor = 'La compañía receptora es requerida'
    }

    if (!formData.acreedor.trim()) {
      newErrors.acreedor = 'El acreedor es requerido'
    }

    if (!formData.concepto.trim()) {
      newErrors.concepto = 'El concepto es requerido'
    }

    const valor = parseFloat(formData.valorSolicitud)
    if (!formData.valorSolicitud || isNaN(valor) || valor <= 0) {
      newErrors.valorSolicitud = 'El valor debe ser un número mayor a 0'
    }

    // El IVA se calcula automáticamente, no necesita validación manual

    if (!archivoPDF) {
      newErrors.archivoPDF = 'Debe adjuntar la cuenta de cobro en PDF'
    }

    if (!archivoXLSX) {
      newErrors.archivoXLSX = 'Debe adjuntar el archivo de distribuciones en XLSX'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(value))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setShowConfirmation(true)
  }

  // Función para subir archivos al servidor
  const uploadFiles = async (): Promise<{success: boolean, urls?: {pdf?: string, xlsx?: string}, error?: string}> => {
    if (!archivoPDF && !archivoXLSX) {
      return { success: true, urls: {} }
    }

    try {
      setUploadingFiles(true)
      const formData = new FormData()

      if (archivoPDF) {
        formData.append('pdf', archivoPDF)
      }
      if (archivoXLSX) {
        formData.append('xlsx', archivoXLSX)
      }

      console.log('📤 Subiendo archivos al servidor...')

      const response = await fetch('/api/upload-files', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error subiendo archivos')
      }

      console.log('✅ Archivos subidos exitosamente:', data.files)
      setFileUrls(data.files)

      return { success: true, urls: data.files }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error subiendo archivos'
      console.error('❌ Error subiendo archivos:', errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setUploadingFiles(false)
    }
  }

  const handleSuccessConfirm = () => {
    setShowSuccess(false)
    router.push('/')
  }

  // Funciones para el diálogo de extracción de PDF
  const handleConfirmPDFExtraction = async () => {
    setShowPDFExtractionDialog(false)
    if (pendingPDFFile) {
      await extractPDFData(pendingPDFFile)
      setPendingPDFFile(null)
    }
  }

  const handleDeclinePDFExtraction = () => {
    setShowPDFExtractionDialog(false)
    setPendingPDFFile(null)
    // El archivo ya se guardó en setArchivoPDF, solo no extraemos los datos
  }

  const confirmSubmit = async () => {
    setLoading(true)
    setShowConfirmation(false)
    
    try {
      // Paso 1: Subir archivos al servidor
      const uploadResult = await uploadFiles()
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Error subiendo archivos')
      }

      // Obtener el token de autenticación actual
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('No hay sesión activa. Por favor, inicie sesión nuevamente.')
      }

      // Llamar a la API para guardar la solicitud
      const response = await fetch('/api/solicitudes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          companiaReceptora: formData.proveedor,
          acreedor: formData.acreedor,
          concepto: formData.concepto,
          descripcion: formData.descripcion,
          valorSolicitud: formData.valorSolicitud,
          tieneIVA: formData.tieneIVA,
          conceptoIVA: formData.tieneIVA ? 'IVA' : null,
          porcentajeIVA: ivaVigente?.porcentaje || 0,
          iva: formData.iva,
          totalSolicitud: formData.totalSolicitud,
          tieneDistribuciones: true, // Siempre true ya que el Excel es obligatorio
          archivos: {
            pdf_url: uploadResult.urls?.pdf || null,
            xlsx_url: uploadResult.urls?.xlsx || null,
            pdf_nombre: archivoPDF?.name || null,
            xlsx_nombre: archivoXLSX?.name || null
          },
          metadata: {
            impuestos: {
              tieneIVA: formData.tieneIVA,
              concepto: ivaVigente?.concepto,
              porcentaje: ivaVigente?.porcentaje,
              descripcion: ivaVigente?.descripcion,
              vigencia: {
                desde: ivaVigente?.vigencia_desde,
                hasta: ivaVigente?.vigencia_hasta
              }
            }
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error creando la solicitud')
      }
      
      // Mostrar modal de éxito con el número generado
      setNumeroSolicitudCreada(data.numero_solicitud)
      setShowSuccess(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado'
      setErrors({ general: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud de OP</h1>
            <p className="mt-1 text-sm text-gray-500">
              Registrar solicitud de generación de Orden de Pago - Área Tributaria
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Mensaje informativo sobre la nueva funcionalidad */}
        <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-green-800">✨ Nueva Funcionalidad: Extracción Automática de Datos</h4>
              <p className="text-sm text-green-700 mt-1">
                Al subir la cuenta de cobro en PDF, el sistema extraerá automáticamente la información y llenará los campos del formulario. 
                Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios.
              </p>
            </div>
          </div>
        </div>

        {/* Mensaje de error general */}
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Información Principal */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Información de la Solicitud
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fecha Cuenta de Cobro */}
            <div>
              <label htmlFor="fechaCuentaCobro" className="block text-sm font-medium text-gray-700 mb-2">
                📅 Fecha Cuenta de Cobro
              </label>
              <input
                type="date"
                id="fechaCuentaCobro"
                value={formData.fechaCuentaCobro}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaCuentaCobro: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-bolivar-green ${
                  errors.fechaCuentaCobro 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:border-bolivar-green'
                }`}
                max={(() => {
                  // Fecha actual en Colombia (UTC-5)
                  const ahora = new Date()
                  const colombiaTime = new Date(ahora.getTime() - (5 * 60 * 60 * 1000))
                  const año = colombiaTime.getFullYear()
                  const mes = String(colombiaTime.getMonth() + 1).padStart(2, '0')
                  const dia = String(colombiaTime.getDate()).padStart(2, '0')
                  return `${año}-${mes}-${dia}`
                })()} // No permitir fechas futuras (Colombia UTC-5)
              />
              <p className="mt-1 text-xs text-gray-500">
                {formData.fechaCuentaCobro && formData.fechaCuentaCobro.trim() ? 
                  (() => {
                    try {
                      // Crear fecha local sin conversión UTC para Colombia
                      const [año, mes, dia] = formData.fechaCuentaCobro.split('-')
                      const fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia))
                      return `✅ Fecha: ${fecha.toLocaleDateString('es-CO', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        timeZone: 'America/Bogota'
                      })}`
                    } catch (error) {
                      return `✅ Fecha: ${formData.fechaCuentaCobro}`
                    }
                  })() : 
                  'Fecha de la cuenta de cobro (extraída del PDF o ingresada manualmente)'
                }
              </p>
              {errors.fechaCuentaCobro && (
                <p className="mt-1 text-sm text-red-600">{errors.fechaCuentaCobro}</p>
              )}
            </div>

            {/* Proveedor */}
            <div>
              <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700 mb-2">
                Compañía Receptora *
              </label>
              <select
                id="proveedor"
                value={formData.proveedor}
                onChange={(e) => setFormData(prev => ({ ...prev, proveedor: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-bolivar-green ${
                  errors.proveedor 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:border-bolivar-green'
                }`}
                disabled={loadingEmpresas}
              >
                {loadingEmpresas ? (
                  <option value="">Cargando empresas del Grupo Bolívar...</option>
                ) : empresasGrupoBolivar.length === 0 ? (
                  <option value="">❌ No hay empresas disponibles - Verificar base de datos</option>
                ) : (
                  [
                    <option key="empty" value="">Seleccione una empresa</option>,
                    ...empresasGrupoBolivar.map((empresa) => (
                      <option key={empresa.id} value={empresa.valorCompleto}>
                        {empresa.nombre}
                      </option>
                    ))
                  ]
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {loadingEmpresas ? 'Cargando...' : 
                 empresasGrupoBolivar.length === 0 ? 
                 '⚠️ No hay empresas disponibles. Debe insertar datos en tabla parametros (grupo: GRUPO_BOLIVAR)' : 
                 `✅ ${empresasGrupoBolivar.length} empresas del Grupo Bolívar disponibles`}
              </p>
              {errors.proveedor && (
                <p className="mt-1 text-sm text-red-600">{errors.proveedor}</p>
              )}
            </div>

            {/* Acreedor */}
            <div>
              <label htmlFor="acreedor" className="block text-sm font-medium text-gray-700 mb-2">
                Acreedor *
              </label>
              <select
                id="acreedor"
                value={formData.acreedor}
                onChange={(e) => setFormData(prev => ({ ...prev, acreedor: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-bolivar-green ${
                  errors.acreedor 
                    ? 'border-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:border-bolivar-green'
                }`}
              >
                <option value="">Seleccione un acreedor</option>
                {ACREEDORES.map((acreedor) => (
                  <option key={acreedor.value} value={acreedor.value}>
                    {acreedor.label}
                  </option>
                ))}
              </select>
              {errors.acreedor && (
                <p className="mt-1 text-sm text-red-600">{errors.acreedor}</p>
              )}
            </div>

            {/* Concepto */}
            <div>
              <label htmlFor="concepto" className="block text-sm font-medium text-gray-700 mb-2">
                Concepto <span className="text-red-500">*</span>
              </label>
              <select
                id="concepto"
                value={formData.concepto}
                onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green ${
                  errors.concepto ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Seleccione un concepto</option>
                {CONCEPTOS.map((concepto) => (
                  <option key={concepto.value} value={concepto.value}>
                    {concepto.label}
                  </option>
                ))}
              </select>
              {errors.concepto && (
                <p className="mt-1 text-sm text-red-600">{errors.concepto}</p>
              )}
            </div>

            {/* Descripción */}
            <div className="col-span-2">
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="descripcion"
                rows={3}
                value={formData.descripcion}
                onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green resize-none ${
                  errors.descripcion ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Descripción detallada de la solicitud (opcional)..."
              />
              {errors.descripcion && (
                <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Agregue información adicional sobre esta solicitud</p>
            </div>
          </div>
        </div>

        {/* Información Financiera */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
            Valores Financieros
          </h2>
          
          {/* Campos financieros en una línea */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
            {/* Valor Solicitud */}
            <div>
              <label htmlFor="valorSolicitud" className="block text-sm font-medium text-gray-700 mb-2">
                Vr. Solicitud <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="valorSolicitud"
                  value={formData.valorSolicitud ? new Intl.NumberFormat('es-CO').format(parseInt(formData.valorSolicitud) || 0) : ''}
                  onChange={(e) => handleValorChange(e.target.value.replace(/[^0-9]/g, ''))}
                  className={`w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-bolivar-green focus:border-bolivar-green ${
                    errors.valorSolicitud ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1,000,000"
                />
              </div>
              {errors.valorSolicitud && (
                <p className="mt-1 text-sm text-red-600">{errors.valorSolicitud}</p>
              )}
            </div>

            {/* Tiene IVA */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiene IVA
              </label>
              <div className="flex items-center h-10">
                <input
                  id="tieneIVA"
                  type="checkbox"
                  checked={formData.tieneIVA}
                  onChange={(e) => handleIVAToggle(e.target.checked)}
                  className="focus:ring-bolivar-green h-4 w-4 text-bolivar-green border-gray-300 rounded mr-2"
                />
                <span className="text-sm text-gray-600">
                  {formData.tieneIVA ? '✓ Sí' : '✗ No'}
                </span>
              </div>
            </div>

            {/* IVA Calculado */}
            <div>
              <label htmlFor="iva" className="block text-sm font-medium text-gray-700 mb-2">
                Vr. IVA {ivaVigente && formData.tieneIVA ? `(${(ivaVigente.porcentaje * 100).toFixed(1)}%)` : ''}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="iva"
                                      value={formData.iva ? formatCurrency(parseFloat(formData.iva)) : '0'}
                  readOnly
                  className={`w-full pl-8 pr-3 py-2 border rounded-md shadow-sm ${
                    formData.tieneIVA 
                      ? 'bg-blue-50 border-blue-300 text-blue-900 font-medium' 
                      : 'bg-gray-100 border-gray-300 text-gray-600'
                  }`}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Total Solicitud */}
            <div>
              <label htmlFor="totalSolicitud" className="block text-sm font-medium text-gray-700 mb-2">
                Total Solicitud
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="totalSolicitud"
                  value={formData.totalSolicitud ? formatCurrency(parseFloat(formData.totalSolicitud)) : '0'}
                  readOnly
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md bg-bolivar-green-50 text-bolivar-green font-bold shadow-sm"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

        </div>


        {/* Anexos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
            <svg className="w-5 h-5 text-bolivar-green mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 00-2.828-2.828l-6.586 6.586a2 2 0 102.828 2.828l6.586-6.586a2 2 0 00-2.828-2.828z" />
            </svg>
            Anexos Requeridos
          </h2>
          
          <div className="space-y-6">
            {/* Cuenta de Cobro PDF */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cuenta de Cobro (PDF) <span className="text-red-500">*</span>
                <span className="ml-2 text-xs text-blue-600 font-normal">
                  ✨ Se extraerán datos automáticamente
                </span>
              </label>
              <div className="flex items-center justify-center w-full">
                <label htmlFor="pdf-upload" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${
                  errors.archivoPDF ? 'border-red-300 bg-red-50' : 
                  extractingPDFData ? 'border-blue-300 bg-blue-50' : 
                  pdfDataExtracted ? 'border-green-300 bg-green-50' : 
                  'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {extractingPDFData ? (
                      <>
                        <div className="w-8 h-8 mb-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="mb-2 text-sm text-blue-600 font-medium">
                          Extrayendo datos del PDF...
                        </p>
                        <p className="text-xs text-blue-500">Por favor espere</p>
                      </>
                    ) : pdfDataExtracted ? (
                      <>
                        <svg className="w-8 h-8 mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="mb-2 text-sm text-green-600 font-medium">
                          ¡Datos extraídos exitosamente!
                        </p>
                        <p className="text-xs text-green-500">
                          Confianza: {extractionConfidence === 'high' ? 'Alta' : 
                                     extractionConfidence === 'medium' ? 'Media' : 'Baja'}
                        </p>
                      </>
                    ) : (
                      <>
                        <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                          <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                        </svg>
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click para subir</span> o arrastra y suelta
                        </p>
                        <p className="text-xs text-gray-500">Solo archivos PDF - Extracción automática</p>
                      </>
                    )}
                  </div>
                  <input 
                    id="pdf-upload" 
                    type="file" 
                    accept=".pdf"
                    onChange={handlePDFChange}
                    className="hidden" 
                    disabled={extractingPDFData}
                  />
                </label>
              </div>
              
              {/* Status messages */}
              {archivoPDF && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Archivo seleccionado: {archivoPDF.name}
                  </p>
                  
                  {pdfDataExtracted && extractionConfidence && (
                    <div className={`p-3 rounded-lg border ${
                      extractionConfidence === 'high' ? 'bg-green-50 border-green-200' :
                      extractionConfidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}>
                      <p className={`text-sm font-medium ${
                        extractionConfidence === 'high' ? 'text-green-800' :
                        extractionConfidence === 'medium' ? 'text-yellow-800' :
                        'text-blue-800'
                      }`}>
                        {extractionConfidence === 'high' && '✅ Los campos se llenaron automáticamente con alta confianza'}
                        {extractionConfidence === 'medium' && '⚠️ Los campos se llenaron automáticamente. Verifique los datos'}
                        {extractionConfidence === 'low' && 'ℹ️ Se extrajeron algunos datos. Por favor, complete los campos faltantes'}
                        {/* Indicador adicional si se usó IVA específico */}
                        {pdfDataExtracted && formData.tieneIVA && formData.iva && (
                          <span className="block mt-1 text-xs">
                            💰 Se usó el valor de IVA específico del documento
                          </span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {errors.archivoPDF && (
                <p className="mt-1 text-sm text-red-600">{errors.archivoPDF}</p>
              )}
              {errors.pdfExtraction && (
                <p className="mt-1 text-sm text-orange-600">{errors.pdfExtraction}</p>
              )}
            </div>

            {/* Archivo de distribuciones XLSX - Siempre obligatorio */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Archivo de Distribuciones (XLSX) <span className="text-red-500">*</span>
                  <span className="ml-2 text-xs text-gray-500 font-normal">Requerido para todas las solicitudes</span>
                </label>
                <div className="flex items-center justify-center w-full">
                  <label htmlFor="xlsx-upload" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 ${
                    errors.archivoXLSX ? 'border-red-300 bg-red-50' : 'border-gray-300 bg-gray-50'
                  }`}>
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                      </svg>
                      <p className="mb-2 text-sm text-gray-500">
                        <span className="font-semibold">Click para subir</span> o arrastra y suelta
                      </p>
                      <p className="text-xs text-gray-500">Solo archivos XLSX</p>
                    </div>
                    <input 
                      id="xlsx-upload" 
                      type="file" 
                      accept=".xlsx"
                      onChange={handleXLSXChange}
                      className="hidden" 
                    />
                  </label>
                </div>
                {archivoXLSX && (
                  <p className="mt-2 text-sm text-green-600 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Archivo seleccionado: {archivoXLSX.name}
                  </p>
                )}
                {errors.archivoXLSX && (
                  <p className="mt-1 text-sm text-red-600">{errors.archivoXLSX}</p>
                )}
              </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <Link
            href="/dashboard"
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-offset-2 focus:ring-bolivar-green transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || uploadingFiles || !isFormComplete()}
            className="px-6 py-2 bg-bolivar-green text-white rounded-md hover:bg-bolivar-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-bolivar-green disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {uploadingFiles ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Subiendo archivos...</span>
              </div>
            ) : loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creando solicitud...</span>
              </div>
            ) : (
              'Crear Solicitud'
            )}
          </button>
        </div>
      </form>

      {/* Modal de confirmación */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Confirmar Solicitud
              </h3>
              <div className="text-sm text-gray-600 mb-6 space-y-2">
                <p><strong>Compañía Receptora:</strong> {formData.proveedor}</p>
                <p><strong>Acreedor:</strong> {formData.acreedor}</p>
                <p><strong>Concepto:</strong> {formData.concepto}</p>
                {formData.descripcion && (
                  <p><strong>Descripción:</strong> {formData.descripcion}</p>
                )}
                <p><strong>Valor base:</strong> {formatCurrency(parseFloat(formData.valorSolicitud))}</p>
                {formData.tieneIVA && ivaVigente && (
                  <p><strong>IVA ({(ivaVigente.porcentaje * 100).toFixed(1)}%):</strong> {formatCurrency(parseFloat(formData.iva))}</p>
                )}
                <p className="font-semibold text-bolivar-green"><strong>Total:</strong> {formatCurrency(parseFloat(formData.totalSolicitud))}</p>
                <p className="text-xs mt-4 text-gray-500">
                  ¿Está seguro de que desea guardar esta solicitud?
                </p>
              </div>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:ring-2 focus:ring-gray-500 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmSubmit}
                  className="px-4 py-2 bg-bolivar-green text-white rounded-md hover:bg-bolivar-green-700 focus:ring-2 focus:ring-bolivar-green transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de éxito */}
      {showSuccess && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                ¡Solicitud Creada Exitosamente!
              </h3>
              <div className="text-sm text-gray-600 mb-6 space-y-3">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-semibold text-bolivar-green mb-2">Número de Solicitud:</p>
                  <p className="text-lg font-mono bg-white px-3 py-2 rounded border">
                    {numeroSolicitudCreada}
                  </p>
                </div>
                <p className="text-sm text-gray-500">
                  La solicitud ha sido registrada y enviada para procesamiento.
                  Será redirigido al dashboard principal.
                </p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={handleSuccessConfirm}
                  className="px-6 py-2 bg-bolivar-green text-white rounded-md hover:bg-bolivar-green-700 focus:ring-2 focus:ring-bolivar-green transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de extracción de PDF */}
      {showPDFExtractionDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                ¿Extraer datos del PDF?
              </h3>
              <div className="text-sm text-gray-600 mb-6 space-y-2">
                <p>Se ha cargado la cuenta de cobro en PDF.</p>
                <p><strong>¿Desea extraer automáticamente la información del documento para llenar los campos del formulario?</strong></p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
                  <p className="text-xs text-blue-700">
                    ✨ <strong>Si selecciona "Sí":</strong> Se extraerán automáticamente campos como acreedor, concepto, descripción, valor e IVA.
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    📄 <strong>Si selecciona "No":</strong> Solo se cargará el archivo PDF sin extraer datos.
                  </p>
                </div>
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleDeclinePDFExtraction}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  No, solo cargar archivo
                </button>
                <button
                  onClick={handleConfirmPDFExtraction}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                >
                  Sí, extraer datos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validación de datos extraídos */}
      {showValidationModal && extractedData && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] overflow-y-auto">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 mb-4">
                📋 Datos Extraídos del PDF
              </h3>
              <div className="text-sm text-gray-600 mb-6">
                <p className="mb-2">Se extrajeron <strong>{extractedData.extractedFields.length} campos</strong> con confianza <strong>{extractedData.confidence}</strong></p>
                <p className="text-xs text-gray-500">Por favor revise la información y confirme si es correcta</p>
              </div>

              {/* Mostrar datos extraídos organizados */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Nueva estructura organizada */}
                  {extractedData.newSolicitud && (
                    <>
                      {extractedData.newSolicitud.fechaCuentaCobro && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">📅 Fecha Cuenta de Cobro</label>
                          <div className="text-sm text-gray-900 mt-1">
                            {(() => {
                              try {
                                // Fecha viene en formato DD-MM-YYYY desde la API
                                const fechaString = extractedData.newSolicitud.fechaCuentaCobro
                                const [dia, mes, año] = fechaString.split('-')
                                
                                // Crear fecha local sin conversión UTC (Colombia UTC-5)
                                const fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia))
                                
                                return fecha.toLocaleDateString('es-CO', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  timeZone: 'America/Bogota' // Zona horaria explícita de Colombia
                                })
                              } catch (error) {
                                console.error('Error formateando fecha:', error)
                                return extractedData.newSolicitud.fechaCuentaCobro
                              }
                            })()}
                          </div>
                        </div>
                      )}

                      {extractedData.newSolicitud.companiaReceptora && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">🏢 Compañía Receptora</label>
                          <div className="text-sm text-gray-900 mt-1">{extractedData.newSolicitud.companiaReceptora.replace('NT-', '').split('-')[1] || extractedData.newSolicitud.companiaReceptora}</div>
                        </div>
                      )}

                      {extractedData.newSolicitud.acreedor && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">🏛️ Acreedor</label>
                          <div className="text-sm text-gray-900 mt-1">{extractedData.newSolicitud.acreedor.replace('NT-', '').split('-')[1] || extractedData.newSolicitud.acreedor}</div>
                        </div>
                      )}

                      {extractedData.newSolicitud.concepto && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">📝 Concepto</label>
                          <div className="text-sm text-gray-900 mt-1">{extractedData.newSolicitud.concepto}</div>
                        </div>
                      )}

                      {extractedData.newSolicitud.valorSolicitud && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">💰 Valor Solicitud</label>
                          <div className="text-sm text-gray-900 mt-1">
                            ${extractedData.newSolicitud.valorSolicitud.toLocaleString('es-CO')}
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-3 rounded border">
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">📊 IVA</label>
                        <div className="text-sm text-gray-900 mt-1">
                          {extractedData.newSolicitud.tieneIVA ? (
                            <span className="text-green-600">✅ Sí tiene IVA</span>
                          ) : (
                            <span className="text-red-600">❌ No tiene IVA</span>
                          )}
                        </div>
                      </div>

                      {/* Mostrar valor de IVA siempre que tenga IVA */}
                      {extractedData.newSolicitud.tieneIVA && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">💰 Valor IVA</label>
                          <div className="text-sm text-gray-900 mt-1">
                            {extractedData.newSolicitud.valorIVA ? (
                              <>
                                ${extractedData.newSolicitud.valorIVA.toLocaleString('es-CO')}
                                <div className="text-xs text-gray-500 mt-1">
                                  Extraído específicamente del PDF
                                </div>
                              </>
                            ) : extractedData.ivaEspecifico ? (
                              <>
                                ${parseInt(extractedData.ivaEspecifico).toLocaleString('es-CO')}
                                <div className="text-xs text-gray-500 mt-1">
                                  Extraído del campo "IVA" del PDF
                                </div>
                              </>
                            ) : extractedData.newSolicitud.valorSolicitud && ivaVigente ? (
                              <>
                                ${Math.round(extractedData.newSolicitud.valorSolicitud * ivaVigente.porcentaje).toLocaleString('es-CO')}
                                <div className="text-xs text-gray-500 mt-1">
                                  Calculado automáticamente ({(ivaVigente.porcentaje * 100).toFixed(1)}%)
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500">Se calculará automáticamente</span>
                            )}
                          </div>
                        </div>
                      )}

                      {extractedData.newSolicitud.total && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">🎯 Total Final</label>
                          <div className="text-sm text-gray-900 mt-1">
                            ${extractedData.newSolicitud.total.toLocaleString('es-CO')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Extraído directamente del PDF
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fallback a estructura legacy si no hay newSolicitud */}
                  {!extractedData.newSolicitud && (
                    <>
                      {extractedData.proveedor && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">🏢 Compañía Receptora</label>
                          <div className="text-sm text-gray-900 mt-1">{extractedData.proveedor.replace('NT-', '').split('-')[1] || extractedData.proveedor}</div>
                        </div>
                      )}

                      {extractedData.acreedor && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">🏛️ Acreedor</label>
                          <div className="text-sm text-gray-900 mt-1">{extractedData.acreedor}</div>
                        </div>
                      )}

                      {extractedData.concepto && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">📝 Concepto</label>
                          <div className="text-sm text-gray-900 mt-1">{extractedData.concepto}</div>
                        </div>
                      )}

                      {extractedData.valorSolicitud && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">💰 Valor Solicitud</label>
                          <div className="text-sm text-gray-900 mt-1">
                            ${parseInt(extractedData.valorSolicitud).toLocaleString('es-CO')}
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-3 rounded border">
                        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">📊 IVA</label>
                        <div className="text-sm text-gray-900 mt-1">
                          {extractedData.tieneIVA ? (
                            <span className="text-green-600">✅ Sí tiene IVA</span>
                          ) : (
                            <span className="text-red-600">❌ No tiene IVA</span>
                          )}
                        </div>
                      </div>

                      {/* Mostrar valor de IVA siempre que tenga IVA (estructura legacy) */}
                      {extractedData.tieneIVA && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">💰 Valor IVA</label>
                          <div className="text-sm text-gray-900 mt-1">
                            {extractedData.ivaEspecifico ? (
                              <>
                                ${parseInt(extractedData.ivaEspecifico).toLocaleString('es-CO')}
                                <div className="text-xs text-gray-500 mt-1">
                                  Extraído del campo "IVA" del PDF
                                </div>
                              </>
                            ) : extractedData.valorSolicitud && ivaVigente ? (
                              <>
                                ${Math.round(parseInt(extractedData.valorSolicitud) * ivaVigente.porcentaje).toLocaleString('es-CO')}
                                <div className="text-xs text-gray-500 mt-1">
                                  Calculado automáticamente ({(ivaVigente.porcentaje * 100).toFixed(1)}%)
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500">Se calculará automáticamente</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Total si está disponible en estructura legacy */}
                      {extractedData.total && (
                        <div className="bg-white p-3 rounded border">
                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">🎯 Total Final</label>
                          <div className="text-sm text-gray-900 mt-1">
                            ${parseInt(extractedData.total).toLocaleString('es-CO')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Extraído directamente del PDF
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Descripción (ocupa toda la fila) */}
                {(extractedData.newSolicitud?.descripcion || extractedData.descripcion) && (
                  <div className="bg-white p-3 rounded border mt-4">
                    <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">📋 Descripción</label>
                    <div className="text-sm text-gray-900 mt-2 whitespace-pre-line border border-gray-200 rounded p-2 bg-gray-50 max-h-32 overflow-y-auto">
                      {extractedData.newSolicitud?.descripcion || extractedData.descripcion}
                    </div>
                  </div>
                )}

                {/* Campos extraídos */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-4">
                  <label className="text-xs font-semibold text-blue-700 uppercase tracking-wide">✨ Campos Procesados</label>
                  <div className="text-xs text-blue-600 mt-1">
                    {extractedData.extractedFields.map((field: string, index: number) => (
                      <span key={index} className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-1">
                        {field}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Confianza */}
                <div className={`border rounded p-3 mt-4 ${
                  extractedData.confidence === 'high' ? 'bg-green-50 border-green-200' :
                  extractedData.confidence === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <label className={`text-xs font-semibold uppercase tracking-wide ${
                    extractedData.confidence === 'high' ? 'text-green-700' :
                    extractedData.confidence === 'medium' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    📈 Confianza de Extracción
                  </label>
                  <div className={`text-sm mt-1 ${
                    extractedData.confidence === 'high' ? 'text-green-900' :
                    extractedData.confidence === 'medium' ? 'text-yellow-900' :
                    'text-red-900'
                  }`}>
                    {extractedData.confidence === 'high' && '🟢 Alta - Los datos fueron extraídos con alta precisión'}
                    {extractedData.confidence === 'medium' && '🟡 Media - Revise cuidadosamente los datos'}
                    {extractedData.confidence === 'low' && '🔴 Baja - Verifique manualmente todos los datos'}
                  </div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleRejectExtractedData}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  ❌ Rechazar datos
                </button>
                <button
                  onClick={handleConfirmExtractedData}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  ✅ Confirmar y aplicar
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                💡 Tip: Si confirma, estos datos se aplicarán automáticamente al formulario. Si rechaza, podrá llenar los campos manualmente.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
