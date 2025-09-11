import { NextApiRequest, NextApiResponse } from 'next'
import { createAdminClient } from '@/lib/supabase'
import { uploadAvatar, setupAvatarsBucket } from '@/lib/storage'
import formidable from 'formidable'

// Deshabilitar bodyParser para manejar multipart/form-data manualmente
export const config = {
  api: {
    bodyParser: false,
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

    // Verificar Content-Type
    const contentType = req.headers['content-type']
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({ error: 'Content-Type debe ser multipart/form-data' })
    }

    // Configurar formidable para parsear el archivo
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB límite
      allowEmptyFiles: false,
      filter: ({ mimetype }) => {
        // Solo permitir imágenes
        return Boolean(mimetype && mimetype.startsWith('image/'))
      }
    })

    // Parsear el formulario
    const [fields, files] = await form.parse(req)
    
    // Obtener el archivo subido
    const avatarFile = Array.isArray(files.avatar) ? files.avatar[0] : files.avatar
    
    if (!avatarFile) {
      return res.status(400).json({ error: 'No se encontró archivo de avatar' })
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(avatarFile.mimetype || '')) {
      return res.status(400).json({ error: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WebP' })
    }

    // Crear objeto File compatible con nuestra función uploadAvatar
    const fs = await import('fs')
    const buffer = fs.readFileSync(avatarFile.filepath)
    const file = new File([buffer], avatarFile.originalFilename || 'avatar.jpg', { 
      type: avatarFile.mimetype || 'image/jpeg' 
    })

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

    // Limpiar archivo temporal
    try {
      fs.unlinkSync(avatarFile.filepath)
    } catch (cleanupError) {
      console.warn('No se pudo limpiar archivo temporal:', cleanupError)
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
