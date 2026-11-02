import { searchEvents } from '../server/events.js'

// GET /api/festivals → 세 출처를 합친 제주 축제·공연·전시·행사 목록
export default async function handler(req, res) {
  try {
    const year = Number(req.query.year) || undefined
    res.status(200).json(await searchEvents({ year }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
