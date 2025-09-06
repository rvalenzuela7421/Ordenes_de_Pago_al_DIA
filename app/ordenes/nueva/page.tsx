"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatCurrency, evaluateAutoApprovalRules } from '@/lib/utils'

export default function NuevaOrdenPage() {
  const [formData, setFormData] = useState({
    numero_orden: '',
    proveedor: '',
    concepto: '',
    monto: '',
    observaciones: ''
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [previewRules, setPreviewRules] = useState<{
    shouldAutoApprove: boolean
    reason: string
  } | null>(null)
  const router = useRouter()

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.numero_orden.trim()) {
      newErrors.numero_orden = 'El número de orden es requerido'
    }

    if (!formData.proveedor.trim()) {
      newErrors.proveedor = 'El proveedor es requerido'
    }

    if (!formData.concepto.trim()) {
      newErrors.concepto = 'El concepto es requerido'
    }

    const monto = parseFloat(formData.monto)
    if (!formData.monto || isNaN(monto) || monto <= 0) {
      newErrors.monto = 'El monto debe ser un número mayor a 0'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleMontoChange = (value: string) => {
    // Permitir solo números y punto decimal
    const sanitized = value.replace(/[^0-9.]/g, '')
    setFormData(prev => ({ ...prev, monto: sanitized }))

    // Evaluar reglas automáticas si hay monto y proveedor
    const monto = parseFloat(sanitized)
    if (!isNaN(monto) && monto > 0 && formData.proveedor.trim()) {
      const rules = evaluateAutoApprovalRules(monto, formData.proveedor.trim())
      setPreviewRules(rules)
    } else {
      setPreviewRules(null)
    }
  }

  const handleProveedorChange = (value: string) => {
    setFormData(prev => ({ ...prev, proveedor: value }))

    // Evaluar reglas automáticas si hay monto y proveedor
    const monto = parseFloat(formData.monto)
    if (!isNaN(monto) && monto > 0 && value.trim()) {
      const rules = evaluateAutoApprovalRules(monto, value.trim())
      setPreviewRules(rules)
    } else {
      setPreviewRules(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/ordenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero_orden: formData.numero_orden.trim(),
          proveedor: formData.proveedor.trim(),
          concepto: formData.concepto.trim(),
          monto: parseFloat(formData.monto),
          metadata: {
            observaciones: formData.observaciones.trim() || undefined
          }
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error creando la orden')
      }

      // Mostrar mensaje de éxito
      const successMessage = data.auto_approved 
        ? `Orden creada y aprobada automáticamente: ${data.approval_reason}`
        : 'Orden creada exitosamente. Pendiente de aprobación.'

      alert(successMessage)

      // Redirigir al dashboard
      router.push('/dashboard')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error inesperado'
      setErrors({ general: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
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
            <h1 className="text-2xl font-bold text-gray-900">Nueva Orden de Pago</h1>
            <p className="mt-1 text-sm text-gray-500">
              Crea una nueva orden de pago para procesamiento
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Mensaje de error general */}
        {errors.general && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
            {errors.general}
          </div>
        )}

        {/* Vista previa de reglas automáticas */}
        {previewRules && (
          <div className={`p-4 border rounded-lg ${
            previewRules.shouldAutoApprove 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start">
              <svg className={`w-5 h-5 mt-0.5 mr-3 ${
                previewRules.shouldAutoApprove ? 'text-green-600' : 'text-yellow-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={previewRules.shouldAutoApprove 
                        ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        : "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      } />
              </svg>
              <div>
                <p className={`text-sm font-medium ${
                  previewRules.shouldAutoApprove ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {previewRules.shouldAutoApprove ? 'Aprobación Automática' : 'Requiere Aprobación Manual'}
                </p>
                <p className={`text-sm mt-1 ${
                  previewRules.shouldAutoApprove ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {previewRules.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información básica */}
        <div className="card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Información Básica
          </h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Número de Orden */}
            <div className="sm:col-span-2">
              <label htmlFor="numero_orden" className="block text-sm font-medium text-gray-700 mb-1">
                Número de Orden *
              </label>
              <input
                type="text"
                id="numero_orden"
                className={`input-field ${errors.numero_orden ? 'border-red-500' : ''}`}
                value={formData.numero_orden}
                onChange={(e) => setFormData(prev => ({ ...prev, numero_orden: e.target.value }))}
                placeholder="OP-2024-001"
              />
              {errors.numero_orden && (
                <p className="mt-1 text-sm text-red-600">{errors.numero_orden}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                Debe ser único en el sistema
              </p>
            </div>

            {/* Proveedor */}
            <div>
              <label htmlFor="proveedor" className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor *
              </label>
              <input
                type="text"
                id="proveedor"
                className={`input-field ${errors.proveedor ? 'border-red-500' : ''}`}
                value={formData.proveedor}
                onChange={(e) => handleProveedorChange(e.target.value)}
                placeholder="EMPRESA ABC S.A.S."
              />
              {errors.proveedor && (
                <p className="mt-1 text-sm text-red-600">{errors.proveedor}</p>
              )}
            </div>

            {/* Monto */}
            <div>
              <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">
                Monto *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="monto"
                  className={`input-field pl-8 ${errors.monto ? 'border-red-500' : ''}`}
                  value={formData.monto}
                  onChange={(e) => handleMontoChange(e.target.value)}
                  placeholder="1000000"
                />
              </div>
              {errors.monto && (
                <p className="mt-1 text-sm text-red-600">{errors.monto}</p>
              )}
              {formData.monto && !isNaN(parseFloat(formData.monto)) && (
                <p className="mt-1 text-sm text-gray-500">
                  {formatCurrency(parseFloat(formData.monto))}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Detalles */}
        <div className="card p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Detalles de la Orden
          </h2>
          
          <div className="space-y-4">
            {/* Concepto */}
            <div>
              <label htmlFor="concepto" className="block text-sm font-medium text-gray-700 mb-1">
                Concepto *
              </label>
              <textarea
                id="concepto"
                rows={3}
                className={`input-field resize-none ${errors.concepto ? 'border-red-500' : ''}`}
                value={formData.concepto}
                onChange={(e) => setFormData(prev => ({ ...prev, concepto: e.target.value }))}
                placeholder="Describe el motivo o concepto de la orden de pago..."
              />
              {errors.concepto && (
                <p className="mt-1 text-sm text-red-600">{errors.concepto}</p>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
                <span className="text-gray-500 font-normal">(opcional)</span>
              </label>
              <textarea
                id="observaciones"
                rows={2}
                className="input-field resize-none"
                value={formData.observaciones}
                onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                placeholder="Información adicional o comentarios..."
              />
            </div>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
          <Link
            href="/dashboard"
            className="btn-secondary"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Creando Orden...</span>
              </div>
            ) : (
              'Crear Orden de Pago'
            )}
          </button>
        </div>
      </form>

      {/* Información sobre reglas automáticas */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-3">
          ℹ️ Reglas de Aprobación Automática
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• <strong>Montos menores a $1,000,000:</strong> Se aprueban automáticamente</p>
          <p>• <strong>Proveedores en lista blanca (hasta $5,000,000):</strong> EMPRESA ABC, SERVICIOS XYZ, PROVEEDOR 123</p>
          <p>• <strong>Otros casos:</strong> Requieren aprobación manual por parte de AdminCOP u OperacionCOP</p>
        </div>
      </div>
    </div>
  )
}
