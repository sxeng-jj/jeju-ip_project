// TourAPI 날짜('YYYYMMDD') 다루기

export const todayYmd = () => {
  const kst = new Date(Date.now() + 9 * 3600e3)
  return kst.toISOString().slice(0, 10).replaceAll('-', '')
}

export const fmtYmd = (s) => (s ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : '')

export const monthOf = (s) => Number(s.slice(4, 6))

// 'ongoing' 진행중 · 'upcoming' 예정 · 'ended' 종료
export function statusOf(f, today = todayYmd()) {
  if (f.end < today) return 'ended'
  if (f.start > today) return 'upcoming'
  return 'ongoing'
}
