// TourAPI 날짜('YYYYMMDD') 다루기

export const todayYmd = () => {
  const kst = new Date(Date.now() + 9 * 3600e3)
  return kst.toISOString().slice(0, 10).replaceAll('-', '')
}

export const fmtYmd = (s) => (s ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : '')

export const monthOf = (s) => Number(s.slice(4, 6))

// 두 'YYYYMMDD' 사이의 일수 (b - a)
export const daysBetween = (a, b) => {
  const t = (s) => Date.UTC(+s.slice(0, 4), +s.slice(4, 6) - 1, +s.slice(6, 8))
  return Math.round((t(b) - t(a)) / 86400e3)
}

// 'ongoing' 진행중 · 'upcoming' 예정 · 'ended' 종료
export function statusOf(f, today = todayYmd()) {
  if (f.end < today) return 'ended'
  if (f.start > today) return 'upcoming'
  return 'ongoing'
}

// 보여줄 순서: ① 진행중(곧 끝나는 것부터) ② 예정(곧 시작하는 것부터) ③ 종료(최근에 끝난 것부터)
const RANK = { ongoing: 0, upcoming: 1, ended: 2 }

export function sortFestivals(list, today = todayYmd()) {
  return [...list].sort((a, b) => {
    const sa = statusOf(a, today)
    const sb = statusOf(b, today)
    if (sa !== sb) return RANK[sa] - RANK[sb]
    if (sa === 'ongoing') return a.end.localeCompare(b.end) || a.start.localeCompare(b.start)
    if (sa === 'upcoming') return a.start.localeCompare(b.start) || a.end.localeCompare(b.end)
    return b.end.localeCompare(a.end)
  })
}

// ── 월·달력 계산 ──────────────────────────────────────────
export const ymdOf = (y, m, d) => `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
export const daysInMonth = (y, m) => new Date(y, m, 0).getDate()

// 그 달과 기간이 하루라도 겹치는가 (8월 25일~11월 15일 행사는 8·9·10·11월에 모두 걸친다)
export const overlapsMonth = (f, y, m) => f.start <= ymdOf(y, m, daysInMonth(y, m)) && f.end >= ymdOf(y, m, 1)
