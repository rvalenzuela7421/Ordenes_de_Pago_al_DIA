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
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [showValidationErrors, setShowValidationErrors] = useState(false)

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
      console.log('🔍 === DIAGNÓSTICO IVA - RESPUESTA DEL BACKEND ===')
      console.log('💰 IVA en respuesta backend:')
      console.log('  - data.tieneIVA:', data.tieneIVA, '(tipo:', typeof data.tieneIVA, ')')
      console.log('  - data.valorIVA:', data.valorIVA, '(tipo:', typeof data.valorIVA, ')')
      console.log('📊 Otros campos relacionados:')
      console.log('  - data.valorSolicitud:', data.valorSolicitud)
      console.log('  - data.valorTotalSolicitud:', data.valorTotalSolicitud)
      console.log('================================================')
      
      // CRÍTICO: Verificar si recibimos el documento correcto
      console.log('🚨 === VERIFICACIÓN DE DOCUMENTO CORRECTO ===')
      console.log('🎯 TIMESTAMP RESPUESTA:', new Date().toISOString())
      console.log('📦 RESPUESTA COMPLETA DEL BACKEND:', JSON.stringify(data, null, 2))
      console.log('🔍 INDICADORES DE DOCUMENTO:')
      console.log('  - Valor Solicitud:', data.valorSolicitud, '(esperado: ~5815188351 para doc con IVA)')
      console.log('  - Compañía:', data.companiaReceptora)
      console.log('  - Acreedor:', data.acreedor)
      console.log('💥 SI VALORES NO COINCIDEN = PROBLEMA DE CACHÉ O REQUEST CRUZADO')
      console.log('=========================================================')

      // Mostrar modal de validación antes de aplicar los datos
      if (data.success && data.extractedFields.length > 0) {
        console.log('📋 Datos extraídos recibidos - aplicando automáticamente al formulario')
        setExtractedData(data)
        // Aplicar datos automáticamente al formulario sin mostrar modal
        applyExtractedDataToForm(data)
        
        // Verificar estado del formulario después de la asignación
        setTimeout(() => {
          console.log('🎯 === VERIFICACIÓN POST-ASIGNACIÓN ===')
          console.log('📋 Estado actual del formulario (formData):')
          console.log('  - tieneIVA:', formData.tieneIVA)
          console.log('  - iva:', formData.iva)
          console.log('  - totalSolicitud:', formData.totalSolicitud)
          console.log('  - valorSolicitud:', formData.valorSolicitud)
          console.log('=======================================')
        }, 100) // Pequeño delay para que el estado se actualice
        
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
    console.log('🔍 === DIAGNÓSTICO COMPLETO DATOS RECIBIDOS ===')
    console.log('📋 Datos completos del PDF:', JSON.stringify(data, null, 2))
    console.log('💰 Específicamente IVA:')
    console.log('  - tieneIVA:', data.tieneIVA, '(tipo:', typeof data.tieneIVA, ')')
    console.log('  - valorIVA:', data.valorIVA, '(tipo:', typeof data.valorIVA, ')')
    console.log('=============================================')
    
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
          
          console.log('🎯 === DIAGNÓSTICO FINAL - DATOS ASIGNADOS AL FORMULARIO ===')
          console.log('📊 newFormData completo:', JSON.stringify(newFormData, null, 2))
          console.log('💰 Campos IVA específicos:')
          console.log('  - newFormData.tieneIVA:', newFormData.tieneIVA)
          console.log('  - newFormData.iva:', newFormData.iva)
          console.log('  - newFormData.totalSolicitud:', newFormData.totalSolicitud)
          console.log('================================================================')
          
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

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      // Crear fecha local sin conversión UTC para Colombia (igual que en el formulario)
      const [año, mes, dia] = dateString.split('-')
      if (año && mes && dia) {
        const fecha = new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia))
        return fecha.toLocaleDateString('es-CO', { 
          year: 'numeric', 
          month: '2-digit',
          day: '2-digit',
          timeZone: 'America/Bogota'
        })
      }
      return dateString
    } catch {
      return dateString
    }
  }

  // Función para validar que los datos del formulario coincidan con los datos extraídos del PDF
  const validatePDFConsistency = (): boolean => {
    console.log('🔍 Validando consistencia PDF vs Formulario...')
    
    if (!extractedData) {
      console.log('ℹ️ No hay datos extraídos del PDF - omitiendo validación')
      return true
    }

    console.log('📊 Datos extraídos del PDF:', extractedData)
    console.log('📝 Datos del formulario:', formData)

    const errors: string[] = []
    const tolerance = 1.0 // Tolerancia para diferencias numéricas mínimas (1 peso)
    console.log(`⚖️ Tolerancia aplicada: ${tolerance} peso(s)`)

    // Función helper para normalizar y limpiar valores numéricos
    const normalizeNumericValue = (value: any): number => {
      if (!value) return 0
      
      // Convertir a string y limpiar
      let stringValue = String(value).trim()
      
      console.log(`🔢 Normalizando valor numérico: "${value}" → string: "${stringValue}"`)
      
      // Detectar y manejar formato colombiano de números
      // Ejemplo: "59.197.588" o "59,197,588.50" 
      
      // Si hay múltiples puntos, es formato colombiano (puntos = separadores de miles)
      const puntosCount = (stringValue.match(/\./g) || []).length
      const comasCount = (stringValue.match(/,/g) || []).length
      
      if (puntosCount > 1) {
        // Formato: 59.197.588 (puntos para miles, sin decimales)
        stringValue = stringValue.replace(/\./g, '')
        console.log(`   📊 Formato colombiano detectado (solo miles): "${stringValue}"`)
      } else if (puntosCount === 1 && comasCount === 0) {
        // Podría ser decimal (59197.588) o miles (59.197)
        const partes = stringValue.split('.')
        if (partes[1] && partes[1].length > 2) {
          // Es formato de miles: 59.197.588 → 59197588
          stringValue = stringValue.replace(/\./g, '')
          console.log(`   📊 Formato miles detectado (punto único con >2 dígitos): "${stringValue}"`)
        } else {
          // Es formato decimal: 59197.50 → mantener
          console.log(`   📊 Formato decimal detectado: "${stringValue}"`)
        }
      } else if (comasCount === 1) {
        // Formato: 59,197,588.50 → 59197588.50
        stringValue = stringValue.replace(/,/g, '')
        console.log(`   📊 Formato con comas para miles: "${stringValue}"`)
      }
      
      // Limpiar caracteres no numéricos (excepto punto decimal)
      stringValue = stringValue.replace(/[^\d\.]/g, '')
      
      const resultado = parseFloat(stringValue) || 0
      console.log(`   ✅ Resultado final: ${resultado}`)
      
      return resultado
    }

    // Función helper para normalizar strings
    const normalizeString = (value: any): string => {
      if (!value) return ''
      return String(value).trim().toLowerCase()
    }

    // 1. Validar Fecha Cuenta de Cobro
    if (extractedData.fechaCuentaCobro && formData.fechaCuentaCobro) {
      // Función helper para normalizar fechas a formato comparable
      const normalizeDateForComparison = (dateStr: string): Date | null => {
        try {
          // Limpiar la fecha de espacios extra
          const cleanDate = dateStr.trim()
          
          // Detectar formato DD-MM-YYYY (del PDF)
          if (/^\d{2}-\d{2}-\d{4}$/.test(cleanDate)) {
            const [dia, mes, año] = cleanDate.split('-')
            return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia))
          }
          
          // Detectar formato YYYY-MM-DD (del formulario)  
          if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
            const [año, mes, dia] = cleanDate.split('-')
            return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia))
          }
          
          // Fallback: intentar parsear como Date directamente
          const fecha = new Date(cleanDate)
          return isNaN(fecha.getTime()) ? null : fecha
        } catch {
          return null
        }
      }
      
      const extractedDate = normalizeDateForComparison(extractedData.fechaCuentaCobro)
      const formDate = normalizeDateForComparison(formData.fechaCuentaCobro)
      
      console.log('📅 Validando fechas:')
      console.log(`   📄 PDF: "${extractedData.fechaCuentaCobro}" → ${extractedDate?.toDateString()}`)
      console.log(`   📋 Form: "${formData.fechaCuentaCobro}" → ${formDate?.toDateString()}`)
      
      if (extractedDate && formDate) {
        // Comparar fechas por separado (año, mes, día) para evitar problemas de timezone
        const extractedDateStr = `${extractedDate.getFullYear()}-${(extractedDate.getMonth() + 1).toString().padStart(2, '0')}-${extractedDate.getDate().toString().padStart(2, '0')}`
        const formDateStr = `${formDate.getFullYear()}-${(formDate.getMonth() + 1).toString().padStart(2, '0')}-${formDate.getDate().toString().padStart(2, '0')}`
        
        console.log(`   🔍 Comparación normalizada: "${extractedDateStr}" vs "${formDateStr}"`)
        
        if (extractedDateStr !== formDateStr) {
          errors.push(`📅 Fecha Cuenta de Cobro: El formulario muestra "${formData.fechaCuentaCobro}" pero el PDF indica "${extractedData.fechaCuentaCobro}"`)
          console.log('❌ Fechas NO coinciden')
        } else {
          console.log('✅ Fechas SÍ coinciden (mismo día)')
        }
      } else {
        // Si no se pueden parsear las fechas, compararlas como string (fallback)
        const extractedDateStr = normalizeString(extractedData.fechaCuentaCobro)
        const formDateStr = normalizeString(formData.fechaCuentaCobro)
        
        if (extractedDateStr !== formDateStr) {
          errors.push(`📅 Fecha Cuenta de Cobro: El formulario muestra "${formData.fechaCuentaCobro}" pero el PDF indica "${extractedData.fechaCuentaCobro}" (no se pudieron normalizar las fechas)`)
          console.log('⚠️ No se pudieron parsear las fechas, comparando como string')
        }
      }
    }

    // 2. Validar Valor Solicitud
    if (extractedData.valorSolicitud) {
      const extractedValue = normalizeNumericValue(extractedData.valorSolicitud)
      const formValue = normalizeNumericValue(formData.valorSolicitud)
      const difference = Math.abs(extractedValue - formValue)
      
      if (difference > tolerance && extractedValue > 0) {
        errors.push(`💰 Valor Solicitud: El formulario muestra $${parseInt(formData.valorSolicitud).toLocaleString('es-CO')} pero el PDF indica $${extractedValue.toLocaleString('es-CO')}`)
      }
    }

    // 3. Validar IVA
    if (extractedData.tieneIVA !== undefined && extractedData.valorIVA !== undefined) {
      console.log('💸 === VALIDACIÓN IVA ===')
      const extractedIVA = normalizeNumericValue(extractedData.valorIVA)
      const formIVA = normalizeNumericValue(formData.iva)
      const ivaExtracted = extractedData.tieneIVA
      const ivaForm = formData.tieneIVA
      
      console.log(`   📄 PDF IVA original: "${extractedData.valorIVA}"`)
      console.log(`   📋 Form IVA original: "${formData.iva}"`)
      console.log(`   🔢 PDF IVA normalizado: ${extractedIVA}`)
      console.log(`   🔢 Form IVA normalizado: ${formIVA}`)
      
      // Verificar checkbox de IVA
      if (ivaExtracted !== ivaForm) {
        errors.push(`✅ Tiene IVA: El formulario indica "${ivaForm ? 'Sí' : 'No'}" pero el PDF indica "${ivaExtracted ? 'Sí' : 'No'}"`)
        console.log('❌ Checkbox IVA no coincide')
      }
      
      // Verificar valor de IVA si ambos tienen IVA
      if (ivaExtracted && ivaForm && extractedIVA > 0) {
        const ivaDifference = Math.abs(extractedIVA - formIVA)
        console.log(`   🔍 Diferencia IVA: ${ivaDifference} (tolerancia: ${tolerance})`)
        
        if (ivaDifference > tolerance) {
          errors.push(`📊 Valor IVA: El formulario muestra $${parseInt(formData.iva).toLocaleString('es-CO')} pero el PDF indica $${extractedIVA.toLocaleString('es-CO')}`)
          console.log('❌ IVA no coincide (fuera de tolerancia)')
        } else {
          console.log('✅ IVA válido (dentro de tolerancia)')
        }
      }
    }

    // 4. Validar Total Solicitud
    if (extractedData.valorTotalSolicitud) {
      console.log('🧾 === VALIDACIÓN TOTAL ===')
      const extractedTotal = normalizeNumericValue(extractedData.valorTotalSolicitud)
      const formTotal = normalizeNumericValue(formData.totalSolicitud)
      const totalDifference = Math.abs(extractedTotal - formTotal)
      
      console.log(`   📄 PDF Total original: "${extractedData.valorTotalSolicitud}"`)
      console.log(`   📋 Form Total original: "${formData.totalSolicitud}"`)
      console.log(`   🔢 PDF Total normalizado: ${extractedTotal}`)
      console.log(`   🔢 Form Total normalizado: ${formTotal}`)
      console.log(`   🔍 Diferencia Total: ${totalDifference} (tolerancia: ${tolerance})`)
      
      if (totalDifference > tolerance && extractedTotal > 0) {
        errors.push(`🧾 Valor Total: El formulario muestra $${parseInt(formData.totalSolicitud).toLocaleString('es-CO')} pero el PDF indica $${extractedTotal.toLocaleString('es-CO')}`)
        console.log('❌ Total no coincide (fuera de tolerancia)')
      } else {
        console.log('✅ Total válido (dentro de tolerancia)')
      }
    }

    // 5. Validar Compañía Receptora
    if (extractedData.companiaReceptora && formData.proveedor) {
      const extractedCompany = normalizeString(extractedData.companiaReceptora)
      const formCompany = normalizeString(formData.proveedor)
      
      console.log('🏢 Validando Compañía Receptora:')
      console.log(`   📄 PDF extraído: "${extractedData.companiaReceptora}"`)
      console.log(`   📋 Formulario: "${formData.proveedor}"`)
      console.log(`   🔤 PDF normalizado: "${extractedCompany}"`)
      console.log(`   🔤 Form normalizado: "${formCompany}"`)
      
      // Extraer partes para comparación más detallada
      const extractedParts = extractedCompany.split('-')
      const formParts = formCompany.split('-')
      
      console.log(`   📊 Partes PDF: [${extractedParts.join(', ')}]`)
      console.log(`   📊 Partes Form: [${formParts.join(', ')}]`)
      
      // Comparación más flexible para compañías (buscar coincidencia parcial)
      const extractedLastPart = extractedParts[extractedParts.length - 1]?.trim() || ''
      const formLastPart = formParts[formParts.length - 1]?.trim() || ''
      
      const isMatch = extractedCompany.includes(formLastPart) || 
                     formCompany.includes(extractedLastPart) ||
                     extractedLastPart === formLastPart
      
      console.log(`   🎯 ¿Coincidencia?: ${isMatch}`)
      
      if (!isMatch) {
        // MENSAJE MEJORADO: Incluir más detalles para debugging
        const errorMsg = `🏢 Compañía Receptora: El formulario muestra "${formData.proveedor}" pero el PDF indica "${extractedData.companiaReceptora}". ` +
          `Si cree que esto es un error de extracción, por favor reporte esta inconsistencia para revisión.`
        errors.push(errorMsg)
        
        console.log('❌ No hay coincidencia en Compañía Receptora')
      } else {
        console.log('✅ Compañía Receptora válida')
      }
    }

    // 6. Validar Acreedor
    if (extractedData.acreedor && formData.acreedor) {
      const extractedCreditor = normalizeString(extractedData.acreedor)
      const formCreditor = normalizeString(formData.acreedor)
      
      // Comparación más flexible para acreedores (buscar coincidencia parcial)
      if (!extractedCreditor.includes(formCreditor.split('-').pop()?.trim() || '') && 
          !formCreditor.includes(extractedCreditor.split('-').pop()?.trim() || '')) {
        errors.push(`👤 Acreedor: El formulario muestra "${formData.acreedor}" pero el PDF indica "${extractedData.acreedor}"`)
      }
    }

    // 7. Validar Concepto
    if (extractedData.concepto && formData.concepto) {
      const extractedConcept = normalizeString(extractedData.concepto)
      const formConcept = normalizeString(formData.concepto)
      
      if (extractedConcept !== formConcept) {
        errors.push(`📝 Concepto: El formulario muestra "${formData.concepto}" pero el PDF indica "${extractedData.concepto}"`)
      }
    }

    // NOTA: No validamos el campo "Descripción" ya que el usuario puede modificarlo 
    // libremente para dar mayor detalle a la solicitud sin que sea una inconsistencia

    // Guardar errores y mostrar modal si los hay
    if (errors.length > 0) {
      console.log(`❌ Se encontraron ${errors.length} inconsistencias:`, errors)
      setValidationErrors(errors)
      setShowValidationErrors(true)
      return false
    }

    console.log('✅ Validación exitosa - no se encontraron inconsistencias')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Limpiar errores de validación previos
    setValidationErrors([])
    setShowValidationErrors(false)
    
    if (!validateForm()) return
    
    // Validar consistencia con datos del PDF antes de continuar
    if (!validatePDFConsistency()) {
      return // Los errores ya se muestran en el modal
    }

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
          fechaCuentaCobro: formData.fechaCuentaCobro,
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
                <p><strong>Fecha Cuenta de Cobro:</strong> {formatDate(formData.fechaCuentaCobro)}</p>
                <p><strong>Concepto:</strong> {formData.concepto}</p>
                {formData.descripcion && (
                  <p><strong>Descripción:</strong> {formData.descripcion}</p>
                )}
                <p><strong>Vr. Solicitud:</strong> {formatCurrency(parseFloat(formData.valorSolicitud))}</p>
                {formData.tieneIVA && ivaVigente && (
                  <p><strong>Vr. IVA ({(ivaVigente.porcentaje * 100).toFixed(1)}%):</strong> {formatCurrency(parseFloat(formData.iva))}</p>
                )}
                <p className="font-semibold text-gray-900"><strong>Total Solicitud:</strong> {formatCurrency(parseFloat(formData.totalSolicitud))}</p>
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

      {/* Modal de errores de validación */}
      {showValidationErrors && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                ⚠️ Inconsistencias Detectadas
              </h3>
              
              <div className="text-left mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  Se encontraron diferencias entre la información del formulario y los datos extraídos del PDF. 
                  Por favor, verifique y corrija los siguientes campos:
                </p>
                
                <div className="max-h-64 overflow-y-auto bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="space-y-3">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="flex items-start text-sm text-yellow-800">
                        <div className="flex-shrink-0 w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3"></div>
                        <span className="flex-1">{error}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-800">
                        <strong>💡 Recomendación:</strong> Para evitar que la solicitud sea devuelta, 
                        asegúrese de que la información del formulario coincida exactamente con el PDF de la cuenta de cobro.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setShowValidationErrors(false)}
                  className="flex items-center gap-2 px-6 py-2 bg-bolivar-green hover:bg-bolivar-green-dark text-white text-sm font-medium rounded-md transition-colors duration-200"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Corregir Información
                </button>
              </div>
              
              <p className="mt-3 text-sm text-red-600 font-medium text-center">
                ⚠️ Debe corregir la información para continuar. Las solicitudes con inconsistencias son devueltas automáticamente.
              </p>
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
