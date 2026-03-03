export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { username, userId } = body

    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })

    await supabase.from('profiles').upsert({
      id: userId,
      letterboxd_username: username,
      display_name: username,
    })

    return NextResponse.json({ success: true, username })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}