// 세 출처(TourAPI · 한눈에보는문화정보 · 전국문화축제표준데이터)를 하나의 행사 목록으로 합친다.
import { getCultureDetail, listCulture } from './culture.js'
import { getStdDetail, listStdFestivals } from './cultfest.js'
import { getFestivalDetail, searchFestivals } from './festival.js'

const kstYear = () => new Date(Date.now() + 9 * 3600e3).getUTCFullYear()

// 같은 행사인지 비교하려고 이름에서 회차·연도·기호를 지운다
const norm = (s) =>
  s.replace(/제\s*\d+\s*회/g, '').replace(/20\d\d/g, '').replace(/[\s\d[\]()〈〉<>《》「」『』·.,:!'"“”‘’~\-_/&]/g, '').toLowerCase()
const overlap = (a, b) => a.start <= b.end && b.start <= a.end

// 이름이 같거나 한쪽이 다른 쪽을 포함하고(5글자 이상) 기간이 겹치면 같은 행사로 본다.
// 입력 순서가 곧 우선순위다 (앞에 있는 출처가 남는다).
export function dedupe(list) {
  const kept = []
  for (const f of list) {
    const n = norm(f.title)
    const dup = kept.some(
      (k) =>
        overlap(k, f) &&
        (k.n === n || (Math.min(k.n.length, n.length) >= 5 && (k.n.includes(n) || n.includes(k.n)))),
    )
    if (!dup) kept.push({ ...f, n })
  }
  return kept.map(({ n: _n, ...f }) => f)
}

const cache = new Map() // year → { at, list }
const TTL = 10 * 60e3

// 한 출처가 실패해도 나머지로 목록을 보여준다 (모두 실패하면 오류)
export async function searchEvents({ year = kstYear() } = {}) {
  const hit = cache.get(year)
  if (hit && Date.now() - hit.at < TTL) return hit.list

  const names = ['tour', 'std', 'culture']
  const results = await Promise.allSettled([searchFestivals({ year }), listStdFestivals({ year }), listCulture({ year })])
  const ok = {}
  const failed = []
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') ok[names[i]] = r.value
    else failed.push(`${names[i]}: ${r.reason.message}`)
  })
  if (failed.length) console.warn('[events] 일부 출처 실패 —', failed.join(' | '))
  if (Object.keys(ok).length === 0) throw new Error(failed[0] ?? '행사 데이터를 불러오지 못했어요')

  const list = dedupe([...(ok.tour ?? []), ...(ok.std ?? []), ...(ok.culture ?? [])]).sort(
    (a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title, 'ko'),
  )
  // 일부 실패한 결과는 캐시하지 않아 다음 요청에서 다시 시도한다
  if (!failed.length) cache.set(year, { at: Date.now(), list })
  return list
}

// id 접두사로 출처를 가른다: 'cul-' 문화정보 · 'std-' 문화축제표준데이터 · 숫자만이면 TourAPI
export async function getEventDetail(id) {
  const s = String(id)
  if (s.startsWith('cul-')) return getCultureDetail(s.slice(4).replace(/\D/g, ''))
  if (s.startsWith('std-')) return getStdDetail(s)
  return getFestivalDetail(s)
}
