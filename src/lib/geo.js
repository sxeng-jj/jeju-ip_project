// 두 지점 사이의 직선거리(km) — 하버사인
export function distKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// 직선거리로 어림잡은 이동 시간(분). 도로는 직선보다 굽으므로 1.35배, 제주 평균 속도는 45km/h 로 가정한다.
export const driveMinutes = (km) => Math.max(5, Math.round(((km * 1.35) / 45) * 60 / 5) * 5)

export const fmtKm = (km) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`)
