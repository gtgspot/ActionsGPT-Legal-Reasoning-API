import { registerSchema } from "@/lib/auth/contracts"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const payload = await request.json()
  const parsed = registerSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration payload", issues: parsed.error.issues }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase environment variables are not configured" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { email, password } = parsed.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL,
      data: {
        default_role: "user",
      },
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({
    userId: data.user?.id,
    email: data.user?.email,
    emailConfirmationRequired: !data.session,
  })
}
