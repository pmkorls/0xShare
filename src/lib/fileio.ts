const FILEIO_API = 'https://file.io'

export interface FileIOUploadResponse {
  success: boolean
  status: number
  id: string
  key: string
  name: string
  link: string
  expires: string
  expiry: string
  downloads: number
  maxDownloads: number
  autoDelete: boolean
  size: number
  mimeType: string
  created: string
  modified: string
}

export interface FileIOError {
  success: false
  status: number
  message: string
}

export interface UploadOptions {
  expires?: string // e.g., '1d', '7d', '14d' (max 14 days on free tier)
  maxDownloads?: number
  autoDelete?: boolean
}

function buildExpiryString(minutes: number): string {
  if (minutes <= 60) return `${minutes}m`
  if (minutes <= 1440) return `${Math.ceil(minutes / 60)}h`
  return `${Math.ceil(minutes / 1440)}d`
}

export async function uploadToFileIO(
  file: Blob | File,
  options: UploadOptions = {}
): Promise<FileIOUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  
  if (options.expires) {
    formData.append('expires', options.expires)
  }
  if (options.maxDownloads !== undefined) {
    formData.append('maxDownloads', options.maxDownloads.toString())
  }
  if (options.autoDelete !== undefined) {
    formData.append('autoDelete', options.autoDelete.toString())
  }

  const response = await fetch(FILEIO_API, {
    method: 'POST',
    body: formData,
  })

  const data = await response.json()
  
  if (!data.success) {
    throw new Error(data.message || 'Upload failed')
  }

  return data as FileIOUploadResponse
}

export async function uploadEncryptedFile(
  encryptedData: ArrayBuffer,
  fileName: string,
  expiryMinutes?: number
): Promise<{ key: string; link: string; expires: string }> {
  const blob = new Blob([encryptedData], { type: 'application/octet-stream' })
  const file = new File([blob], fileName, { type: 'application/octet-stream' })

  const options: UploadOptions = {
    autoDelete: false, // We manage deletion ourselves
  }

  if (expiryMinutes) {
    // File.io max is 14 days, but we limit to 60 minutes in UI
    options.expires = buildExpiryString(Math.min(expiryMinutes, 20160))
  } else {
    // Default to 14 days if no expiry specified
    options.expires = '14d'
  }

  const result = await uploadToFileIO(file, options)
  
  return {
    key: result.key,
    link: result.link,
    expires: result.expires,
  }
}

export async function downloadFromFileIO(key: string): Promise<ArrayBuffer> {
  const response = await fetch(`${FILEIO_API}/${key}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('File not found or expired')
  }

  return response.arrayBuffer()
}

export function encodeFileKey(key: string): string {
  return btoa(key).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeFileKey(encoded: string): string {
  let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return atob(base64)
}
