#!/usr/bin/env node

// 🐛 DEBUG - Registro en Modo Demo
// Ejecutar con: node debug-registro.js

const fs = require('fs')
const path = require('path')

console.log('🐛 DEBUG: Analizando problema de registro...\n')

// 1. Verificar variables de entorno
const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  console.log('📁 CONTENIDO DE .env.local:')
  console.log('==========================')
  console.log(envContent)
  console.log('==========================\n')
} else {
  console.log('❌ .env.local NO ENCONTRADO\n')
}

// 2. Verificar archivos críticos
const criticalFiles = [
  'lib/auth.ts',
  'components/AuthForm.tsx',
  'lib/utils.ts'
]

console.log('📋 VERIFICANDO ARCHIVOS CRÍTICOS:')
console.log('=================================')
criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file)
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} - EXISTE`)
  } else {
    console.log(`❌ ${file} - NO ENCONTRADO`)
  }
})
console.log('')

// 3. Verificar si el servidor está corriendo
const { exec } = require('child_process')

console.log('🌐 VERIFICANDO SERVIDOR:')
console.log('========================')
exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/register', (error, stdout, stderr) => {
  if (error) {
    console.log('❌ SERVIDOR NO RESPONDE')
    console.log('💡 Asegúrate de que esté corriendo: npm run dev')
  } else {
    console.log(`✅ SERVIDOR RESPONDE - HTTP ${stdout}`)
    
    if (stdout === '200') {
      console.log('✅ Página de registro accesible')
    } else {
      console.log('⚠️  Página de registro con problemas')
    }
  }
  
  console.log('')
  console.log('🔍 INSTRUCCIONES PARA DEBUG:')
  console.log('============================')
  console.log('1. Ve a http://localhost:3000/auth/register')
  console.log('2. Abre las Herramientas de Desarrollador (F12)')
  console.log('3. Ve a la pestaña "Console"')
  console.log('4. Completa el formulario e intenta registrarte')
  console.log('5. Busca mensajes que empiecen con "🎭 MODO DEMO"')
  console.log('6. Si no aparecen, hay un problema con la detección del modo demo')
  console.log('')
  console.log('🚨 SI VES EL ERROR "Error de conexión":')
  console.log('======================================')
  console.log('1. Busca errores en la consola del navegador')
  console.log('2. Verifica que aparezca: "🔍 isDemoMode check:"')
  console.log('3. Si no aparece, reinicia el servidor: npm run dev')
  console.log('4. Si sigue fallando, comparte el error de la consola')
})
