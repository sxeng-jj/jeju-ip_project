import { lazy, Suspense, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import SafeBoundary from './SafeBoundary'
import { hasWebGL } from '../lib/webgl'

// three.js 는 무거워서 홈의 글과 검색이 먼저 뜨고, 애니메이션은 나중에 따로 내려받는다
const JejuStory3D = lazy(() => import('./JejuStory3D'))

// 3D 를 못 그리면 같은 주인공을 이모지로 대신 보여준다
const Plain = () => (
  <div className="story story-plain d-flex flex-column align-items-center justify-content-center text-center">
    <div style={{ fontSize: '3.5rem' }} aria-hidden="true">🍊⛰️🎈🌊</div>
    <div className="fw-bold mt-2">제주에 온 걸 환영해요!</div>
  </div>
)

export default function HeroScene() {
  const [gl] = useState(hasWebGL)
  // 시스템에서 '움직임 줄이기'를 켠 사람에게는 저절로 재생하지 않고 마지막 장면만 보여준다
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  if (!gl) return <Plain />
  return (
    <SafeBoundary fallback={<Plain />}>
      <Suspense fallback={<div className="story d-flex align-items-center justify-content-center"><Spinner size="sm" /></div>}>
        <JejuStory3D reduced={reduced} />
      </Suspense>
    </SafeBoundary>
  )
}
