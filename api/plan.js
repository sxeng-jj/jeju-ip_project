import Anthropic from '@anthropic-ai/sdk'
import { clientIp, makeLimiter } from '../server/limit.js'
import { makePlan } from '../server/planner.js'

// 도구를 여러 번 부르는 일정 짜기는 오래 걸려서 시간을 늘려 둔다 (Vercel)
export const config = { maxDuration: 60 }

const limited = makeLimiter(6) // 일정 짜기는 비용이 커서 10분에 6번까지
const GROUPS = ['축제', '공연', '전시', '행사']
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
const compact = (s) => s.replaceAll('-', '')
const todayKst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)

// POST /api/plan { startDate, endDate, city, groups, transport, note, savedIds } → { title, summary, days, tips }
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 만 받아요' })
  try {
    const b = req.body ?? {}
    if (!isDate(b.startDate ?? '') || !isDate(b.endDate ?? '')) return res.status(400).json({ error: '날짜를 골라 주세요' })
    if (b.startDate < todayKst()) return res.status(400).json({ error: '오늘 이후 날짜를 골라 주세요' })
    const span = (Date.parse(b.endDate) - Date.parse(b.startDate)) / 86400e3
    if (span < 0) return res.status(400).json({ error: '끝나는 날이 시작하는 날보다 빠를 수 없어요' })
    if (span > 4) return res.status(400).json({ error: '일정은 최대 5일까지 짤 수 있어요' })

    if (limited(clientIp(req))) return res.status(429).json({ error: '일정을 너무 많이 만들었어요. 잠시 뒤에 다시 시도해 주세요.' })

    const plan = await makePlan({
      start: compact(b.startDate),
      end: compact(b.endDate),
      city: ['제주시', '서귀포시'].includes(b.city) ? b.city : '',
      groups: Array.isArray(b.groups) ? b.groups.filter((g) => GROUPS.includes(g)) : [],
      transport: b.transport === 'bus' ? 'bus' : 'car',
      note: String(b.note ?? '').replace(/[<>]/g, ' ').slice(0, 200).trim(),
      savedIds: Array.isArray(b.savedIds) ? b.savedIds.filter((id) => typeof id === 'string' && /^[\w-]{1,40}$/.test(id)).slice(0, 12) : [],
    })
    res.status(200).json(plan)
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'AI 가 바빠요. 잠시 뒤에 다시 시도해 주세요.' })
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ error: 'AI 의 API 키가 올바르지 않아요.' })
    res.status(e.status && e.status >= 400 && e.status < 600 ? e.status : 500).json({ error: e.message })
  }
}
