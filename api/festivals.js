import { searchFestivals } from '../server/festival.js'

export default async function handler(req, res) {
  try {
    const year = Number(req.query.year) || undefined
    res.status(200).json(await searchFestivals({ year }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
