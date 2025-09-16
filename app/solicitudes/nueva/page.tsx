"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  getEmpresasGrupoBolivar, type EmpresaGrupoBolivar, 
  getAcreedoresAutorizados, type Acreedor,
  getConceptosValidos, type Concepto,
  getIVAVigente 
} from '@/lib/parametros-data'
import Link from 'next/link'

// Todos los datos se cargan desde la base de datos - tabla parametros

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
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Información del tipo de solicitud seleccionado
  const [tipoSolicitud, setTipoSolicitud] = useState<string>('')
  const [tipoSolicitudId, setTipoSolicitudId] = useState<string>('')
  const [descripcionGrupoTipo, setDescripcionGrupoTipo] = useState<string>('')
  
  const [empresasGrupoBolivar, setEmpresasGrupoBolivar] = useState<EmpresaGrupoBolivar[]>([])
  const [loadingEmpresas, setLoadingEmpresas] = useState(true)
  const [acreedores, setAcreedores] = useState<Acreedor[]>([])
  const [loadingAcreedores, setLoadingAcreedores] = useState(true)
  const [conceptos, setConceptos] = useState<Concepto[]>([])
  const [loadingConceptos, setLoadingConceptos] = useState(true)
  
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
  // Modal de validación eliminado - los datos se aplican automáticamente
  const [extractedData, setExtractedData] = useState<any>(null)

  // Leer parámetros del tipo de solicitud de la URL
  useEffect(() => {
    if (!searchParams) return
    
    const tipo = searchParams.get('tipo')
    const tipoId = searchParams.get('tipoId')
    const descripcionParam = searchParams.get('descripcionGrupo')
    
    if (tipo) {
      setTipoSolicitud(tipo)
      console.log('📋 Tipo de solicitud recibido:', tipo)
    }
    if (tipoId) {
      setTipoSolicitudId(tipoId)
    }
    if (descripcionParam) {
      setDescripcionGrupoTipo(descripcionParam)
    }
    
    // Si no hay tipo de solicitud, redirigir a la página de selección
    if (!tipo) {
      console.warn('⚠️ No se recibió tipo de solicitud, redirigiendo...')
      router.push('/solicitudes')
      return
    }
  }, [searchParams, router])

  // Cargar datos al montar el componente
  useEffect(() => {
    cargarDatosIniciales()
  }, [])

  // Cargar todos los datos necesarios desde la base de datos
  const cargarDatosIniciales = async () => {
    await Promise.all([
      cargarIVAVigente(),
      cargarEmpresasGrupoBolivar(),
      cargarAcreedoresAutorizados(),
      cargarConceptosValidos()
    ])
  }

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

  // Cargar acreedores autorizados desde tabla parametros
  const cargarAcreedoresAutorizados = async () => {
    try {
      setLoadingAcreedores(true)
      console.log('🏦 Cargando acreedores autorizados desde parámetros...')
      
      const { acreedores: acreedoresCargados, count, error } = await getAcreedoresAutorizados(true)
      
      if (error) {
        console.error('❌ Error al cargar acreedores:', error)
        throw new Error(error)
      }
      
      if (acreedoresCargados && acreedoresCargados.length > 0) {
        setAcreedores(acreedoresCargados)
        console.log('✅ Acreedores autorizados cargados:', count)
      } else {
        console.error('❌ No se encontraron acreedores en la base de datos')
        setAcreedores([])
      }
    } catch (error) {
      console.error('💥 Error inesperado cargando acreedores:', error)
      setAcreedores([])
    } finally {
      setLoadingAcreedores(false)
    }
  }

  // Cargar conceptos válidos desde tabla parametros
  const cargarConceptosValidos = async () => {
    try {
      setLoadingConceptos(true)
      console.log('📋 Cargando conceptos válidos desde parámetros...')
      
      const { conceptos: conceptosCargados, count, error } = await getConceptosValidos(true)
      
      if (error) {
        console.error('❌ Error al cargar conceptos:', error)
        throw new Error(error)
      }
      
      if (conceptosCargados && conceptosCargados.length > 0) {
        setConceptos(conceptosCargados)
        console.log('✅ Conceptos válidos cargados:', count)
      } else {
        console.error('❌ No se encontraron conceptos en la base de datos')
        setConceptos([])
      }
    } catch (error) {
      console.error('💥 Error inesperado cargando conceptos:', error)
      setConceptos([])
    } finally {
      setLoadingConceptos(false)
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
        console.log('📋 Datos extraídos recibidos - aplicando automáticamente al formulario')
        setExtractedData(data)
        // Aplicar datos automáticamente al formulario sin mostrar modal
        applyExtractedDataToForm(data)
        setPdfDataExtracted(true)
        setExtractionConfidence(data.confidence)
        console.log('✅ Datos del PDF aplicados automáticamente al formulario')
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
          
        // ✨ USAR ESTRUCTURA UNIFICADA ExtractedPDFData
        console.log('✨ Usando estructura unificada ExtractedPDFData')
        const solicitud = data
            
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
              console.log('🔍 Intentando asignar compañía receptora extraída:', solicitud.companiaReceptora)
              console.log('📋 Empresas disponibles del Grupo Bolívar:', empresasGrupoBolivar.length)
              
              // Verificar si el valor extraído coincide exactamente con alguna opción
              const empresaEncontrada = empresasGrupoBolivar.find(empresa => 
                empresa.valorCompleto === solicitud.companiaReceptora
              )
              
              if (empresaEncontrada) {
              newFormData.proveedor = solicitud.companiaReceptora
                console.log('✅ Compañía Receptora auto-seleccionada (coincidencia exacta):', solicitud.companiaReceptora)
              } else {
                console.log('⚠️ Buscando coincidencia parcial para compañía receptora...')
                
                // Buscar coincidencia parcial por NIT, código o nombre
                const empresaParcial = empresasGrupoBolivar.find(empresa => {
                  const valorExtraido = solicitud.companiaReceptora.toLowerCase()
                  const valorEmpresa = empresa.valorCompleto.toLowerCase()
                  
                  return (
                    // Coincidencia por NIT (considerando dígito de verificación)
                    (empresa.nit && valorExtraido.includes(empresa.nit)) ||
                    // Coincidencia por nombre de empresa
                    (empresa.nombre && valorExtraido.includes(empresa.nombre.toLowerCase())) ||
                    // Coincidencia parcial en cualquier dirección
                    valorEmpresa.includes(valorExtraido) ||
                    valorExtraido.includes(valorEmpresa)
                  )
                })
                
                if (empresaParcial) {
                  newFormData.proveedor = empresaParcial.valorCompleto
                  console.log('✅ Compañía Receptora auto-seleccionada (coincidencia parcial):', empresaParcial.valorCompleto)
                  console.log('🔄 Valor original extraído:', solicitud.companiaReceptora)
                } else {
                  console.log('❌ Compañía receptora extraída no coincide con opciones disponibles:', solicitud.companiaReceptora)
                  console.log('📋 Opciones disponibles:')
                  empresasGrupoBolivar.forEach(empresa => {
                    console.log(`  - ${empresa.valorCompleto} (NIT: ${empresa.nit})`)
                  })
                }
              }
            }
            
            // 3. Acreedor  
            if (solicitud.acreedor) {
              console.log('🔍 Intentando asignar acreedor extraído:', solicitud.acreedor)
              
              // Verificar si el valor extraído coincide exactamente con alguna opción
              const acreedorEncontrado = acreedores.find(acreedor => acreedor.valor === solicitud.acreedor)
              
              if (acreedorEncontrado) {
              newFormData.acreedor = solicitud.acreedor
                console.log('✅ Acreedor auto-seleccionado (coincidencia exacta):', solicitud.acreedor)
              } else {
                // Buscar coincidencia parcial por NIT o nombre
                const acreedorParcial = acreedores.find(acreedor => 
                  acreedor.valor.toLowerCase().includes(solicitud.acreedor.toLowerCase()) ||
                  solicitud.acreedor.toLowerCase().includes(acreedor.valor.toLowerCase())
                )
                
                if (acreedorParcial) {
                  newFormData.acreedor = acreedorParcial.valor
                  console.log('✅ Acreedor auto-seleccionado (coincidencia parcial):', acreedorParcial.valor)
                } else {
                  console.log('⚠️ Acreedor extraído no coincide con opciones disponibles:', solicitud.acreedor)
                  console.log('📋 Opciones disponibles:', acreedores.map(a => a.valor))
                }
              }
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
              
              console.log('🔍 DIAGNÓSTICO IVA - Datos recibidos del PDF:')
              console.log('  📊 Valor Solicitud:', solicitud.valorSolicitud)
              console.log('  ✅ tieneIVA:', solicitud.tieneIVA)
              console.log('  💰 valorIVA:', solicitud.valorIVA)
              console.log('  🧾 valorTotalSolicitud:', solicitud.valorTotalSolicitud)
              
              // CRUCIAL: Verificar si se extrajo IVA del PDF
              if (solicitud.valorIVA && solicitud.valorIVA > 0) {
                // HAY IVA EXTRAÍDO DEL PDF
                newFormData.tieneIVA = true
                newFormData.iva = Math.round(solicitud.valorIVA).toString()
                console.log(`🎯 ¡IVA ASIGNADO! Checkbox marcado, valor: $${Math.round(solicitud.valorIVA)}`)
                
                // Usar total del PDF si está disponible, sino calcular
                if (solicitud.valorTotalSolicitud && solicitud.valorTotalSolicitud > 0) {
                  newFormData.totalSolicitud = Math.round(solicitud.valorTotalSolicitud).toString()
                  console.log(`✅ Total del PDF: $${Math.round(solicitud.valorTotalSolicitud)}`)
                } else {
                  newFormData.totalSolicitud = (solicitud.valorSolicitud + Math.round(solicitud.valorIVA)).toString()
                  console.log('✅ Total calculado: valor base + IVA extraído')
                }
              } else {
                // NO HAY IVA O ES CERO
                newFormData.tieneIVA = false
                newFormData.iva = '0'
                newFormData.totalSolicitud = solicitud.valorSolicitud.toString()
                console.log('❌ Sin IVA - checkbox desmarcado, total = valor base')
              }
          } else {
              console.log('⚠️ No se extrajo valor de solicitud del PDF')
            }
          
          return newFormData
        })

        // Mostrar mensaje de éxito
        const fieldsCount = data.extractedFields.length
        console.log(`✅ Se aplicaron ${fieldsCount} campos validados al formulario con confianza ${data.confidence}`)
  }

  // Funciones del modal eliminadas - los datos se aplican automáticamente

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
    
    // Verificar fecha cuenta de cobro obligatoria
    if (!formData.fechaCuentaCobro.trim()) return false
    
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

    if (!formData.fechaCuentaCobro.trim()) {
      newErrors.fechaCuentaCobro = 'La fecha cuenta de cobro es requerida'
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
            <h1 className="text-2xl font-bold text-gray-900">Nueva Solicitud de Orden de Pago</h1>
            {tipoSolicitud && (
              <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-bolivar-green text-white">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {tipoSolicitud}
              </div>
            )}
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
                📅 Fecha Cuenta de Cobro <span className="text-red-500">*</span>
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
                Compañía Receptora <span className="text-red-500">*</span>
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
                        {empresa.valorCompleto}
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
                Acreedor <span className="text-red-500">*</span>
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
                disabled={loadingAcreedores}
              >
                {loadingAcreedores ? (
                  <option value="">Cargando acreedores autorizados...</option>
                ) : acreedores.length === 0 ? (
                  <option value="">❌ No hay acreedores disponibles - Verificar base de datos</option>
                ) : (
                  [
                    <option key="empty" value="">Seleccione un acreedor</option>,
                    ...acreedores.map((acreedor) => (
                      <option key={acreedor.id} value={acreedor.valor}>
                    {acreedor.label}
                  </option>
                    ))
                  ]
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {loadingAcreedores ? 'Cargando...' : 
                 acreedores.length === 0 ? 
                 '⚠️ No hay acreedores disponibles. Debe insertar datos en tabla parametros (grupo: ACREEDORES)' : 
                 `✅ ${acreedores.length} acreedores autorizados disponibles`}
              </p>
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
                disabled={loadingConceptos}
              >
                {loadingConceptos ? (
                  <option value="">Cargando conceptos válidos...</option>
                ) : conceptos.length === 0 ? (
                  <option value="">❌ No hay conceptos disponibles - Verificar base de datos</option>
                ) : (
                  [
                    <option key="empty" value="">Seleccione un concepto</option>,
                    ...conceptos.map((concepto) => (
                      <option key={concepto.id} value={concepto.valor}>
                    {concepto.label}
                  </option>
                    ))
                  ]
                )}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {loadingConceptos ? 'Cargando...' : 
                 conceptos.length === 0 ? 
                 '⚠️ No hay conceptos disponibles. Debe insertar datos en tabla parametros (grupo: CONCEPTOS)' : 
                 `✅ ${conceptos.length} conceptos válidos disponibles`}
              </p>
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
                        <p className="text-xs text-gray-500">Solo archivos PDF</p>
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
            className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading || uploadingFiles || !isFormComplete()}
            className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploadingFiles ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Subiendo archivos...</span>
              </>
            ) : loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creando solicitud...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Crear Solicitud
              </>
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
                  className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </button>
                <button
                  onClick={confirmSubmit}
                  className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
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
                  className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Continuar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de extracción de PDF */}
      {showPDFExtractionDialog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="p-5 border w-96 shadow-lg rounded-md bg-white">
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
              </div>
              <div className="flex justify-center space-x-3">
                <button
                  onClick={handleDeclinePDFExtraction}
                  className="flex items-center gap-2 px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  No, solo cargar archivo
                </button>
                <button
                  onClick={handleConfirmPDFExtraction}
                  className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Sí, extraer datos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de validación eliminado - los datos se procesan automáticamente */}
    </div>
  )
}
