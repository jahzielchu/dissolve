'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Match = {
  id: string
  other_user: {
    id: string
    display_name: string
    letterboxd_username: string
    avatar_url: string | null
  }
  created_at: string
}

export default function Matches() {
  const { user } = useUser()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) loadMatches()
  }, [user?.id])

  async function loadMatches() {
    setLoading(true)
    const { data } = await supabase
      .from('matches')
      .select('id, created_at, user1_id, user2_id')
      .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)

    if (!data) { setLoading(false); return }

    const matchesWithProfiles = await Promise.all(
      data.map(async (match) => {
        const otherId = match.user1_id === user!.id ? match.user2_id : match.user1_id
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, letterboxd_username, avatar_url')
          .eq('id', otherId)
          .single()
        return {
          id: match.id,
          created_at: match.created_at,
          other_user: profile || { id: otherId, display_name: 'Unknown', letterboxd_username: '', avatar_url: null }
        }
      })
    )

    setMatches(matchesWithProfiles)
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
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Dissolve</p>
            <h1 className="text-4xl font-black" style={{ fontFamily: 'Georgia, serif' }}>Matches</h1>
          </div>
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition border border-gray-800 px-4 py-2 hover:border-white">
            Swipe
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-20 border border-gray-800">
            <div className="flex items-center justify-center gap-2 mb-6 opacity-20">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="w-4 h-3 border border-white rounded-sm" />)}
            </div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">No matches yet</p>
            <p className="text-gray-600 text-sm">Keep swiping to find your people</p>
            <Link href="/dashboard" className="mt-6 inline-block text-xs uppercase tracking-widest border border-gray-700 px-6 py-3 hover:border-white hover:text-white transition">
              Start Swiping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-px border border-gray-800">
            {matches.map((match, i) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="flex items-center justify-between p-4 hover:bg-gray-900 transition group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-gray-600 text-xs w-4">{i + 1}.</span>
                  {match.other_user.avatar_url ? (
                    <img src={match.other_user.avatar_url} alt={match.other_user.display_name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center text-sm">🎬</div>
                  )}
                  <div>
                    <p className="font-black text-sm" style={{ fontFamily: 'Georgia, serif' }}>{match.other_user.display_name}</p>
                    <p className="text-gray-500 text-xs tracking-wider">@{match.other_user.letterboxd_username}</p>
                  </div>
                </div>
                <span className="text-gray-600 group-hover:text-white transition text-xs uppercase tracking-widest">Open →</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}