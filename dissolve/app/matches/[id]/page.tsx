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
  const [otherId, setOtherId] = useState<string | null>(null)
  const [otherUser, setOtherUser] = useState<{ display_name: string, letterboxd_username: string, avatar_url: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (user && matchId) {
      loadChat()
      const unsub = subscribeToMessages()
      return unsub
    }
  }, [user?.id, matchId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadChat() {
    setLoading(true)
    const { data: match } = await supabase.from('matches').select('user1_id, user2_id').eq('id', matchId).single()
    if (!match) { router.push('/matches'); return }
    const otherUserId = match.user1_id === user!.id ? match.user2_id : match.user1_id
    setOtherId(otherUserId)
    const { data: profile } = await supabase.from('profiles').select('display_name, letterboxd_username, avatar_url').eq('id', otherUserId).single()
    setOtherUser(profile)
    const { data: msgs } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true })
    setMessages(msgs || [])
    setLoading(false)
  }

  function subscribeToMessages() {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => { setMessages(prev => [...prev, payload.new as Message]) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !user) return
    const content = newMessage.trim()
    setNewMessage('')
    await supabase.from('messages').insert({ match_id: matchId, sender_id: user.id, content })
  }

  if (loading) return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <p className="text-xs uppercase tracking-widest text-gray-500">Loading...</p>
    </main>
  )

  return (
    <main className="flex flex-col h-screen bg-black text-white">
      <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-800">
        <Link href="/matches" className="text-gray-500 hover:text-white transition text-xs uppercase tracking-widest">← Back</Link>
        <Link href={`/user/${otherId}`} className="flex items-center gap-3 hover:opacity-80 transition">
          {otherUser?.avatar_url ? (
            <img src={otherUser.avatar_url} alt={otherUser.display_name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full border border-gray-700 flex items-center justify-center text-xs">🎬</div>
          )}
          <div>
            <p className="font-black text-sm" style={{ fontFamily: 'Georgia, serif' }}>{otherUser?.display_name}</p>
            <p className="text-gray-500 text-xs">@{otherUser?.letterboxd_username}</p>
          </div>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <p className="text-xs uppercase tracking-widest text-gray-600 mb-2">You matched</p>
            <p className="text-gray-500 text-sm">Start the conversation 🎬</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`max-w-xs px-4 py-3 text-sm ${
            msg.sender_id === user?.id
              ? 'bg-white text-black self-end'
              : 'border border-gray-800 text-white self-start'
          }`}>
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
          className="flex-1 bg-transparent border border-gray-800 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-gray-500 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="bg-white text-black px-6 py-3 text-xs uppercase tracking-widest font-bold hover:bg-gray-200 transition disabled:opacity-30"
        >
          Send
        </button>
      </div>
    </main>
  )
}