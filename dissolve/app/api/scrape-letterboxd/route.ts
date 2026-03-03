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

    // Try to get their Letterboxd avatar
    let avatarUrl = null
    try {
      const res = await fetch(`https://letterboxd.com/${username}/`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(5000)
      })

      if (res.ok) {
        const html = await res.text()
        const avatarMatch = html.match(/src="(https:\/\/a\.ltrbxd\.com\/resized\/avatar[^"]+)"/)
        if (avatarMatch) {
          avatarUrl = avatarMatch[1]
        }
      }
    } catch (e) {
      console.log('Could not fetch avatar, continuing without it')
    }

    await supabase.from('profiles').upsert({
      id: userId,
      letterboxd_username: username,
      display_name: username,
      avatar_url: avatarUrl,
    })

    return NextResponse.json({ success: true, username, avatarUrl })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}