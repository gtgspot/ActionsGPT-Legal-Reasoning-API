// Browser-compatible crypto utilities using Web Crypto API

export async function generateSHA256(input: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder()
  const data = typeof input === "string" ? encoder.encode(input) : input
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function generateMD5(input: string | ArrayBuffer): Promise<string> {
  // MD5 is not available in Web Crypto API, so we'll use SHA-256 as fallback
  // For a real implementation, you'd need a JS library like crypto-js
  console.warn("MD5 not available in browser, using SHA-256 instead")
  return generateSHA256(input)
}

export function stringToHex(input: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(input)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function hexToString(hex: string): string {
  const bytes = new Uint8Array(hex.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || [])
  return new TextDecoder().decode(bytes)
}

export function stringToByteArray(input: string): Uint8Array {
  return new TextEncoder().encode(input)
}

export function byteArrayToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}
