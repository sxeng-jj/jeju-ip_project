import { getFestivalDetail } from '../server/festival.js'

// GET /api/festival?id=140930 → 한 행사의 상세정보
export default async function handler(req, res) {
  try {
    res.status(200).json(await getFestivalDetail(req.query.id))
  } catch (e) {
    res.status(e.message.includes('올바르지') ? 400 : 500).json({ error: e.message })
  }
}
