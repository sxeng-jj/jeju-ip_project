import { memo } from 'react'
import { rng } from '../lib/paint'
import { RX, RY } from '../lib/intro'

// 주인공 귤이: 여행 중에는 표정 없는 평범한 귤, 마지막에만 눈·입·손·발·모자·가방이 생긴다.
// 모든 부분은 같은 몸통 그룹 안에 있어 잎과 과피가 함께 움직인다.

const INK = '#2a2420'

// 활동 아이콘: 둥근 선과 부드러운 색 (진한 녹색 선 + 감귤색 포인트)
const ICON = { fill: 'none', stroke: '#2f6b45', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' }
const ICON_DRAWINGS = {
  walk: ( // 산책: 발자국 두 개
    <>
      {[[-14, 8, -12], [14, -10, 12]].map(([x, y, rot], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
          <ellipse cx="0" cy="6" rx="9" ry="13" fill="#f08a17" stroke="#2f6b45" strokeWidth="3.5" />
          <ellipse cx="0" cy="-17" rx="6.5" ry="5" fill="#f08a17" stroke="#2f6b45" strokeWidth="3.5" />
          {[-9, 0, 9].map((dx) => <circle key={dx} cx={dx} cy="-9" r="2.4" fill="#2f6b45" />)}
        </g>
      ))}
    </>
  ),
  camera: (
    <>
      <path d="M-26 -12 H-14 L-8 -22 H8 L14 -12 H26 Q32 -12 32 -6 V20 Q32 26 26 26 H-26 Q-32 26 -32 20 V-6 Q-32 -12 -26 -12Z" {...ICON} />
      <circle cx="0" cy="6" r="13" {...ICON} fill="#f08a17" />
      <circle cx="-4" cy="2" r="3.4" fill="#fff" stroke="none" />
      <circle cx="22" cy="-4" r="2.6" fill="#f08a17" stroke="none" />
    </>
  ),
  wave: ( // 물결
    <>
      <path d="M-30 -8 q10 -12 20 0 t20 0 t20 0" {...ICON} />
      <path d="M-30 8 q10 -12 20 0 t20 0 t20 0" {...ICON} stroke="#f08a17" />
      <path d="M-30 24 q10 -12 20 0 t20 0 t20 0" {...ICON} />
      <circle cx="14" cy="-26" r="7" fill="#f08a17" stroke="none" />
    </>
  ),
  shell: ( // 조개
    <>
      <path d="M-30 14 C-34 -14 -14 -28 0 -28 C14 -28 34 -14 30 14 Q0 28 -30 14Z" {...ICON} fill="#f08a17" fillOpacity="0.9" />
      <path d="M0 -26 V20 M-14 -20 L-14 18 M14 -20 L14 18 M-24 -8 L-22 14 M24 -8 L22 14" {...ICON} strokeWidth="2.6" stroke="#fff3d6" />
      <path d="M-10 26 h20 l-4 8 h-12z" {...ICON} strokeWidth="3" />
    </>
  ),
  music: ( // 북소리: 음표
    <>
      <path d="M-14 16 V-22 L20 -28 V10" {...ICON} />
      <path d="M-14 -12 L20 -18" {...ICON} />
      <ellipse cx="-20" cy="18" rx="10" ry="8" fill="#f08a17" stroke="#2f6b45" strokeWidth="3.5" transform="rotate(-18 -20 18)" />
      <ellipse cx="14" cy="12" rx="10" ry="8" fill="#f08a17" stroke="#2f6b45" strokeWidth="3.5" transform="rotate(-18 14 12)" />
    </>
  ),
}

function Actor({ reg, icons }) {
  const r = rng(7)
  const dots = Array.from({ length: 46 }, () => {
    const a = r() * Math.PI * 2
    const d = Math.sqrt(r()) * 0.88
    return [Math.cos(a) * RX * d, Math.sin(a) * RY * d, 1.2 + r() * 1.8, 0.2 + r() * 0.25]
  })
  return (
    <>
      <ellipse ref={reg('shadow')} rx="58" ry="11" fill="#5a3a1c" opacity="0.25" />
      <path ref={reg('stem')} stroke="#6b4a2e" strokeWidth="6" strokeLinecap="round" fill="none" />

      <g ref={reg('body')}>
        {/* 다리 (몸통 뒤에서 자란다) */}
        {[-1, 1].map((s) => (
          <g key={s} ref={reg(s < 0 ? 'legL' : 'legR')}>
            <path d="M0 0 V40" stroke={INK} strokeWidth="5" strokeLinecap="round" />
            <ellipse cx={s * 4} cy="42" rx="10" ry="4.8" fill={INK} />
          </g>
        ))}

        {/* 여행용 배낭 (몸통 뒤로 삐져나온다) */}
        <g ref={reg('bag')}>
          <rect x="-4" y="-42" width="50" height="76" rx="16" fill="#3f7d4e" stroke="#2a5a38" strokeWidth="2.4" />
          <rect x="10" y="2" width="30" height="26" rx="8" fill="#5a9a52" stroke="#2a5a38" strokeWidth="2" />
          <path d="M14 -46 q10 -12 20 0" stroke="#2a5a38" strokeWidth="5" fill="none" strokeLinecap="round" />
          <circle cx="25" cy="15" r="3.6" fill="#f08a17" />
          <path d="M2 -26 h40" stroke="#f08a17" strokeWidth="5" strokeLinecap="round" />
        </g>

        {/* 둥글고 약간 납작한 몸통 + 과피 점무늬 */}
        <ellipse rx={RX} ry={RY} fill="url(#gTang)" stroke="#c9590a" strokeOpacity="0.5" strokeWidth="1.6" />
        {dots.map(([x, y, rr, o], i) => <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={rr.toFixed(1)} fill="#c75a0a" opacity={o} />)}
        <path d={`M${-RX + 8} ${8} C${-RX + 20} ${RY - 4} ${RX - 30} ${RY + 2} ${RX - 4} 12 C${RX - 20} ${RY + 14} ${-RX + 24} ${RY + 12} ${-RX + 8} 8Z`} fill="#8a2b00" opacity="0.16" />
        <ellipse cx="-20" cy="-22" rx="22" ry="12" fill="#fff" opacity="0.3" transform="rotate(-22 -20 -22)" />
        <circle cx="2" cy={-RY + 3} r="6" fill="#a8430a" opacity="0.65" />

        {/* 잎 하나 */}
        <g transform={`translate(2 ${-RY + 1})`}>
          <path d="M0 0 C-1 -8 3 -14 8 -16" stroke="#6b4a2e" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M6 -14 C14 -42 56 -52 86 -36 C68 -12 32 -2 6 -14Z" fill="#3f7d4e" stroke="#2a5a38" strokeWidth="1.4" />
          <path d="M6 -14 C14 -42 56 -52 86 -36 C70 -34 34 -28 6 -14Z" fill="#6aa65a" opacity="0.55" />
          <path d="M8 -14 C34 -26 58 -32 82 -36" stroke="#cfe6a8" strokeWidth="1.8" fill="none" opacity="0.8" />
        </g>

        {/* 변신 뒤에만 나타나는 부분들 */}
        <g ref={reg('strap')} opacity="0">
          <path d={`M-30 ${-RY + 6} C-38 -14 -38 8 -34 28 M30 ${-RY + 6} C38 -14 38 8 34 28`} stroke="#2f6b45" strokeWidth="8" fill="none" strokeLinecap="round" />
          <path d="M-35 6 H35" stroke="#2f6b45" strokeWidth="4" strokeLinecap="round" />
        </g>
        <g ref={reg('cheeks')}>
          <circle cx="-30" cy="10" r="9" fill="#f26b5b" opacity="0.5" />
          <circle cx="30" cy="10" r="9" fill="#f26b5b" opacity="0.5" />
        </g>
        <g ref={reg('eyes')}>
          <ellipse cx="-17" cy="0" rx="4.6" ry="5.4" fill={INK} />
          <ellipse cx="17" cy="0" rx="4.6" ry="5.4" fill={INK} />
          <circle cx="-15.5" cy="-2" r="1.5" fill="#fff" />
          <circle cx="18.5" cy="-2" r="1.5" fill="#fff" />
        </g>
        <g ref={reg('mouth')}>
          <path ref={reg('mouthOpen')} d="M-13 0 Q0 24 13 0Z" fill="#b8452c" opacity="0" />
          <path d="M-13 0 Q0 15 13 0" stroke="#6b2a12" strokeWidth="3.4" fill="none" strokeLinecap="round" />
        </g>
        <path ref={reg('armL')} stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
        <path ref={reg('armR')} stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
        <circle ref={reg('handL')} r="6.5" fill={INK} />
        <circle ref={reg('handR')} r="6.5" fill={INK} />
        {/* 관광 차림: 목에 건 카메라 */}
        <g ref={reg('camera')}>
          <path d="M-14 -22 L-18 -44 M14 -22 L18 -44" stroke="#8b5a2b" strokeWidth="4" strokeLinecap="round" />
          <rect x="-20" y="-13" width="40" height="27" rx="6" fill="#3b4a52" stroke="#222c31" strokeWidth="2" />
          <rect x="-12" y="-19" width="14" height="8" rx="3" fill="#3b4a52" stroke="#222c31" strokeWidth="2" />
          <circle cx="2" cy="1" r="10" fill="#222c31" />
          <circle cx="2" cy="1" r="6.5" fill="#8fd3ea" />
          <circle cx="0" cy="-1.5" r="2" fill="#fff" opacity="0.9" />
          <circle cx="14" cy="-7" r="2.4" fill="#f08a17" />
        </g>
        {/* 챙이 넓은 밀짚모자 */}
        <g ref={reg('hat')} opacity="0">
          <ellipse cx="0" cy="0" rx="56" ry="12.5" fill="#e8c97a" stroke="#b8914a" strokeWidth="2" />
          <path d="M-28 -2 C-28 -40 28 -40 28 -2Z" fill="#f0d98e" stroke="#b8914a" strokeWidth="2" />
          <path d="M-28.5 -9 H28.5 L28 -2 H-28Z" fill="#f08a17" />
          <path d="M26 -6 q16 6 20 20 M26 -4 q10 8 8 22" stroke="#f08a17" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M-46 3 q46 14 92 0" stroke="#c9a458" strokeWidth="1.6" fill="none" opacity="0.7" />
          <path d="M-14 -28 C-6 -35 8 -35 16 -28" stroke="#fff3c4" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      </g>

      {/* 신나서 들썩일 때: 터지는 선과 떠오르는 음표 (굴러서 흔들리는 게 아니라 신난 것임을 보여 준다) */}
      <g ref={reg('joy')}>
        <g ref={reg('joyLines')} opacity="0" stroke="#f08a17" strokeWidth="6" strokeLinecap="round">
          {[-160, -130, -100, -70, -40, -10].map((a, i) => {
            const r = (a * Math.PI) / 180
            const r0 = 70 + (i % 2) * 6
            return <path key={a} d={`M${(Math.cos(r) * r0).toFixed(1)} ${(Math.sin(r) * r0).toFixed(1)} L${(Math.cos(r) * (r0 + 30)).toFixed(1)} ${(Math.sin(r) * (r0 + 30)).toFixed(1)}`} stroke={i % 2 ? '#2f6b45' : '#f08a17'} />
          })}
        </g>
        {['n1', 'n2'].map((k) => <text key={k} ref={reg(k)} opacity="0" fontSize="44" fontWeight="800" fill="#2f6b45" stroke="#fff" strokeWidth="5" paintOrder="stroke">♪</text>)}
      </g>

      {/* 기분을 말하는 말풍선 */}
      <g ref={reg('bubble')} opacity="0">
        <rect ref={reg('bubbleBox')} x="-80" y="-34" width="160" height="62" rx="31" fill="#fffaf0" stroke="#2f6b45" strokeWidth="4" />
        <g ref={reg('bubbleTail')}><path d="M-12 26 L10 58 L16 26" fill="#fffaf0" stroke="#2f6b45" strokeWidth="4" strokeLinejoin="round" /><path d="M-9 25 H14" stroke="#fffaf0" strokeWidth="6" /></g>
        <text ref={reg('bubbleText')} x="0" y="9" textAnchor="middle" fontSize="30" fontWeight="800" fill="#1f6b45" />
      </g>

      {/* 활동 아이콘 */}
      {icons.map(({ id }) => (
        <g key={id} ref={reg(`icon_${id}`)} opacity="0">
          <circle r="52" fill="#fff4d8" stroke="#fff" strokeWidth="3" opacity="0.96" />
          <circle r="52" fill="none" stroke="#e8d3a6" strokeWidth="2" strokeDasharray="3 6" />
          {ICON_DRAWINGS[id]}
        </g>
      ))}
    </>
  )
}

export default memo(Actor)
