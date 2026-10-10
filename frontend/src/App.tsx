import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowUpRight, AudioLines, Bot, ChevronRight, Circle, Clock3, Command, Cpu, Globe2, LayoutDashboard, Mic, Send, ShieldCheck, Sparkles, Terminal, Zap } from 'lucide-react'
import { getStatus, sendMessage, type AssistantStatus, type Language } from './api'

type Message = { id: number; role: 'user' | 'assistant'; text: string }
type History = { id: number; text: string; result: 'pending' | 'complete' | 'failed'; time: string }
const copy = {
  en: { overview: 'COMMAND CENTER', title: 'At your service.', subtitle: 'Your personal intelligence, one conversation away.', chat: 'Assistant channel', placeholder: 'Ask JARVIS something…', send: 'Send message', empty: 'No commands yet. Your session starts here.', history: 'Command history', greeting: 'Hello. I’m JARVIS, your personal assistant. This is a local demo — how can I help you explore?', offline: 'Backend unavailable. Check that the Python server is running.', voice: 'Voice is coming in a later milestone. No microphone access is requested.', ready: 'Assistant ready', connecting: 'Connecting', unavailable: 'Assistant offline' },
  sr: { overview: 'KONTROLNI CENTAR', title: 'Na vašoj usluzi.', subtitle: 'Vaša lična inteligencija, na samo jedan razgovor.', chat: 'Kanal asistenta', placeholder: 'Pitajte JARVIS nešto…', send: 'Pošalji poruku', empty: 'Još nema komandi. Vaša sesija počinje ovde.', history: 'Istorija komandi', greeting: 'Zdravo. Ja sam JARVIS, vaš lični asistent. Ovo je lokalni demo — kako mogu da pomognem?', offline: 'Backend nije dostupan. Proverite da li Python server radi.', voice: 'Glas stiže u narednoj fazi. Pristup mikrofonu nije zatražen.', ready: 'Asistent spreman', connecting: 'Povezivanje', unavailable: 'Asistent nije dostupan' },
}

export default function App() {
  const [language, setLanguage] = useState<Language>('en')
  const [status, setStatus] = useState<AssistantStatus | null>(null)
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<History[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState(false)
  const nextId = useRef(0)
  const chatEnd = useRef<HTMLDivElement>(null)
  const text = copy[language]
  useEffect(() => {
    let active = true
    const refresh = async () => {
      try { const current = await getStatus(); if (active) { setStatus(current); setConnection('online') } }
      catch { if (active) { setStatus(null); setConnection('offline') } }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 10000)
    return () => { active = false; clearInterval(timer) }
  }, [])
  useEffect(() => { document.documentElement.lang = language }, [language])
  useEffect(() => { chatEnd.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' }) }, [messages, sending])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || sending || connection !== 'online') return
    const id = ++nextId.current
    setDraft(''); setSending(true); setError(false)
    setMessages(current => [...current, { id, role: 'user', text: message }])
    setHistory(current => [{ id, text: message, result: 'pending' as const, time: new Date().toLocaleTimeString(language === 'sr' ? 'sr-RS' : 'en-GB', {hour: '2-digit', minute: '2-digit'}) }, ...current].slice(0, 20))
    try {
      const response = await sendMessage(message, language)
      setMessages(current => [...current, {id: ++nextId.current, role: 'assistant', text: response.reply}])
      setHistory(current => current.map(item => item.id === id ? {...item, result: 'complete'} : item))
    } catch {
      setError(true)
      setHistory(current => current.map(item => item.id === id ? {...item, result: 'failed'} : item))
    } finally { setSending(false) }
  }
  const online = connection === 'online'
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#dashboard" aria-label="JARVIS dashboard"><div className="brand-mark"><Command size={22}/></div><span>JARVIS<span className="brand-sub">PERSONAL INTELLIGENCE</span></span></a>
      <div className="nav-label">WORKSPACE</div>
      <a className="nav-item active" href="#dashboard"><LayoutDashboard size={18}/>Dashboard<span className="nav-dot"/></a>
      <a className="nav-item" href="#chat"><AudioLines size={18}/>Assistant channel</a>
      <a className="nav-item" href="#history"><Clock3 size={18}/>Session history</a>
      <div className="sidebar-bottom"><ShieldCheck size={22}/><strong>You’re in control</strong><p>Local demo. No computer actions. No external AI connection.</p><span className="version">FOUNDATION / v0.1.0</span></div>
    </aside>
    <main id="dashboard">
      <header className="topbar"><div className="breadcrumb">Workspace <ChevronRight size={14}/> <span>Overview</span></div><div className="top-actions"><span className="local-badge"><span/>LOCAL DEMO</span><label className="language"><Globe2 size={15}/><select aria-label="Language" value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="en">English</option><option value="sr">Srpski</option></select></label><div className="avatar">U</div></div></header>
      <div className="content"><section className="welcome"><div><div className="eyebrow">{text.overview} <span>/ 01</span></div><h1>{text.title}</h1><p>{text.subtitle}</p></div><span className="platform-tag"><Command size={14}/> BUILT FOR macOS</span></section>
      <section className="hero"><div className="hero-copy"><span className={`connection ${connection}`} role="status"><span/>{online ? text.ready : connection === 'connecting' ? text.connecting : text.unavailable}</span><h2>A little more human.<br/><span>A lot more possible.</span></h2><p>A space to think, ask, and create.<br/>Your next idea starts with a conversation.</p><a className="hero-link" href="#chat">Open assistant channel <ArrowUpRight size={16}/></a></div><div className="reactor" aria-hidden="true"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit orbit-three"/><div className="reactor-core"><AudioLines size={52} strokeWidth={1}/></div><span className="reactor-label">J.A.R.V.I.S.</span><span className="reactor-code">NEURAL INTERFACE · DEMO</span></div><span className="hero-corner">SYSTEM / {online ? 'CONNECTED' : 'WAITING'}</span></section>
      <section className="status-grid" aria-label="System status">
        <StatusCard icon={<Activity size={19}/>} title="Backend connection" value={online ? 'Online' : connection === 'connecting' ? 'Connecting' : 'Offline'} detail={online ? 'Health check passed' : 'Waiting for health check'} active={online}/>
        <StatusCard icon={<Cpu size={19}/>} title="Assistant engine" value={status?.mode === 'mock' ? 'Mock mode' : 'Unavailable'} detail="No API keys required" active={online}/>
        <StatusCard icon={<Mic size={19}/>} title="Voice interface" value="Coming soon" detail="Microphone placeholder"/>
        <StatusCard icon={<ShieldCheck size={19}/>} title="Computer automation" value="Not connected" detail="Future explicit approval"/>
      </section>
      <div className="workspace-grid"><section className="panel chat-panel" id="chat"><div className="panel-header"><div><Bot size={19}/><h3>{text.chat}</h3></div><span className="subtle-tag">{online ? 'MOCK' : 'OFFLINE'}</span></div><div className="chat-messages" aria-live="polite"><div className="message assistant"><div className="message-avatar"><Sparkles size={16}/></div><div><span className="message-author">JARVIS <small>LOCAL ASSISTANT</small></span><p>{text.greeting}</p></div></div>{messages.map(message => <div className={`message ${message.role}`} key={message.id}><div className="message-avatar">{message.role === 'assistant' ? <Sparkles size={16}/> : 'U'}</div><div><span className="message-author">{message.role === 'assistant' ? 'JARVIS' : language === 'sr' ? 'VI' : 'YOU'}</span><p>{message.text}</p></div></div>)}{sending && <p className="pending">{language === 'sr' ? 'JARVIS odgovara…' : 'JARVIS is responding…'}</p>}<div ref={chatEnd}/></div>{(connection === 'offline' || error) && <div className="notice error" role="alert">{text.offline}</div>}{voiceNotice && <div className="notice" role="status">{text.voice}</div>}<form className="composer" onSubmit={event => void submit(event)}><input aria-label="Message" placeholder={text.placeholder} value={draft} onChange={event => setDraft(event.target.value)} maxLength={2000} disabled={sending}/><button className="mic-button" type="button" aria-label="Microphone — coming soon" onClick={() => setVoiceNotice(current => !current)}><Mic size={18}/></button><button className="send-button" type="submit" aria-label={text.send} disabled={!draft.trim() || sending || !online}><Send size={17}/></button></form><div className="composer-note"><ShieldCheck size={12}/> Mock responses · Session-only history · No actions executed</div></section>
      <section className="panel history-panel" id="history"><div className="panel-header"><div><Terminal size={18}/><h3>{text.history}</h3></div><span className="count">{history.length.toString().padStart(2, '0')}</span></div>{history.length === 0 ? <div className="empty-history"><div><Clock3 size={27}/></div><strong>A fresh start.</strong><p>{text.empty}</p></div> : <ol className="history-list">{history.map(item => <li key={item.id}><div className={`history-icon ${item.result}`}><Zap size={14}/></div><div><p>{item.text}</p><span>{item.result === 'complete' ? 'Mock response' : item.result === 'failed' ? 'Request failed' : 'Pending'} · {item.time}</span></div></li>)}</ol>}<div className="history-footer"><Circle size={8}/> History clears when you reload</div></section></div>
      <footer className="page-footer"><span>JARVIS / PERSONAL INTELLIGENCE SYSTEM</span><span>Milestone 01 <span className="footer-dot">·</span> Foundation</span></footer>
      </div>
    </main>
  </div>
}
function StatusCard({icon, title, value, detail, active = false}: {icon: React.ReactNode; title: string; value: string; detail: string; active?: boolean}) {
  return <div className="status-card"><div className="card-top"><span>{title}</span><span className={active ? 'icon-active' : ''}>{icon}</span></div><strong>{value}</strong><p><span className={active ? 'card-dot active-dot' : 'card-dot'}/>{detail}</p></div>
}
