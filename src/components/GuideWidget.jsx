import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { post } from '../api/client'
import { useAppStore } from '../store/useAppStore'

const GENERAL_CHIPS = ['지금 진행 중인 축제 추천해줘', '서귀포 쪽 공연·전시 알려줘', '비 오는 날 갈 만한 실내 행사는?']
const DETAIL_CHIPS = ['이 행사를 간단히 요약해줘', '이 행사 가기 전에 알아둘 점은?', '이 근처에서 같이 볼 행사는?']
const MAX_TURNS = 10 // 서버에 보내는 최근 대화 수

// 답변 속 [제목](/경로 또는 https://주소) 링크와 **굵게** 만 화면에 그린다 (그 밖의 글자는 그대로 보여 줘서 안전하다)
function Rich({ text, onNavigate }) {
  const parts = []
  const re = /\[([^\]]+)\]\((\/[^)\s]*|https?:\/\/[^)\s]+)\)|\*\*([^*]+)\*\*/g
  let last = 0
  for (const m of text.matchAll(re)) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(!m[1]
      ? <strong key={m.index}>{m[3]}</strong>
      : m[2].startsWith('/')
        ? <Link key={m.index} to={m[2]} onClick={onNavigate}>{m[1]}</Link>
        : <a key={m.index} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)
}

// 답변 끝의 [[선택: 보기1 | 보기2]] 를 떼어 내 버튼 글자로 돌려준다 (예·아니오를 눌러서 답하게)
const splitChoices = (text) => {
  const m = text.match(/\[\[선택:\s*([^\]]+)\]\]\s*$/)
  if (!m) return { body: text, choices: [] }
  return { body: text.slice(0, m.index).trimEnd(), choices: m[1].split('|').map((c) => c.trim()).filter(Boolean).slice(0, 3) }
}

// 오른쪽 아래 AI 가이드: 어느 화면에서든 눌러서 작은 대화창으로 바로 물어볼 수 있다.
// 지금 보고 있는 화면(행사 상세라면 그 행사)을 서버에 함께 알려 줘서 "이 행사"처럼 말해도 알아듣는다.
export default function GuideWidget() {
  const { pathname } = useLocation()
  const detail = matchPath('/festivals/:id', pathname)
  const festivalId = detail?.params.id

  const myPlan = useAppStore((s) => s.plan) // 내 일정에 담은 행사: AI 가 일정을 짤 때 확인한다
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([]) // [{ role, content, error? }]
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    inputRef.current?.focus()
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading, open])

  const send = async (text) => {
    const q = text.trim()
    if (!q || loading) return
    const next = [...messages.filter((m) => !m.error), { role: 'user', content: q }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const { reply } = await post('/api/guide', {
        messages: next.slice(-MAX_TURNS).map(({ role, content }) => ({ role, content })),
        page: { path: pathname, festivalId },
        plan: myPlan,
      })
      setMessages([...next, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: e.message, error: true }])
    } finally {
      setLoading(false)
    }
  }

  const chips = festivalId ? DETAIL_CHIPS : GENERAL_CHIPS

  return (
    <>
      {open && (
        <section className="guide-panel" role="dialog" aria-label="AI 가이드 대화창">
          <header className="guide-head">
            <span className="fw-bold"><i className="bi bi-robot me-2" />AI 가이드 귤이</span>
            <button type="button" className="btn-close" aria-label="닫기" onClick={() => setOpen(false)} />
          </header>

          <div className="guide-list" ref={listRef} aria-live="polite">
            <div className="guide-msg bot">
              안녕하세요, 귤이예요 🍊 제주 축제·공연·전시를 찾아 드릴게요.{festivalId && ' 지금 보고 있는 행사에 대해서도 물어보세요.'}
            </div>
            {messages.map((m, i) => {
              const { body, choices } = m.role === 'assistant' && !m.error ? splitChoices(m.content) : { body: m.content, choices: [] }
              const last = i === messages.length - 1
              return (
                <div key={i} className={m.role === 'user' ? undefined : 'd-flex flex-column gap-1 align-items-start'} style={m.role === 'user' ? { display: 'contents' } : undefined}>
                  <div className={`guide-msg ${m.role === 'user' ? 'me' : 'bot'}${m.error ? ' err' : ''}`}>
                    {m.role === 'user' ? m.content : <Rich text={body} onNavigate={() => setOpen(false)} />}
                  </div>
                  {last && !loading && choices.length > 0 && (
                    <div className="d-flex flex-wrap gap-1">
                      {choices.map((c) => <button key={c} type="button" className="guide-chip guide-choice" onClick={() => send(c)}>{c}</button>)}
                    </div>
                  )}
                </div>
              )
            })}
            {loading && <div className="guide-msg bot text-secondary">찾아보는 중… <span className="spinner-border spinner-border-sm ms-1" aria-hidden="true" /></div>}
            {messages.length === 0 && (
              <div className="d-flex flex-wrap gap-1 mt-1">
                {chips.map((c) => <button key={c} type="button" className="guide-chip" onClick={() => send(c)}>{c}</button>)}
              </div>
            )}
          </div>

          <form className="guide-form" onSubmit={(e) => { e.preventDefault(); send(input) }}>
            <input
              ref={inputRef}
              className="form-control form-control-sm"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="무엇이든 물어보세요"
              maxLength={300}
              aria-label="AI 가이드에게 질문"
            />
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading || !input.trim()} aria-label="보내기">
              <i className="bi bi-send-fill" />
            </button>
          </form>
        </section>
      )}

      <button type="button" className="guide-fab" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? 'AI 가이드 닫기' : 'AI 가이드 열기'}>
        <i className={`bi bi-${open ? 'x-lg' : 'robot'}`} />
        {!open && <span className="ms-2">AI 가이드</span>}
      </button>
    </>
  )
}
