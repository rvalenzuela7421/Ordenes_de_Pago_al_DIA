#!/usr/bin/env node

// 🔍 VERIFICADOR DE MODO - Sistema COP
// Ejecutar con: node verificar-modo.js

const fs = require('fs')
const path = require('path')

console.log('🔍 VERIFICANDO CONFIGURACIÓN DEL SISTEMA COP...\n')

// Leer archivo .env.local
const envPath = path.join(__dirname, '.env.local')

if (!fs.existsSync(envPath)) {
  console.log('❌ ERROR: Archivo .env.local no encontrado')
  console.log('📝 Crea el archivo .env.local con las variables de entorno\n')
  process.exit(1)
}

const envContent = fs.readFileSync(envPath, 'utf8')
const envLines = envContent.split('\n')

let supabaseUrl = ''
let supabaseKey = ''

envLines.forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
    supabaseUrl = line.split('=')[1]
  }
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
    supabaseKey = line.split('=')[1]
  }
})

// Determinar modo
const isDemoMode = supabaseUrl === 'https://demo.supabase.co'

console.log('📊 ESTADO ACTUAL:')
console.log('================')

if (isDemoMode) {
  console.log('🎭 MODO: DEMO')
  console.log('📍 URL: ' + supabaseUrl)
  console.log('🔐 Key: ' + (supabaseKey ? 'Configurada (demo)' : 'No configurada'))
  console.log('')
  console.log('⚠️  CARACTERÍSTICAS DEL MODO DEMO:')
  console.log('   ❌ Los usuarios NO se crean realmente')
  console.log('   ❌ No hay persistencia en base de datos')
  console.log('   ✅ Simulación de registro exitoso')
  console.log('   ✅ Validaciones funcionando')
  console.log('   ✅ Interfaz completa en español')
  console.log('')
  console.log('🚀 PARA PASAR A MODO REAL:')
  console.log('   1. Crea cuenta en https://supabase.com')
  console.log('   2. Crea un nuevo proyecto')
  console.log('   3. Ejecuta el archivo SETUP_SUPABASE.sql')
  console.log('   4. Actualiza .env.local con credenciales reales')
  console.log('   5. Reinicia el servidor (npm run dev)')
  console.log('')
  console.log('📖 Lee el archivo: GUIA_SUPABASE_REAL.md')
  
} else {
  console.log('🚀 MODO: PRODUCCIÓN')
  console.log('📍 URL: ' + supabaseUrl)
  console.log('🔐 Key: ' + (supabaseKey ? 'Configurada' : '❌ FALTA'))
  console.log('')
  
  if (supabaseUrl && supabaseKey) {
    console.log('✅ CARACTERÍSTICAS DEL MODO PRODUCCIÓN:')
    console.log('   ✅ Usuarios se crean en Supabase real')
    console.log('   ✅ Persistencia en base de datos')
    console.log('   ✅ Email de confirmación enviado')
    console.log('   ✅ Login real funcionando')
    console.log('   ✅ Todas las funcionalidades activas')
    console.log('')
    console.log('🎯 PARA PROBAR:')
    console.log('   1. Ve a http://localhost:3000/auth/register')
    console.log('   2. Completa el formulario')
    console.log('   3. El usuario se creará en Supabase')
    console.log('   4. Revisa tu email para confirmar cuenta')
  } else {
    console.log('❌ CONFIGURACIÓN INCOMPLETA')
    console.log('📝 Verifica que .env.local tenga:')
    console.log('   - NEXT_PUBLIC_SUPABASE_URL')
    console.log('   - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
}

console.log('')
console.log('🔄 Para verificar nuevamente: node verificar-modo.js')
console.log('📊 Estado del servidor: http://localhost:3000')
console.log('')
