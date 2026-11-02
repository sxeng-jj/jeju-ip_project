import { useEffect, useState } from 'react'
import GyuriJourney from './GyuriJourney'
import SafeBoundary from './SafeBoundary'

// 홈에 처음 들어올 때 화면 전체에 깔리는 인트로. 오류가 나면 건너뛸 수 있는 안내로 대신한다.
export default function IntroOverlay({ onClose, onStart }) {
  const [reduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden' // 뒤 화면이 같이 스크롤되지 않게
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="gj-overlay" role="dialog" aria-modal="true" aria-label="귤이의 제주 여행 소개 영상">
      <SafeBoundary
        fallback={(
          <div className="gj-error">
            <p className="mb-3">소개 영상을 불러오지 못했어요.</p>
            <button type="button" className="btn btn-primary" onClick={onStart}>제주 축제 달력 시작하기</button>
          </div>
        )}
      >
        <GyuriJourney mode="play" reduced={reduced} onClose={onClose} onStart={onStart} />
      </SafeBoundary>
    </div>
  )
}

