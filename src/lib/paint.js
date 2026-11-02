// 손그림 느낌의 모양을 만드는 도구들. 같은 씨앗(seed)이면 언제나 같은 모양이 나온다.

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f1 = (n) => Math.round(n * 10) / 10
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

// 살짝 찌그러진 둥근 덩어리 (바위·잎·구름·덤불)
export function blob(cx, cy, rx, ry, r, n = 9, jitter = 0.14) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (r() - 0.5) * 0.3
    const k = 1 + (r() - 0.5) * 2 * jitter
    return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]
  })
  const m0 = mid(pts[0], pts[1])
  let d = `M${f1(m0[0])} ${f1(m0[1])}`
  for (let i = 1; i <= n; i++) {
    const p = pts[i % n]
    const m = mid(p, pts[(i + 1) % n])
    d += `Q${f1(p[0])} ${f1(p[1])} ${f1(m[0])} ${f1(m[1])}`
  }
  return `${d}Z`
}

// 굽이치는 능선(언덕·산·밭) — 아래는 bottom 까지 채운다
export function ridge(x0, x1, top, amp, step, r, bottom, wave = 0) {
  if (x1 < x0 + step * 2) x1 = x0 + step * 2
  const pts = []
  for (let x = x0; x <= x1 + step; x += step) {
    pts.push([x, top + (r() - 0.5) * amp + Math.sin((x - x0) * 0.004 + wave) * amp * 0.4])
  }
  let d = `M${f1(x0)} ${f1(bottom)}L${f1(pts[0][0])} ${f1(pts[0][1])}`
  for (let i = 1; i < pts.length - 1; i++) {
    const m = mid(pts[i], pts[i + 1])
    d += `Q${f1(pts[i][0])} ${f1(pts[i][1])} ${f1(m[0])} ${f1(m[1])}`
  }
  return `${d}L${f1(pts[pts.length - 1][0])} ${f1(bottom)}Z`
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)]
