import { loginSchema } from "@/lib/auth/contracts"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const payload = await request.json()
  const parsed = loginSchema.safeParse(payload)

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload", issues: parsed.error.issues }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase environment variables are not configured" }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  const { data, error } = await supabase.auth.signInWithPassword(parsed.data)

  if (error || !data.session) {
    return NextResponse.json({ error: error?.message || "Invalid email or password" }, { status: 401 })
  }

  return NextResponse.json({
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    },
    user: {
      id: data.user.id,
      email: data.user.email,
    },
  })
}
