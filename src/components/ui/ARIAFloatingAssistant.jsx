// src/components/ui/ARIAFloatingAssistant.jsx
// Chatbot ARIA — connecté à l'Edge Function Gemini + pgvector RAG

import { useState, useRef, useEffect, useCallback } from 'react'
import { askARIA } from '@/services/ariaService'

const SUGGESTIONS = [
  { label: "🤖 C'est quoi l'IA ?",       text: "Qu'est-ce que l'intelligence artificielle ?" },
  { label: '📜 Obtenir un certificat ?',  text: 'Comment obtenir un certificat ?' },
  { label: '🧠 Différence IA / ML ?',     text: 'Quelle est la différence entre IA et ML ?' },
  { label: '📊 Rôle des données ?',       text: 'Quel est le rôle des données dans l\'IA ?' },
]

function SourceBadge({ source }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#f0dbff]/60
                    border border-[#8127cf]/20 rounded-full text-xs text-[#8127cf]">
      <span className="material-symbols-outlined text-[12px]">auto_stories</span>
      <span className="font-medium truncate max-w-[130px]">Source {source.similarity}%</span>
    </div>
  )
}

function Message({ msg }) {
  const isAria = msg.from === 'aria'
  return (
    <div className={`flex gap-2 ${isAria ? 'justify-start' : 'justify-end'}`}>
      {isAria && (
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center
                        text-white text-xs font-bold"
             style={{ background: 'linear-gradient(135deg, #ec4899, #8127cf)' }}>
          AI
        </div>
      )}
      <div className="max-w-[85%] space-y-1.5">
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
          isAria
            ? 'bg-[#f8f5ff] border border-[#e5d8f5] text-[#0b1c30] rounded-tl-sm'
            : 'text-white rounded-tr-sm'
        }`}
        style={!isAria ? { background: 'linear-gradient(135deg, #ec4899, #8127cf)' } : {}}>
          {msg.text || (msg.loading && <span className="opacity-60 animate-pulse">▍</span>)}
        </div>
        {msg.sources?.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}
        <p className="text-[10px] text-[#7e7385] px-1">{msg.time}</p>
      </div>
    </div>
  )
}

export default function ARIAFloatingAssistant({ lessonId = null, moduleId = null, lessonTitle = null }) {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([{
    id: 1, from: 'aria',
    text: `Bonjour !  Je suis ARIA, votre assistante pédagogique IA.\n${lessonTitle ? `Je suis contextualisée sur : "${lessonTitle}".` : 'Posez-moi vos questions sur le cours.'}`,
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }])
  const [input,     setInput]     = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status,    setStatus]    = useState('')

  const bottomRef  = useRef(null)
  const inputRef   = useRef(null)
  const historyRef = useRef([])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 150) }, [open])

  function now() {
    return new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const send = useCallback(async (text) => {
    const question = (text || input).trim()
    if (!question || isLoading) return

    setInput('')
    setIsLoading(true)
    setStatus('🔍 Recherche dans le cours…')

    const userMsg = { id: Date.now(), from: 'user', text: question, time: now() }
    setMessages(prev => [...prev, userMsg])

    const ariaId  = Date.now() + 1
    setMessages(prev => [...prev, {
      id: ariaId, from: 'aria', text: '', loading: true, sources: [], time: now()
    }])

    historyRef.current = [
      ...historyRef.current,
      { role: 'user', content: question },
    ].slice(-10)

    const result = await askARIA({
      question,
      lessonId,
      moduleId,
      history: historyRef.current,
    })

    if (result.error) {
      setMessages(prev => prev.map(m =>
        m.id === ariaId ? { ...m, loading: false, text: `❌ ${result.error}` } : m
      ))
    } else {
      setMessages(prev => prev.map(m =>
        m.id === ariaId ? {
          ...m,
          loading: false,
          text:    result.reponse,
          sources: result.sources,
        } : m
      ))
      historyRef.current = [
        ...historyRef.current,
        { role: 'assistant', content: result.reponse },
      ].slice(-10)
    }

    setStatus('')
    setIsLoading(false)
  }, [input, isLoading, lessonId, moduleId])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="absolute bottom-20 right-0 w-[370px] bg-white rounded-3xl shadow-2xl
                        border border-[#ded6f3] flex flex-col overflow-hidden"
             style={{ height: '540px' }}>

          {/* Header */}
          <div className="px-5 py-4 border-b border-[#f0ebf8]"
               style={{ background: 'linear-gradient(135deg, #8127cf 0%, #ec4899 100%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center
                                justify-center text-white font-bold text-sm">AI</div>
                <div>
                  <p className="text-white font-bold text-sm">ARIA</p>
                  <p className="text-white/70 text-xs">
                    {lessonTitle ? `Leçon : ${lessonTitle.slice(0, 25)}…` : 'Assistante pédagogique · RAG'}
                  </p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map(msg => <Message key={msg.id} msg={msg} />)}
            {status && (
              <div className="flex items-center gap-2 text-xs text-[#8127cf] px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#8127cf] animate-pulse" />
                {status}
              </div>
            )}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-wrap gap-2 mt-2">
                {SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => send(s.text)}
                          className="px-3 py-1.5 text-xs rounded-full border border-[#8127cf]/30
                                     text-[#8127cf] hover:bg-[#f0dbff] transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-[#f0ebf8]">
            <div className="flex items-end gap-2 bg-[#f8f5ff] rounded-2xl px-4 py-2.5
                            border border-[#e5d8f5] focus-within:border-[#8127cf]/40">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question sur le cours…"
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm
                           text-[#0b1c30] placeholder:text-[#7e7385] resize-none
                           disabled:opacity-50 max-h-24 overflow-y-auto leading-relaxed"
                style={{ minHeight: '22px' }}
              />
              <button onClick={() => send()} disabled={!input.trim() || isLoading}
                      className="w-8 h-8 rounded-xl flex items-center justify-center
                                 text-white transition-all active:scale-95
                                 disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #ec4899, #8127cf)' }}>
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
            <p className="text-[10px] text-[#7e7385] text-center mt-2">
              Réponses basées sur le contenu de vos leçons · IAAI eLearning 101
            </p>
          </div>
        </div>
      )}

      {/* Bouton flottant */}
      <button onClick={() => setOpen(o => !o)}
              className="w-14 h-14 rounded-full shadow-xl flex items-center justify-center
                         text-white transition-all hover:scale-110 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #ec4899 0%, #8127cf 100%)' }}
              aria-label={open ? 'Fermer ARIA' : 'Ouvrir ARIA'}>
        <span className="material-symbols-outlined text-[26px]">
          {open ? 'close' : 'smart_toy'}
        </span>
      </button>
    </div>
  )
}
