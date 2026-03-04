'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Profile = {
  id: string
  letterboxd_username: string
  display_name: string
  compatibility: number
  topFilms: string[]
  avatar_url: string | null
}

export default function Dashboard() {
  const { user } = useUser()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swiping, setSwiping] = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    if (user) loadProfiles()
  }, [user?.id])

  async function loadProfiles() {
    setLoading(true)
    const { data: swipes } = await supabase.from('swipes').select('swiped_id').eq('swiper_id', user!.id)
    const swipedIds = swipes?.map(s => s.swiped_id) || []
    const { data: myFilms } = await supabase.from('user_films').select('slug, rating').eq('user_id', user!.id)
    const { data: otherProfiles } = await supabase.from('profiles').select('id, letterboxd_username, display_name, avatar_url').neq('id', user!.id)
    if (!otherProfiles) { setLoading(false); return }

    const profilesWithCompat = await Promise.all(
      otherProfiles.filter(p => !swipedIds.includes(p.id)).map(async (profile) => {
        const { data: theirFilms } = await supabase.from('user_films').select('slug, rating').eq('user_id', profile.id)
        const myMap = new Map(myFilms?.map(f => [f.slug, f.rating]) || [])
        const theirMap = new Map(theirFilms?.map(f => [f.slug, f.rating]) || [])
        let overlap = 0, total = 0
        for (const [slug, myRating] of myMap) {
          if (theirMap.has(slug)) {
            overlap += Math.max(0, 5 - Math.abs(myRating - theirMap.get(slug)!)) / 5
            total++
          }
        }
        const compatibility = total > 0 ? Math.round((overlap / total) * 100) : 0
        const topFilms = Array.from(theirMap.keys()).slice(0, 3).map(s => s.replace(/-/g, ' '))
        return { ...profile, compatibility, topFilms, avatar_url: profile.avatar_url || null }
      })
    )

    profilesWithCompat.sort((a, b) => b.compatibility - a.compatibility)
    setProfiles(profilesWithCompat)
    setLoading(false)
  }

  async function swipe(direction: 'like' | 'pass') {
    if (!profiles[current] || !user) return
    setSwiping(direction === 'like' ? 'right' : 'left')
    await supabase.from('swipes').insert({ swiper_id: user.id, swiped_id: profiles[current].id, direction })
    if (direction === 'like') {
      const { data: theirSwipe } = await supabase.from('swipes').select('id').eq('swiper_id', profiles[current].id).eq('swiped_id', user.id).eq('direction', 'like').single()
      if (theirSwipe) {
        await supabase.from('matches').insert({ user1_id: user.id, user2_id: profiles[current].id })
        alert(`🎬 It's a match with ${profiles[current].display_name}!`)
      }
    }
    setTimeout(() => { setSwiping(null); setCurrent(c => c + 1) }, 300)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <Link href="/profile" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition" style={{ fontFamily: 'Georgia, serif' }}>Dissolve</Link>

    </main>
  )

  if (current >= profiles.length) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-8 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-4 h-3 border border-white rounded-sm" />)}
        </div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">End of reel</p>
        <p className="text-2xl font-black" style={{ fontFamily: 'Georgia, serif' }}>No more profiles</p>
        <p className="text-gray-500 mt-2 text-sm">Check back later for new cinephiles</p>
        <Link href="/matches" className="mt-8 inline-block text-xs uppercase tracking-widest border border-gray-700 px-6 py-3 hover:border-white transition">
          View Matches
        </Link>
      </div>
    </main>
  )

  const profile = profiles[current]

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black text-white overflow-hidden px-6">
      {/* Film grain */}
      <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}
      />

      <div className="relative z-20 w-full max-w-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <p className="text-xs uppercase tracking-widest text-gray-500" style={{ fontFamily: 'Georgia, serif' }}>Dissolve</p>
          <Link href="/matches" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition">
            Matches
          </Link>
        </div>

        {/* Card */}
        <div className={`border border-gray-800 rounded-none p-6 mb-8 transition-all duration-300 ${
          swiping === 'right' ? 'translate-x-24 opacity-0' :
          swiping === 'left' ? '-translate-x-24 opacity-0' : ''
        }`}>
          {/* Profile header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-12 h-12 rounded-full object-cover grayscale" />
              ) : (
                <div className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-lg">🎬</div>
              )}
              <div>
                <Link href={`/user/${profile.id}`} className="hover:underline">
  <h2 className="font-black text-lg" style={{ fontFamily: 'Georgia, serif' }}>{profile.display_name}</h2>
</Link>
                <p className="text-gray-500 text-xs tracking-wider">@{profile.letterboxd_username}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ fontFamily: 'Georgia, serif' }}>{profile.compatibility}%</p>
              <p className="text-gray-500 text-xs uppercase tracking-wider">match</p>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-800 mb-4" />

          {/* Top films */}
          <div>
            <p className="text-gray-600 text-xs uppercase tracking-widest mb-3">Top Films</p>
            <div className="flex flex-col gap-2">
              {profile.topFilms.length > 0 ? profile.topFilms.map((film, i) => (
                <p key={i} className="text-sm capitalize text-gray-300">
                  <span className="text-gray-600 mr-2">{i + 1}.</span>{film}
                </p>
              )) : <p className="text-sm text-gray-600">No films yet</p>}
            </div>
          </div>
        </div>

        {/* Swipe buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => swipe('pass')}
            className="flex-1 py-4 border border-gray-800 text-xs uppercase tracking-widest text-gray-500 hover:border-red-900 hover:text-red-400 transition"
          >
            Pass
          </button>
          <button
            onClick={() => swipe('like')}
            className="flex-1 py-4 border border-gray-800 text-xs uppercase tracking-widest text-gray-500 hover:border-white hover:text-white transition"
          >
            Like
          </button>
        </div>
      </div>
    </main>
  )
}