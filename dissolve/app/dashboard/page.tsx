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
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)

  useEffect(() => {
    if (user) loadProfiles()
  }, [user?.id])

  async function loadProfiles() {
    setLoading(true)
    const { data: myProfile } = await supabase.from('profiles').select('avatar_url').eq('id', user!.id).single()
    setMyAvatar(myProfile?.avatar_url || null)
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
        setMatchedProfile(profiles[current])
        return
      }
    }
    setTimeout(() => { setSwiping(null); setCurrent(c => c + 1) }, 300)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-xs uppercase tracking-widest text-gray-500">Loading...</p>
    </main>
  )

  if (matchedProfile) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-8 opacity-20">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-4 h-3 border border-white rounded-sm" />)}
      </div>

      <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">It's a match</p>

      <div className="flex items-center justify-center gap-4 mb-8">
        {myAvatar ? (
          <img src={myAvatar} alt="You" className="w-20 h-20 rounded-full object-cover border-2 border-white" />
        ) : (
          <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center text-2xl">🎬</div>
        )}
        <p className="text-2xl text-gray-600">×</p>
        {matchedProfile.avatar_url ? (
          <img src={matchedProfile.avatar_url} alt={matchedProfile.display_name} className="w-20 h-20 rounded-full object-cover border-2 border-white" />
        ) : (
          <div className="w-20 h-20 rounded-full border-2 border-white flex items-center justify-center text-2xl">🎬</div>
        )}
      </div>

      <h1 className="text-4xl font-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>
        {matchedProfile.display_name}
      </h1>
      <p className="text-gray-500 mb-10 text-sm">You both liked each other</p>

      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link
          href="/matches"
          className="bg-white text-black px-8 py-4 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition text-center"
        >
          Send a Message
        </Link>
        <button
          onClick={() => { setMatchedProfile(null); setSwiping(null); setCurrent(c => c + 1) }}
          className="border border-gray-700 px-8 py-4 text-xs uppercase tracking-widest text-gray-400 hover:border-white hover:text-white transition"
        >
          Keep Swiping
        </button>
      </div>

      <div className="flex items-center justify-center gap-2 mt-8 opacity-20">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-4 h-3 border border-white rounded-sm" />)}
      </div>
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
        <div className="flex gap-4 justify-center mt-8">
          <Link href="/matches" className="text-xs uppercase tracking-widest border border-gray-700 px-6 py-3 hover:border-white transition">
            View Matches
          </Link>
          <Link href="/profile" className="text-xs uppercase tracking-widest border border-gray-700 px-6 py-3 hover:border-white transition">
            Your Profile
          </Link>
        </div>
      </div>
    </main>
  )

  const profile = profiles[current]

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-black text-white overflow-hidden px-6">
      <div className="pointer-events-none fixed inset-0 z-10 opacity-[0.025]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`, backgroundRepeat: 'repeat', backgroundSize: '128px 128px' }}
      />

      <div className="relative z-20 w-full max-w-sm">
        <div className="flex items-center justify-between mb-8">
          <Link href="/profile" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition">
            Profile
          </Link>
          <p className="text-xs uppercase tracking-widest text-gray-500" style={{ fontFamily: 'Georgia, serif' }}>Dissolve</p>
          <Link href="/matches" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition">
            Matches
          </Link>
        </div>

        <div className={`border border-gray-800 rounded-none p-6 mb-8 transition-all duration-300 ${
          swiping === 'right' ? 'translate-x-24 opacity-0' :
          swiping === 'left' ? '-translate-x-24 opacity-0' : ''
        }`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full border border-gray-700 flex items-center justify-center text-lg">🎬</div>
              )}
              <div>
                <h2
                  className="font-black text-lg cursor-pointer hover:underline"
                  style={{ fontFamily: 'Georgia, serif' }}
                  onClick={() => window.location.href = `/user/${profile.id}`}
                >
                  {profile.display_name}
                </h2>
                <p className="text-gray-500 text-xs tracking-wider">@{profile.letterboxd_username}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black" style={{ fontFamily: 'Georgia, serif' }}>{profile.compatibility}%</p>
              <p className="text-gray-500 text-xs uppercase tracking-wider">match</p>
            </div>
          </div>

          <div className="border-t border-gray-800 mb-4" />

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