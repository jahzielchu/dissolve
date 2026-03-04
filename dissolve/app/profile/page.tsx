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
    display_name: string
    letterboxd_username: string
    avatar_url: string | null
  }
}

export default function Profile() {
  const { user } = useUser()
  const [profile, setProfile] = useState<any>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) loadProfile()
  }, [user?.id])

  async function loadProfile() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user!.id)
      .single()

    if (data) {
      setProfile(data)
      setDisplayName(data.display_name || '')
      setBio(data.bio || '')
    }

    // Load matches
    const { data: matchData } = await supabase
      .from('matches')
      .select('id, user1_id, user2_id')
      .or(`user1_id.eq.${user!.id},user2_id.eq.${user!.id}`)

    if (matchData) {
      const matchesWithProfiles = await Promise.all(
        matchData.map(async (match) => {
          const otherId = match.user1_id === user!.id ? match.user2_id : match.user1_id
          const { data: otherProfile } = await supabase
            .from('profiles')
            .select('display_name, letterboxd_username, avatar_url')
            .eq('id', otherId)
            .single()
          return {
            id: match.id,
            other_user: otherProfile || { display_name: 'Unknown', letterboxd_username: '', avatar_url: null }
          }
        })
      )
      setMatches(matchesWithProfiles)
    }
  }

  async function saveProfile() {
    if (!user) return
    setSaving(true)
    await supabase.from('profiles').update({
      display_name: displayName,
      bio,
    }).eq('id', user.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true)

    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}.${fileExt}`

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (!error) {
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      await supabase.from('profiles').update({
        avatar_url: urlData.publicUrl
      }).eq('id', user.id)

      setProfile((prev: any) => ({ ...prev, avatar_url: urlData.publicUrl }))
    }

    setUploading(false)
  }

  return (
    <main className="flex min-h-screen flex-col bg-black text-white px-6 py-12">
      <div className="max-w-md w-full mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Dissolve</p>
            <h1 className="text-4xl font-black" style={{ fontFamily: 'Georgia, serif' }}>Profile</h1>
          </div>
          <Link href="/dashboard" className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition border border-gray-800 px-4 py-2 hover:border-white">
            Swipe
          </Link>
        </div>

        {/* Photo upload */}
        <div className="flex items-center gap-6 mb-10">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" className="w-20 h-20 rounded-full object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-full border border-gray-700 flex items-center justify-center text-2xl">🎬</div>
            )}
          </div>
          <div>
            <label className="cursor-pointer text-xs uppercase tracking-widest border border-gray-700 px-4 py-2 hover:border-white hover:text-white transition text-gray-400">
              {uploading ? 'Uploading...' : 'Upload Photo'}
              <input type="file" accept="image/*" onChange={uploadPhoto} className="hidden" />
            </label>
            <p className="text-gray-600 text-xs mt-2">JPG, PNG up to 5MB</p>
          </div>
        </div>

        {/* Edit fields */}
        <div className="flex flex-col gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Display Name</p>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-transparent border border-gray-800 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 text-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Bio</p>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-transparent border border-gray-800 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 text-sm resize-none"
              placeholder="Tell people about your taste in film..."
            />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Letterboxd</p>
            <p className="text-sm text-gray-400 border border-gray-800 px-4 py-3">
              @{profile?.letterboxd_username || '—'}
            </p>
          </div>

          <button
            onClick={saveProfile}
            disabled={saving}
            className="bg-white text-black px-8 py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition disabled:opacity-50"
          >
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>

        {/* Matches */}
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-4">Your Matches</p>
          {matches.length === 0 ? (
            <div className="border border-gray-800 p-6 text-center">
              <p className="text-gray-600 text-sm">No matches yet</p>
              <Link href="/dashboard" className="mt-3 inline-block text-xs uppercase tracking-widest text-gray-500 hover:text-white transition">
                Start Swiping →
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
                      <img src={match.other_user.avatar_url} alt={match.other_user.display_name} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-xs">🎬</div>
                    )}
                    <div>
                      <p className="font-black text-sm" style={{ fontFamily: 'Georgia, serif' }}>{match.other_user.display_name}</p>
                      <p className="text-gray-500 text-xs">@{match.other_user.letterboxd_username}</p>
                    </div>
                  </div>
                  <span className="text-gray-600 group-hover:text-white transition text-xs uppercase tracking-widest">Chat →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  )
}