import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Container, ProgressBar, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import SafeBoundary from '../components/SafeBoundary'
import { fetchFestivals } from '../api/client'
import { buildCollection } from '../lib/badges'
import { hasWebGL } from '../lib/webgl'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const BadgeShelf3D = lazy(() => import('../components/BadgeShelf3D'))

const Stars = ({ n }) =>
  [1, 2, 3, 4, 5].map((i) => <i key={i} className={`bi bi-star${i <= n ? '-fill' : ''} text-warning me-1`} />)

// 내 스탬프·후기 + 도감 진행률과 배지 (로그인한 회원만)
export default function Stamps() {
  const user = useAppStore((s) => s.user)
  const nickname = useAppStore((s) => s.nickname)
  const authReady = useAppStore((s) => s.authReady)
  const stamps = useAppStore((s) => s.stamps)
  const loading = useAppStore((s) => s.stampsLoading)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const removeStamp = useAppStore((s) => s.removeStamp)
  const [list, setList] = useState([]) // 도감의 전체 분량을 세려고 행사 목록을 받는다

  useEffect(() => { loadStamps() }, [user, loadStamps])
  useEffect(() => { fetchFestivals().then(setList).catch(() => {}) }, [])

  const col = useMemo(() => buildCollection(stamps, list), [stamps, list])
  const earned = col.badges.filter((b) => b.ok).length
  const [gl] = useState(hasWebGL)
  const [selKey, setSelKey] = useState(null)
  // 고른 배지, 없으면 얻은 배지 중 첫 번째, 그것도 없으면 첫 배지
  const sel = col.badges.find((b) => b.key === selKey) ?? col.badges.find((b) => b.ok) ?? col.badges[0]

  const badgeGrid = (
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
  )

  return (
    <Container>
      <PageHeader icon="patch-check" title="내 스탬프" sub="가본 축제·공연·전시에 스탬프를 찍고 도감과 배지를 모아요" />

      {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 필요해요.</Alert>}

      {/* 저장된 로그인 상태를 확인하는 동안에는 '로그인하세요'를 보여주지 않는다 */}
      {!authReady && <Spinner />}

      {authReady && !user && (
        <Card className="text-center p-3 mb-4">
          <Card.Body>
            <i className="bi bi-person-lock display-4 text-warning" />
            <h5 className="mt-2">스탬프와 도감은 로그인 후에 이용할 수 있어요</h5>
            <p className="text-secondary small mb-3">내 계정에 스탬프·후기·배지가 저장되어, 다른 기기에서도 이어서 모을 수 있어요.</p>
            <div className="d-flex justify-content-center gap-2">
              <Link to="/login" state={{ from: '/stamps' }} className="btn btn-primary">로그인</Link>
              <Link to="/signup" state={{ from: '/stamps' }} className="btn btn-outline-primary">회원가입</Link>
            </div>
          </Card.Body>
        </Card>
      )}

      {user && (
        <p className="small text-secondary mb-3">
          <i className="bi bi-person-circle me-1 text-warning" /><strong className="text-body">{nickname}</strong>님의 스탬프 · {user.email}
          <span className="d-block">남긴 후기는 이 닉네임으로 다른 사람에게도 보여요.</span>
        </p>
      )}

      {user && loading && <Spinner />}

      {user && !loading && (
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
            {gl ? (
              <>
                <SafeBoundary fallback={badgeGrid}>
                  <Suspense fallback={<div className="shelf3d d-flex align-items-center justify-content-center"><Spinner /></div>}>
                    <BadgeShelf3D badges={col.badges} selectedKey={sel?.key} onSelect={setSelKey} />
                  </Suspense>
                  {sel && (
                    <Card className="mt-2">
                      <Card.Body className="d-flex align-items-center gap-3 py-2">
                        <span style={{ fontSize: '2rem' }}>{sel.ok ? sel.emoji : '🔒'}</span>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{sel.name} {sel.ok && <Badge bg="success">획득</Badge>}</div>
                          <div className="small text-secondary">
                            {sel.desc}{!sel.ok && sel.need ? ` · 진행 ${sel.have} / ${sel.need}` : ''}
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  )}
                  <details className="mt-2">
                    <summary className="small text-secondary">목록으로 보기</summary>
                    <div className="mt-2">{badgeGrid}</div>
                  </details>
                </SafeBoundary>
              </>
            ) : (
              badgeGrid
            )}
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
        {user && stamps.map((s) => (
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
