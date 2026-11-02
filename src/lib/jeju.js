// 3D 지도용 제주 지형 데이터 (외부 지도 없이 손으로 찍은 근사 해안선)

// [경도, 위도] — 제주시에서 시계 방향으로 한 바퀴
export const JEJU_OUTLINE = [
  [126.53, 33.52], [126.65, 33.54], [126.75, 33.56], [126.85, 33.52],
  [126.94, 33.46], [126.93, 33.40], [126.83, 33.32], [126.71, 33.26],
  [126.56, 33.24], [126.41, 33.24], [126.31, 33.22], [126.25, 33.21],
  [126.17, 33.24], [126.16, 33.31], [126.24, 33.39], [126.25, 33.43],
  [126.32, 33.47], [126.42, 33.50],
]

export const HALLA = { lng: 126.533, lat: 33.362 } // 한라산 백록담 부근

const CENTER = { lng: 126.55, lat: 33.38 }
const SCALE = 0.1 // 1km = 0.1 단위

// 경도·위도 → 3D 평면 좌표 [x, z]. 위도 1° ≈ 111km, 경도 1° ≈ 93km (제주 위도 기준)
export function project(lng, lat) {
  return [(lng - CENTER.lng) * 93 * SCALE, -(lat - CENTER.lat) * 111 * SCALE]
}

// 같은 곳에 몰린 핀 펼치기
// 가까운 핀(NEAR 이내)끼리 묶어서 묶음의 중심 둘레에 고리 모양으로 벌려 놓는다.
// 반환: { [id]: { x, z, ox, oz } }  (x,z = 핀을 세울 자리, ox,oz = 실제 위치)
const NEAR = 0.6

export function spreadPins(festivals) {
  const pts = festivals.map((f) => {
    const [x, z] = project(f.lng, f.lat)
    return { id: f.id, x, z, key: f.start + f.id }
  })

  // 묶음 찾기 (union-find)
  const parent = pts.map((_, i) => i)
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  for (let i = 0; i < pts.length; i++)
    for (let j = i + 1; j < pts.length; j++)
      if (Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) < NEAR) parent[find(i)] = find(j)

  const groups = {}
  pts.forEach((p, i) => (groups[find(i)] ??= []).push(p))

  const out = {}
  for (const g of Object.values(groups)) {
    if (g.length === 1) {
      out[g[0].id] = { x: g[0].x, z: g[0].z, ox: g[0].x, oz: g[0].z }
      continue
    }
    const cx = g.reduce((s, p) => s + p.x, 0) / g.length
    const cz = g.reduce((s, p) => s + p.z, 0) / g.length
    const r = Math.max(0.4, (0.5 * g.length) / (2 * Math.PI)) // 이웃 핀과 약 0.5 간격
    g.sort((a, b) => a.key.localeCompare(b.key)).forEach((p, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / g.length
      out[p.id] = { x: cx + r * Math.cos(a), z: cz + r * Math.sin(a), ox: p.x, oz: p.z }
    })
  }
  return out
}

// 축제 시작 월 → 계절 색
export function seasonOf(ymd) {
  const m = Number(ymd.slice(4, 6))
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

export const SEASONS = {
  spring: { label: '봄 (3~5월)', color: '#ff8fb8' },
  summer: { label: '여름 (6~8월)', color: '#2ed3c6' },
  autumn: { label: '가을 (9~11월)', color: '#ff9a3c' },
  winter: { label: '겨울 (12~2월)', color: '#7db7ff' },
}

// 주변 장소 종류별 색 (초록 섬 위에서 잘 보이도록 밝은 색)
export const KIND_COLORS = { 관광지: '#ffffff', 문화시설: '#c58bff', 국가유산: '#ffd84a' }

export const seasonColor = (ymd) => SEASONS[seasonOf(ymd)].color
