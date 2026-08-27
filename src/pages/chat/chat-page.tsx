import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useFamily } from '@/contexts/family-context'
import { useAuth } from '@/contexts/auth-context'
import { chatService } from '@/services/chat.service'
import type { Tables } from '@/types/database.types'

type ChatRow = Tables<'chat_messages'> & { author: Tables<'profiles'> | null }

export default function ChatPage() {
  const { family, members } = useFamily()
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  async function load() {
    if (!family) return
    setLoading(true)
    try {
      setMessages((await chatService.getMessages(family.id)) as ChatRow[])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    if (!family) return
    return chatService.subscribeToMessages(family.id, load)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function memberFor(userId: string) {
    return members.find((m) => m.user_id === userId)
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() || !family || !user) return
    const content = text.trim()
    setText('')
    await chatService.sendMessage({ family_id: family.id, user_id: user.id, content })
    await load()
  }

  if (!family || !user) return null

  return (
    <div className="flex h-[calc(100vh-11rem)] flex-col lg:h-[calc(100vh-6rem)]">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Familienchat</h1>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-2/3" />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState emoji="💬" title="Noch keine Nachrichten" description="Schreibt eure erste Nachricht an die Familie." />
        ) : (
          <div className="space-y-3">
            {messages.map((m) => {
              const author = memberFor(m.user_id)
              const isMe = m.user_id === user.id
              return (
                <div key={m.id} className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <Avatar name={author?.display_name ?? 'Mitglied'} color={author?.color} src={author?.avatar_url} className="h-7 w-7" />
                  <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {!isMe && <p className="mb-0.5 text-[11px] font-medium opacity-70">{author?.display_name}</p>}
                    <p>{m.content}</p>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nachricht schreiben…" />
        <Button type="submit" size="icon" aria-label="Senden">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
