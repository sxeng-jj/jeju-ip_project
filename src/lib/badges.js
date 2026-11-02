import { monthOf } from './date'
import { seasonOf, SEASONS } from './jeju'
import { GROUPS, typeOf } from './festivalMeta'

// 3D 진열장의 메달 얼굴에 새길 그림 (이모지는 글꼴만 있으면 어디서나 그려진다)
const BADGE_EMOJI = {
  first: '🌱', explorer: '🧭', master: '🏆', both: '🗺️', seasons: '🍂',
  festival: '🎈', music: '🎭', art: '🖼️', writer: '✍️', months: '📅',
}

// 스탬프 + 행사 목록 → 도감 진행률과 배지
// stamps: Supabase stamps 행들, list: 전체 행사 목록
export function buildCollection(stamps, list) {
  const byId = new Map(list.map((f) => [f.id, f]))
  const got = stamps.map((s) => byId.get(s.festival_id)).filter(Boolean) // 목록에 있는 행사만 분류에 쓴다

  const progress = (title, keys, labelOf, pick) => ({
    title,
    rows: keys.map((k) => ({
      key: k,
      label: labelOf(k),
      have: new Set(got.filter((f) => pick(f) === k).map((f) => f.id)).size,
      total: list.filter((f) => pick(f) === k).length,
    })),
  })

  const sections = [
    progress('지역 도감', ['제주시', '서귀포시'], (k) => k, (f) => f.city),
    progress('유형 도감', GROUPS, (k) => k, (f) => typeOf(f).group),
    progress('사계절 도감', Object.keys(SEASONS), (k) => SEASONS[k].label, (f) => seasonOf(f.start)),
  ]

  const n = stamps.length
  const city = (k) => sections[0].rows.find((r) => r.key === k).have
  const group = (k) => sections[1].rows.find((r) => r.key === k).have
  const reviews = stamps.filter((s) => s.comment).length
  const months = new Set(got.map((f) => monthOf(f.start)))

  const badges = [
    { key: 'first', icon: 'patch-check', name: '첫 스탬프', desc: '스탬프 1개 모으기', ok: n >= 1 },
    { key: 'explorer', icon: 'compass', name: '제주 탐험가', desc: '스탬프 5개 모으기', ok: n >= 5, progress: [n, 5] },
    { key: 'master', icon: 'trophy', name: '축제 마스터', desc: '스탬프 15개 모으기', ok: n >= 15, progress: [n, 15] },
    { key: 'both', icon: 'signpost-split', name: '두 도시 여행자', desc: '제주시·서귀포시 모두 방문', ok: city('제주시') >= 1 && city('서귀포시') >= 1 },
    { key: 'seasons', icon: 'sun', name: '사계절 여행자', desc: '봄·여름·가을·겨울에 시작한 행사 모두 방문', ok: sections[2].rows.every((r) => r.have >= 1) },
    { key: 'festival', icon: 'balloon-heart', name: '축제 러버', desc: '축제 3곳 방문', ok: group('축제') >= 3, progress: [group('축제'), 3] },
    { key: 'music', icon: 'music-note-beamed', name: '공연 마니아', desc: '공연 3곳 방문', ok: group('공연') >= 3, progress: [group('공연'), 3] },
    { key: 'art', icon: 'easel', name: '전시 마니아', desc: '전시 3곳 방문', ok: group('전시') >= 3, progress: [group('전시'), 3] },
    { key: 'writer', icon: 'pencil', name: '후기 작가', desc: '후기 3개 남기기', ok: reviews >= 3, progress: [reviews, 3] },
    { key: 'months', icon: 'calendar-check', name: '꾸준한 여행자', desc: '서로 다른 3개 달의 행사 방문', ok: months.size >= 3, progress: [months.size, 3] },
  ].map(({ progress: p, ...b }) => ({ ...b, emoji: BADGE_EMOJI[b.key], have: p ? Math.min(p[0], p[1]) : undefined, need: p?.[1] }))

  return { sections, badges, collected: new Set(got.map((f) => f.id)).size, total: list.length }
}
