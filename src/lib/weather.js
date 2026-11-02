// 날씨(기상청)와 축제를 이어 붙이는 도우미

export const cityOf = (festival) => (festival.addr?.includes('서귀포시') ? '서귀포시' : '제주시')

// 축제 기간과 겹치는 첫 예보일의 예보 (예보는 약 3일치라 없을 수 있다)
export function forecastFor(festival, weather) {
  const days = weather?.[cityOf(festival)] ?? []
  return days.find((d) => d.date >= festival.start && d.date <= festival.end)
}

export const weatherIcon = (w) => {
  if (w.rain !== '없음') return w.rain === '눈' ? 'cloud-snow' : 'cloud-rain'
  return { 맑음: 'sun', 구름많음: 'cloud-sun', 흐림: 'clouds' }[w.sky] ?? 'cloud'
}
