import { memo } from 'react'
import { blob, pick, ridge, rng } from '../lib/paint'
import { BUMPS, GROUND, HANG, LX, WAVE_HOP, X_END, xAt } from '../lib/intro'

// 인트로의 배경 일러스트. 층(layer)마다 움직이는 속도가 달라(가까울수록 빠르게) 깊이감이 난다.
// 어떤 풍경을 '몇 초쯤 화면 어디에 보이게' 둘지를 LX(시간, 화면 가로, 층 속도) 로 정하므로 줄거리와 그림의 자리가 어긋나지 않는다.
// 모두 SVG 도형이라 임시 에셋 없이 동작한다. 나중에 진짜 일러스트 이미지로 바꿀 때는 각 층의 <g> 안을 <image> 로 바꾸면 된다.

const C = {
  leaf: ['#2f6b45', '#3f7d4e', '#5a9a52', '#7bb35a'],
  basalt: ['#3a3532', '#4a4540', '#5b544c', '#6a6157'],
  canola: ['#f6d23a', '#f0c425', '#ffe066', '#e8b11c'],
  sand: '#ecd5a4',
  peopleCloth: ['#e58a8a', '#59a7a0', '#f2c14e', '#6f8fd0', '#b987c9', '#f08a17'],
}

const range = (f, pad = 900) => [f * -400 - pad, f * X_END + 3400 + pad] // 이 층이 덮어야 하는 가로 범위
const T = (t, sx, f) => LX(t, sx, f)
// 시간 창 w=[나타남 시작, 완전히 나타남, 사라짐 시작, 완전히 사라짐](초) 동안만 보이게 한다 (느린 먼 층은 한꺼번에 많이 보이기 때문에 시간으로 장면을 나눈다)
const Fade = ({ w, children }) => <g className="gj-fade" data-w={w.join(',')}>{children}</g>

// ── 하늘 위 구름 ──
function Clouds() {
  const r = rng(11)
  const [a, b] = range(0.04)
  const items = []
  for (let x = a; x < b; x += 360 + r() * 160) {
    const y = 90 + r() * 170
    const s = 0.8 + r() * 0.8
    items.push(
      <g key={x} transform={`translate(${x.toFixed(0)} ${y.toFixed(0)}) scale(${s.toFixed(2)})`} opacity="0.82">
        <path d={blob(0, 0, 110, 32, r, 9, 0.12)} fill="#fff" />
        <path d={blob(-60, 12, 70, 26, r, 8, 0.12)} fill="#fff" />
        <path d={blob(62, 10, 80, 28, r, 8, 0.12)} fill="#fff" />
        <path d={blob(0, 26, 140, 14, r, 8, 0.1)} fill="#ffe9cc" opacity="0.55" />
      </g>,
    )
  }
  return <>{items}</>
}

// ── 먼 산: 한라산(방패 모양의 완만한 산), 성산일출봉, 바다, 섬 ──
function Far() {
  const r = rng(21)
  const cx = T(14, 950, 0.1)
  const hill = (x0, x1, top, amp, color, seed) => <path d={ridge(x0, x1, top, amp, 80, rng(seed), 700)} fill={color} />
  const sx = T(18, 1150, 0.12)
  const [seaA, seaB] = [T(0, -600, 0.12), T(36, 2400, 0.12)]
  return (
    <>
      {/* 한라산 */}
      <g className="hallasan">
        <path d={`M${cx - 900} 640 C${cx - 560} 560 ${cx - 330} 420 ${cx - 120} 345 C${cx - 60} 325 ${cx - 40} 336 ${cx} 336 C${cx + 40} 336 ${cx + 70} 326 ${cx + 130} 346 C${cx + 340} 425 ${cx + 600} 565 ${cx + 920} 640Z`} fill="url(#gHalla)" />
        <path d={`M${cx - 170} 365 C${cx - 90} 332 ${cx - 40} 338 ${cx} 338 C${cx + 40} 338 ${cx + 80} 330 ${cx + 175} 368 C${cx + 110} 362 ${cx + 60} 372 ${cx} 364 C${cx - 60} 372 ${cx - 120} 360 ${cx - 170} 365Z`} fill="#eef3ec" opacity="0.85" />
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={blob(cx - 600 + i * 210 + r() * 40, 520 + r() * 40, 150, 22, r, 8, 0.14)} fill="#fff" opacity="0.5" />
        ))}
        {hill(cx - 1200, cx - 180, 560, 40, '#8fb58a', 3)}
        {hill(cx + 250, cx + 1300, 575, 40, '#86ad84', 4)}
      </g>

      {/* 바다 (먼 층은 천천히 움직여 한꺼번에 보이므로, 시간에 맞춰 서서히 나타나게 한다) */}
      <g className="sea">
        <rect x={seaA} y="520" width={seaB - seaA} height="260" fill="url(#gSea)" />
        <rect className="seaSunset" x={seaA} y="520" width={seaB - seaA} height="260" fill="url(#gSeaSunset)" opacity="0" />
        <g className="drift">
          {Array.from({ length: 90 }, (_, i) => {
            const x = seaA + r() * (seaB - seaA)
            const y = 530 + r() * 150
            const w = 24 + (y - 520) * 0.5 * r() + 10
            return <path key={i} d={`M${x.toFixed(0)} ${y.toFixed(0)}q${w / 4} -5 ${w / 2} 0t${w / 2} 0`} stroke="#fff" strokeWidth="2.2" fill="none" opacity={0.25 + r() * 0.35} strokeLinecap="round" />
          })}
        </g>
        <rect x={seaA} y="516" width={seaB - seaA} height="8" fill="#e6f6f4" opacity="0.7" />
        {/* 성산일출봉 */}
        <g transform={`translate(${sx} 520)`}>
          <path d="M-330 8 C-250 -14 -200 -30 -150 -60 C-130 -120 -110 -150 -70 -158 C-50 -168 -20 -148 0 -156 C30 -164 60 -150 90 -150 C130 -140 150 -90 170 -50 C220 -20 270 -4 330 8Z" fill="#7e7458" />
          <path d="M-150 -60 C-130 -120 -110 -150 -70 -158 C-50 -168 -20 -148 0 -156 C30 -164 60 -150 90 -150 C130 -140 150 -90 170 -50 C120 -70 80 -72 40 -84 C0 -96 -40 -86 -80 -80 C-110 -76 -130 -70 -150 -60Z" fill="#6f9f55" />
          <path d="M-70 -158 C-40 -140 -20 -134 0 -140 C30 -146 60 -142 90 -150" stroke="#9cc279" strokeWidth="4" fill="none" strokeLinecap="round" />
          {[-110, -60, -10, 40, 100, 150].map((x, i) => <path key={i} d={`M${x} -50 l${(i % 2 ? 6 : -6)} 50`} stroke="#5d543d" strokeWidth="3" opacity="0.5" />)}
          <path d="M-330 8 C-200 -10 -120 0 -60 10 L-330 10Z" fill="#8bb56a" />
        </g>
        {/* 멀리 떠 있는 작은 섬(비양도) */}
        <path transform={`translate(${T(23, 300, 0.12)} 520)`} d="M-90 6 C-70 -26 -40 -34 -10 -30 C20 -42 50 -22 90 6Z" fill="#7da07a" opacity="0.8" />
        {/* 고기잡이배 */}
        {[[19.5, 700], [22.5, 1250], [27, 1450]].map(([t, sxx], i) => (
          <g key={i} transform={`translate(${T(t, sxx, 0.12)} ${575 + i * 18})`}>
            <g className="bob" style={{ animationDelay: `${i * -0.9}s` }}>
              <path d="M-34 0 L34 0 L24 14 L-24 14Z" fill="#3b5d73" />
              <path d="M-34 0 L34 0" stroke="#fff" strokeWidth="4" />
              <path d="M0 -2 L0 -46 L26 -6Z" fill="#fff7e6" />
              <path d="M0 -46 L0 -2" stroke="#8b5a2b" strokeWidth="2.5" />
            </g>
          </g>
        ))}
      </g>
    </>
  )
}

// ── 먼 언덕과 감귤나무 ──
function MidFar() {
  const [a] = range(0.22)
  const b = T(14, 1500, 0.22)
  return (
    <g mask="url(#mHills)">
      <defs>
        <linearGradient id="gHillFade" gradientUnits="userSpaceOnUse" x1={b - 700} y1="0" x2={b} y2="0">
          <stop offset="0" stopColor="#fff" /><stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id="mHills" maskUnits="userSpaceOnUse" x={a} y="0" width={b - a + 200} height="900"><rect x={a} y="0" width={b - a + 200} height="900" fill="url(#gHillFade)" /></mask>
      </defs>
      <path d={ridge(a, b, 585, 55, 90, rng(31), 720)} fill="#a6c585" />
      <path d={ridge(a, b, 620, 40, 70, rng(32), 720)} fill="#8bb26f" />
      {Array.from({ length: Math.round((b - a) / 150) }, (_, i) => {
        const r = rng(100 + i)
        const x = a + i * 150 + r() * 80
        return <path key={i} d={blob(x, 620 + r() * 14, 34 + r() * 14, 26 + r() * 8, r, 8, 0.14)} fill={C.leaf[1 + (i % 2)]} opacity="0.85" />
      })}
    </g>
  )
}

function Tree({ x, y, s, seed }) {
  const r = rng(seed)
  return (
    <g data-cx={x.toFixed(0)} data-cw={Math.round(70 * s) + 20} transform={`translate(${x.toFixed(0)} ${y}) scale(${s})`}>
      <path d="M-7 0 C-5 -40 -6 -70 -2 -96 L10 -96 C8 -70 10 -40 9 0Z" fill="#6b4a2e" />
      <path d="M0 -70 l-28 -30 M4 -80 l26 -28" stroke="#6b4a2e" strokeWidth="6" strokeLinecap="round" />
      {[[-46, -118, 52, 42], [42, -122, 54, 44], [0, -150, 62, 50], [-18, -102, 46, 34], [24, -100, 48, 34]].map(([cx, cy, rx, ry], i) => (
        <path key={i} d={blob(cx, cy, rx, ry, r, 9, 0.14)} fill={C.leaf[i % 4]} />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={i} cx={(r() - 0.5) * 140} cy={-90 - r() * 80} r={7 + r() * 2.5} fill="#f4901c" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <circle key={`h${i}`} cx={(r() - 0.5) * 120 - 4} cy={-105 - r() * 70} r="2.5" fill="#ffd27a" opacity="0.7" />
      ))}
    </g>
  )
}

function Mid() {
  const items = []
  const add = (w, node) => items.push(<Fade key={items.length} w={w}>{node}</Fade>)
  // 감귤밭 (감귤나무가 줄지어 있다)
  const x0 = T(-1, -200, 0.45)
  const x1 = T(10, 1700, 0.45)
  for (let x = x0, i = 0; x < x1; x += 235 + (i % 3) * 22, i++) {
    add([-1, 0, 9.5, 12], <Tree key={`t${i}`} x={x} y={650} s={0.85 + (i % 3) * 0.1} seed={200 + i} />)
  }
  // 유채꽃밭 언덕
  const cA = T(9.4, 900, 0.45)
  const cB = cA + 3200
  const r = rng(41)
  add([9.4, 11, 17, 20], 
    <g key="canola">
      <path d={ridge(cA, cB, 588, 46, 80, rng(42), 720)} fill="url(#gCanolaFar)" />
      <path d={ridge(cA + 120, cB - 40, 625, 36, 70, rng(43), 720)} fill="url(#gCanolaNear)" />
      {Array.from({ length: 260 }, (_, i) => {
        const x = cA + r() * (cB - cA)
        const y = 600 + r() * 100
        const rs = 2.2 + (y - 600) * 0.035
        return <ellipse key={i} cx={x.toFixed(0)} cy={y.toFixed(0)} rx={rs} ry={rs * 0.8} fill={C.canola[i % 4]} opacity={0.5 + r() * 0.5} />
      })}
    </g>,
  )
  return <>{items}</>
}

// 축제 마당 뒤의 천막
function Tent({ x, alt }) {
  return (
    <g transform={`translate(${x} 690)`}>
      <path d="M-92 0 L-92 -62 L0 -118 L92 -62 L92 0Z" fill="#fff7ea" />
      <path d="M-92 -62 L0 -118 L92 -62Z" fill={alt ? '#f08a17' : '#2f6b45'} opacity="0.9" />
      {[-60, -20, 20, 60].map((px) => <path key={px} d={`M${px} -62 L${px * 0.3} -108`} stroke="#fff" strokeWidth="3" opacity="0.7" />)}
      <path d="M-92 0 L-92 -62 M92 0 L92 -62" stroke="#c9b48a" strokeWidth="4" />
      <path d="M-60 0 L-60 -40 L60 -40 L60 0Z" fill="#fbe9c8" opacity="0.6" />
      <circle cx="0" cy="-30" r="34" fill="url(#gLamp)" className="glow" />
    </g>
  )
}

function Rock({ x, y, s = 1, seed }) {
  const r = rng(seed)
  return (
    <g data-cx={x.toFixed(0)} data-cw={Math.round(70 * s) + 20} transform={`translate(${x.toFixed(0)} ${y}) scale(${s})`}>
      <path d={blob(0, 0, 44, 32, r, 10, 0.16)} fill={C.basalt[Math.floor(r() * 4)]} />
      <path d={blob(-8, -10, 28, 16, r, 8, 0.12)} fill="#fff" opacity="0.1" />
      {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={(r() - 0.5) * 70} cy={(r() - 0.5) * 44} r={1.6 + r() * 2.2} fill="#221f1d" opacity="0.55" />)}
    </g>
  )
}

function Person({ x, seed }) {
  const r = rng(seed)
  const col = pick(r, C.peopleCloth)
  const h = 86 + r() * 30
  return (
    <g transform={`translate(${x.toFixed(0)} 704)`}>
      <g className="sway" style={{ animationDelay: `${-r() * 2}s`, animationDuration: `${1.1 + r() * 0.8}s` }}>
        <path d={`M-16 0 C-18 ${-h * 0.5} -12 ${-h * 0.72} 0 ${-h * 0.74} C12 ${-h * 0.72} 18 ${-h * 0.5} 16 0Z`} fill={col} />
        <circle cx="0" cy={-h * 0.74 - 15} r="14" fill="#f3d2ae" />
        <path d={`M-14 ${-h * 0.74 - 18} C-14 ${-h * 0.74 - 34} 14 ${-h * 0.74 - 34} 14 ${-h * 0.74 - 18} C8 ${-h * 0.74 - 24} -8 ${-h * 0.74 - 24} -14 ${-h * 0.74 - 18}Z`} fill="#3a2a22" />
        <path d={`M-14 ${-h * 0.5} L-24 ${-h * 0.74 - 8}`} stroke={col} strokeWidth="7" strokeLinecap="round" />
        <path d={`M14 ${-h * 0.5} L24 ${-h * 0.74 - 8}`} stroke={col} strokeWidth="7" strokeLinecap="round" />
      </g>
    </g>
  )
}

function Flag({ x, y, w, color, i }) {
  return (
    <path className="flag" style={{ animationDelay: `${-i * 0.25}s` }} d={`M${x} ${y} L${x + w} ${y} L${x + w / 2} ${y + w * 1.15}Z`} fill={color} />
  )
}

function Bunting({ x0, x1, y, seed }) {
  const r = rng(seed)
  const flags = []
  const cols = ['#f08a17', '#2f6b45', '#fff3d6', '#3fb5c9', '#e58a8a']
  for (let x = x0 + 30, i = 0; x < x1 - 30; x += 40, i++) {
    const sag = Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 38
    flags.push(<Flag key={i} x={x} y={y + sag + 2} w={26} color={cols[Math.floor(r() * 5)]} i={i} />)
  }
  return (
    <g>
      <path d={`M${x0} ${y} Q${(x0 + x1) / 2} ${y + 76} ${x1} ${y}`} stroke="#6b4a2e" strokeWidth="3" fill="none" />
      {flags}
    </g>
  )
}

function Haenyeo({ x, y, d = 0, flip = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip} 1)`}>
      <g className="bob" style={{ animationDelay: `${d}s` }}>
        <path d="M-26 6 C-24 -18 -12 -26 0 -26 C12 -26 24 -18 26 6Z" fill="#26323a" />
        <circle cx="0" cy="-40" r="15" fill="#e9c9a4" />
        <path d="M-17 -42 C-17 -62 17 -62 17 -42 C10 -48 -10 -48 -17 -42Z" fill="#fff4de" />
        <path d="M-17 -40 L-22 -34 M17 -40 L22 -34" stroke="#fff4de" strokeWidth="5" strokeLinecap="round" />
        <rect x="-11" y="-42" width="22" height="9" rx="4.5" fill="#3b5d73" opacity="0.85" />
        <circle cx="0" cy="-37.5" r="3.2" fill="#bfe8ee" />
        <g transform="translate(46 -2)">
          <circle r="21" fill="#f08a17" />
          <path d="M-21 0 A21 21 0 0 0 21 0" fill="#c9650a" opacity="0.4" />
          <path d="M-14 -14 L14 14 M14 -14 L-14 14 M-21 0 L21 0 M0 -21 L0 21" stroke="#fff3d6" strokeWidth="1.6" opacity="0.65" />
          <path d="M-22 6 C-30 22 -14 34 -2 28" stroke="#fff3d6" strokeWidth="2" fill="none" opacity="0.7" />
        </g>
        <path d="M-60 8 q15 -9 30 0 t30 0 t30 0 t30 0" stroke="#fff" strokeWidth="3" fill="none" opacity="0.8" strokeLinecap="round" />
      </g>
    </g>
  )
}

function Hareubang({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-34 0 C-38 -50 -30 -96 -22 -116 L22 -116 C30 -96 38 -50 34 0Z" fill="#5b544c" />
      <path d="M-40 -108 C-40 -150 40 -150 40 -108 C40 -100 -40 -100 -40 -108Z" fill="#4a4540" />
      <path d="M-22 -150 C-22 -176 22 -176 22 -150Z" fill="#3a3532" />
      <path d="M-30 -138 L30 -138" stroke="#6a6157" strokeWidth="3" />
      <path d="M-18 -128 C-18 -118 -8 -116 -8 -126 M18 -128 C18 -118 8 -116 8 -126" stroke="#26221f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M-16 -100 q16 12 32 0" stroke="#26221f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M-20 -80 C-34 -66 -30 -50 -18 -46 M20 -80 C34 -66 30 -50 18 -46" stroke="#4a4540" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M-14 -70 L-14 -54 M14 -70 L14 -54" stroke="#3a3532" strokeWidth="6" strokeLinecap="round" />
      {Array.from({ length: 12 }, (_, i) => <circle key={i} cx={-24 + ((i * 17) % 48)} cy={-20 - ((i * 23) % 90)} r="2" fill="#26221f" opacity="0.5" />)}
    </g>
  )
}

function Drummer({ x }) {
  return (
    <g transform={`translate(${x} 700)`}>
      <rect x="-190" y="-30" width="380" height="30" rx="6" fill="#a87440" />
      <rect x="-190" y="-34" width="380" height="8" rx="4" fill="#c9955a" />
      <path d="M-170 -34 L-170 -230 M170 -34 L170 -230" stroke="#7a5230" strokeWidth="9" strokeLinecap="round" />
      <path d="M-170 -230 L170 -230 L150 -160 L-150 -160Z" fill="#c8453a" opacity="0.92" />
      <path d="M-150 -160 L150 -160" stroke="#fff3d6" strokeWidth="4" strokeDasharray="14 10" />
      {/* 북 */}
      <g transform="translate(0 -92)">
        <g className="beat">
          <ellipse rx="62" ry="58" fill="#8b3a2a" />
          <ellipse rx="52" ry="48" fill="#f3dcb0" />
          <path d="M-52 0 L52 0 M0 -48 L0 48" stroke="#e1c48c" strokeWidth="2" opacity="0.7" />
          <path d="M-62 -6 C-40 -16 40 -16 62 -6" stroke="#2f6b45" strokeWidth="6" fill="none" />
          <circle r="14" fill="#c8453a" opacity="0.85" />
        </g>
      </g>
      {/* 북을 치는 사람 */}
      <g transform="translate(-118 -34)">
        <g className="sway">
          <path d="M-20 0 C-22 -44 -14 -70 0 -72 C14 -70 22 -44 20 0Z" fill="#fff7ea" />
          <path d="M-18 -50 L22 -22" stroke="#3b5d73" strokeWidth="9" />
          <circle cy="-90" r="17" fill="#f3d2ae" />
          <path d="M-18 -94 C-18 -114 18 -114 18 -94 C12 -102 -12 -102 -18 -94Z" fill="#26221f" />
          <g className="stick"><path d="M14 -52 L74 -78" stroke="#e1c48c" strokeWidth="6" strokeLinecap="round" /><path d="M10 -54 L24 -40" stroke="#fff7ea" strokeWidth="9" strokeLinecap="round" /></g>
        </g>
      </g>
      {/* 상모(리본 모자)를 쓴 춤꾼 */}
      <g transform="translate(120 -34)">
        <g className="sway" style={{ animationDuration: '0.9s' }}>
          <path d="M-18 0 C-20 -44 -12 -70 0 -72 C12 -70 20 -44 18 0Z" fill="#59a7a0" />
          <path d="M-18 -46 L18 -46" stroke="#f2c14e" strokeWidth="7" />
          <circle cy="-88" r="16" fill="#f3d2ae" />
          <path d="M-20 -94 L20 -94 L0 -112Z" fill="#26221f" />
          <path d="M0 -112 C40 -150 90 -120 70 -86 M0 -112 C-40 -150 -90 -120 -70 -86" stroke="#f08a17" strokeWidth="4" fill="none" strokeLinecap="round" className="ribbon" />
        </g>
      </g>
    </g>
  )
}

function MidNear() {
  const items = []
  const add = (w, node) => items.push(<Fade key={items.length} w={w}>{node}</Fade>)
  // 현무암 돌담 (돌을 두 줄로 쌓았다)
  const wA = T(6.3, 900, 0.75)
  const wB = wA + 3000
  for (let x = wA, i = 0; x < wB; x += 52, i++) {
    const r = rng(300 + i)
    add([6.3, 7.6, 12, 14], <Rock key={`w1${i}`} x={x + r() * 14} y={690 + r() * 6} s={0.95 + r() * 0.3} seed={300 + i} />)
    if (i % 1 === 0) add([6.3, 7.6, 12, 14], <Rock key={`w2${i}`} x={x + 26 + r() * 12} y={636 + r() * 8} s={0.9 + r() * 0.3} seed={500 + i} />)
    if (i % 3 === 0) add([6.3, 7.6, 12, 14], <path key={`m${i}`} d={blob(x + 10, 604 + r() * 10, 26, 8, r, 7, 0.2)} fill="#7bb35a" opacity="0.85" />)
    if (i % 4 === 1) add([6.3, 7.6, 12, 14], <circle key={`f${i}`} cx={x + 18} cy={606 + r() * 8} r="4" fill="#f6d23a" />)
  }
  // 앞쪽 유채꽃
  const fA = T(10.6, 900, 0.75)
  const fB = fA + 3000
  const r = rng(61)
  add([10.6, 12, 17, 19], 
    <g key="stalks">
      {Array.from({ length: 150 }, (_, i) => {
        const x = fA + r() * (fB - fA)
        const h = 36 + r() * 48
        return (
          <g key={i} data-cx={x.toFixed(0)} data-cw="40">
            <path d={`M${x.toFixed(0)} 710 q${(r() - 0.5) * 10} ${-h / 2} ${(r() - 0.5) * 12} ${-h}`} stroke="#5a9a52" strokeWidth="2.5" fill="none" />
            <circle cx={(x + (r() - 0.5) * 6).toFixed(0)} cy={(704 - h).toFixed(0)} r={4 + r() * 2.5} fill={C.canola[i % 4]} />
          </g>
        )
      })}
    </g>,
  )
  // 해안 현무암 + 불턱(해녀들이 쉬는 돌담)
  const sA = T(15.8, 900, 0.75)
  const sB = sA + 3600
  for (let x = sA, i = 0; x < sB; x += 190 + (i % 3) * 60, i++) {
    const r2 = rng(700 + i)
    add([15.8, 17.2, 24.5, 26.5], <Rock key={`sr${i}`} x={x} y={702 - r2() * 8} s={0.7 + r2() * 0.55} seed={700 + i} />)
  }
  const bx = T(22.4, 1150, 0.75)
  add([19.5, 21, 25, 27], 
    <g key="bulteok">
      {Array.from({ length: 13 }, (_, i) => {
        const a = Math.PI + (i / 12) * Math.PI
        return <Rock key={i} x={bx + Math.cos(a) * 112} y={700 + Math.sin(a) * 34} s={0.5} seed={800 + i} />
      })}
      <path className="smoke" d={`M${bx} 664 q-14 -20 0 -40 t0 -40`} stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.5" />
    </g>,
  )
  // 해녀들 (존중하는 모습으로: 물질하는 사람들, 테왁과 함께)
  add([19.5, 21, 25, 27], <Haenyeo key="h1" x={T(22.2, 1380, 0.75)} y={648} d={0} />)
  add([19.5, 21, 25, 27], <Haenyeo key="h2" x={T(22.9, 1050, 0.75) + 160} y={634} d={-1.1} flip={-1} />)
  add([19.5, 21, 25, 27], <Haenyeo key="h3" x={T(21.6, 560, 0.75)} y={640} d={-0.5} />)
  // 축제: 돌하르방, 관객, 무대, 깃발
  ;[-1150, -760, 760, 1150].forEach((dx, i) => add([23.5, 25, 31, 33], <Tent key={`tent${i}`} x={T(27.6, 960, 0.75) + dx} alt={i % 2} />))
  add([23.5, 25, 31, 33], <Hareubang key="hb" x={T(25.2, 330, 0.75)} y={704} s={0.9} />)
  add([23.5, 25, 31, 33], <Drummer key="dr" x={T(27.6, 960, 0.75)} />)
  for (let i = 0; i < 16; i++) {
    const side = i < 8 ? -1 : 1
    add([23.5, 25, 31, 33], <Person key={`p${i}`} x={T(27.6, 960, 0.75) + side * (250 + (i % 8) * 62)} seed={900 + i} />)
  }
  add([23.5, 25, 31, 33], <Bunting key="b1" x0={T(25.4, 100, 0.75)} x1={T(25.4, 1700, 0.75)} y={290} seed={91} />)
  add([23.5, 25, 31, 33], <Bunting key="b2" x0={T(25.4, 1700, 0.75)} x1={T(25.4, 3300, 0.75)} y={290} seed={92} />)
  ;[100, 1700, 3300].forEach((sx, i) => add([23.5, 25, 31, 33], <path key={`bp${i}`} d={`M${T(25.4, sx, 0.75)} 704 L${T(25.4, sx, 0.75)} 280`} stroke="#6b4a2e" strokeWidth="9" strokeLinecap="round" />))
  return <>{items}</>
}

// ── 귤이가 달리는 길 ──
function Ground() {
  const [a, b] = range(1)
  const r = rng(71)
  const stops = [
    [0, '#d9b57a'], [6, '#d6b377'], [8, '#b9a58a'], [11, '#a9b85a'], [15, '#bcc268'], [17, '#ecd5a4'],
    [24, '#e8cf9d'], [26, '#e4b980'], [30, '#e9c08f'], [34, '#f0c98f'], [40, '#f2d3a0'],
  ]
  const span = b - a
  const xs = (t) => (xAt(t) - a) / span
  const marks = []
  for (let x = a; x < b; x += 46) {
    const y = 706 + r() * 60
    marks.push(<path key={x} data-cx={x.toFixed(0)} data-cw="90" d={`M${x.toFixed(0)} ${y.toFixed(0)} q${20 + r() * 20} ${-6 - r() * 6} ${44 + r() * 30} ${r() * 4}`} stroke="#fff" strokeWidth={2 + r() * 2.5} fill="none" opacity={0.1 + r() * 0.16} strokeLinecap="round" />)
    if (r() > 0.55) marks.push(<ellipse key={`s${x}`} data-cx={x + 20} data-cw="30" cx={x + 20} cy={720 + r() * 120} rx={6 + r() * 12} ry={3 + r() * 3} fill="#8a6a3a" opacity={0.08 + r() * 0.1} />)
  }
  return (
    <>
      <defs>
        <linearGradient id="gGround" gradientUnits="userSpaceOnUse" x1={a} y1="0" x2={b} y2="0">
          {stops.map(([t, c]) => <stop key={t} offset={Math.min(1, Math.max(0, xs(t)))} stopColor={c} />)}
        </linearGradient>
      </defs>
      <path d={ridge(a, b, GROUND, 8, 60, rng(72), 1100)} fill="url(#gGround)" />
      <path d={ridge(a, b, GROUND + 6, 6, 60, rng(73), 1100)} fill="url(#gShade)" />
      {marks}
      {/* 길가의 풀 */}
      {Array.from({ length: 120 }, (_, i) => {
        const x = a + (i / 120) * (xAt(16) - a + 400) + r() * 40
        return <path key={`g${i}`} data-cx={x.toFixed(0)} data-cw="30" d={`M${x.toFixed(0)} 704 q${-4 + r() * 8} -14 ${-6 + r() * 12} ${-18 - r() * 12}M${(x + 5).toFixed(0)} 704 q${r() * 8} -12 ${r() * 10} ${-12 - r() * 12}`} stroke={C.leaf[i % 4]} strokeWidth="3" fill="none" strokeLinecap="round" />
      })}
      {/* 귤이가 넘는 작은 돌 */}
      {BUMPS.map((bm, i) => <Rock key={`b${i}`} x={bm.x} y={706} s={0.3 + bm.h / 55} seed={1000 + i} />)}
      {/* 조개와 불가사리 */}
      {[21.2, 22.0, 22.8, 23.6, 24.3].map((t, i) => (
        <path key={`sh${i}`} transform={`translate(${xAt(t) + 180 + i * 40} ${730 + (i % 2) * 22}) scale(${0.8 + (i % 3) * 0.2})`} d="M-14 0 C-14 -16 14 -16 14 0Z M-9 0 L-5 -11 M0 0 L0 -13 M9 0 L5 -11" fill="#fff3d6" stroke="#d69a6b" strokeWidth="1.8" />
      ))}
    </>
  )
}

// 파도가 닿는 자리(귤이 폴짝 뛰는 곳): 물보라
export function Splash() {
  const x = WAVE_HOP.x
  return (
    <g transform={`translate(${x} 700)`}>
      <path d="M-120 20 C-100 -30 -60 -50 -20 -34 C0 -62 40 -64 60 -30 C90 -44 118 -20 130 20Z" fill="#fff" opacity="0.9" />
      <path d="M-120 20 C-70 4 40 6 130 20" stroke="#8ed6e0" strokeWidth="4" fill="none" />
      {[[-60, -70], [-20, -92], [30, -84], [70, -62], [100, -40], [-90, -44]].map(([dx, dy], i) => (
        <circle key={i} cx={dx} cy={dy} r={5 + (i % 3) * 2} fill="#d9f4f7" />
      ))}
    </g>
  )
}

// ── 맨 앞 풍경: 가장 빠르게 지나가며 장면을 부드럽게 이어 준다 ──
function Foreground() {
  const items = []
  // 감귤 가지와 잎 (왼쪽 위 테두리)
  const lx = T(0, 0, 1.4)
  const r = rng(81)
  items.push(
    <g key="canopy">
      <path d={`M${lx - 200} 40 C${lx + 120} 70 ${lx + 330} 20 ${lx + 640} 110`} stroke="#5a3d25" strokeWidth="26" fill="none" strokeLinecap="round" />
      {Array.from({ length: 22 }, (_, i) => {
        const x = lx - 160 + i * 36 + r() * 20
        const y = 20 + Math.sin(i * 0.5) * 40 + r() * 70
        return <path key={i} d={blob(x, y, 52 + r() * 22, 26 + r() * 10, r, 8, 0.15)} fill={C.leaf[i % 4]} transform={`rotate(${(r() * 70 - 35).toFixed(0)} ${x.toFixed(0)} ${y.toFixed(0)})`} />
      })}
      {[[lx + 60, 120, 38], [lx + 250, 94, 34], [lx + 480, 150, 32]].map(([x, y, rr], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={rr} fill="url(#gTang)" />
          <circle cx={x - rr * 0.3} cy={y - rr * 0.3} r={rr * 0.25} fill="#fff" opacity="0.3" />
        </g>
      ))}
    </g>,
  )
  // 아래쪽 풀과 꽃, 돌, 갈대 — 장면마다 모양이 바뀐다
  const bottom = (t0, t1, kind) => {
    const a = T(t0, -200, 1.4)
    const b = T(t1, 1800, 1.4)
    for (let x = a, i = 0; x < b; x += 150 + (i % 3) * 36, i++) {
      const rr = rng(2000 + kind * 100 + i)
      const y = 905 + rr() * 30
      if (kind === 0) { // 감귤꽃(흰 꽃)과 잎
        items.push(
          <g key={`fb${kind}-${i}`} data-cx={x.toFixed(0)} data-cw="170" transform={`translate(${x.toFixed(0)} ${y})`}>
            <path d={blob(0, 0, 70, 38, rr, 8, 0.15)} fill={C.leaf[i % 4]} />
            {[0, 1, 2].map((k) => (
              <g key={k} transform={`translate(${-30 + k * 30} ${-34 + (k % 2) * 8})`}>
                {[0, 72, 144, 216, 288].map((ang) => <ellipse key={ang} cx="0" cy="-9" rx="6" ry="10" fill="#fffaf0" transform={`rotate(${ang})`} />)}
                <circle r="4.5" fill="#f6c443" />
              </g>
            ))}
          </g>,
        )
      } else if (kind === 1) { // 현무암
        items.push(<Rock key={`fb${kind}-${i}`} x={x} y={y + 10} s={1.6 + rr() * 1.3} seed={2100 + i} />)
      } else if (kind === 2) { // 유채꽃
        items.push(
          <g key={`fb${kind}-${i}`} data-cx={x.toFixed(0)} data-cw="170" transform={`translate(${x.toFixed(0)} ${y + 20})`}>
            {Array.from({ length: 7 }, (_, k) => {
              const h = 110 + rr() * 120
              const dx = (k - 3) * 22
              return (
                <g key={k}>
                  <path d={`M${dx} 0 q${(rr() - 0.5) * 20} ${-h / 2} ${(rr() - 0.5) * 24} ${-h}`} stroke="#4f8f45" strokeWidth="4" fill="none" />
                  {[0, 1, 2, 3].map((q) => <circle key={q} cx={dx + (rr() - 0.5) * 26} cy={-h + (rr() - 0.5) * 30} r={9 + rr() * 5} fill={C.canola[q]} />)}
                </g>
              )
            })}
          </g>,
        )
      } else if (kind === 3) { // 바다: 하얀 거품과 돌
        items.push(
          <g key={`fb${kind}-${i}`} data-cx={x.toFixed(0)} data-cw="170" transform={`translate(${x.toFixed(0)} ${y})`}>
            <Rock x={0} y={10} s={1.4 + rr()} seed={2300 + i} />
            <path className="foam" d="M-90 6 q20 -26 45 -4 t45 -2 t45 4 t45 -4" stroke="#fff" strokeWidth="9" fill="none" strokeLinecap="round" opacity="0.85" />
          </g>,
        )
      } else { // 억새와 마른 풀
        items.push(
          <g key={`fb${kind}-${i}`} data-cx={x.toFixed(0)} data-cw="170" transform={`translate(${x.toFixed(0)} ${y + 30})`}>
            {Array.from({ length: 9 }, (_, k) => <path key={k} className="grass" style={{ animationDelay: `${-k * 0.2}s` }} d={`M${(k - 4) * 14} 0 q${(rr() - 0.5) * 30} ${-90 - rr() * 70} ${(rr() - 0.4) * 60} ${-150 - rr() * 70}`} stroke={kind === 4 ? '#3f5a3a' : '#7a5a3a'} strokeWidth="5" fill="none" strokeLinecap="round" />)}
          </g>,
        )
      }
    }
  }
  bottom(-1, 6.5, 0)
  bottom(6.2, 11.2, 1)
  bottom(11.0, 16, 2)
  bottom(15.8, 24.6, 3)
  bottom(24.4, 36, 4)
  return <>{items}</>
}

// 장면을 잇는 맨 앞 깃발 기둥 (축제로 들어서는 순간 가장 빠르게 스쳐 지나간다)
function Gate() {
  const px = T(24.9, 120, 1.9)
  return (
    <g>
      <path d={`M${px} 960 L${px} 120`} stroke="#6b4a2e" strokeWidth="14" strokeLinecap="round" />
      {['#f08a17', '#2f6b45', '#fff3d6', '#e58a8a'].map((c, i) => <Flag key={i} x={px + 8} y={150 + i * 62} w={44} color={c} i={i} />)}
    </g>
  )
}

function Scenery({ reg, children }) {
  return (
    <>
      <defs>
        <linearGradient id="gSky" gradientUnits="userSpaceOnUse" x1="0" y1="-300" x2="0" y2="720">
          <stop ref={reg('skyTop')} offset="0" stopColor="#bfe3e4" />
          <stop ref={reg('skyBot')} offset="1" stopColor="#fff1cf" />
        </linearGradient>
        <radialGradient id="gSun"><stop offset="0" stopColor="#fffbe6" /><stop offset="0.35" stopColor="#ffe9a8" stopOpacity="0.9" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" /></radialGradient>
        <linearGradient id="gHalla" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7ea993" /><stop offset="1" stopColor="#a9c9a6" /></linearGradient>
        <linearGradient id="gSeaSunset" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe2b0" /><stop offset="0.35" stopColor="#f9a870" /><stop offset="1" stopColor="#c9667a" /></linearGradient>
        <linearGradient id="gSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#b9ecf0" /><stop offset="0.35" stopColor="#6fcfdb" /><stop offset="1" stopColor="#2fa6bd" /></linearGradient>
        <linearGradient id="gCanolaFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9d85a" /><stop offset="1" stopColor="#a9bf4a" /></linearGradient>
        <linearGradient id="gCanolaNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f2d23c" /><stop offset="1" stopColor="#c9b832" /></linearGradient>
        <linearGradient id="gShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="0.25" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#6b4a2e" stopOpacity="0.25" /></linearGradient>
        <radialGradient id="gLamp"><stop offset="0" stopColor="#fff2b8" stopOpacity="0.95" /><stop offset="1" stopColor="#ffb347" stopOpacity="0" /></radialGradient>
        <radialGradient id="gTang" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffc24a" /><stop offset="0.5" stopColor="#f7931e" /><stop offset="1" stopColor="#df6d0c" /></radialGradient>
      </defs>

      <rect x="-4000" y="-1400" width="12000" height="2700" fill="url(#gSky)" />
      <g ref={reg('sun')}><circle r="200" fill="url(#gSun)" /><circle r="54" fill="#fff4cc" opacity="0.95" /></g>
      <g ref={reg('clouds')}><Clouds /></g>
      <g ref={reg('far')}><Far /></g>
      <g ref={reg('midfar')}><MidFar /></g>
      <g ref={reg('mid')}><Mid /></g>
      <g ref={reg('midnear')}><MidNear /></g>
      <g ref={reg('near')}>
        <Ground />
        {/* 가지에 달린 귤의 꼭지와 가지 */}
        <g ref={reg('branch')}>
          <path d={`M${HANG.x - 620} 96 C${HANG.x - 300} 150 ${HANG.x - 120} 190 ${HANG.x + 30} 214 C${HANG.x + 120} 226 ${HANG.x + 260} 190 ${HANG.x + 420} 120`} stroke="#6b4a2e" strokeWidth="24" fill="none" strokeLinecap="round" />
          <path d={`M${HANG.x - 620} 86 C${HANG.x - 300} 140 ${HANG.x - 120} 180 ${HANG.x + 30} 204`} stroke="#8a6340" strokeWidth="7" fill="none" strokeLinecap="round" opacity="0.7" />
          {[[-200, 150, 1], [-60, 188, -1], [150, 218, 1], [300, 168, -1], [-360, 128, -1]].map(([dx, dy, s], i) => {
            const r = rng(400 + i)
            return (
              <g key={i} transform={`translate(${HANG.x + dx} ${dy})`}>
                <path d={blob(0, 8, 60, 28, r, 8, 0.15)} fill={C.leaf[i % 4]} transform={`rotate(${s * 18})`} />
                <path d={blob(s * 36, 24, 44, 22, r, 8, 0.15)} fill={C.leaf[(i + 1) % 4]} transform={`rotate(${-s * 12})`} />
              </g>
            )
          })}
        </g>
        <g ref={reg('splash')} opacity="0"><Splash /></g>
      </g>
      <g ref={reg('actor')}>{children}</g>
      <g ref={reg('fg')}><Foreground /></g>
      <g ref={reg('fg2')}><Gate /></g>
      <rect ref={reg('warm')} x="-4000" y="-1400" width="12000" height="3000" fill="#ff9a3c" opacity="0" style={{ pointerEvents: 'none' }} />
    </>
  )
}

export default memo(Scenery)
