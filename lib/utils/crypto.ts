import crypto from "crypto"

export function generateSHA256(input: string | ArrayBuffer): string {
  if (input instanceof ArrayBuffer) {
    return crypto.createHash("sha256").update(Buffer.from(input)).digest("hex")
  }
  return crypto.createHash("sha256").update(input, "utf8").digest("hex")
}

export function generateMD5(input: string | ArrayBuffer): string {
  if (input instanceof ArrayBuffer) {
    return crypto.createHash("md5").update(Buffer.from(input)).digest("hex")
  }
  return crypto.createHash("md5").update(input, "utf8").digest("hex")
}

export function stringToHex(input: string): string {
  return Buffer.from(input, "utf8").toString("hex")
}

export function hexToString(hex: string): string {
  return Buffer.from(hex, "hex").toString("utf8")
}

export function stringToByteArray(input: string): Uint8Array {
  return new TextEncoder().encode(input)
}

export function byteArrayToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}
