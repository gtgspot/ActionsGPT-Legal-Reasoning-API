import crypto from 'crypto'
import { describe, expect, it } from 'vitest'
import {
  authWebhookSchema,
  loginSchema,
  registerSchema,
  verifyWebhookSignature,
} from '../lib/auth/contracts'

describe('Auth contracts', () => {
  it('accepts valid registration payload', () => {
    const parsed = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'strong-pass-123',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects short passwords during registration', () => {
    const parsed = registerSchema.safeParse({
      email: 'user@example.com',
      password: 'short',
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts valid login payload', () => {
    const parsed = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'x',
    })

    expect(parsed.success).toBe(true)
  })

  it('validates webhook payload structure', () => {
    const parsed = authWebhookSchema.safeParse({
      type: 'INSERT',
      table: 'users',
      record: {
        id: '4f53f592-ec55-4cc6-b856-391dbab7ae8d',
        email: 'user@example.com',
        email_confirmed_at: null,
      },
    })

    expect(parsed.success).toBe(true)
  })

  it('verifies webhook signatures', () => {
    const secret = 'top-secret'
    const payload = JSON.stringify({ type: 'INSERT' })
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')

    expect(verifyWebhookSignature(payload, signature, secret)).toBe(true)
    expect(verifyWebhookSignature(payload, 'bad-signature', secret)).toBe(false)
  })
})
