import { distM } from './geo'

// 비 오는 날(강수 형태가 있거나 강수확률 60% 이상)
export const isRainy = (w) => Boolean(w) && (w.rain !== '없음' || w.pop >= 60)

// 날씨별로 어떤 종류를 몇 곳 넣을지: 비 오면 문화시설(실내) 위주, 맑으면 관광지(야외) 위주
const QUOTA = {
  rainy: { 문화시설: 2, 국가유산: 1, 관광지: 2 },
  sunny: { 관광지: 3, 국가유산: 1, 문화시설: 1 },
}

// 축제 주변 장소(가까운 순)로 하루 코스를 만든다.
// ① 종류별 할당만큼 가까운 곳부터 뽑고 ② 모자라면 가까운 곳으로 채운 뒤 ③ 축제에서 출발해 가까운 곳부터 이어 순서를 정한다.
export function buildCourse(center, spots, { rainy = false, size = 5 } = {}) {
  const quota = { ...(rainy ? QUOTA.rainy : QUOTA.sunny) }
  const names = new Set() // 같은 이름(예: 돌하르방 여러 개)은 한 번만
  const picked = []

  for (const s of spots) {
    if (picked.length >= size) break
    if (names.has(s.title) || !(quota[s.kind] > 0)) continue
    picked.push(s); names.add(s.title); quota[s.kind]--
  }
  for (const s of spots) {
    if (picked.length >= size) break
    if (names.has(s.title)) continue
    picked.push(s); names.add(s.title)
  }

  const order = []
  const rest = [...picked]
  let cur = center
  while (rest.length) {
    rest.sort((a, b) => distM(cur, a) - distM(cur, b))
    cur = rest.shift()
    order.push(cur)
  }
  return order
}

// 코스 총 이동거리(m): 축제 → 1번 → 2번 → …
export function courseLength(center, course) {
  let total = 0
  let cur = center
  for (const s of course) { total += distM(cur, s); cur = s }
  return total
}
