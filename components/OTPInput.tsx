"use client"

import { useState, useRef, useEffect } from 'react'

interface OTPInputProps {
  length?: number
  onComplete: (otp: string) => void
  loading?: boolean
  error?: string
}

export default function OTPInput({ 
  length = 6, 
  onComplete, 
  loading = false, 
  error 
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    // Focus en el primer input al montar
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return

    const newOtp = [...otp]
    
    // Solo permitir un dígito por input
    newOtp[index] = value.substring(value.length - 1)
    setOtp(newOtp)

    // Mover al siguiente input automáticamente
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Si se completó el OTP, llamar callback
    if (newOtp.every(digit => digit !== '') && !loading) {
      onComplete(newOtp.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const newOtp = [...otp]
      
      if (newOtp[index]) {
        newOtp[index] = ''
      } else if (index > 0) {
        newOtp[index - 1] = ''
        inputRefs.current[index - 1]?.focus()
      }
      
      setOtp(newOtp)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text/plain')
    const pastedDigits = pastedData.replace(/\D/g, '').slice(0, length)
    
    if (pastedDigits.length === length) {
      const newOtp = pastedDigits.split('')
      setOtp(newOtp)
      inputRefs.current[length - 1]?.focus()
      
      if (!loading) {
        onComplete(pastedDigits)
      }
    }
  }

  const clearOTP = () => {
    setOtp(Array(length).fill(''))
    inputRefs.current[0]?.focus()
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex justify-center space-x-2 mb-4">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={2}
            className={`
              w-12 h-12 text-center text-xl font-semibold border-2 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-primary-500
              ${error 
                ? 'border-red-500 bg-red-50' 
                : loading
                  ? 'border-gray-300 bg-gray-100 cursor-not-allowed'
                  : 'border-gray-300 hover:border-gray-400'
              }
              ${digit ? 'border-primary-500 bg-primary-50' : ''}
            `}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={index === 0 ? handlePaste : undefined}
            disabled={loading}
          />
        ))}
      </div>

      {error && (
        <div className="text-sm text-red-600 text-center mb-4">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-300 border-t-primary-600 rounded-full animate-spin"></div>
          <span>Verificando...</span>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={clearOTP}
          disabled={loading}
          className="text-sm text-gray-500 hover:text-gray-700 underline disabled:no-underline disabled:text-gray-300"
        >
          Limpiar código
        </button>
      </div>
    </div>
  )
}
