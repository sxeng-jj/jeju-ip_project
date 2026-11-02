import { NavLink, Outlet } from 'react-router-dom'
import { Container, Nav, Navbar, Toast } from 'react-bootstrap'
import { NAV_ITEMS } from '../router'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)

  return (
    <>
      <Navbar expand="md" variant="dark" className="border-bottom border-secondary">
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
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main>
        <Outlet />
      </main>

      <footer className="text-center text-secondary small py-4">
        데이터: 한국관광공사 · 기상청 · 국가유산청 (공공데이터포털)
      </footer>

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
