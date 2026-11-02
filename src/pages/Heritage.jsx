import { useEffect, useState } from 'react'
import { Alert, Badge, Col, Container, Form, ListGroup, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { fetchHeritage, fetchHeritageKinds } from '../api/client'

// STEP 4: 국가유산청 — 축제 뒤에 있는 제주의 전통(굿·마을제·해녀 문화 등) 찾기
export default function Heritage() {
  const [keyword, setKeyword] = useState('')
  const [kind, setKind] = useState('')
  const [kinds, setKinds] = useState([])
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchHeritageKinds().then(setKinds).catch(() => {})
  }, [])

  // 입력이 멈춘 뒤에 검색
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => {
      fetchHeritage(keyword, kind)
        .then((d) => { setList(d); setError('') })
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [keyword, kind])

  return (
    <Container>
      <PageHeader icon="bank" title="제주의 전통" sub="국가유산청 · 축제와 이어지는 제주의 국가유산" />

      <Row className="g-2 mb-3">
        <Col md={7}>
          <Form.Control
            placeholder="이름으로 검색 (예: 해녀, 영등, 굿, 당)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </Col>
        <Col md={5}>
          <Form.Select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="">모든 종목</option>
            {kinds.map((k) => <option key={k} value={k}>{k}</option>)}
          </Form.Select>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}
      <p className="text-secondary small">{loading ? <Spinner as="span" size="sm" /> : `${list.length}건`}</p>

      <ListGroup className="pb-5">
        {list.map((h) => (
          <ListGroup.Item key={h.id} className="d-flex justify-content-between align-items-center">
            <span>
              {h.name}
              <small className="text-secondary ms-2">{h.city}</small>
            </span>
            <Badge bg="secondary">{h.kind}</Badge>
          </ListGroup.Item>
        ))}
      </ListGroup>
    </Container>
  )
}
