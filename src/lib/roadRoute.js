// 실제 도로 길로 잰 이동 거리·시간. 공개 OSRM 서버(OpenStreetMap 도로 데이터, 키 불필요)를 쓴다.
// 주의: 실시간 교통(정체)은 반영하지 않은, 막히지 않을 때의 자동차 기준 값이다.
const OSRM = 'https://router.project-osrm.org/route/v1/driving'
const cache = new Map() // 같은 순서의 일정은 다시 묻지 않는다

// points: [{ lat, lng }, ...] (2곳 이상) → { legs: [{ km, min }], path: [[lat, lng], ...] }
export async function fetchRoadRoute(points) {
  const key = points.map((p) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`).join(';')
  if (cache.has(key)) return cache.get(key)

  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 10000)
  try {
    const res = await fetch(`${OSRM}/${key}?overview=full&geometries=geojson&steps=false`, { signal: ctl.signal })
    if (!res.ok) throw new Error(`길찾기 서버 오류 (${res.status})`)
    const data = await res.json()
    const r = data.routes?.[0]
    if (data.code !== 'Ok' || !r) throw new Error('길을 찾지 못했어요')
    const result = {
      legs: r.legs.map((l) => ({ km: l.distance / 1000, min: Math.max(1, Math.round(l.duration / 60)) })),
      path: r.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
    }
    cache.set(key, result)
    return result
  } finally {
    clearTimeout(timer)
  }
}

export const fmtMin = (min) => (min < 60 ? `${min}분` : `${Math.floor(min / 60)}시간${min % 60 ? ` ${min % 60}분` : ''}`)
