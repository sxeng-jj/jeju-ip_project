import { getNearby } from '../server/nearby.js'

export default async function handler(req, res) {
  try {
    const { lat, lng, radius } = req.query
    res.status(200).json(await getNearby({ lat: Number(lat), lng: Number(lng), radius: Number(radius) }))
  } catch (e) {
    res.status(e.message.includes('필요해요') ? 400 : 500).json({ error: e.message })
  }
}
