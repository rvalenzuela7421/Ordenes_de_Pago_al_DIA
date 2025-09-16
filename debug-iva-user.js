// DIAGNÓSTICO ESPECÍFICO PARA EL PDF DEL USUARIO
// Texto de ejemplo basado en la imagen compartida por el usuario

const textoEjemplo = `
CUENTA DE COBRO No. 2024-048

SEÑORES:
SEGUROS BOLÍVAR S.A.
Carrera 10 # 18-36 Piso 4
BOGOTÁ D.C.

Por concepto de servicios prestados correspondientes al mes de octubre de 2024
Asesoría especializada en temas tributarios y contables para el área financiera.

Valor de los Servicios           $ 129.396
IVA (19%)                        $ 24.585  
TOTAL A PAGAR                    $ 153.981

Fecha: 15/10/2024
Vencimiento: 30/10/2024

Atentamente,
NOMBRE DEL PROVEEDOR
CC 12.345.678-9
`;

console.log('🔍 === DIAGNÓSTICO ESPECÍFICO DEL PDF DEL USUARIO ===');
console.log('📄 Texto de ejemplo basado en la imagen compartida:');
console.log(textoEjemplo);
console.log('================================================');

// REPRODUCIR LA LÓGICA DE EXTRACCIÓN DE IVA DEL BACKEND
function extraerIVAComoEnBackend(texto) {
  console.log('6️⃣ Extrayendo IVA del documento...');
  
  const lineas = texto.split('\n');
  console.log(`📋 Total de líneas en el documento: ${lineas.length}`);
  
  // NUEVA LÓGICA MEJORADA: 5 patrones específicos para capturar IVA
  const patronesIVA = [
    /IVA\s*\([^)]*\)\s*[$]?\s*([\d.,]+)/i,           // IVA (19%) $ 24.585
    /IVA\s*[$]?\s*([\d.,]+)/i,                       // IVA $ 24.585  
    /Valor\s*I\.?V\.?A\.?\s*[$]?\s*([\d.,]+)/i,      // Valor IVA $ 24.585
    /I\.?V\.?A\.?\s*\d+%?\s*[$]?\s*([\d.,]+)/i,      // I.V.A. 19% $ 24.585
    /Total\s*I\.?V\.?A\.?\s*[$]?\s*([\d.,]+)/i       // Total IVA $ 24.585
  ];
  
  const valoresEncontrados = [];
  
  console.log('🔍 Buscando IVA en líneas que contengan "IVA"...');
  lineas.forEach((linea, index) => {
    if (linea.toLowerCase().includes('iva')) {
      console.log(`📍 Línea ${index + 1} contiene "IVA": "${linea.trim()}"`);
      
      // Probar todos los patrones
      patronesIVA.forEach((patron, patronIndex) => {
        const match = linea.match(patron);
        if (match) {
          const valorTexto = match[1];
          console.log(`✅ Patrón ${patronIndex + 1} coincide: "${valorTexto}"`);
          
          // Limpiar y convertir a número
          const valorLimpio = valorTexto.replace(/[$.]/g, '').replace(/,/g, '');
          const valorNumerico = parseFloat(valorLimpio);
          
          console.log(`🔢 Conversión: "${valorTexto}" → "${valorLimpio}" → ${valorNumerico}`);
          
          if (!isNaN(valorNumerico) && valorNumerico > 1000) {
            console.log(`✅ Valor válido encontrado: $${valorNumerico.toLocaleString('es-CO')}`);
            valoresEncontrados.push(valorNumerico);
          } else if (!isNaN(valorNumerico)) {
            console.log(`❌ Valor descartado (muy pequeño, posible %): ${valorNumerico}`);
          } else {
            console.log(`❌ Valor no numérico: ${valorTexto}`);
          }
        }
      });
    }
  });
  
  console.log(`📊 Valores de IVA encontrados: [${valoresEncontrados.join(', ')}]`);
  
  // Seleccionar el valor más alto
  let ivaFinalEncontrado = null;
  if (valoresEncontrados.length > 0) {
    ivaFinalEncontrado = Math.max(...valoresEncontrados);
    console.log(`✅ Valor IVA final: $${ivaFinalEncontrado.toLocaleString('es-CO')}`);
  } else {
    console.log('❌ No se encontraron valores de IVA válidos');
  }
  
  // ASIGNACIÓN FINAL
  console.log('🔍 DIAGNÓSTICO FINAL IVA:');
  console.log(`  📊 ivaFinalEncontrado: ${ivaFinalEncontrado}`);
  console.log(`  🎯 Condición (ivaFinalEncontrado > 0): ${ivaFinalEncontrado !== null && ivaFinalEncontrado > 0}`);
  
  if (ivaFinalEncontrado !== null && ivaFinalEncontrado > 0) {
    console.log(`✅ RESULTADO IVA FINAL: tieneIVA=true, valorIVA=$${ivaFinalEncontrado.toLocaleString('es-CO')}`);
    console.log('🎯 ¡EL IVA SE ENVIARÁ AL FRONTEND!');
    return {
      tieneIVA: true,
      valorIVA: ivaFinalEncontrado
    };
  } else {
    console.log('❌ RESULTADO IVA FINAL: tieneIVA=false, valorIVA=null');
    console.log('⚠️ NO se encontró IVA válido - campo permanecerá vacío');
    return {
      tieneIVA: false,
      valorIVA: null
    };
  }
}

// EJECUTAR LA PRUEBA
const resultado = extraerIVAComoEnBackend(textoEjemplo);

console.log('');
console.log('🚀 === RESULTADO FINAL ===');
console.log(`tieneIVA: ${resultado.tieneIVA}`);
console.log(`valorIVA: ${resultado.valorIVA}`);
console.log('==========================');

// VERIFICACIÓN ESPECÍFICA
console.log('');
console.log('🎯 === VERIFICACIÓN ESPECÍFICA ===');
console.log('¿Se debería extraer $24,585? SÍ');
console.log(`¿Se extrajo? ${resultado.valorIVA === 24585 ? '✅ SÍ' : '❌ NO'}`);
console.log('===================================');
