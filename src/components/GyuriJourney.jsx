import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from 'react-bootstrap'
import IntroActor from './IntroActor'
import IntroScenery from './IntroScenery'
import { createAudio } from '../lib/introAudio'
import { DURATION, ICONS, SCENES, SPEED, sceneIndexAt } from '../lib/intro'
import { renderFrame } from '../lib/introRender'

const LOOP_DELAY = 60 // 끝까지 본 뒤 이만큼(초) 지나면 저절로 처음부터 다시 재생한다
const END_AT = 40.5 // 마지막 장면(환영 인사)의 시각: 건너뛰기나 정지 화면은 여기로 간다
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// 「귤이의 제주 여행」: 귤 한 알이 굴러 제주의 풍경을 지나 일어서서 환영 인사를 하는 일러스트 애니메이션.
// 홈 배너 안에서 바로 재생된다. autoplay=false 나 '움직임 줄이기' 설정이면 재생하지 않고 마지막 장면(문구·버튼 포함)만 보여 준다.
export default function GyuriJourney({ autoplay = true, reduced = false, startAt = 0, freeze = false, onDone, onStart }) {
  const still = !autoplay || reduced
  const wrap = useRef(null)
  const els = useRef({})
  const regs = useRef({})
  const vbW = useRef(1600)
  const audio = useRef(null)
  const bar = useRef(null)
  const mutedRef = useRef(true)
  const skipRef = useRef(false)

  const [run, setRun] = useState(0)
  const [muted, setMuted] = useState(true)
  const [caption, setCaption] = useState('')
  const [phase, setPhase] = useState(still ? 2 : 0) // 0: 여행 중, 1: 환영 문구, 2: 버튼까지 표시
  const [replaying, setReplaying] = useState(false) // 마지막 장면에서 '다시 보기'를 눌러 재생 중인가

  const playing = !still || replaying
  const reg = useCallback((name) => (regs.current[name] ??= (node) => { els.current[name] = node }), [])
  const actor = useMemo(() => <IntroActor reg={reg} icons={ICONS} />, [reg])

  useEffect(() => {
    const e = els.current
    e.hallasan = e.far?.querySelector('.hallasan')
    e.sea = e.far?.querySelector('.sea')
    e.seaSunset = e.far?.querySelector('.seaSunset')
    // 화면 밖에 있는 요소는 그리지 않는다 (층마다 수천 개의 도형이 있어서, 안 하면 매 프레임 너무 무겁다)
    e.cull = [['mid', 0.45], ['midnear', 0.75], ['near', 1], ['fg', 1.4]].flatMap(([name, f]) => [...(e[name]?.querySelectorAll('[data-cx]') ?? [])].map((el) => ({ el, f, x: Number(el.dataset.cx), w: Number(el.dataset.cw) || 120, shown: true })))
    e.fades = [...wrap.current.querySelectorAll('.gj-fade')].map((g) => ({ g, w: g.dataset.w.split(',').map(Number) }))
    const size = () => {
      const r = wrap.current.getBoundingClientRect()
      vbW.current = clamp((900 * r.width) / Math.max(1, r.height), 700, 3200)
    }
    size()

    if (!playing) {
      renderFrame(e, END_AT, vbW.current)
      const ro = new ResizeObserver(() => { size(); renderFrame(e, END_AT, vbW.current) })
      ro.observe(wrap.current)
      return () => ro.disconnect()
    }

    const au = createAudio()
    audio.current = au
    au.setMuted(mutedRef.current)
    skipRef.current = false
    let raf = 0
    let last = performance.now()
    let t = run === 0 ? startAt : 0
    let visible = true
    let hidden = document.hidden
    let scene = -1
    let cap = ''
    let ph = 0
    let done = false
    let idle = 0 // 끝난 뒤 지난 시간(초)
    let skipped = false // 건너뛰기로 끝에 온 경우에는 저절로 다시 재생하지 않는다
    const onVis = () => { hidden = document.hidden; last = performance.now() }
    document.addEventListener('visibilitychange', onVis)
    const ro = new ResizeObserver(size)
    ro.observe(wrap.current)
    // 화면 밖(스크롤로 가려졌을 때)에서는 멈춘다
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; last = performance.now() })
    io.observe(wrap.current)

    const frame = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      if (skipRef.current) { // 건너뛰기: 마지막 장면으로
        skipRef.current = false
        skipped = true
        t = Math.max(t, END_AT)
      } else if (!hidden && visible && !freeze) {
        const prev = t
        t += dt * SPEED
        au.tick(prev, Math.min(t, DURATION))
      }
      renderFrame(e, t, vbW.current)

      const si = sceneIndexAt(Math.min(t, DURATION - 0.01))
      const c = SCENES[si].name && t - SCENES[si].from < 3.4 ? SCENES[si].name : ''
      if (si !== scene || c !== cap) { scene = si; cap = c; setCaption(c) }
      const p = t >= 39.6 ? 2 : t >= 38.2 ? 1 : 0
      if (p !== ph) { ph = p; setPhase(p) }
      if (bar.current) bar.current.style.width = `${Math.min(100, (t / DURATION) * 100).toFixed(1)}%`
      if (!done && t >= END_AT) { done = true; onDone?.() }
      if (done && !skipped && !reduced && !hidden && visible && !freeze) {
        idle += dt
        if (idle >= LOOP_DELAY) { // 일정 시간(LOOP_DELAY) 뒤 처음부터 다시
          setCaption('')
          setPhase(0)
          setRun((r) => r + 1)
          return
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', onVis)
      ro.disconnect()
      io.disconnect()
      au.close()
    }
  }, [playing, run])

  const toggleSound = () => {
    const next = !muted
    mutedRef.current = next
    setMuted(next)
    audio.current?.setMuted(next) // 버튼을 누른 순간에만 소리를 만든다(브라우저 정책)
  }
  const skip = () => { skipRef.current = true }
  const replay = () => {
    setCaption('')
    setPhase(0)
    setReplaying(true)
    setRun((r) => r + 1)
  }

  return (
    <div ref={wrap} className="gj" role="img" aria-label="귤 한 알이 감귤밭에서 떨어져 돌담길, 유채꽃과 한라산, 바다, 해녀의 바다, 축제를 지나 구르다가 일어서서 모자를 쓰고 배낭을 메고 제주에 온 걸 환영하는 애니메이션">
      <svg ref={reg('svg')} className="gj-svg" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <IntroScenery reg={reg}>{actor}</IntroScenery>
        <rect ref={reg('flash')} x="-4000" y="-1400" width="12000" height="3000" fill="#fff" opacity="0" />
        <g ref={reg('viewfinder')} opacity="0" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M-380 -170 v-60 h60 M380 -170 v-60 h-60 M-380 170 v60 h60 M380 170 v60 h-60" />
        </g>
      </svg>
      <div className="gj-grain" aria-hidden="true" />
      <div className="gj-vignette" aria-hidden="true" />

      {playing && phase < 2 && (
        <div className="gj-top">
          <Button variant="light" size="sm" onClick={toggleSound} aria-pressed={!muted} aria-label={muted ? '소리 켜기' : '소리 끄기'}>
            <i className={`bi bi-volume-${muted ? 'mute' : 'up'}-fill`} />
            <span className="d-none d-sm-inline ms-1">{muted ? '소리 켜기' : '소리 끄기'}</span>
          </Button>
          <Button variant="light" size="sm" onClick={skip}>
            <i className="bi bi-skip-forward-fill me-1" />건너뛰기
          </Button>
        </div>
      )}
      {playing && caption && <div key={caption} className="gj-caption" role="status">{caption}</div>}
      {playing && <div className="gj-progress" aria-hidden="true"><div ref={bar} /></div>}

      {phase >= 1 && (
        <div className="gj-welcome" role="status">
          <div className="gj-hello">혼저 옵서예!</div>
          <div className="gj-sub">제주에 온 걸 환영해!</div>
        </div>
      )}
      {phase >= 2 && (
        <div className="gj-cta">
          <Button variant="primary" onClick={onStart}>
            귤이와 함께 제주 여행 시작하기 <i className="bi bi-arrow-right ms-1" />
          </Button>
          {!reduced && <Button variant="light" size="sm" onClick={replay}><i className="bi bi-arrow-counterclockwise me-1" />다시 보기</Button>}
        </div>
      )}
    </div>
  )
}
