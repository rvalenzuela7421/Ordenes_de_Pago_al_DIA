// HERRAMIENTA PARA DIAGNOSTICAR EL TEXTO REAL DE TUS PDFs
const fs = require('fs');
const pdf = require('pdf-parse');

async function debugRealPDF() {
  console.log('🔍 === DIAGNÓSTICO DE PDF REAL ===');
  
  // Lista de posibles ubicaciones donde podrían estar tus PDFs
  const possiblePaths = [
    '/Users/rauloctavio/Downloads/CxP 25 - 1118.pdf',
    '/Users/rauloctavio/Desktop/CxP 25 - 1118.pdf',
    './CxP 25 - 1118.pdf',
    '/Users/rauloctavio/Desktop/Proyectos Cursor/OPs al DIA/CxP 25 - 1118.pdf'
  ];
  
  let pdfPath = null;
  let pdfBuffer = null;
  
  // Buscar el PDF en las ubicaciones posibles
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        console.log(`✅ PDF encontrado en: ${path}`);
        pdfPath = path;
        pdfBuffer = fs.readFileSync(path);
        break;
      }
    } catch (error) {
      // Continuar buscando
    }
  }
  
  if (!pdfBuffer) {
    console.log('❌ PDF no encontrado en las ubicaciones esperadas.');
    console.log('📁 Ubicaciones buscadas:');
    possiblePaths.forEach(path => console.log(`   - ${path}`));
    console.log('');
    console.log('🎯 INSTRUCCIONES:');
    console.log('1. Localiza el archivo "CxP 25 - 1118.pdf"');
    console.log('2. Cópialo a esta carpeta: /Users/rauloctavio/Desktop/Proyectos Cursor/OPs al DIA/');
    console.log('3. Ejecuta este script nuevamente: node debug-real-pdf.js');
    return;
  }
  
  try {
    // Extraer texto del PDF
    console.log('📄 Extrayendo texto del PDF...');
    const data = await pdf(pdfBuffer);
    const texto = data.text;
    
    console.log('✅ Texto extraído exitosamente');
    console.log(`📊 Total de caracteres: ${texto.length}`);
    console.log('');
    
    // Mostrar las primeras 20 líneas
    console.log('📋 === PRIMERAS 20 LÍNEAS DEL PDF ===');
    const lineas = texto.split('\n');
    lineas.slice(0, 20).forEach((linea, index) => {
      console.log(`${(index + 1).toString().padStart(2, '0')}| "${linea.trim()}"`);
    });
    console.log('');
    
    // Buscar líneas que contengan "IVA"
    console.log('🔍 === LÍNEAS QUE CONTIENEN "IVA" ===');
    const lineasConIVA = [];
    lineas.forEach((linea, index) => {
      if (linea.toLowerCase().includes('iva')) {
        lineasConIVA.push({
          numero: index + 1,
          texto: linea.trim()
        });
        console.log(`📍 Línea ${index + 1}: "${linea.trim()}"`);
      }
    });
    
    if (lineasConIVA.length === 0) {
      console.log('❌ NO se encontraron líneas que contengan "IVA"');
      console.log('');
      console.log('🔍 === BÚSQUEDA ALTERNATIVA: PALABRAS SIMILARES ===');
      
      // Buscar palabras similares
      const palabrasAlternativas = ['impuesto', 'tax', 'valor agregado', 'vat', '19%', 'gravado'];
      
      palabrasAlternativas.forEach(palabra => {
        console.log(`\n🔎 Buscando "${palabra}":`);
        lineas.forEach((linea, index) => {
          if (linea.toLowerCase().includes(palabra.toLowerCase())) {
            console.log(`   Línea ${index + 1}: "${linea.trim()}"`);
          }
        });
      });
    } else {
      console.log(`✅ Se encontraron ${lineasConIVA.length} líneas con "IVA"`);
    }
    
    console.log('');
    console.log('📋 === TEXTO COMPLETO DEL PDF ===');
    console.log('(Mostrando todo para análisis completo)');
    console.log('=====================================');
    console.log(texto);
    console.log('=====================================');
    
  } catch (error) {
    console.error('❌ Error al procesar el PDF:', error.message);
  }
}

// Ejecutar el diagnóstico
debugRealPDF().catch(console.error);
