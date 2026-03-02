export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as cheerio from 'cheerio'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = body.username
    if (!username) return NextResponse.json({ error: 'Username required' }, { status: 400 })

    // Save profile first so user can proceed
    await supabase.from('profiles').upsert({
      id: username,
      letterboxd_username: username,
      display_name: username,
    })

    // Scrape Letterboxd
    const res = await fetch(`https://letterboxd.com/${username}/films/ratings/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: AbortSignal.timeout(8000)
    })

    if (res.ok) {
      const html = await res.text()
      const $ = cheerio.load(html)
      const films: { title: string; slug: string; rating: number }[] = []

      $('.poster-container').each((_, el) => {
        const slug = $(el).find('[data-film-slug]').attr('data-film-slug') || ''
        const ratingEl = $(el).find('[data-rating]')
        const rating = ratingEl.length ? parseInt(ratingEl.attr('data-rating') || '0') / 2 : 0
        const title = $(el).find('img').attr('alt') || slug.replace(/-/g, ' ')
        
        if (slug && rating > 0) {
          films.push({ slug, title, rating })
        }
      })

      if (films.length > 0) {
        await supabase.from('user_films').delete().eq('user_id', username)
        await supabase.from('user_films').insert(
          films.slice(0, 100).map(f => ({
            user_id: username,
            title: f.title,
            slug: f.slug,
            rating: f.rating,
          }))
        )
      }
    }

    return NextResponse.json({ success: true, username })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
