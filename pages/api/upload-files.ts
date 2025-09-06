import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

// Configuración para el manejo de archivos
export const config = {
  api: {
    bodyParser: false, // Deshabilitamos el body parser por defecto para manejar archivos
  },
}

// Crear cliente de Supabase con permisos de administrador
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Función para generar nombre único de archivo
function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  const extension = path.extname(originalName)
  const baseName = path.basename(originalName, extension)
    .replace(/[^a-zA-Z0-9]/g, '-') // Reemplazar caracteres especiales
    .toLowerCase()
  
  return `${baseName}-${timestamp}-${random}${extension}`
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Configurar formidable para parsear archivos
    const form = formidable({
      maxFiles: 2, // Máximo 2 archivos (PDF + XLSX)
      maxFileSize: 10 * 1024 * 1024, // 10MB máximo por archivo
      keepExtensions: true,
    })

    // Parsear la request
    const [fields, files] = await form.parse(req)

    console.log('📁 Archivos recibidos:', Object.keys(files))
    
    const uploadedFiles: Record<string, string> = {}

    // Procesar cada archivo
    for (const [fieldName, fileArray] of Object.entries(files)) {
      if (!fileArray || fileArray.length === 0) continue

      const file = Array.isArray(fileArray) ? fileArray[0] : fileArray
      
      console.log(`📄 Procesando archivo: ${fieldName}`, {
        originalFilename: file.originalFilename,
        mimetype: file.mimetype,
        size: file.size
      })

      // Validar tipo de archivo
      if (fieldName === 'pdf' && file.mimetype !== 'application/pdf') {
        return res.status(400).json({ 
          error: 'El archivo PDF debe ser de tipo application/pdf' 
        })
      }

      if (fieldName === 'xlsx' && 
          file.mimetype !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        return res.status(400).json({ 
          error: 'El archivo XLSX debe ser de tipo application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        })
      }

      // Generar nombre único
      const uniqueFileName = generateUniqueFileName(file.originalFilename || 'archivo')
      
      // Leer el archivo
      const fileBuffer = fs.readFileSync(file.filepath)
      
      // Subir a Supabase Storage
      const { data, error } = await supabaseAdmin.storage
        .from('solicitudes-archivos') // Bucket para archivos de solicitudes
        .upload(`${fieldName}/${uniqueFileName}`, fileBuffer, {
          contentType: file.mimetype || 'application/octet-stream',
          upsert: false
        })

      if (error) {
        console.error(`Error subiendo archivo ${fieldName}:`, error)
        return res.status(500).json({ 
          error: `Error subiendo archivo ${fieldName}: ${error.message}` 
        })
      }

      // Obtener URL pública del archivo
      const { data: urlData } = supabaseAdmin.storage
        .from('solicitudes-archivos')
        .getPublicUrl(data.path)

      uploadedFiles[fieldName] = urlData.publicUrl

      console.log(`✅ Archivo ${fieldName} subido exitosamente:`, urlData.publicUrl)

      // Limpiar archivo temporal
      fs.unlinkSync(file.filepath)
    }

    // Responder con las URLs de los archivos subidos
    res.status(200).json({
      success: true,
      files: uploadedFiles,
      message: `${Object.keys(uploadedFiles).length} archivo(s) subido(s) exitosamente`
    })

  } catch (error) {
    console.error('Error en upload-files API:', error)
    res.status(500).json({ 
      error: 'Error interno del servidor al subir archivos',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
