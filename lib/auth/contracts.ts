import crypto from "crypto"
import { z } from "zod"

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const authWebhookSchema = z.object({
  type: z.string().min(1),
  table: z.string().default("users"),
  record: z.object({
    id: z.string().uuid(),
    email: z.string().email().optional(),
    email_confirmed_at: z.string().datetime().nullable().optional(),
  }),
})

export function verifyWebhookSignature(payload: string, signature: string | null, secret: string): boolean {
  if (!signature) return false
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex")

  const providedBuffer = Buffer.from(signature, "utf8")
  const expectedBuffer = Buffer.from(expected, "utf8")

  if (providedBuffer.length !== expectedBuffer.length) return false

  return crypto.timingSafeEqual(providedBuffer, expectedBuffer)
}
