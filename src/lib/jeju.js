// 계절: 행사 시작 월 → 계절 (지도 핀 색, 도감)
export function seasonOf(ymd) {
  const m = Number(ymd.slice(4, 6))
  if (m >= 3 && m <= 5) return 'spring'
  if (m >= 6 && m <= 8) return 'summer'
  if (m >= 9 && m <= 11) return 'autumn'
  return 'winter'
}

export const SEASONS = {
  spring: { label: '봄 (3~5월)', color: '#f4c20d' },
  summer: { label: '여름 (6~8월)', color: '#1f7fd1' },
  autumn: { label: '가을 (9~11월)', color: '#f57c00' },
  winter: { label: '겨울 (12~2월)', color: '#c2185b' },
}

export const seasonColor = (ymd) => SEASONS[seasonOf(ymd)].color
