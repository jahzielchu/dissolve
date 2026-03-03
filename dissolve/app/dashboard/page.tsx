'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'

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

    const { data: swipes } = await supabase
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', user!.id)

    const swipedIds = swipes?.map(s => s.swiped_id) || []

    const { data: myFilms } = await supabase
      .from('user_films')
      .select('slug, rating')
      .eq('user_id', user!.id)

    const { data: otherProfiles } = await supabase
      .from('profiles')
      .select('id, letterboxd_username, display_name')
      .neq('id', user!.id)

    if (!otherProfiles) { setLoading(false); return }

    const profilesWithCompat = await Promise.all(
      otherProfiles
        .filter(p => !swipedIds.includes(p.id))
        .map(async (profile) => {
          const { data: theirFilms } = await supabase
            .from('user_films')
            .select('slug, rating')
            .eq('user_id', profile.id)

          const myMap = new Map(myFilms?.map(f => [f.slug, f.rating]) || [])
          const theirMap = new Map(theirFilms?.map(f => [f.slug, f.rating]) || [])

          let overlap = 0
          let total = 0

          for (const [slug, myRating] of myMap) {
            if (theirMap.has(slug)) {
              const diff = Math.abs(myRating - theirMap.get(slug)!)
              overlap += Math.max(0, 5 - diff) / 5
              total++
            }
          }

          const compatibility = total > 0 ? Math.round((overlap / total) * 100) : 0
          const topFilms = Array.from(theirMap.keys()).slice(0, 3).map(s => s.replace(/-/g, ' '))

          return { ...profile, compatibility, topFilms }
        })
    )

    profilesWithCompat.sort((a, b) => b.compatibility - a.compatibility)
    setProfiles(profilesWithCompat)
    setLoading(false)
  }

  async function swipe(direction: 'like' | 'pass') {
    if (!profiles[current] || !user) return
    setSwiping(direction === 'like' ? 'right' : 'left')

    await supabase.from('swipes').insert({
      swiper_id: user.id,
      swiped_id: profiles[current].id,
      direction,
    })

    if (direction === 'like') {
      const { data: theirSwipe } = await supabase
        .from('swipes')
        .select('id')
        .eq('swiper_id', profiles[current].id)
        .eq('swiped_id', user.id)
        .eq('direction', 'like')
        .single()

      if (theirSwipe) {
        await supabase.from('matches').insert({
          user1_id: user.id,
          user2_id: profiles[current].id,
        })
        alert(`🎬 It's a match with ${profiles[current].display_name}!`)
      }
    }

    setTimeout(() => {
      setSwiping(null)
      setCurrent(c => c + 1)
    }, 300)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-gray-400">Loading matches...</p>
    </main>
  )

  if (current >= profiles.length) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="text-center">
        <p className="text-2xl font-bold mb-2">No more profiles</p>
        <p className="text-gray-400">Check back later for new cinephiles</p>
      </div>
    </main>
  )

  const profile = profiles[current]

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Dissolve</h1>

        <div className={`bg-gray-900 rounded-2xl p-6 mb-6 transition-all duration-300 ${
          swiping === 'right' ? 'translate-x-24 opacity-0' : 
          swiping === 'left' ? '-translate-x-24 opacity-0' : ''
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{profile.display_name}</h2>
              <p className="text-gray-400 text-sm">@{profile.letterboxd_username}</p>
            </div>
            <div className="bg-white text-black rounded-full px-3 py-1 text-sm font-bold">
              {profile.compatibility}% match
            </div>
          </div>

          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Top Films</p>
            <div className="flex flex-col gap-1">
              {profile.topFilms.length > 0 ? profile.topFilms.map((film, i) => (
                <p key={i} className="text-sm capitalize">🎬 {film}</p>
              )) : <p className="text-sm text-gray-500">No films yet</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => swipe('pass')}
            className="w-16 h-16 rounded-full border border-gray-600 flex items-center justify-center text-2xl hover:border-red-400 hover:text-red-400 transition"
          >
            ✕
          </button>
          <button
            onClick={() => swipe('like')}
            className="w-16 h-16 rounded-full border border-gray-600 flex items-center justify-center text-2xl hover:border-green-400 hover:text-green-400 transition"
          >
            ♥
          </button>
        </div>
      </div>
    </main>
  )
}