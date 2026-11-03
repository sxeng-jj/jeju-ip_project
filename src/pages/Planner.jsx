import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Badge, Button, Card, Col, Container, Form, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { fetchFestivals, post } from '../api/client'
import { fmtYmd, todayYmd } from '../lib/date'
import { GROUP_STYLE, GROUPS } from '../lib/festivalMeta'
import { useAppStore } from '../store/useAppStore'

const iso = (ymd) => `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`
const addDays = (isoDate, n) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * 86400e3).toISOString().slice(0, 10)
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const dayLabel = (ymd) => {
  const d = new Date(Date.parse(`${iso(ymd)}T00:00:00Z`))
  return `${Number(ymd.slice(4, 6))}월 ${Number(ymd.slice(6, 8))}일 (${WEEK[d.getUTCDay()]})`
}

// AI 여행 일정: 날짜·지역·관심 유형·이동수단을 고르면 하루씩 코스를 짜 주고, 결과를 내 일정에 한 번에 담을 수 있다.
// (오른쪽 아래 AI 가이드 대화창은 질문에 답하는 용도이고, 이 화면은 여러 날짜에 걸친 코스를 만들어 저장하는 용도예요.)
export default function Planner() {
  const today = iso(todayYmd())
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState(addDays(today, 1))
  const [city, setCity] = useState('')
  const [groups, setGroups] = useState([])
  const [transport, setTransport] = useState('car')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [plan, setPlan] = useState(null)
  const [useSaved, setUseSaved] = useState(true) // 내 일정에 담은 행사를 반영할지
  const [titles, setTitles] = useState({}) // id → 제목 (담아 둔 행사 이름을 보여 주려고)

  const myPlan = useAppStore((s) => s.plan)
  const togglePlan = useAppStore((s) => s.togglePlan)
  const addToPlan = useAppStore((s) => s.addToPlan)

  useEffect(() => {
    if (myPlan.length === 0) return
    fetchFestivals().then((list) => setTitles(Object.fromEntries(list.map((f) => [f.id, f.title])))).catch(() => {})
  }, [myPlan.length])

  const ids = useMemo(() => (plan ? plan.days.flatMap((d) => d.items.map((i) => i.id)) : []), [plan])
  const allSaved = ids.length > 0 && ids.every((id) => myPlan.includes(id))

  const onStart = (v) => {
    setStart(v)
    // 끝나는 날이 시작하는 날보다 빠르거나 5일을 넘으면 맞춰 준다
    if (end < v || end > addDays(v, 4)) setEnd(v)
  }
  const toggleGroup = (g) => setGroups((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setPlan(null)
    try {
      setPlan(await post('/api/plan', { startDate: start, endDate: end, city, groups, transport, note, savedIds: useSaved ? myPlan : [] }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container className="pb-5">
      <PageHeader icon="calendar2-heart" title="AI 여행 일정" sub="날짜와 취향을 고르면 귤이가 열리는 행사로 하루씩 코스를 짜 줘요. 마음에 들면 내 일정에 한 번에 담아요." />

      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={submit}>
            <Row className="g-3">
              <Col xs={6} md={3}>
                <Form.Label className="small fw-semibold mb-1">시작하는 날</Form.Label>
                <Form.Control type="date" size="sm" value={start} min={today} onChange={(e) => e.target.value && onStart(e.target.value)} required />
              </Col>
              <Col xs={6} md={3}>
                <Form.Label className="small fw-semibold mb-1">끝나는 날 <span className="text-secondary fw-normal">(최대 5일)</span></Form.Label>
                <Form.Control type="date" size="sm" value={end} min={start} max={addDays(start, 4)} onChange={(e) => e.target.value && setEnd(e.target.value)} required />
              </Col>
              <Col xs={6} md={3}>
                <Form.Label className="small fw-semibold mb-1">지역</Form.Label>
                <Form.Select size="sm" value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">제주시·서귀포시 모두</option>
                  <option value="제주시">제주시</option>
                  <option value="서귀포시">서귀포시</option>
                </Form.Select>
              </Col>
              <Col xs={6} md={3}>
                <Form.Label className="small fw-semibold mb-1">이동수단</Form.Label>
                <Form.Select size="sm" value={transport} onChange={(e) => setTransport(e.target.value)}>
                  <option value="car">자차</option>
                  <option value="bus">대중교통 (이동 적게)</option>
                </Form.Select>
              </Col>
              <Col xs={12}>
                <div className="small fw-semibold mb-1">관심 있는 유형 <span className="text-secondary fw-normal">(고르지 않으면 전체)</span></div>
                <div className="d-flex flex-wrap gap-2">
                  {GROUPS.map((g) => {
                    const on = groups.includes(g)
                    return (
                      <Button key={g} size="sm" variant={on ? 'primary' : 'outline-secondary'} onClick={() => toggleGroup(g)} aria-pressed={on} type="button">
                        <i className={`bi bi-${GROUP_STYLE[g].icon} me-1`} />{g}
                      </Button>
                    )
                  })}
                </div>
              </Col>
              {myPlan.length > 0 && (
                <Col xs={12}>
                  <Form.Check
                    type="checkbox"
                    id="use-saved"
                    checked={useSaved}
                    onChange={(e) => setUseSaved(e.target.checked)}
                    label={<span className="small fw-semibold">내 일정에 담은 {myPlan.length}곳을 일정에 넣고, 그 근처로 나머지를 짜 줘요</span>}
                  />
                  {useSaved && (
                    <div className="small text-secondary ms-4">
                      {myPlan.slice(0, 4).map((id) => titles[id] ?? '불러오는 중…').join(' · ')}{myPlan.length > 4 && ` 외 ${myPlan.length - 4}곳`}
                    </div>
                  )}
                </Col>
              )}
              <Col xs={12}>
                <Form.Label className="small fw-semibold mb-1">더 바라는 점 <span className="text-secondary fw-normal">(선택)</span></Form.Label>
                <Form.Control size="sm" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="예: 아이와 함께, 비 오면 실내 위주로, 조용한 곳 위주로" />
              </Col>
              <Col xs={12}>
                <Button type="submit" disabled={loading}>
                  {loading
                    ? <><Spinner size="sm" className="me-2" />귤이가 일정을 짜는 중… (20~40초)</>
                    : <><i className="bi bi-stars me-2" />일정 만들어줘</>}
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {plan && (
        <section aria-live="polite">
          <div className="d-flex flex-wrap align-items-start gap-2 mb-2">
            <div className="me-auto">
              <h3 className="h4 fw-bold mb-1">{plan.title}</h3>
              <p className="mb-0">{plan.summary}</p>
            </div>
            {ids.length > 0 && (
              <div className="d-flex flex-wrap gap-2">
                <Button variant={allSaved ? 'success' : 'primary'} onClick={() => addToPlan(ids)} disabled={allSaved}>
                  <i className={`bi bi-${allSaved ? 'check2-circle' : 'bookmark-plus'} me-1`} />{allSaved ? '내 일정에 담았어요' : `전체 ${ids.length}곳 내 일정에 담기`}
                </Button>
                <Link to="/map" className="btn btn-outline-primary"><i className="bi bi-map me-1" />지도에서 동선 보기</Link>
              </div>
            )}
          </div>

          {(plan.savedUsed > 0 || plan.skippedSaved?.length > 0) && (
            <Alert variant="info" className="small py-2 mt-2 mb-0">
              <i className="bi bi-bookmark-star me-1" />
              {plan.savedUsed > 0 && <>내 일정에 담은 {plan.savedUsed}곳을 넣어 짰어요. </>}
              {plan.skippedSaved.length > 0 && <>넣지 못한 곳: {plan.skippedSaved.map((s) => `${s.title}(${s.reason})`).join(', ')}</>}
            </Alert>
          )}

          {plan.days.map((d, di) => (
            <div key={d.date} className="mt-4">
              <h4 className="h6 fw-bold mb-2">
                <Badge bg="" className="me-2" style={{ background: 'var(--jeju-green)' }}>{di + 1}일차</Badge>
                {dayLabel(d.date)}
                {d.theme && <span className="text-secondary fw-normal"> · {d.theme}</span>}
              </h4>
              {d.items.length === 0 ? (
                <div className="small text-secondary ps-1">이날은 조건에 맞는 행사를 찾지 못했어요. 자유 일정으로 쉬어 가요.</div>
              ) : (
                d.items.map((it, i) => {
                  const g = GROUP_STYLE[it.group] ?? GROUP_STYLE.행사
                  const saved = myPlan.includes(it.id)
                  return (
                    <Card key={it.id} className="mb-2">
                      <Card.Body className="py-2 d-flex gap-2 align-items-start">
                        <span className="plan-num flex-shrink-0">{i + 1}</span>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="fw-semibold">
                            <Link to={`/festivals/${it.id}`}>{it.title}</Link>
                            <Badge bg="" className="ms-2" style={{ background: g.color, color: g.text }}>{it.group}</Badge>
                            {it.fromPlan && <Badge bg="warning" text="dark" className="ms-1"><i className="bi bi-bookmark-star-fill me-1" />내 일정</Badge>}
                          </div>
                          <div className="small text-secondary">{[it.place, it.city].filter(Boolean).join(' · ')} · {fmtYmd(it.start)} ~ {fmtYmd(it.end)}</div>
                          <div className="small mt-1"><i className="bi bi-chat-heart me-1 text-warning" />{it.why}</div>
                        </div>
                        <div className="d-flex flex-column gap-1 flex-shrink-0">
                          <Button size="sm" variant={saved ? 'success' : 'outline-primary'} onClick={() => togglePlan(it.id)} aria-label={saved ? '내 일정에서 빼기' : '내 일정에 담기'}>
                            <i className={`bi bi-${saved ? 'bookmark-check-fill' : 'bookmark-plus'}`} />
                          </Button>
                          <Link to={`/map?festival=${it.id}`} className="btn btn-sm btn-outline-secondary" aria-label="지도에서 보기"><i className="bi bi-geo-alt" /></Link>
                        </div>
                      </Card.Body>
                    </Card>
                  )
                })
              )}
            </div>
          ))}

          {plan.tips.length > 0 && (
            <Alert variant="light" className="mt-4 small">
              <div className="fw-semibold mb-1"><i className="bi bi-lightbulb me-1" />여행 팁</div>
              <ul className="mb-0 ps-3">{plan.tips.map((t) => <li key={t}>{t}</li>)}</ul>
            </Alert>
          )}
          {plan.dropped > 0 && <div className="small text-secondary mt-2">확인되지 않은 행사 {plan.dropped}건은 일정에서 뺐어요.</div>}
        </section>
      )}
    </Container>
  )
}
