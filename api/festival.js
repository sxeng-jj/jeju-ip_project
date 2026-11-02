import { getEventDetail } from '../server/events.js'

// GET /api/festival?id=140930 | cul-123 | std-abc → 한 건의 상세정보
export default async function handler(req, res) {
  try {
    const id = String(req.query.id ?? '')
    if (!/^(cul-|std-)?[a-z0-9]+$/.test(id)) return res.status(400).json({ error: '올바르지 않은 id 예요' })
    res.status(200).json(await getEventDetail(id))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
