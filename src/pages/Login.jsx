import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import { validateLogin } from '../lib/validate'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// 로그인. 스탬프를 찍으려다 온 경우(location.state.from)에는 로그인 뒤 그 페이지로 돌아간다.
export default function Login() {
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const signIn = useAppStore((s) => s.signIn)
  const toast = useAppStore((s) => s.toast)

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (authReady && user) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    const problem = validateLogin(form)
    if (problem) return setError(problem)
    setError('')
    setBusy(true)
    const r = await signIn({ email: form.email.trim(), password: form.password })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    toast('로그인했어요')
    navigate(from, { replace: true })
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={7} lg={5}>
          <Card className="p-2">
            <Card.Body>
              <h3 className="fw-bold mb-1"><i className="bi bi-box-arrow-in-right me-2 text-warning" />로그인</h3>
              <p className="text-secondary small">스탬프와 도감은 로그인한 내 계정에 저장돼요.</p>

              {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 필요해요.</Alert>}
              {from !== '/' && <Alert variant="success" className="small py-2">로그인하면 보던 페이지로 돌아가요.</Alert>}

              <Form onSubmit={submit} noValidate>
                <Form.Group className="mb-3" controlId="login-email">
                  <Form.Label>이메일</Form.Label>
                  <Form.Control type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="login-password">
                  <Form.Label>비밀번호</Form.Label>
                  <Form.Control type="password" autoComplete="current-password" value={form.password} onChange={set('password')} />
                </Form.Group>

                {error && <Alert variant="danger" className="py-2 small" role="alert">{error}</Alert>}

                <Button type="submit" className="w-100" disabled={busy || !isSupabaseReady}>
                  {busy ? <Spinner as="span" size="sm" className="me-2" /> : null}로그인
                </Button>
              </Form>

              <p className="small text-secondary text-center mt-3 mb-0">
                아직 계정이 없나요? <Link to="/signup" state={{ from }}>회원가입</Link>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
