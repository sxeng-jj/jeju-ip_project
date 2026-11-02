// 지역 판별 도우미 (TourAPI·문화정보·문화축제표준데이터가 함께 쓴다)

// 주소 → 읍·면 이름 (동 지역은 '시내'로 묶는다)  예) '제주특별자치도 제주시 애월읍 …' → '애월읍'
export function areaOf(addr = '', city) {
  const token = addr.match(/(?:제주시|서귀포시)\s+(\S+)/)?.[1] ?? ''
  if (/[읍면]$/.test(token)) return token
  return /(?:제주시|서귀포시)/.test(addr) ? `${city} 시내` : ''
}

// 주소에 시 이름이 있으면 그것을, 없으면 null
export const cityOfAddr = (addr = '') => addr.match(/서귀포시|제주시/)?.[0] ?? null

// 좌표만 있을 때 제주시/서귀포시를 어림잡는다. 한라산 능선을 따라 그은 대략적인 경계선이며 정확하지 않다.
// (서쪽 한경면 → 한라산 정상 → 동쪽 성산·표선 경계)
export function cityOfCoord(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !lat || !lng) return null
  const boundary = lng <= 126.53 ? 33.3 + (lng - 126.17) * 0.1667 : 33.36 + (lng - 126.53) * 0.125
  return lat > boundary ? '제주시' : '서귀포시'
}
