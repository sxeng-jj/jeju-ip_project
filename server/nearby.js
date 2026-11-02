// 한 지점 주변의 관광지·문화시설(TourAPI 위치기반) + 국가유산(국가유산청, 직접 거리 계산)
import { httpsUrl, tourCall } from './tourapi.js'
import { searchHeritage } from './heritage.js'

const TYPES = [
  { id: '12', kind: '관광지' },
  { id: '14', kind: '문화시설' },
]

// 같은 자리에 여러 유산이 있을 때 대표로 삼을 종목 순서 (직접 가볼 수 있는 것 우선)
const VISIT_FIRST = ['사적', '명승', '천연기념물', '국가민속문화유산', '시도기념물', '국가무형유산', '시도민속문화유산', '시도무형유산', '보물']

// 두 지점 사이 거리(m) — 하버사인
function distM(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2
  return Math.round(2 * 6371000 * Math.asin(Math.sqrt(a)))
}

// 반환: 가까운 순 [{ id, kind, sub?, title, addr, image, lat, lng, dist(m) }]
export async function getNearby({ lat, lng, radius = 5000, heritageLimit = 10 } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('lat, lng 가 필요해요')
  const r = Math.min(Math.max(Number(radius) || 5000, 500), 20000)

  const [tour, heritage] = await Promise.all([
    Promise.all(
      TYPES.map(async ({ id, kind }) => {
        const list = await tourCall('locationBasedList2', {
          numOfRows: '60',
          mapX: String(lng),
          mapY: String(lat),
          radius: String(r),
          contentTypeId: id,
          arrange: 'E', // 거리순
        })
        return list.map((p) => ({
          id: p.contentid,
          kind,
          title: p.title,
          addr: p.addr1,
          image: httpsUrl(p.firstimage),
          lat: Number(p.mapy),
          lng: Number(p.mapx),
          dist: Math.round(Number(p.dist)),
        }))
      }),
    ),
    searchHeritage({}),
  ])

  // 박물관 소장 유물(문서·불상 등)은 같은 좌표에 수십 건이 몰려 있어 코스에 쓸모가 없다.
  // → 같은 좌표는 하나로 묶고(대표 + 'more'), 직접 가볼 만한 종목을 대표로 고른다.
  const rank = (kind) => { const i = VISIT_FIRST.indexOf(kind); return i === -1 ? VISIT_FIRST.length : i }
  const groups = new Map()
  for (const h of heritage) {
    if (!h.lat || !h.lng) continue
    const dist = distM(lat, lng, h.lat, h.lng)
    if (dist > r) continue
    const key = `${h.lat.toFixed(4)},${h.lng.toFixed(4)}`
    ;(groups.get(key) ?? groups.set(key, []).get(key)).push({ ...h, dist })
  }
  const heritageNear = [...groups.values()]
    .map((g) => {
      const [h] = g.sort((a, b) => rank(a.kind) - rank(b.kind) || a.name.localeCompare(b.name))
      return {
        id: `heritage-${h.id}`,
        kind: '국가유산',
        sub: h.kind,
        title: h.name,
        addr: h.city,
        image: '',
        lat: h.lat,
        lng: h.lng,
        dist: h.dist,
        more: g.length - 1, // 같은 자리의 다른 유산 개수
      }
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, heritageLimit)

  return [...tour.flat(), ...heritageNear].sort((a, b) => a.dist - b.dist)
}
