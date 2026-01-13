// AES-256-GCM encryption utilities with URL-safe base64

function toUrlSafeBase64(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromUrlSafeBase64(urlSafe: string): string {
  let base64 = urlSafe.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  return base64
}

export async function generateKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const exported = await crypto.subtle.exportKey('raw', key)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(exported)))
  return toUrlSafeBase64(base64)
}

export async function importKey(keyString: string): Promise<CryptoKey> {
  const base64 = fromUrlSafeBase64(keyString)
  const keyData = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  )
}

export async function encryptData(data: string | ArrayBuffer, key: CryptoKey): Promise<{ encrypted: ArrayBuffer; iv: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const dataBuffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  )
  
  return { encrypted, iv }
}

export async function decryptData(encrypted: ArrayBuffer, iv: Uint8Array, key: CryptoKey): Promise<ArrayBuffer> {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encrypted
  )
}

export function combineIvAndEncrypted(iv: Uint8Array, encrypted: ArrayBuffer): ArrayBuffer {
  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)
  return combined.buffer
}

export function splitIvAndEncrypted(combined: ArrayBuffer): { iv: Uint8Array; encrypted: ArrayBuffer } {
  const iv = new Uint8Array(combined.slice(0, 12))
  const encrypted = combined.slice(12)
  return { iv, encrypted }
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function hashPassword(password: string): Promise<string> {
  const encoded = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded)
  return arrayBufferToBase64(hashBuffer)
}
