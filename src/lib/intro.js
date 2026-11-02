// 「귤이의 제주 여행」 인트로(약 42초)의 줄거리와 움직임 수식.
// 모든 움직임을 '지금 몇 초인가(t)'만 알면 계산되는 함수로 만들어, 건너뛰기·다시 보기·정지 화면을 같은 코드로 그린다.
// 화면 그리기는 components/GyuriJourney.jsx, 배경 일러스트는 components/IntroScenery.jsx.

export const DURATION = 42

export const SCENES = [
  { key: 'orchard', name: '감귤밭', from: 0, to: 7 },
  { key: 'wall', name: '돌담길', from: 7, to: 11 },
  { key: 'canola', name: '유채꽃과 한라산', from: 11, to: 16 },
  { key: 'sea', name: '제주 바다', from: 16, to: 21 },
  { key: 'haenyeo', name: '해녀의 바다', from: 21, to: 25 },
  { key: 'festival', name: '제주 축제', from: 25, to: 30 },
  { key: 'sunset', name: '노을 해변', from: 30, to: 34 },
  { key: 'change', name: '', from: 34, to: 38 },
  { key: 'welcome', name: '', from: 38, to: 42 },
]
export const sceneIndexAt = (t) => {
  const i = SCENES.findIndex((s) => t < s.to)
  return i < 0 ? SCENES.length - 1 : i
}

const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const lerp = (a, b, w) => a + (b - a) * w
export const smooth = (a, b, x) => {
  const u = clamp01((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}
// 0 → 1 로 커지되 한 번 넘쳤다가 안착 (감쇠 스프링)
export const pop = (u) => (u <= 0 ? 0 : 1 - Math.exp(-7 * u) * Math.cos(12 * u))

// ── 귤의 크기와 자리 ──
export const G = 1500 // 중력
export const GROUND = 700 // 길바닥 높이
export const RX = 58 // 약간 납작한 제주 감귤
export const RY = 51
const R_ROLL = 54.5 // 구르는 반지름 (이동 거리 ÷ 이것 = 회전 각도)
export const PIVOT = { x: 640, y: 232 } // 가지에 달린 꼭지
export const HANG = { x: 640, y: 330 } // 매달린 귤의 중심
const L = HANG.y - PIVOT.y

export const T_FALL = 2.1
const FALL_DROP = GROUND - RY - HANG.y
const T_FALL_DUR = Math.sqrt((2 * FALL_DROP) / G)
export const T_LAND = T_FALL + T_FALL_DUR
const X_LAND = HANG.x + 60
export const T_ROLL = 3.9
const X_ROLL = X_LAND + 30
export const X_END = 5600
export const T_ARRIVE = 34

const V1 = G * T_FALL_DUR * 0.42
const V2 = V1 * 0.45
const D1 = (2 * V1) / G
const D2 = (2 * V2) / G
export const LANDINGS = [T_LAND, T_LAND + D1, T_LAND + D1 + D2]

// 변신 장면의 순서
export const CH = { eyes: 35.0, mouth: 35.15, cheek: 35.25, legs: 35.3, arms: 35.45, hat: 35.7, bag: 35.95 }
const HOPS = [
  { t0: 35.0, d: 0.7, h: 90 },
  { t0: 35.7, d: 0.6, h: 50 },
  { t0: 36.3, d: 0.45, h: 22 },
]
HOPS.forEach((h) => LANDINGS.push(h.t0 + h.d))
export const LEG_LEN = 40

// 매달려 흔들리는 각도 (떨어지기 직전에 점점 세게)
const sway = (t) => {
  if (t >= T_FALL) return 0
  const amp = 0.05 + 0.2 * smooth(0.9, 1.9, t)
  return amp * Math.sin(t * (2.4 + t * 1.6)) * (1 - smooth(1.9, T_FALL, t))
}

// 굴러가는 속도의 모양(사다리꼴): 천천히 출발해 일정하게 달리다가 마지막에 서서히 멈춘다
const RAMP_UP = 0.1
const RAMP_DOWN = 0.22
const V_CRUISE = 1 / (1 - (RAMP_UP + RAMP_DOWN) / 2)
function rollProgress(u) {
  if (u <= 0) return 0
  if (u >= 1) return 1
  if (u < RAMP_UP) return (0.5 * V_CRUISE * u * u) / RAMP_UP
  if (u < 1 - RAMP_DOWN) return 0.5 * V_CRUISE * RAMP_UP + V_CRUISE * (u - RAMP_UP)
  const w = 1 - u
  return 1 - (0.5 * V_CRUISE * w * w) / RAMP_DOWN
}

export function xAt(t) {
  if (t < T_FALL) return PIVOT.x + L * Math.sin(sway(t))
  if (t < T_LAND) return HANG.x + (X_LAND - HANG.x) * ((t - T_FALL) / T_FALL_DUR)
  if (t < T_ROLL) return X_LAND + (X_ROLL - X_LAND) * smooth(T_LAND, T_ROLL, t)
  if (t >= T_ARRIVE) return X_END
  return X_ROLL + (X_END - X_ROLL) * rollProgress((t - T_ROLL) / (T_ARRIVE - T_ROLL))
}

// 돌담길에서 작은 돌을 넘고, 파도 앞에서 폴짝 뛰는 자리
export const BUMPS = [7.7, 8.6, 9.5, 10.4].map((tt, i) => ({ x: xAt(tt), h: [15, 22, 13, 20][i] }))
export const WAVE_HOP = { x: xAt(20.7), h: 30 }

// 회전 각도: 구른 거리에 정확히 맞춘다. 멈추면 잎이 위로 오도록 가장 가까운 한 바퀴 지점으로 돌려 맞춘다.
export function rotAt(t) {
  if (t < T_FALL) return sway(t)
  if (t < T_LAND) return 0.35 * ((t - T_FALL) / T_FALL_DUR)
  const roll = 0.35 + (xAt(t) - X_LAND) / R_ROLL
  const target = Math.round(roll / (2 * Math.PI)) * 2 * Math.PI
  return roll + (target - roll) * smooth(33.0, 34.8, t)
}

export const heightAt = (th) => Math.hypot(RX * Math.sin(th), RY * Math.cos(th)) // 중심에서 바닥까지 (타원이라 회전에 따라 달라진다)
const arc = (u) => 4 * u * (1 - u)

// 바닥에서 떠오른 높이: 통통 튐 + 작은 돌 + 파도 + 북소리 박자 + 변신 뒤 폴짝 + 다리가 자라며 올라옴
export function liftAt(t) {
  let h = 0
  const x = xAt(t)
  if (t >= T_LAND && t < T_LAND + D1 + D2) {
    const s = t - T_LAND
    h += s < D1 ? V1 * s - 0.5 * G * s * s : V2 * (s - D1) - 0.5 * G * (s - D1) ** 2
  }
  for (const b of BUMPS) {
    const d = (x - b.x) / 46
    if (Math.abs(d) < 1) h += b.h * (1 - d * d)
  }
  const dw = (x - WAVE_HOP.x) / 62
  if (Math.abs(dw) < 1) h += WAVE_HOP.h * (1 - dw * dw)
  if (t > 25.3 && t < 29.8) {
    const amp = 14 * smooth(25.3, 25.9, t) * (1 - smooth(29.0, 29.8, t))
    h += amp * Math.sin(Math.PI * (((t - 25) / 0.5) % 1)) // 0.5초(120BPM) 박자에 맞춰 살짝 뜀
  }
  for (const hop of HOPS) {
    const u = (t - hop.t0) / hop.d
    if (u > 0 && u < 1) h += hop.h * arc(u)
  }
  h += LEG_LEN * pop((t - CH.legs) / 0.6)
  return h
}

export function yAt(t) {
  if (t < T_FALL) return PIVOT.y + L * Math.cos(sway(t))
  if (t < T_LAND) return HANG.y + 0.5 * G * (t - T_FALL) ** 2
  return GROUND - heightAt(rotAt(t)) - liftAt(t)
}

// 착지할 때 살짝 납작해졌다 돌아오는 모양
export function squashAt(t) {
  for (const l of LANDINGS) {
    const s = (t - l) / 0.22
    if (s > 0 && s < 1) {
      const k = Math.sin(Math.PI * s)
      return { sx: 1 + 0.13 * k, sy: 1 - 0.16 * k }
    }
  }
  const u = (t - 34.55) / 0.45 // 변신 직전 웅크림
  if (u > 0 && u < 1) {
    const k = Math.sin(Math.PI * u)
    return { sx: 1 + 0.1 * k, sy: 1 - 0.12 * k }
  }
  return { sx: 1, sy: 1 }
}

// ── 카메라 ──
export const REF_W = 1600 // 배경을 배치할 때 기준으로 삼는 화면 너비
// 귤이 화면 어디에 있는가(너비 비율): 처음엔 가운데 → 달리는 동안 왼쪽 36% → 마지막엔 다시 가운데
const frac = (t) => {
  const run = lerp(0.5, 0.36, smooth(2.8, 6.5, t))
  return lerp(run, 0.5, smooth(32.5, 35, t))
}
// 카메라가 따라가는 가로 위치 (매달려 흔들리는 동안에는 흔들림을 따라가지 않는다)
const anchorX = (t) => (t < T_ROLL ? HANG.x + (X_ROLL - HANG.x) * smooth(1.5, T_ROLL, t) : xAt(t))
// 세로로 긴 화면(휴대폰)은 가장자리가 잘리므로 귤이를 가운데에 둔다
export const camXAt = (t, vbW = REF_W) => anchorX(t) - vbW * (vbW < 1100 ? 0.5 : frac(t))
export const camYAt = (t) => -170 * (1 - smooth(2.3, 6.2, t)) // 처음엔 가지 높이를 보다가 귤 높이까지 내려온다
// 마지막 장면에서 귤이 정면으로 다가오는 정도
export const zoomAt = (t) => 1 + 0.75 * smooth(33.5, 36, t)
export const lookAt = (t) => lerp(450, 640, smooth(33.5, 36, t)) // 화면 가운데가 보는 높이

// 배경 요소를 놓는 도우미: '시간 t 에 화면 가로 sx 에 보이게' 놓으려면 f(시차 비율) 층에서 어디에 그려야 하는가
export const LX = (t, sx, f) => sx + f * camXAt(t)

// ── 하늘 ──
const SKY_KEYS = [
  { t: 0, top: '#bfe3e4', bot: '#fff1cf' }, // 아침 감귤밭
  { t: 11, top: '#a8dcef', bot: '#fff4d8' }, // 맑은 낮, 한라산
  { t: 18, top: '#8fd3ea', bot: '#f4f4de' }, // 바다
  { t: 25, top: '#ffd7a2', bot: '#fff0d0' }, // 축제 오후
  { t: 30, top: '#f6a66c', bot: '#ffdca8' }, // 노을 시작
  { t: 34, top: '#e98f6a', bot: '#ffd1a0' }, // 석양
  { t: 38, top: '#ffcf8f', bot: '#fff0cf' }, // 환영 인사의 따뜻한 빛
]
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const mixHex = (a, b, w) => {
  const A = hex(a)
  const B = hex(b)
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], w))).join(',')})`
}
export function skyAt(t) {
  const i = SKY_KEYS.findIndex((k) => t < k.t)
  const a = SKY_KEYS[i < 0 ? SKY_KEYS.length - 1 : Math.max(0, i - 1)]
  const b = SKY_KEYS[i < 0 ? SKY_KEYS.length - 1 : Math.max(0, i)]
  const w = a === b ? 0 : smooth(a.t, b.t, t)
  return { top: mixHex(a.top, b.top, w), bot: mixHex(a.bot, b.bot, w) }
}
export const sunY = (t) => lerp(150, 520, smooth(2, 35, t))
// 장면 전체에 덧입히는 따뜻한 색 (축제의 불빛 → 노을)
export const warmthAt = (t) => 0.1 * smooth(25.5, 28, t) * (1 - smooth(30, 31, t)) + 0.2 * smooth(30, 34, t) * (1 - 0.45 * smooth(37, 39, t))

// ── 활동 아이콘 (새 장소에 닿을 때마다 0.3초 튀어나와 1.3초 머물다 사라진다) ──
export const ICONS = [
  { id: 'walk', t: 7.4 },
  { id: 'camera', t: 11.8 },
  { id: 'wave', t: 16.6 },
  { id: 'shell', t: 21.5 },
  { id: 'music', t: 25.7 },
]
export function iconState(t, start) {
  const s = t - start
  if (s < 0 || s > 1.95) return 0
  if (s < 0.3) return pop(s / 0.3)
  if (s < 1.6) return 1
  return 1 - smooth(1.6, 1.95, s)
}

// 효과음이 울릴 때(초)
export const SFX = {
  thumps: LANDINGS.slice(0, 3),
  knocks: BUMPS.map((_, i) => [7.7, 8.6, 9.5, 10.4][i]),
  shutter: 12.4,
  splash: 20.7,
  bubbles: 21.6,
  drums: Array.from({ length: 10 }, (_, i) => 25.5 + i * 0.5),
  chimes: [34.2, 34.5, 34.8, 35.1],
  boings: HOPS.map((h) => h.t0),
  hello: 38.0,
}
