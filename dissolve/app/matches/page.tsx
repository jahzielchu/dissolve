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
          .select('id, display_name, letterboxd_username')
          .eq('id', otherId)
          .single()

        return {
          id: match.id,
          created_at: match.created_at,
          other_user: profile || { id: otherId, display_name: 'Unknown', letterboxd_username: '' }
        }
      })
    )

    setMatches(matchesWithProfiles)
    setLoading(false)
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-gray-400">Loading matches...</p>
    </main>
  )

  return (
    <main className="flex min-h-screen flex-col bg-black text-white px-6 py-12">
      <div className="max-w-md w-full mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Matches</h1>
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition">
            Swipe
          </Link>
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl mb-2">No matches yet</p>
            <p className="text-gray-400">Keep swiping to find your people</p>
            <Link href="/dashboard" className="mt-6 inline-block bg-white text-black px-6 py-2 rounded-full font-semibold">
              Start Swiping
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {matches.map((match) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className="bg-gray-900 rounded-2xl p-4 flex items-center justify-between hover:bg-gray-800 transition"
              >
                <div>
                  <p className="font-semibold">{match.other_user.display_name}</p>
                  <p className="text-gray-400 text-sm">@{match.other_user.letterboxd_username}</p>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}