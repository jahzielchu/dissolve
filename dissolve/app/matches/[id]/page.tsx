'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { createClient } from '@supabase/supabase-js'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Message = {
  id: string
  content: string
  sender_id: string
  created_at: string
}

export default function Chat() {
  const { user } = useUser()
  const params = useParams()
  const router = useRouter()
  const matchId = params.id as string
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState<{ display_name: string, letterboxd_username: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user && matchId) {
      loadChat()
      subscribeToMessages()
    }
  }, [user?.id, matchId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadChat() {
    setLoading(true)

    const { data: match } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .eq('id', matchId)
      .single()

    if (!match) { router.push('/matches'); return }

    const otherId = match.user1_id === user!.id ? match.user2_id : match.user1_id

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, letterboxd_username')
      .eq('id', otherId)
      .single()

    setOtherUser(profile)

    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })

    setMessages(msgs || [])
    setLoading(false)
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `match_id=eq.${matchId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !user) return

    const content = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      match_id: matchId,
      sender_id: user.id,
      content,
    })
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-gray-400">Loading chat...</p>
    </main>
  )

  return (
    <main className="flex flex-col h-screen bg-black text-white">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-800">
        <Link href="/matches" className="text-gray-400 hover:text-white">←</Link>
        <div>
          <p className="font-semibold">{otherUser?.display_name}</p>
          <p className="text-gray-400 text-sm">@{otherUser?.letterboxd_username}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-center py-10">
            You matched! Say something 🎬
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${
              msg.sender_id === user?.id
                ? 'bg-white text-black self-end'
                : 'bg-gray-800 text-white self-start'
            }`}
          >
            {msg.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-gray-800 flex gap-3">
        <input
          type="text"
          placeholder="Message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-full px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-white"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="bg-white text-black px-4 py-2 rounded-full font-semibold hover:bg-gray-200 transition disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </main>
  )
}