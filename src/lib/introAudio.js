import { DURATION, SFX } from './intro'

// 인트로의 효과음과 배경음악. 따로 음원 파일 없이 브라우저가 소리를 만든다(임시 사운드: 나중에 진짜 음원으로 바꿔도 된다).
// 브라우저 정책상 소리는 사용자가 켜기 버튼을 누른 뒤에야 AudioContext 를 만들어 재생한다. 처음에는 항상 음소거다.

const SCALE = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25] // 도레미솔라 (5음계)
const PATTERN = [0, 2, 4, 2, 3, 1, 4, 5]
const BGM = Array.from({ length: Math.floor(DURATION / 0.5) }, (_, i) => ({ t: i * 0.5, note: SCALE[PATTERN[i % PATTERN.length]] }))

export function createAudio() {
  let ctx = null
  let master = null
  let muted = true

  const ensure = () => {
    if (ctx) return ctx
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.5
    master.connect(ctx.destination)
    return ctx
  }

  const tone = (freq, { type = 'sine', dur = 0.3, vol = 0.2, to, delay = 0 } = {}) => {
    if (!ctx || muted) return
    const t0 = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, t0)
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    o.connect(g).connect(master)
    o.start(t0)
    o.stop(t0 + dur + 0.05)
  }
  const noise = (dur, vol, freq) => {
    if (!ctx || muted) return
    const n = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.value = vol
    src.connect(f).connect(g).connect(master)
    src.start()
  }

  const fire = (id) => {
    if (id === 'thump') tone(150, { to: 60, dur: 0.18, vol: 0.35 })
    else if (id === 'knock') tone(520, { type: 'triangle', to: 300, dur: 0.1, vol: 0.18 })
    else if (id === 'shutter') { noise(0.08, 0.5, 3000); tone(1800, { dur: 0.05, vol: 0.1, delay: 0.09 }) }
    else if (id === 'splash') noise(0.5, 0.45, 1800)
    else if (id === 'bubbles') [0, 0.08, 0.17].forEach((d, i) => tone(700 + i * 260, { dur: 0.12, vol: 0.12, delay: d }))
    else if (id === 'drum') tone(110, { to: 48, dur: 0.28, vol: 0.5 })
    else if (id === 'chime') tone(1046 + Math.random() * 400, { dur: 0.5, vol: 0.12 })
    else if (id === 'boing') tone(260, { to: 620, dur: 0.22, vol: 0.2 })
    else if (id === 'hello') [523.25, 659.25, 783.99].forEach((f) => tone(f, { type: 'triangle', dur: 1.1, vol: 0.14 }))
  }

  const events = [
    ...SFX.thumps.map((t) => ({ t, id: 'thump' })),
    ...SFX.knocks.map((t) => ({ t, id: 'knock' })),
    { t: SFX.shutter, id: 'shutter' },
    { t: SFX.splash, id: 'splash' },
    { t: SFX.bubbles, id: 'bubbles' },
    ...SFX.drums.map((t) => ({ t, id: 'drum' })),
    ...SFX.chimes.map((t) => ({ t, id: 'chime' })),
    ...SFX.boings.map((t) => ({ t, id: 'boing' })),
    { t: SFX.hello, id: 'hello' },
  ]

  return {
    // 소리 켜기/끄기 (켜는 순간 AudioContext 를 만든다)
    setMuted(m) {
      muted = m
      if (!m) ensure()
      if (ctx) {
        master.gain.value = m ? 0 : 0.5
        if (!m) ctx.resume()
      }
    },
    // prev 초 ~ t 초 사이에 울릴 소리를 낸다
    tick(prev, t) {
      if (muted || !ctx || t <= prev || t - prev > 0.5) return
      for (const e of events) if (e.t > prev && e.t <= t) fire(e.id)
      for (const b of BGM) if (b.t > prev && b.t <= t) tone(b.note, { type: 'triangle', dur: 0.55, vol: 0.05 })
    },
    close() {
      ctx?.close()
      ctx = null
    },
  }
}
