#!/usr/bin/env node

// 🧪 HERRAMIENTA DE PRUEBA - Login y Redirección
// Ejecutar con: node test-login-redirect.js

console.log('🧪 PRUEBA DE LOGIN Y REDIRECCIÓN')
console.log('===============================\n')

const { exec } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

async function testLoginRedirect() {
  console.log('🔍 1. VERIFICANDO ESTADO DEL SERVIDOR...')
  
  try {
    const { stdout: loginStatus } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login')
    const { stdout: dashboardStatus } = await execAsync('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard')
    
    console.log(`✅ Login: HTTP ${loginStatus.trim()}`)
    console.log(`✅ Dashboard: HTTP ${dashboardStatus.trim()}`)
    
    if (loginStatus.trim() !== '200' || dashboardStatus.trim() !== '200') {
      console.log('❌ Algunas páginas no están funcionando')
      return
    }
  } catch (error) {
    console.log('❌ Error verificando servidor:', error.message)
    return
  }

  console.log('\n🔍 2. VERIFICANDO MODO DEMO...')
  
  const fs = require('fs')
  try {
    const envContent = fs.readFileSync('.env.local', 'utf8')
    const isDemo = envContent.includes('https://demo.supabase.co')
    
    if (isDemo) {
      console.log('✅ MODO DEMO ACTIVO')
    } else {
      console.log('❌ MODO PRODUCCIÓN - Esta prueba es para modo demo')
      return
    }
  } catch (error) {
    console.log('❌ No se puede leer .env.local')
    return
  }

  console.log('\n🎯 3. INSTRUCCIONES DETALLADAS DE PRUEBA:')
  console.log('========================================')
  
  console.log('\n📱 PASO 1: ACCEDER AL LOGIN')
  console.log('============================')
  console.log('1. Abre el navegador en: http://localhost:3000/auth/login')
  console.log('2. Abre las herramientas de desarrollador (F12)')
  console.log('3. Ve a la pestaña "Console"')
  console.log('4. Ve a la pestaña "Application" → "Session Storage"')
  console.log('')
  
  console.log('🔍 VERIFICAR EN SESSION STORAGE:')
  console.log('- NO debe haber "demo_login_active"')
  console.log('- NO debe haber "demo_user_email"')
  console.log('')
  
  console.log('📝 PASO 2: INTENTAR LOGIN')
  console.log('=========================')
  console.log('1. Ingresa CUALQUIER credencial:')
  console.log('   Email: test@cop.com')
  console.log('   Contraseña: Test123!')
  console.log('2. Presiona "Ingresar"')
  console.log('')
  
  console.log('🎯 LO QUE DEBERÍAS VER EN LA CONSOLA:')
  console.log('====================================')
  console.log('✅ "🔍 isDemoMode check: { url: \'https://demo.supabase.co\', isDemo: true }"')
  console.log('✅ "🎭 MODO DEMO: Simulando login con email..."')
  console.log('✅ "🎭 MODO DEMO: Sesión demo establecida, redirigiendo al dashboard"')
  console.log('')
  
  console.log('🎯 LO QUE DEBERÍAS VER EN SESSION STORAGE:')
  console.log('==========================================')
  console.log('✅ demo_login_active: "true"')
  console.log('✅ demo_user_email: "test@cop.com"')
  console.log('')
  
  console.log('🎯 LO QUE DEBERÍAS VER EN PANTALLA:')
  console.log('===================================')
  console.log('✅ Mensaje: "🎭 ¡Login simulado exitoso! Redirigiendo al dashboard..."')
  console.log('✅ Después de 2 segundos: REDIRECCIÓN AUTOMÁTICA AL DASHBOARD')
  console.log('')
  
  console.log('📊 PASO 3: VERIFICAR DASHBOARD')
  console.log('===============================')
  console.log('Después de la redirección deberías ver:')
  console.log('✅ URL cambia a: http://localhost:3000/dashboard')
  console.log('✅ Dashboard con mensaje: "¡Bienvenido al Sistema COP! 🎭"')
  console.log('✅ Sidebar con opción "Inicio"')
  console.log('✅ Avatar "UD" en parte superior derecha')
  console.log('✅ Estadísticas y datos demo')
  console.log('')
  
  console.log('🔍 LO QUE DEBERÍAS VER EN LA CONSOLA DEL DASHBOARD:')
  console.log('===================================================')
  console.log('✅ "🎭 MODO DEMO: Obteniendo perfil de usuario demo..."')
  console.log('✅ "🎭 MODO DEMO: Usuario demo encontrado: usuario.demo@cop.com"')
  console.log('')
  
  console.log('🧪 PASO 4: PROBAR LOGOUT')
  console.log('=========================')
  console.log('1. En el dashboard, haz clic en el avatar "UD" (parte superior derecha)')
  console.log('2. Haz clic en "Cerrar Sesión" (botón rojo)')
  console.log('3. Deberías ver animación de carga')
  console.log('4. Redirección automática de vuelta al login')
  console.log('')
  
  console.log('🎯 LO QUE DEBERÍAS VER EN LA CONSOLA AL LOGOUT:')
  console.log('===============================================')
  console.log('✅ "🎭 MODO DEMO: Simulando cierre de sesión..."')
  console.log('✅ "🎭 MODO DEMO: Cerrando sesión demo..."')
  console.log('✅ "🎭 MODO DEMO: Sesión cerrada exitosamente"')
  console.log('')
  
  console.log('🔍 VERIFICAR SESSION STORAGE DESPUÉS DEL LOGOUT:')
  console.log('===============================================')
  console.log('✅ demo_login_active: ELIMINADO')
  console.log('✅ demo_user_email: ELIMINADO')
  console.log('')
  
  console.log('🚨 SI EL LOGIN NO REDIRIGE AL DASHBOARD:')
  console.log('========================================')
  console.log('1. Verifica que aparezcan TODOS los mensajes de consola mencionados')
  console.log('2. Verifica que session storage contenga "demo_login_active"')
  console.log('3. Verifica que no haya errores de JavaScript en la consola')
  console.log('4. Intenta en modo incógnito del navegador')
  console.log('5. Si persiste, comparte TODOS los mensajes de la consola')
  console.log('')
  
  console.log('🚨 SI EL DASHBOARD NO CARGA:')
  console.log('============================')
  console.log('1. Verifica que aparezca: "🎭 MODO DEMO: Usuario demo encontrado:"')
  console.log('2. Si aparece "🎭 MODO DEMO: No hay sesión demo activa" → problema con sessionStorage')
  console.log('3. Verifica que ProtectedRoute no esté redirigiendo')
  console.log('4. Revisa si hay errores de compilación en la terminal')
  console.log('')
  
  console.log('✅ CREDENCIALES DE PRUEBA RECOMENDADAS:')
  console.log('=======================================')
  console.log('Email: admin@cop.com')
  console.log('Contraseña: Admin123!')
  console.log('(En modo demo, CUALQUIER credencial funciona)')
  console.log('')
  
  console.log('🎯 FLUJO ESPERADO COMPLETO:')
  console.log('===========================')
  console.log('LOGIN → Session Storage Set → DASHBOARD → Avatar → LOGOUT → Session Storage Clear → LOGIN')
  console.log('')
  
  console.log('🔧 SI NECESITAS REINICIAR:')
  console.log('==========================')
  console.log('1. Ctrl+C en la terminal del servidor')
  console.log('2. npm run dev')
  console.log('3. Esperar a que compile completamente')
  console.log('4. Probar nuevamente')
  console.log('')
  
  console.log('🎉 ¡AHORA EL LOGIN DEBERÍA REDIRIGIR CORRECTAMENTE AL DASHBOARD!')
  console.log('')
}

testLoginRedirect().catch(console.error)
