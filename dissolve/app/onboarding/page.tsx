'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'

export default function Onboarding() {
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const { user } = useUser()

  async function handleClick() {
    if (!username || !user) return
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/scrape-letterboxd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.toLowerCase().trim(),
          userId: user.id
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-6">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold mb-2">Connect Letterboxd</h1>
        <p className="text-gray-400 mb-8">
          We'll use your film taste to find your matches.
        </p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Your Letterboxd username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="off"
            spellCheck="false"
            className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white"
          />

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            onClick={handleClick}
            disabled={loading || !username}
            className="bg-white text-black px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Continue'}
          </button>
        </div>
      </div>
    </main>
  )
}