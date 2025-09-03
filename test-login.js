#!/usr/bin/env node

// 🧪 HERRAMIENTA DE PRUEBA - Login en Modo Demo
// Ejecutar con: node test-login.js

console.log('🧪 PRUEBA DE LOGIN EN MODO DEMO')
console.log('==============================\n')

// Simular el proceso de login
async function testLogin() {
  console.log('🔍 1. VERIFICANDO ESTADO DEL SERVIDOR...')
  
  try {
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)
    
    const { stdout } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login')
    
    if (stdout.trim() === '200') {
      console.log('✅ Servidor respondiendo correctamente')
    } else {
      console.log('❌ Servidor con problemas:', stdout)
      return
    }
  } catch (error) {
    console.log('❌ No se puede conectar al servidor')
    console.log('💡 Asegúrate de ejecutar: npm run dev')
    return
  }

  console.log('\n🔍 2. VERIFICANDO MODO DEMO...')
  
  const fs = require('fs')
  const envContent = fs.readFileSync('.env.local', 'utf8')
  const isDemo = envContent.includes('https://demo.supabase.co')
  
  if (isDemo) {
    console.log('✅ MODO DEMO ACTIVO')
  } else {
    console.log('❌ MODO PRODUCCIÓN - Esta prueba es solo para modo demo')
    return
  }

  console.log('\n🧪 3. INSTRUCCIONES PARA PRUEBA MANUAL:')
  console.log('=====================================')
  console.log('1. Ve a: http://localhost:3000/auth/login')
  console.log('2. Abre herramientas de desarrollador (F12)')
  console.log('3. Ve a la pestaña "Console"')
  console.log('4. Ingresa CUALQUIER email y contraseña, por ejemplo:')
  console.log('   Email: demo@test.com')
  console.log('   Contraseña: cualquier123')
  console.log('5. Presiona "Ingresar"')
  console.log('')
  console.log('🎯 LO QUE DEBERÍAS VER:')
  console.log('======================')
  console.log('✅ En la CONSOLA:')
  console.log('   "🔍 isDemoMode check: { url: "https://demo.supabase.co", isDemo: true }"')
  console.log('   "🎭 MODO DEMO: Simulando login con email..."')
  console.log('')
  console.log('✅ En la PANTALLA:')
  console.log('   "🎭 ¡Login simulado exitoso! Redirigiendo al dashboard..."')
  console.log('')
  console.log('🚨 SI VES EL ERROR:')
  console.log('===================')
  console.log('❌ "Error de conexión. Verifica tu conexión a internet"')
  console.log('💡 Significa que la detección del modo demo no está funcionando')
  console.log('💡 Comparte los mensajes de la consola del navegador')
  console.log('')
  console.log('🔄 CREDENCIALES DE PRUEBA:')
  console.log('==========================')
  console.log('Email: test@demo.com')
  console.log('Contraseña: Demo123!')
  console.log('(En modo demo, CUALQUIER credencial funciona)')
  console.log('')
  console.log('📊 REINICIAR SERVIDOR SI ES NECESARIO:')
  console.log('======================================')
  console.log('1. Presiona Ctrl+C en la terminal donde corre npm run dev')
  console.log('2. Ejecuta: npm run dev')
  console.log('3. Espera a que cargue completamente')
  console.log('4. Intenta el login nuevamente')
  console.log('')
}

testLogin().catch(console.error)
