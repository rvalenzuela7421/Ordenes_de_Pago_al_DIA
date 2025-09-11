import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { uploadAvatar, setupAvatarsBucket } from '@/lib/storage'

// Configurar el límite de tamaño y permitir formData
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  try {
    // Verificar autenticación
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' })
    }

    const token = authHeader.split(' ')[1]
    const supabase = createAdminClient()
    
    // Verificar token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return res.status(401).json({ error: 'Token inválido' })
    }

    // Obtener el archivo de FormData
    const contentType = req.headers['content-type']
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type debe ser multipart/form-data' })
    }

    // Parse manual del FormData (simplificado para el ejemplo)
    // En producción, considera usar una librería como `formidable` o `multer`
    const boundary = contentType.split('boundary=')[1]
    if (!boundary) {
      return res.status(400).json({ error: 'Boundary no encontrado en Content-Type' })
    }

    // Para simplificar, vamos a recibir el archivo como base64
    const { fileData, fileName, mimeType } = req.body

    if (!fileData || !fileName || !mimeType) {
      return res.status(400).json({ error: 'Datos del archivo requeridos: fileData, fileName, mimeType' })
    }

    // Convertir base64 a File
    const buffer = Buffer.from(fileData, 'base64')
    const file = new File([buffer], fileName, { type: mimeType })

    // Configurar bucket si no existe
    const bucketSetup = await setupAvatarsBucket()
    if (!bucketSetup.success) {
      return res.status(500).json({ error: `Error configurando storage: ${bucketSetup.error}` })
    }

    // Subir avatar
    const uploadResult = await uploadAvatar(file, user.id)
    
    if (!uploadResult.success) {
      return res.status(400).json({ error: uploadResult.error })
    }

    // Actualizar perfil del usuario con la nueva URL del avatar
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: uploadResult.url })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error actualizando perfil:', updateError)
      return res.status(500).json({ error: 'Error actualizando perfil del usuario' })
    }

    return res.status(200).json({ 
      success: true, 
      avatar_url: uploadResult.url,
      message: 'Avatar subido exitosamente' 
    })

  } catch (error) {
    console.error('Error en upload-avatar:', error)
    return res.status(500).json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}
