import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Modal } from 'react-bootstrap'
import SafeBoundary from './SafeBoundary'
import { hasWebGL } from '../lib/webgl'
import { useAppStore } from '../store/useAppStore'

const BadgeSpin3D = lazy(() => import('./BadgeSpin3D'))

// 배지를 새로 얻으면 화면 가운데에 크게 띄우는 알림창. 여러 개를 한꺼번에 얻으면 하나씩 차례로 보여 준다.
export default function BadgeUnlock() {
  const badge = useAppStore((s) => s.unlocked[0])
  const dismiss = useAppStore((s) => s.dismissUnlocked)
  const [gl] = useState(hasWebGL)

  return (
    <Modal show={Boolean(badge)} onHide={dismiss} centered contentClassName="badge-unlock" aria-labelledby="badge-unlock-title">
      {badge && (
        <Modal.Body className="text-center">
          <div className="badge-unlock-kicker">🎉 새 배지를 얻었어요!</div>
          <div className="badge-unlock-stage">
            {gl ? (
              <SafeBoundary fallback={<div className="badge-unlock-emoji">{badge.emoji}</div>}>
                <Suspense fallback={<div className="badge-unlock-emoji">{badge.emoji}</div>}>
                  <BadgeSpin3D key={badge.key} emoji={badge.emoji} />
                </Suspense>
              </SafeBoundary>
            ) : (
              <div className="badge-unlock-emoji">{badge.emoji}</div>
            )}
          </div>
          <h2 id="badge-unlock-title" className="h4 fw-bold mb-1">{badge.name}</h2>
          <p className="text-secondary mb-3">{badge.desc}</p>
          <div className="d-flex gap-2 justify-content-center">
            <Link to="/stamps" className="btn btn-outline-primary" onClick={dismiss}>내 배지 보기</Link>
            <Button variant="primary" onClick={dismiss} autoFocus>확인</Button>
          </div>
        </Modal.Body>
      )}
    </Modal>
  )
}
