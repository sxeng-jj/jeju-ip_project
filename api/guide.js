import Anthropic from '@anthropic-ai/sdk'
import { askGuide } from '../server/guide.js'

// 도구를 여러 번 부르는 답변은 10초를 넘길 수 있어 시간을 늘려 둔다 (Vercel)
export const config = { maxDuration: 60 }

// 비용 보호: 같은 접속 주소에서 10분에 20번까지만 (서버가 꺼졌다 켜지면 초기화되는 간단한 제한)
const hits = new Map()
const LIMIT = 20
const WINDOW = 10 * 60e3
function limited(ip) {
  const now = Date.now()
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW)
  list.push(now)
  hits.set(ip, list)
  return list.length > LIMIT
}

// POST /api/guide  { messages: [{role, content}], page: { path, festivalId? } } → { reply }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 받아요' })
  try {
    const { messages, page } = req.body ?? {}
    if (!Array.isArray(messages) || messages.length === 0) return res.status(400).json({ error: '질문이 비어 있어요' })
    // 최근 대화 10개까지, 한 개당 1000자까지만 받는다
    const clean = messages
      .slice(-10)
      .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }))
    if (clean.length === 0 || clean[clean.length - 1].role !== 'user') return res.status(400).json({ error: '마지막은 질문이어야 해요' })
    while (clean[0].role !== 'user') clean.shift() // 대화는 사용자 말로 시작해야 한다

    const ip = String(req.headers['x-forwarded-for'] ?? req.socket?.remoteAddress ?? 'local').split(',')[0].trim()
    if (limited(ip)) return res.status(429).json({ error: '질문이 너무 많아요. 잠시 뒤에 다시 물어봐 주세요.' })

    const safePage = { path: String(page?.path ?? '').slice(0, 80), festivalId: /^[\w-]{1,40}$/.test(page?.festivalId ?? '') ? page.festivalId : undefined }
    res.status(200).json({ reply: await askGuide({ messages: clean, page: safePage }) })
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'AI 가이드가 바빠요. 잠시 뒤에 다시 물어봐 주세요.' })
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'AI 가이드의 API 키가 올바르지 않아요.' })
    res.status(e.status && e.status >= 400 && e.status < 600 ? e.status : 500).json({ error: e.message })
  }
}
