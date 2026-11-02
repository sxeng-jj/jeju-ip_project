import { lazy, Suspense, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import SafeBoundary from './SafeBoundary'
import { hasWebGL } from '../lib/webgl'

// three.js 는 무거워서 홈의 글과 검색이 먼저 뜨고, 3D 장식은 나중에 따로 내려받는다
const JejuScene3D = lazy(() => import('./JejuScene3D'))

// 3D 를 못 그리면 같은 주인공들을 이모지로 대신 보여준다
const Plain = () => (
  <div className="hero-scene d-flex align-items-center justify-content-center" aria-hidden="true" style={{ fontSize: '4rem' }}>
    🗿🍊⛰️
  </div>
)

export default function HeroScene() {
  const [gl] = useState(hasWebGL)
  if (!gl) return <Plain />
  return (
    <SafeBoundary fallback={<Plain />}>
      <Suspense fallback={<div className="hero-scene d-flex align-items-center justify-content-center"><Spinner size="sm" /></div>}>
        <JejuScene3D />
      </Suspense>
    </SafeBoundary>
  )
}
