// Unicode normalization and validation utilities
export function normalizeUnicode(input: string, form: "NFC" | "NFD" | "NFKC" | "NFKD" = "NFC"): string {
  return input.normalize(form)
}

export function detectScript(text: string): string {
  // Basic script detection based on Unicode ranges
  const codePoint = text.codePointAt(0)
  if (!codePoint) return "Zzzz" // Unknown

  if (codePoint >= 0x0600 && codePoint <= 0x06ff) return "Arab" // Arabic
  if (codePoint >= 0x0400 && codePoint <= 0x04ff) return "Cyrl" // Cyrillic
  if (codePoint >= 0x0370 && codePoint <= 0x03ff) return "Grek" // Greek
  if (codePoint >= 0x0590 && codePoint <= 0x05ff) return "Hebr" // Hebrew
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) return "Hani" // Han (Chinese)
  if (codePoint >= 0x3040 && codePoint <= 0x309f) return "Hira" // Hiragana
  if (codePoint >= 0x30a0 && codePoint <= 0x30ff) return "Kana" // Katakana
  if (codePoint >= 0x0e00 && codePoint <= 0x0e7f) return "Thai" // Thai
  if (codePoint >= 0x0020 && codePoint <= 0x007f) return "Latn" // Latin

  return "Zzzz" // Unknown
}

export function removeDiacritics(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
}

export function calculateLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  return matrix[b.length][a.length]
}

export function calculateSimilarity(a: string, b: string): number {
  const distance = calculateLevenshteinDistance(a, b)
  const maxLength = Math.max(a.length, b.length)
  if (maxLength === 0) return 1.0
  return 1 - distance / maxLength
}
