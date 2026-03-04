'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function UserProfile() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [profile, setProfile] = useState<any>(null)
  const [films, setFilms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) loadProfile()
  }, [userId])

  async function loadProfile() {
    setLoading(true)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!profileData) { router.push('/dashboard'); return }
    setProfile(profileData)

    const { data: filmsData } = await supabase
      .from('user_films')
      .select('title, rating, slug')
      .eq('user_id', userId)
      .order('rating', { ascending: false })
      .limit(10)

    setFilms(filmsData || [])
    setLoading(false)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-xs uppercase tracking-widest text-gray-500">Loading...</p>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-black text-white px-6 py-12">
      <div className="max-w-md w-full mx-auto">

        {/* Back button */}
        <Link href="/dashboard" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition mb-12 inline-block">
          ← Back
        </Link>

        {/* Profile header */}
        <div className="flex items-center gap-6 mb-8">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.display_name} className="w-20 h-20 rounded-full object-cover grayscale" />
          ) : (
            <div className="w-20 h-20 rounded-full border border-gray-700 flex items-center justify-center text-2xl">🎬</div>
          )}
          <div>
            <h1 className="text-3xl font-black" style={{ fontFamily: 'Georgia, serif' }}>{profile.display_name}</h1>
            
              href={`https://letterboxd.com/${profile.letterboxd_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 text-xs tracking-wider hover:text-white transition"
            >
              @{profile.letterboxd_username} ↗
            </a>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <div className="border border-gray-800 p-4 mb-8">
            <p className="text-gray-300 text-sm leading-relaxed">{profile.bio}</p>
          </div>
        )}

        {/* Top films */}
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">Top Films</p>
          {films.length > 0 ? (
            <div className="flex flex-col gap-px border border-gray-800">
              {films.map((film, i) => (
                <div key={i} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600 text-xs w-4">{i + 1}.</span>
                    <p className="text-sm capitalize">{film.title}</p>
                  </div>
                  <p className="text-gray-500 text-xs">{'★'.repeat(Math.round(film.rating))}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No films yet</p>
          )}
        </div>

      </div>
    </main>
  )
}