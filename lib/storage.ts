import { createClient } from '@supabase/supabase-js'

// Cliente de Supabase con permisos de administrador para storage
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Configuración del bucket de archivos
const BUCKET_NAME = 'solicitudes-archivos'

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
