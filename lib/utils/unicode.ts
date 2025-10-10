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

export function transliterateToAscii(text: string): string {
  // First remove diacritics
  let result = removeDiacritics(text)

  // Basic transliteration for common non-Latin characters
  const transliterationMap: Record<string, string> = {
    // Arabic
    ا: "a",
    ب: "b",
    ت: "t",
    ث: "th",
    ج: "j",
    ح: "h",
    خ: "kh",
    د: "d",
    ذ: "dh",
    ر: "r",
    ز: "z",
    س: "s",
    ش: "sh",
    ص: "s",
    ض: "d",
    ط: "t",
    ظ: "z",
    ع: "",
    غ: "gh",
    ف: "f",
    ق: "q",
    ك: "k",
    ل: "l",
    م: "m",
    ن: "n",
    ه: "h",
    و: "w",
    ي: "y",
    // Cyrillic
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    е: "e",
    ё: "yo",
    ж: "zh",
    з: "z",
    и: "i",
    й: "y",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ъ: "",
    ы: "y",
    ь: "",
    э: "e",
    ю: "yu",
    я: "ya",
    // Greek
    α: "a",
    β: "b",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "e",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "ch",
    ψ: "ps",
    ω: "o",
  }

  result = result
    .split("")
    .map((char) => {
      return transliterationMap[char] || char
    })
    .join("")

  // Remove any remaining non-ASCII characters
  result = result.replace(/[^\x00-\x7F]/g, "")

  return result
}

export function getByteSequence(text: string): string {
  const encoder = new TextEncoder()
  const bytes = encoder.encode(text)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).toUpperCase().padStart(2, "0"))
    .join(" ")
}
