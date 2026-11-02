import { heritageKinds, searchHeritage } from '../server/heritage.js'

export default async function handler(req, res) {
  try {
    const { keyword, kind, kinds } = req.query
    if (kinds) return res.status(200).json(await heritageKinds())
    res.status(200).json(await searchHeritage({ keyword, kind }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
