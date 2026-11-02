// 홈 첫 화면 애니메이션의 줄거리와 움직임 수식.
// 모든 움직임을 '지금 몇 초인가(t)'만 알면 계산되는 함수로 만들어 두었다. 그래서 건너뛰기·다시 보기가 쉽고,
// 어느 시점의 장면이든 정확히 불러내 점검할 수 있다. (화면 그리기는 components/JejuStory3D.jsx)

export const G = 14 // 중력 (실제보다 세게 해서 통통 튀는 맛을 낸다)
export const RY = 0.405 // 땅에 놓인 귤의 중심 높이 (반지름 0.45 × 세로 0.9)
export const HANG = { x: 2.6, y: 2.75 } // 나뭇가지에 매달린 귤의 자리

export const T_FALL = 1.5 // 이때 꼭지가 떨어져 낙하 시작
const DROP_H = HANG.y - RY
export const T_DROP = Math.sqrt((2 * DROP_H) / G) // 땅에 닿기까지 걸리는 시간
export const T_LAND = T_FALL + T_DROP
export const X_LAND = HANG.x + 0.35 // 떨어지면서 조금 앞으로 밀려 닿는 자리
export const X_END = 67 // 여행의 끝(환영 인사를 하는 자리)
export const T_ARRIVE = 20 // 이때 도착해서 멈춘다
export const T_SQUASH = T_ARRIVE + 0.35 // 찌그러진다
export const T_POP = T_SQUASH + 0.5 // 팡! 캐릭터로 변신
export const T_WAVE = T_POP + 1.6 // 손 흔들기 시작
export const T_BUBBLE = T_POP + 2.0 // 환영 말풍선
export const END = T_POP + 3.6 // 줄거리 끝 (이후에는 손을 흔들며 서 있는다)

export const WALLS = [21.2, 53.4] // 귤이 폴짝 뛰어넘는 돌담의 x 위치
const BOUNCE = 0.5 // 튕길 때마다 속도가 이만큼 남는다

const clamp01 = (x) => Math.min(1, Math.max(0, x))
export const smooth = (a, b, x) => {
  const u = clamp01((x - a) / (b - a))
  return u * u * (3 - 2 * u)
}

// 굴러가는 속도의 모양(사다리꼴): 처음 20% 동안 서서히 빨라지고, 가운데는 일정하게 달리고, 마지막 30% 동안 서서히 멈춘다.
// 처음과 끝의 속도가 0 이라 갑자기 튀거나 급정지하지 않고, 가운데를 일정하게 둬서 축제 마당이 휙 지나가 버리지 않는다.
const RAMP_UP = 0.2
const RAMP_DOWN = 0.3
const V_CRUISE = 1 / (1 - (RAMP_UP + RAMP_DOWN) / 2) // 전체 거리를 1 로 맞추는 가운데 구간 속도
function rollProgress(u) {
  if (u <= 0) return 0
  if (u >= 1) return 1
  if (u < RAMP_UP) return (0.5 * V_CRUISE * u * u) / RAMP_UP
  if (u < 1 - RAMP_DOWN) return 0.5 * V_CRUISE * RAMP_UP + V_CRUISE * (u - RAMP_UP)
  const w = 1 - u
  return 1 - (0.5 * V_CRUISE * w * w) / RAMP_DOWN
}

// 귤의 가로 위치: 매달림 → 떨어지며 살짝 밀림 → 굴러가기 시작해 일정하게 달리다 도착 앞에서 서서히 멈춘다
export function xAt(t) {
  if (t < T_FALL) return HANG.x
  if (t < T_LAND) return HANG.x + (X_LAND - HANG.x) * ((t - T_FALL) / (T_LAND - T_FALL))
  if (t >= T_ARRIVE) return X_END
  return X_LAND + (X_END - X_LAND) * rollProgress((t - T_LAND) / (T_ARRIVE - T_LAND))
}

// 돌담 위를 지날 때 폴짝 뛰는 높이
export function hopAt(x) {
  let h = 0
  for (const w of WALLS) {
    const d = (x - w) / 0.95
    if (Math.abs(d) < 1) h += 0.75 * (1 - d * d)
  }
  return h
}

// 귤의 높이: 매달림 → 자유낙하 → 두세 번 통통 → 굴러가며 돌담에서 폴짝
export function yAt(t) {
  if (t < T_FALL) return HANG.y
  if (t < T_LAND) return HANG.y - 0.5 * G * (t - T_FALL) ** 2
  let dt = t - T_LAND
  let v = G * T_DROP * BOUNCE // 땅에 닿는 순간 속도의 절반으로 튕겨 오른다
  for (let i = 0; i < 4; i++) {
    const dur = (2 * v) / G
    if (dt < dur) return RY + v * dt - 0.5 * G * dt * dt
    dt -= dur
    v *= BOUNCE
  }
  return RY + hopAt(xAt(t))
}

// 굴러가는 각도(구르는 거리에 정확히 맞춘다). 도착하면 꼭지가 위로 오도록 가장 가까운 한 바퀴 지점으로 돌려 맞춘다.
export function rotZAt(t) {
  const roll = t < T_FALL ? 0 : -(xAt(t) - X_LAND) / 0.45
  if (t < T_ARRIVE) return roll
  const target = Math.round(roll / (2 * Math.PI)) * 2 * Math.PI
  return roll + (target - roll) * smooth(T_ARRIVE, T_SQUASH, t)
}

// 변신 전 찌그러짐
export function squashAt(t) {
  const u = (t - T_SQUASH) / 0.5
  if (u <= 0 || u >= 1) return { sx: 1, sy: 1 }
  const k = Math.sin(Math.PI * u)
  return { sx: 1 + 0.22 * k, sy: 1 - 0.3 * k }
}

// 0 → 1 로 커지되 한 번 넘쳤다가 안착 (감쇠 스프링): 얼굴·팔다리가 '뿅' 나타나는 모양
export const pop = (u) => (u <= 0 ? 0 : 1 - Math.exp(-6 * u) * Math.cos(11 * u))

// 변신한 뒤의 폴짝 (두 번, 점점 낮게)
export function charHopAt(t) {
  const s = t - (T_POP + 0.3)
  if (s < 0 || s > 0.9) return 0
  return 0.55 * Math.abs(Math.sin((Math.PI * s) / 0.45)) * (1 - s / 1.2)
}

// 오른팔 흔들기 (인사 시작 뒤에는 계속 흔든다)
export const waveAngle = (t) => (t < T_WAVE ? 0 : Math.sin((t - T_WAVE) * 9) * 0.35)

// 장면 이름표: 귤의 x 위치로 지금 어느 풍경인지 정한다
export const CHAPTERS = [
  { key: 'orchard', from: -Infinity, emoji: '🍊', label: '귤나무 과수원에서 귤 하나가 툭!' },
  { key: 'highland', from: 12, emoji: '⛰️', label: '한라산과 오름을 지나' },
  { key: 'festival', from: 31, emoji: '🎈', label: '신나는 축제 마당을 구경하고' },
  { key: 'coast', from: 49, emoji: '🌊', label: '푸른 바다를 따라 달려요' },
  { key: 'finale', from: 62.5, emoji: '👋', label: '제주에 온 걸 환영해요!' },
]
export const chapterAt = (x) => CHAPTERS.reduce((idx, c, i) => (x >= c.from ? i : idx), 0)

// 하늘 색: 아침 과수원 → 맑은 산 → 따뜻한 축제 → 바다 → 황금빛 도착
export const SKY = [
  [-10, '#d4eef7'],
  [12, '#cdeaf8'],
  [26, '#c3e6fb'],
  [38, '#ffe2c0'],
  [52, '#9fdcf0'],
  [66, '#ffd9a8'],
]

// 카메라: ① 매달린 귤 클로즈업 → ② 달리는 귤을 따라가며 앞쪽 풍경을 보여줌 → ③ 도착한 캐릭터를 가까이
// aspect 가 좁은 화면(모바일)에서는 조금 뒤로 물러나 풍경이 더 보이게 한다.
export function cameraAt(t, aspect = 2) {
  const x = xAt(t)
  const A = { px: 3.0, py: 2.5, pz: 5.4, lx: 2.9, ly: 1.9 }
  const B = { px: x - 1.0, py: 2.2, pz: 7.8, lx: x + 2.4, ly: 1.2 }
  const C = { px: X_END + 0.3, py: 1.5, pz: 4.4, lx: X_END, ly: 1.15 }
  const ab = smooth(2.4, 4.8, t)
  const bc = smooth(T_ARRIVE - 1.5, T_ARRIVE + 0.8, t)
  const mix = (k) => {
    const f = (a, b, w) => a + (b - a) * w
    const ab1 = f(A[k], B[k], ab)
    return f(ab1, C[k], bc)
  }
  const wide = aspect < 1.4 ? 1.3 : 1
  return {
    px: mix('px'),
    py: mix('py') + Math.sin(t * 0.7) * 0.04, // 아주 살짝 흔들려 영상 느낌을 준다
    pz: mix('pz') * wide,
    lx: mix('lx'),
    ly: mix('ly'),
  }
}
