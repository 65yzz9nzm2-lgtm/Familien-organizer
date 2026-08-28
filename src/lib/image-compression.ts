export interface CompressImageOptions {
  /** Longest edge in pixels after resizing. 2000px keeps document text legible. */
  maxDimension?: number
  /** JPEG quality, 0-1. */
  quality?: number
}

/**
 * Downscales and re-encodes an image file as JPEG to keep uploads well under
 * Supabase's free-tier storage quota. Non-image files (PDFs, etc.) and
 * images that are already small pass through unchanged. Falls back to the
 * original file if compression fails or doesn't actually save space.
 */
export async function compressImageIfNeeded(file: File, options: CompressImageOptions = {}): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return file

  const { maxDimension = 2000, quality = 0.85 } = options
  const SMALL_ENOUGH_BYTES = 800 * 1024

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))

    if (scale === 1 && file.size <= SMALL_ENOUGH_BYTES) {
      bitmap.close()
      return file
    }

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^./\\]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    // Decoding can fail for formats the browser doesn't support - upload the original rather than block the user.
    return file
  }
}
