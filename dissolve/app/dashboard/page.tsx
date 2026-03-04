'use client'

import { useEffect, useState, useRef } from 'react'
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
  sharedFilms: string[]
  avatar_url: string | null
  bio: string | null
}

export default function Dashboard() {
  const { user } = useUser()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [current, setCurrent] = useState(0)
  const [loading, setLoading] = useState(true)
  const [swiping, setSwiping] = useState<'left' | 'right' | null>(null)
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null)
  const [myAvatar, setMyAvatar] = useState<string | null>(null)
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startX = useRef(0)

  useEffect(() => {
    if (user) loadProfiles()
  }, [user?.id])

  async function loadProfiles() {
    setLoading(true)
    const { data: myProfile } = await supabase.from('profiles').select('avatar_url').eq('id', user!.id).single()
    setMyAvatar(myProfile?.avatar_url || null)
    const { data: swipes } = await supabase.from('swipes').select('swiped_id').eq('swiper_id', user!.id)
    const swipedIds = swipes?.map(s => s.swiped_id) || []
    const { data: myFilms } = await supabase.from('user_films').select('slug, rating, title').eq('user_id', user!.id)
    const { data: otherProfiles } = await supabase.from('profiles').select('id, letterboxd_username, display_name, avatar_url, bio').neq('id', user!.id)
    if (!otherProfiles) { setLoading(false); return }

    const profilesWithCompat = await Promise.all(
      otherProfiles.filter(p => !swipedIds.includes(p.id)).map(async (profile) => {
        const { data: theirFilms } = await supabase.from('user_films').select('slug, rating, title').eq('user_id', profile.id)
        const myMap = new Map(myFilms?.map(f => [f.slug, { rating: f.rating, title: f.title }]) || [])
        const theirMap = new Map(theirFilms?.map(f => [f.slug, { rating: f.rating, title: f.title }]) || [])
        let overlap = 0, total = 0
        const sharedFilms: string[] = []
        for (const [slug, myData] of myMap) {
          if (theirMap.has(slug)) {
            const diff = Math.abs(myData.rating - theirMap.get(slug)!.rating)
            overlap += Math.max(0, 5 - diff) / 5
            total++
            if (diff <= 1) sharedFilms.push(myData.title)
          }
        }
        const compatibility = total > 0 ? Math.round((overlap / total) * 100) : 0
        const topFilms = Array.from(theirMap.values()).slice(0, 3).map(f => f.title)
        return { ...profile, compatibility, topFilms, sharedFilms: sharedFilms.slice(0, 3), avatar_url: profile.avatar_url || null, bio: profile.bio || null }
      })
    )

    profilesWithCompat.sort((a, b) => b.compatibility - a.compatibility)
    setProfiles(profilesWithCompat)
    setLoading(false)
  }

  async function swipe(direction: 'like' | 'pass') {
    if (!profiles[current] || !user) return
    setSwiping(direction === 'like' ? 'right' : 'left')
    setDragX(0)
    await supabase.from('swipes').insert({ swiper_id: user.id, swiped_id: profiles[current].id, direction })
    if (direction === 'like') {
      const { data: theirSwipe } = await supabase.from('swipes').select('id').eq('swiper_id', profiles[current].id).eq('swiped_id', user.id).eq('direction', 'like').single()
      if (theirSwipe) {
        await supabase.from('matches').insert({ user1_id: user.id, user2_id: profiles[current].id })
        setMatchedProfile(profiles[current])
        return
      }
    }
    setTimeout(() => { setSwiping(null); setCurrent(c => c + 1) }, 350)
  }

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX
    setIsDragging(true)
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!isDragging) return
    setDragX(e.touches[0].clientX - startX.current)
  }

  function handleTouchEnd() {
    setIsDragging(false)
    if (dragX > 80) swipe('like')
    else if (dragX < -80) swipe('pass')
    else setDragX(0)
  }

  function handleMouseDown(e: React.MouseEvent) {
    startX.current = e.clientX
    setIsDragging(true)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return
    setDragX(e.clientX - startX.current)
  }

  function handleMouseUp() {
    setIsDragging(false)
    if (dragX > 80) swipe('like')
    else if (dragX < -80) swipe('pass')
    else setDragX(0)
  }

  const rotation = dragX * 0.04
  const likeOpacity = Math.min(Math.max(dragX / 80, 0), 1)
  const passOpacity = Math.min(Math.max(-dragX / 80, 0), 1)

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
      <p className="text-xs uppercase tracking-widest text-gray-600">Loading...</p>
    </main>
  )

  if (matchedProfile) return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0a0a0a] text-white px-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-10 opacity-20">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-4 h-3 border border-white rounded-sm" />)}
      </div>
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-6">It's a match</p>
      <div className="flex items-center justify-center gap-4 mb-8">
        {myAvatar ? (
          <img src={myAvatar} alt="You" className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-2xl" />
        ) : (
          <div className="w-24 h-24 rounded-full border-2 border-white flex items-center justify-center text-3xl">🎬</div>
        )}
        <p className="text-3xl text-gray-700">×</p>
        {matchedProfile.avatar_url ? (
          <img src={matchedProfile.avatar_url} alt={matchedProfile.display_name} className="w-24 h-24 rounded-full object-cover border-2 border-white shadow-2xl" />
        ) : (
          <div className="w-24 h-24 rounded-full border-2 border-white flex items-center justify-center text-3xl">🎬</div>
        )}
      </div>
      <h1 className="text-5xl font-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>{matchedProfile.display_name}</h1>
      <p className="text-gray-500 mb-6 text-sm">You both liked each other</p>
      {matchedProfile.sharedFilms.length > 0 && (
        <div className="mb-10 bg-white/5 rounded-2xl px-6 py-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">You both love</p>
          {matchedProfile.sharedFilms.map((film, i) => (
            <p key={i} className="text-gray-300 text-sm capitalize">🎬 {film}</p>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/matches" className="bg-white text-black px-8 py-4 rounded-full text-sm font-bold hover:bg-gray-200 transition text-center">
          Send a Message
        </Link>
        <button
          onClick={() => { setMatchedProfile(null); setSwiping(null); setCurrent(c => c + 1) }}
          className="border border-gray-700 px-8 py-4 rounded-full text-sm text-gray-400 hover:border-white hover:text-white transition"
        >
          Keep Swiping
        </button>
      </div>
    </main>
  )

  if (current >= profiles.length) return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-white">
      <div className="text-center px-6">
        <div className="flex items-center justify-center gap-2 mb-8 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="w-4 h-3 border border-white rounded-sm" />)}
        </div>
        <p className="text-xs uppercase tracking-widest text-gray-600 mb-3">End of reel</p>
        <p className="text-3xl font-black mb-2" style={{ fontFamily: 'Georgia, serif' }}>No more profiles</p>
        <p className="text-gray-600 mt-2 text-sm">Check back later for new cinephiles</p>
        <div className="flex gap-3 justify-center mt-8">
          <Link href="/matches" className="text-sm border border-gray-800 px-6 py-3 rounded-full hover:border-white transition text-gray-400 hover:text-white">View Matches</Link>
          <Link href="/profile" className="text-sm border border-gray-800 px-6 py-3 rounded-full hover:border-white transition text-gray-400 hover:text-white">Your Profile</Link>
        </div>
      </div>
    </main>
  )

  const profile = profiles[current]

  return (
    <main className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      {/* Nav */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4">
        <Link href="/profile">
          {myAvatar ? (
            <img src={myAvatar} alt="You" className="w-9 h-9 rounded-full object-cover border border-gray-700" />
          ) : (
            <div className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center text-sm">🎬</div>
          )}
        </Link>
        <p className="text-sm font-black tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>Dissolve</p>
        <Link href="/matches" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition">
          Matches
        </Link>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative rounded-3xl overflow-hidden bg-[#111] cursor-grab active:cursor-grabbing select-none shadow-2xl"
            style={{
              transform: swiping
                ? `translateX(${swiping === 'right' ? '150px' : '-150px'}) rotate(${swiping === 'right' ? '10deg' : '-10deg'})`
                : `translateX(${dragX}px) rotate(${rotation}deg)`,
              opacity: swiping ? 0 : 1,
              transition: isDragging ? 'none' : 'all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            {/* Like / Pass stamps */}
            <div className="absolute top-8 left-6 z-20 border-4 border-green-400 text-green-400 text-lg font-black uppercase tracking-widest px-3 py-1 rotate-[-15deg] rounded"
              style={{ opacity: likeOpacity }}>
              Like
            </div>
            <div className="absolute top-8 right-6 z-20 border-4 border-red-400 text-red-400 text-lg font-black uppercase tracking-widest px-3 py-1 rotate-[15deg] rounded"
              style={{ opacity: passOpacity }}>
              Pass
            </div>

            {/* Big profile photo */}
            <div className="relative w-full h-80 bg-gray-900">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🎬</div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent" />
              {/* Match % badge */}
              <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1">
                <p className="text-white text-sm font-bold">{profile.compatibility}% match</p>
              </div>
            </div>

            {/* Card content */}
            <div className="px-5 pb-6 pt-2">
              <div className="mb-3">
                <h2
                  className="text-2xl font-black cursor-pointer"
                  style={{ fontFamily: 'Georgia, serif' }}
                  onClick={() => window.location.href = `/user/${profile.id}`}
                >
                  {profile.display_name}
                </h2>
                <p className="text-gray-500 text-xs tracking-wider">@{profile.letterboxd_username}</p>
              </div>

              {profile.bio && (
                <p className="text-gray-300 text-sm leading-relaxed mb-4">{profile.bio}</p>
              )}

              <div className="border-t border-gray-800 pt-4 mb-3">
                <p className="text-gray-600 text-xs uppercase tracking-widest mb-2">Top Films</p>
                <div className="flex flex-col gap-1">
                  {profile.topFilms.map((film, i) => (
                    <p key={i} className="text-sm capitalize text-gray-300">
                      <span className="text-gray-600 mr-2">{i + 1}.</span>{film}
                    </p>
                  ))}
                </div>
              </div>

              {profile.sharedFilms.length > 0 && (
                <div className="bg-white/5 rounded-xl px-4 py-3">
                  <p className="text-gray-500 text-xs uppercase tracking-widest mb-2">You Both Love</p>
                  <div className="flex flex-col gap-1">
                    {profile.sharedFilms.map((film, i) => (
                      <p key={i} className="text-sm capitalize text-white">🎬 {film}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 justify-center mt-6">
            <button
              onClick={() => swipe('pass')}
              className="w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center text-2xl hover:border-red-400 hover:text-red-400 transition bg-[#0a0a0a]"
            >
              ✕
            </button>
            <button
              onClick={() => swipe('like')}
              className="w-16 h-16 rounded-full border-2 border-gray-700 flex items-center justify-center text-2xl hover:border-white hover:text-white transition bg-[#0a0a0a]"
            >
              ♥
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
