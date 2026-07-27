// src/services/storageService.js
// Service pour gérer l'upload d'images via Supabase Storage
import { supabase } from './supabaseClient'

const BUCKET_NAME = 'images'

/**
 * Upload une image vers Supabase Storage
 * @param {File} file - Le fichier image à uploader
 * @param {string} path - Le chemin de destination (ex: 'avatars/user-id.jpg')
 * @param {Object} options - Options d'upload
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadImage(file, path, options = {}) {
  try {
    // Vérifier que le fichier est une image
    if (!file.type.startsWith('image/')) {
      throw new Error('Le fichier doit être une image')
    }

    // Vérifier la taille du fichier (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      throw new Error('L\'image ne doit pas dépasser 5MB')
    }

    // Générer un nom de fichier unique si non fourni
    const fileName = options.fileName || `${Date.now()}-${file.name}`
    const fullPath = `${path}/${fileName}`

    // Upload le fichier
    const { error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(fullPath, file, {
        cacheControl: '3600',
        upsert: options.upsert || false,
        contentType: file.type,
      })

    if (error) throw error

    // Obtenir l'URL publique
    const { data: { publicUrl } } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(fullPath)

    return {
      publicUrl,
      path: fullPath,
    }
  } catch (error) {
    console.error('[uploadImage]', error)
    throw new Error(`Erreur lors de l'upload: ${error.message}`, { cause: error })
  }
}

/**
 * Supprime une image de Supabase Storage
 * @param {string} path - Le chemin de l'image à supprimer
 * @returns {Promise<boolean>}
 */
export async function deleteImage(path) {
  try {
    const { error } = await supabase
      .storage
      .from(BUCKET_NAME)
      .remove([path])

    if (error) throw error

    return true
  } catch (error) {
    console.error('[deleteImage]', error)
    throw new Error(`Erreur lors de la suppression: ${error.message}`, { cause: error })
  }
}

/**
 * Upload un avatar utilisateur
 * @param {File} file - Le fichier image
 * @param {string} userId - L'ID de l'utilisateur
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadAvatar(file, userId) {
  return uploadImage(file, 'avatars', {
    fileName: `${userId}.jpg`,
    upsert: true,
  })
}

/**
 * Upload une vignette de module
 * @param {File} file - Le fichier image
 * @param {string} moduleId - L'ID du module
 * @returns {Promise<{publicUrl: string, path: string}>}
 */
export async function uploadModuleThumbnail(file, moduleId) {
  return uploadImage(file, 'modules', {
    fileName: `${moduleId}.jpg`,
    upsert: true,
  })
}

/**
 * Upload toutes les images d'un formulaire
 * @param {Object} files - Objet contenant les fichiers à uploader
 * @param {Object} paths - Objet contenant les chemins de destination
 * @returns {Promise<Object>}
 */
export async function uploadMultipleImages(files, paths) {
  const uploads = {}

  for (const [key, file] of Object.entries(files)) {
    if (file && paths[key]) {
      try {
        uploads[key] = await uploadImage(file, paths[key])
      } catch (error) {
        console.error(`Erreur upload ${key}:`, error)
        uploads[key] = null
      }
    }
  }

  return uploads
}
