import { authWebhookSchema, verifyWebhookSignature } from "@/lib/auth/contracts"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const secret = process.env.AUTH_WEBHOOK_SECRET

  if (!secret) {
    return NextResponse.json({ error: "AUTH_WEBHOOK_SECRET is not configured" }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get("x-webhook-signature")

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
  }

  const payload = JSON.parse(rawBody)
  const parsed = authWebhookSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid webhook payload", issues: parsed.error.issues }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase service role environment variables are not configured" }, { status: 500 })
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey)
  const user = parsed.data.record
  const isEmailVerified = Boolean(user.email_confirmed_at)

  const { error } = await adminClient.from("user_permissions").upsert(
    {
      user_id: user.id,
      email: user.email ?? null,
      can_login: isEmailVerified,
      can_register: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
