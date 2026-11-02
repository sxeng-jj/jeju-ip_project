import { lazy, Suspense } from 'react'
import { Button, Spinner } from 'react-bootstrap'
import SafeBoundary from './SafeBoundary'

const GyuriJourney = lazy(() => import('./GyuriJourney'))

// 홈 맨 위 배너: 귤이가 환영 인사를 하는 마지막 장면(정지 화면) + 인트로 다시 보기 버튼
export default function HeroScene({ onReplay }) {
  return (
    <div className="hero-poster">
      <SafeBoundary fallback={<div className="hero-poster-plain">🍊 제주에 온 걸 환영해요!</div>}>
        <Suspense fallback={<div className="hero-poster-plain"><Spinner size="sm" /></div>}>
          <GyuriJourney mode="still" />
        </Suspense>
      </SafeBoundary>
      <Button variant="light" size="sm" className="hero-poster-btn" onClick={onReplay}>
        <i className="bi bi-play-fill me-1" />귤이의 제주 여행 다시 보기
      </Button>
    </div>
  )
}
