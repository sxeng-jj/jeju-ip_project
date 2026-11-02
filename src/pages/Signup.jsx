import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import { PASSWORD_MIN, validateSignup } from '../lib/validate'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

// 회원가입: 닉네임(후기에 보이는 이름) + 이메일 + 비밀번호.
// 프로젝트 설정에 따라 가입 즉시 로그인되거나, 확인 메일의 링크를 눌러야 로그인된다.
export default function Signup() {
  const navigate = useNavigate()
  const from = useLocation().state?.from ?? '/'
  const user = useAppStore((s) => s.user)
  const authReady = useAppStore((s) => s.authReady)
  const signUp = useAppStore((s) => s.signUp)
  const toast = useAppStore((s) => s.toast)

  const [form, setForm] = useState({ nickname: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('') // 확인 메일을 보낸 주소
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (authReady && user && !sentTo) return <Navigate to={from} replace />

  const submit = async (e) => {
    e.preventDefault()
    const problem = validateSignup(form)
    if (problem) return setError(problem)
    setError('')
    setBusy(true)
    const r = await signUp({ email: form.email.trim(), password: form.password, nickname: form.nickname.trim() })
    setBusy(false)
    if (!r.ok) return setError(r.error)
    if (r.needsConfirm) return setSentTo(form.email.trim())
    toast('가입을 환영해요!')
    navigate(from, { replace: true })
  }

  if (sentTo) {
    return (
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={7} lg={5}>
            <Card className="p-2">
              <Card.Body className="text-center">
                <i className="bi bi-envelope-check display-4 text-warning" />
                <h4 className="fw-bold mt-2">확인 메일을 보냈어요</h4>
                <p className="mb-1"><strong>{sentTo}</strong></p>
                <p className="text-secondary small">메일의 링크를 누르면 가입이 끝나요. 그다음 로그인해 주세요. 메일이 안 보이면 스팸함도 확인해 보세요.</p>
                <Link to="/login" state={{ from }} className="btn btn-primary">로그인하러 가기</Link>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={7} lg={5}>
          <Card className="p-2">
            <Card.Body>
              <h3 className="fw-bold mb-1"><i className="bi bi-person-plus me-2 text-warning" />회원가입</h3>
              <p className="text-secondary small">가입하면 스탬프·후기·도감을 내 계정에 모을 수 있어요.</p>

              {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 필요해요.</Alert>}

              <Form onSubmit={submit} noValidate>
                <Form.Group className="mb-3" controlId="su-nickname">
                  <Form.Label>닉네임</Form.Label>
                  <Form.Control autoComplete="nickname" maxLength={12} placeholder="예: 돌하르방 (후기에 보이는 이름)" value={form.nickname} onChange={set('nickname')} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="su-email">
                  <Form.Label>이메일</Form.Label>
                  <Form.Control type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
                </Form.Group>
                <Form.Group className="mb-3" controlId="su-password">
                  <Form.Label>비밀번호</Form.Label>
                  <Form.Control type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />
                  <Form.Text className="text-secondary">{PASSWORD_MIN}자 이상, 영문자와 숫자를 함께 써 주세요.</Form.Text>
                </Form.Group>
                <Form.Group className="mb-3" controlId="su-confirm">
                  <Form.Label>비밀번호 확인</Form.Label>
                  <Form.Control type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} />
                </Form.Group>

                {error && <Alert variant="danger" className="py-2 small" role="alert">{error}</Alert>}

                <Button type="submit" className="w-100" disabled={busy || !isSupabaseReady}>
                  {busy ? <Spinner as="span" size="sm" className="me-2" /> : null}가입하기
                </Button>
              </Form>

              <p className="small text-secondary text-center mt-3 mb-0">
                이미 계정이 있나요? <Link to="/login" state={{ from }}>로그인</Link>
              </p>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  )
}
