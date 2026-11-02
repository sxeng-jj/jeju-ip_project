import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Col, Container, Form, InputGroup, ProgressBar, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { fetchFestivals } from '../api/client'
import { buildCollection } from '../lib/badges'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const Stars = ({ n }) =>
  [1, 2, 3, 4, 5].map((i) => <i key={i} className={`bi bi-star${i <= n ? '-fill' : ''} text-warning me-1`} />)

// 닉네임 정하기 + 내 스탬프·후기 + 도감 진행률과 배지
export default function Stamps() {
  const nickname = useAppStore((s) => s.nickname)
  const setNickname = useAppStore((s) => s.setNickname)
  const stamps = useAppStore((s) => s.stamps)
  const loading = useAppStore((s) => s.stampsLoading)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const removeStamp = useAppStore((s) => s.removeStamp)
  const [draft, setDraft] = useState(nickname)
  const [list, setList] = useState([]) // 도감의 전체 분량을 세려고 행사 목록을 받는다

  useEffect(() => { loadStamps() }, [nickname, loadStamps])
  useEffect(() => { fetchFestivals().then(setList).catch(() => {}) }, [])

  const col = useMemo(() => buildCollection(stamps, list), [stamps, list])
  const earned = col.badges.filter((b) => b.ok).length

  return (
    <Container>
      <PageHeader icon="patch-check" title="내 스탬프" sub="가본 축제·공연·전시에 스탬프를 찍고 도감과 배지를 모아요" />

      {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 필요해요.</Alert>}

      <Form
        className="mb-4"
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setNickname(draft) }}
      >
        <InputGroup>
          <InputGroup.Text>닉네임</InputGroup.Text>
          <Form.Control value={draft} maxLength={20} placeholder="예: 돌하르방" onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" disabled={!draft.trim() || draft.trim() === nickname}>
            {nickname ? '바꾸기' : '정하기'}
          </Button>
        </InputGroup>
        <Form.Text className="text-secondary">로그인 없이 닉네임으로 내 스탬프를 구분해요. 남긴 후기는 다른 사람에게도 보여요.</Form.Text>
      </Form>

      {!nickname && <Alert variant="secondary">닉네임을 정하면 내 스탬프가 보여요.</Alert>}
      {nickname && loading && <Spinner />}

      {nickname && !loading && (
        <>
          {/* ── 도감 ── */}
          <section className="mb-4">
            <h5 className="mb-1">
              축제 도감 <small className="text-secondary ms-1">{col.collected} / {col.total}</small>
            </h5>
            <ProgressBar now={col.total ? (col.collected / col.total) * 100 : 0} className="mb-3" style={{ height: 8 }} />
            <Row xs={1} md={3} className="g-3">
              {col.sections.map((sec) => (
                <Col key={sec.title}>
                  <Card className="h-100">
                    <Card.Body>
                      <div className="fw-semibold mb-2">{sec.title}</div>
                      {sec.rows.map((r) => (
                        <div key={r.key} className="mb-2">
                          <div className="d-flex justify-content-between small">
                            <span>{r.label}</span>
                            <span className="text-secondary">{r.have} / {r.total}</span>
                          </div>
                          <ProgressBar now={r.total ? (r.have / r.total) * 100 : 0} variant={r.have ? 'success' : 'secondary'} style={{ height: 6 }} />
                        </div>
                      ))}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          {/* ── 배지 ── */}
          <section className="mb-4">
            <h5 className="mb-2">배지 <small className="text-secondary ms-1">{earned} / {col.badges.length}</small></h5>
            <Row xs={2} md={5} className="g-2">
              {col.badges.map((b) => (
                <Col key={b.key}>
                  <Card className="h-100 text-center" style={{ opacity: b.ok ? 1 : 0.5 }}>
                    <Card.Body className="p-2">
                      <i className={`bi bi-${b.ok ? b.icon : 'lock'} fs-3 ${b.ok ? 'text-warning' : ''}`} />
                      <div className="small fw-semibold mt-1">{b.name}</div>
                      <div className="text-secondary" style={{ fontSize: '.7rem' }}>{b.desc}</div>
                      {!b.ok && b.need && <div className="small mt-1">{b.have} / {b.need}</div>}
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>

          {/* ── 내 스탬프 목록 ── */}
          <h5 className="mb-2">모은 스탬프 {stamps.length > 0 && <small className="text-secondary ms-1">{stamps.length}개</small>}</h5>
          {stamps.length === 0 && (
            <Alert variant="secondary">
              아직 스탬프가 없어요. <Link to="/festivals">축제·행사 페이지</Link>에서 첫 스탬프를 찍어 보세요!
            </Alert>
          )}
        </>
      )}

      <Row xs={1} md={2} className="g-3 pb-5">
        {stamps.map((s) => (
          <Col key={s.id}>
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <Card.Title className="fs-6">
                    <i className="bi bi-patch-check-fill text-success me-1" />
                    <Link to={`/festivals/${s.festival_id}`} className="text-reset">{s.festival_title}</Link>
                  </Card.Title>
                  <Button size="sm" variant="outline-danger" aria-label="삭제" onClick={() => removeStamp(s.id)}>
                    <i className="bi bi-trash" />
                  </Button>
                </div>
                {s.rating && <div className="mb-1"><Stars n={s.rating} /></div>}
                {s.comment && <Card.Text className="mb-1">{s.comment}</Card.Text>}
                <Card.Text className="small text-secondary mb-0">{new Date(s.created_at).toLocaleDateString('ko-KR')}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  )
}
