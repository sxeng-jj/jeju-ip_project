import { lazy, Suspense, useCallback, useState } from 'react'
import { Spinner } from 'react-bootstrap'
import SafeBoundary from './SafeBoundary'

const GyuriJourney = lazy(() => import('./GyuriJourney'))
const SEEN = 'jeju-intro-seen'

// 홈 맨 위 배너: 「귤이의 제주 여행」이 이 자리에서 바로 재생되고, 끝나면 환영 인사와 시작 버튼이 남는다.
// 이 탭에서 이미 본 뒤(또는 '움직임 줄이기' 설정)에는 재생하지 않고 마지막 장면만 보여 준다. 다시 보기 버튼으로 언제든 재생할 수 있다.
export default function HeroScene({ onStart }) {
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  const [autoplay] = useState(() => {
    try { return !sessionStorage.getItem(SEEN) } catch { return true }
  })
  const done = useCallback(() => {
    try { sessionStorage.setItem(SEEN, '1') } catch { /* 저장이 안 돼도 보는 데는 문제없다 */ }
  }, [])

  return (
    <div className="gj-host">
      <SafeBoundary
        fallback={(
          <div className="gj-error">
            <p className="mb-3">소개 영상을 불러오지 못했어요.</p>
            <button type="button" className="btn btn-primary" onClick={onStart}>제주 축제 검색하러 가기</button>
          </div>
        )}
      >
        <Suspense fallback={<div className="gj-error"><Spinner size="sm" /></div>}>
          <GyuriJourney autoplay={autoplay} reduced={reduced} onDone={done} onStart={onStart} />
        </Suspense>
      </SafeBoundary>
    </div>
  )
}
