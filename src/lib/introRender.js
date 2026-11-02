import {
  CH, GROUND, ICONS, PIVOT, RX, RY, T_FALL,
  camXAt, camYAt, iconState, lerp, lookAt, pop, rotAt, skyAt, smooth, squashAt, sunY, warmthAt, xAt, yAt, zoomAt,
} from './intro'

const rad = (d) => (d * Math.PI) / 180
const bump = (t, c, w) => Math.max(0, 1 - Math.abs(t - c) / w)
const fx = (n) => n.toFixed(1)

// 시간 t 의 한 장면을 그린다. 요소를 React 상태로 바꾸지 않고 속성을 직접 고쳐 매 프레임이 가볍다.
// el: 이름 → SVG 요소, vbW: 화면의 가로 세로 비율에 맞춘 화면 너비(세로는 900 고정)
export function renderFrame(el, t, vbW) {
  if (!el.svg || !el.body) return
  const cam = camXAt(t, vbW)
  const cy = camYAt(t)
  const z = zoomAt(t)
  const vw = vbW / z
  const vh = 900 / z
  el.svg.setAttribute('viewBox', `${fx(vbW / 2 - vw / 2)} ${fx(lookAt(t) - vh / 2)} ${fx(vw)} ${fx(vh)}`)

  // 층마다 다른 속도로 흘러가는 시차(패럴랙스)
  const layer = (g, f) => g && g.setAttribute('transform', `translate(${fx(-f * cam)} ${fx(-f * cy)})`)
  layer(el.clouds, 0.04)
  layer(el.far, 0.1)
  layer(el.midfar, 0.22)
  layer(el.mid, 0.45)
  layer(el.midnear, 0.75)
  layer(el.near, 1)
  layer(el.actor, 1)
  layer(el.fg, 1.4)
  layer(el.fg2, 1.9)

  // 하늘·해·따뜻한 빛
  const sky = skyAt(t)
  el.skyTop.setAttribute('stop-color', sky.top)
  el.skyBot.setAttribute('stop-color', sky.bot)
  el.sun.setAttribute('transform', `translate(${fx(vbW * lerp(0.72, 0.36, smooth(26, 34, t)))} ${fx(sunY(t))})`)
  el.warm.setAttribute('opacity', warmthAt(t).toFixed(3))
  if (el.hallasan) el.hallasan.setAttribute('opacity', (1 - smooth(19.5, 23, t)).toFixed(2))
  // 화면 밖의 도형은 숨긴다 (바뀔 때만 DOM 을 건드린다)
  const left = vbW / 2 - vw / 2
  for (const c of el.cull ?? []) {
    const lo = c.f * cam + left - 260
    const hi = c.f * cam + left + vw + 260
    const vis = c.x + c.w > lo && c.x - c.w < hi
    if (vis !== c.shown) { c.shown = vis; c.el.style.display = vis ? '' : 'none' }
  }

  // 시간 창에 따라 나타나고 사라지는 풍경 (보이지 않을 때는 그리지도 않아 가볍다)
  for (const { g, w } of el.fades ?? []) {
    const o = smooth(w[0], w[1], t) * (1 - smooth(w[2], w[3], t))
    g.style.display = o < 0.01 ? 'none' : ''
    g.setAttribute('opacity', o.toFixed(2))
  }
  if (el.seaSunset) el.seaSunset.setAttribute('opacity', (0.85 * smooth(28, 34, t)).toFixed(2)) // 바다가 노을빛으로 물든다
  if (el.sea) el.sea.setAttribute('opacity', smooth(12.5, 15.5, t).toFixed(2)) // 유채꽃밭 너머로 바다가 서서히 드러난다
  if (el.branch) el.branch.style.display = t < 9 ? '' : 'none'

  // 귤이
  const x = xAt(t)
  const y = yAt(t)
  const sq = squashAt(t)
  const yy = y + (1 - sq.sy) * RY // 납작해져도 바닥에 붙어 있도록
  el.body.setAttribute('transform', `translate(${fx(x)} ${fx(yy)}) scale(${sq.sx.toFixed(3)} ${sq.sy.toFixed(3)}) rotate(${fx((rotAt(t) * 180) / Math.PI)})`)
  const air = Math.max(0, GROUND - (y + RY))
  el.shadow.setAttribute('transform', `translate(${fx(x)} ${GROUND + 12})`)
  el.shadow.setAttribute('rx', fx(60 / (1 + air / 380)))
  el.shadow.setAttribute('opacity', (0.28 / (1 + air / 160)).toFixed(3))
  if (t < T_FALL + 0.02) {
    el.stem.setAttribute('d', `M${PIVOT.x} ${PIVOT.y} L${fx(x)} ${fx(y - RY + 4)}`)
    el.stem.style.display = ''
  } else el.stem.style.display = 'none'

  // 변신: 눈 → 입 → 볼 → 다리 → 팔 → 모자 → 가방 순서로 튀어나온다
  const p = (k) => pop((t - CH[k]) / 0.45)
  const scale = (g, s, tx = 0, ty = 0, rot = 0) => g.setAttribute('transform', `translate(${tx} ${ty}) rotate(${rot}) scale(${Math.max(0.0001, s).toFixed(3)})`)
  const blink = 1 - 0.92 * bump(t % 3.4, 3.3, 0.1)
  el.eyes.setAttribute('transform', `translate(0 -4) scale(${Math.max(0.0001, p('eyes')).toFixed(3)} ${(Math.max(0.0001, p('eyes')) * blink).toFixed(3)})`)
  scale(el.mouth, p('mouth'), 0, 14)
  scale(el.cheeks, p('cheek'), 0, 0)
  el.mouthOpen.setAttribute('opacity', smooth(37.7, 38.1, t).toFixed(2))
  const pl = p('legs')
  ;[['legL', -22], ['legR', 22]].forEach(([k, lx]) => el[k].setAttribute('transform', `translate(${lx} ${RY - 4}) scale(1 ${Math.max(0.0001, pl).toFixed(3)})`))

  const pa = Math.max(0.0001, p('arms'))
  const sh = [[-RX + 9, 8, 118, 'L'], [RX - 9, 8, 62, 'R']]
  sh.forEach(([sx0, sy0, down, side]) => {
    let a = down
    if (side === 'R') {
      const up = smooth(37.0, 37.6, t)
      a = lerp(62, -52, up) + Math.sin(Math.max(0, t - 37.6) * 9) * 20 * up // 손 흔들기
    } else a = lerp(118, 128, Math.sin(t * 2) * 0.5 + 0.5)
    const len = 44 * pa
    const ex = sx0 + Math.cos(rad(a)) * len
    const ey = sy0 + Math.sin(rad(a)) * len
    el[`arm${side}`].setAttribute('d', `M${fx(sx0)} ${fx(sy0)} L${fx(ex)} ${fx(ey)}`)
    el[`hand${side}`].setAttribute('transform', `translate(${fx(ex)} ${fx(ey)}) scale(${Math.min(1, pa).toFixed(2)})`)
  })
  scale(el.hat, p('hat'), -22, -RY + 10, -12)
  const pb = p('bag')
  scale(el.bag, pb, RX - 8, 26)
  el.strap.setAttribute('opacity', Math.min(1, Math.max(0, pb)).toFixed(2))

  // 금빛 반짝임: 34~35초에 귤 가운데로 모였다가 35~36.4초에 사방으로 터진다
  const cxs = x
  const cys = GROUND - RY - 20
  const gather = smooth(34.0, 35.0, t)
  const burst = smooth(35.0, 36.4, t)
  for (let i = 0; i < 30; i++) {
    const g = el[`sp${i}`]
    if (!g) continue
    const a = i * 2.399 + t * 0.6 * (1 - burst)
    const r0 = 240 + ((i * 37) % 210)
    const radius = t < 35.0 ? r0 * (1 - gather * gather) : burst * (70 + ((i * 53) % 170))
    const op = t < 35.0 ? gather : 1 - burst
    const s = 0.7 + ((i * 7) % 5) * 0.25
    g.setAttribute('transform', `translate(${fx(cxs + Math.cos(a) * radius)} ${fx(cys + Math.sin(a) * radius * 0.8)}) scale(${(s * (0.5 + 0.5 * op)).toFixed(2)})`)
    g.setAttribute('opacity', op.toFixed(2))
  }

  // 활동 아이콘 (귤 앞쪽 위에 작게, 귤을 가리지 않는다)
  for (const ic of ICONS) {
    const g = el[`icon_${ic.id}`]
    if (!g) continue
    const s = iconState(t, ic.t)
    g.setAttribute('opacity', Math.min(1, s * 2).toFixed(2))
    g.setAttribute('transform', `translate(${fx(x + 130)} ${fx(GROUND - 270 + Math.sin(t * 3) * 4)}) scale(${Math.max(0.0001, s).toFixed(3)})`)
  }

  // 물보라, 사진 찍는 효과
  if (el.splash) el.splash.setAttribute('opacity', bump(t, WAVE_HOP_T, 0.75).toFixed(2))
  const flash = bump(t, 12.4, 0.16)
  el.flash.setAttribute('opacity', (flash * 0.55).toFixed(2))
  el.viewfinder.setAttribute('opacity', (bump(t, 12.4, 0.7) * 0.9).toFixed(2))
  el.viewfinder.setAttribute('transform', `translate(${fx(vbW / 2)} 440) scale(${(1.08 - 0.08 * Math.min(1, bump(t, 12.4, 0.7) * 2)).toFixed(3)})`)
}

const WAVE_HOP_T = 20.7
