export const KDF_ITERATIONS = 600_000

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes
}

export function normalizeAnswer(answer: string): string {
  return answer.trim().normalize('NFC').toLocaleLowerCase('en-US')
}

async function deriveKek(secret: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-KW', length: 256 },
    false,
    ['wrapKey', 'unwrapKey'],
  )
}

export async function generateDek(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
}

export async function wrapDek(dek: CryptoKey, secret: string, iterations = KDF_ITERATIONS): Promise<{ salt: string; wrapped: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const kek = await deriveKek(secret, salt, iterations)
  const wrapped = new Uint8Array(await crypto.subtle.wrapKey('raw', dek, kek, 'AES-KW'))
  return { salt: bytesToBase64(salt), wrapped: bytesToBase64(wrapped) }
}

export async function unwrapDek(wrapped: string, salt: string, secret: string, iterations: number): Promise<CryptoKey> {
  const kek = await deriveKek(secret, base64ToBytes(salt), iterations)
  return crypto.subtle.unwrapKey(
    'raw',
    base64ToBytes(wrapped),
    kek,
    'AES-KW',
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(value))),
  )
  const packed = new Uint8Array(iv.length + cipher.length)
  packed.set(iv, 0)
  packed.set(cipher, iv.length)
  return bytesToBase64(packed)
}

export async function decryptJson<T>(key: CryptoKey, payload: string): Promise<T> {
  const packed = base64ToBytes(payload)
  const iv = packed.slice(0, 12)
  const cipher = packed.slice(12)
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher)
  return JSON.parse(new TextDecoder().decode(plain)) as T
}
