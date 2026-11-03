import { useEffect } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Button, Container, Nav, Navbar, Toast } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import BadgeUnlock from '../components/BadgeUnlock'
import GuideWidget from '../components/GuideWidget'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const user = useAppStore((s) => s.user)
  const nickname = useAppStore((s) => s.nickname)
  const authReady = useAppStore((s) => s.authReady)
  const initAuth = useAppStore((s) => s.initAuth)
  const signOut = useAppStore((s) => s.signOut)

  // 저장된 로그인 상태를 읽고, 이후 로그인·로그아웃을 계속 따라간다
  useEffect(() => initAuth(), [initAuth])

  return (
    <>
      <Navbar expand="md" variant="light" className="festa-nav">
        <Container>
          <Navbar.Brand as={NavLink} to="/">
            <i className="bi bi-stars me-2" />제주 축제 달력
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="ms-auto">
              {NAV_ITEMS.map((n) => (
                <Nav.Link key={n.to} as={NavLink} to={n.to} end={n.to === '/'}>
                  <i className={`bi bi-${n.icon} me-1`} />{n.label}
                </Nav.Link>
              ))}
            </Nav>

            {/* 로그인 영역: 저장된 상태를 확인하기 전에는 비워 두어 '로그아웃'이 잠깐 깜빡이지 않게 한다 */}
            <div className="d-flex align-items-center gap-2 ms-md-3 mt-2 mt-md-0">
              {authReady && (user ? (
                <>
                  <span className="small text-nowrap"><i className="bi bi-person-circle me-1 text-warning" />{nickname}님</span>
                  <Button size="sm" variant="outline-secondary" onClick={signOut}>로그아웃</Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-sm btn-outline-primary">로그인</Link>
                  <Link to="/signup" className="btn btn-sm btn-primary">회원가입</Link>
                </>
              ))}
            </div>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main>
        <Outlet />
      </main>

      <footer className="festa-footer text-center text-secondary small py-4 mt-5">
        데이터: 한국관광공사 · 한국문화정보원 · 기상청 · 지자체 문화축제 (공공데이터포털)
        <Link to="/status" className="ms-2 text-secondary">서비스 상태</Link>
      </footer>

      <BadgeUnlock />
      <GuideWidget />

      <div className="toast-stack">
        {toasts.map((t) => (
          <Toast key={t.id} bg={t.variant} show>
            <Toast.Body className="text-white">{t.message}</Toast.Body>
          </Toast>
        ))}
      </div>
    </>
  )
}
