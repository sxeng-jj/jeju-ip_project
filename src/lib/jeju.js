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

export const seasonColor = (ymd) => SEASONS[seasonOf(ymd)].color
