import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase con permisos de administrador para storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configuración del bucket de archivos
const BUCKET_NAME = 'solicitudes-archivos'
const AVATARS_BUCKET = 'avatars'

/**
 * Configura el bucket de storage si no existe
 */
export async function setupStorageBucket() {
  try {
    // Verificar si el bucket existe
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.id === BUCKET_NAME)

    if (!bucketExists) {
      // Crear bucket público
      const { data, error } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        allowedMimeTypes: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        fileSizeLimit: 10485760 // 10MB
      })

      if (error) {
        console.error('Error creando bucket:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Bucket creado exitosamente:', data)
    } else {
      console.log('✅ Bucket ya existe:', BUCKET_NAME)
    }

    return { success: true, bucket: BUCKET_NAME }
  } catch (error) {
    console.error('Error configurando storage:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

/**
 * Sube un archivo al storage de Supabase
 */
export async function uploadFile(
  file: File, 
  folder: 'pdf' | 'xlsx', 
  fileName: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const filePath = `${folder}/${fileName}`
    
    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Subir archivo
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Error subiendo archivo:', error)
      return { success: false, error: error.message }
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path)

    return { success: true, url: urlData.publicUrl }

  } catch (error) {
    console.error('Error en uploadFile:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Elimina un archivo del storage
 */
export async function deleteFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Error eliminando archivo:', error)
      return { success: false, error: error.message }
    }

    return { success: true }

  } catch (error) {
    console.error('Error en deleteFile:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Obtiene información de un archivo
 */
export async function getFileInfo(filePath: string) {
  try {
    // Extraer folder y filename del path
    const pathParts = filePath.split('/')
    const folder = pathParts.slice(0, -1).join('/')
    const filename = pathParts[pathParts.length - 1]

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .list(folder, {
        search: filename
      })

    if (error) {
      console.error('Error obteniendo info del archivo:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data?.[0] || null }

  } catch (error) {
    console.error('Error en getFileInfo:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Configura el bucket de avatares si no existe
 */
export async function setupAvatarsBucket() {
  try {
    // Verificar si el bucket existe
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = buckets?.some(bucket => bucket.id === AVATARS_BUCKET)

    if (!bucketExists) {
      // Crear bucket público para avatares
      const { data, error } = await supabaseAdmin.storage.createBucket(AVATARS_BUCKET, {
        public: true,
        allowedMimeTypes: [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/webp'
        ],
        fileSizeLimit: 5242880 // 5MB
      })

      if (error) {
        console.error('Error creando bucket de avatares:', error)
        return { success: false, error: error.message }
      }

      console.log('✅ Bucket de avatares creado exitosamente:', data)
    } else {
      console.log('✅ Bucket de avatares ya existe:', AVATARS_BUCKET)
    }

    return { success: true, bucket: AVATARS_BUCKET }
  } catch (error) {
    console.error('Error configurando storage de avatares:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

/**
 * Sube un avatar al storage de Supabase
 */
export async function uploadAvatar(
  file: File, 
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, WebP' }
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5242880) {
      return { success: false, error: 'El archivo es demasiado grande. Máximo 5MB permitido' }
    }

    // Generar nombre de archivo único
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${userId}_${Date.now()}.${fileExtension}`
    const filePath = `avatars/${fileName}`
    
    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Eliminar avatar anterior si existe
    await deleteOldAvatar(userId)
    
    // Subir nuevo avatar
    const { data, error } = await supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .upload(filePath, arrayBuffer, {
        contentType: file.type,
        upsert: false
      })

    if (error) {
      console.error('Error subiendo avatar:', error)
      return { success: false, error: error.message }
    }

    // Obtener URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(data.path)

    return { success: true, url: urlData.publicUrl }

  } catch (error) {
    console.error('Error en uploadAvatar:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}

/**
 * Elimina el avatar anterior de un usuario
 */
export async function deleteOldAvatar(userId: string): Promise<void> {
  try {
    // Listar archivos del usuario
    const { data: files } = await supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .list('avatars', {
        search: userId
      })

    if (files && files.length > 0) {
      // Eliminar archivos antiguos del usuario
      const filesToDelete = files
        .filter(file => file.name.startsWith(userId))
        .map(file => `avatars/${file.name}`)

      if (filesToDelete.length > 0) {
        await supabaseAdmin.storage
          .from(AVATARS_BUCKET)
          .remove(filesToDelete)
        
        console.log(`✅ Eliminados ${filesToDelete.length} avatares antiguos del usuario ${userId}`)
      }
    }
  } catch (error) {
    console.error('Error eliminando avatar anterior:', error)
    // No lanzar error, ya que esto es secundario
  }
}

/**
 * Elimina completamente el avatar de un usuario
 */
export async function deleteAvatar(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteOldAvatar(userId)
    return { success: true }
  } catch (error) {
    console.error('Error en deleteAvatar:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    }
  }
}
