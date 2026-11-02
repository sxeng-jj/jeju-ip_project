import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Col, Container, Form, ListGroup, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Jeju3D from '../components/Jeju3D'
import FestivalCard from '../components/FestivalCard'
import StampModal from '../components/StampModal'
import { fetchFestivals, fetchWeather } from '../api/client'
import { distKm, driveMinutes, fmtKm } from '../lib/geo'
import { SEASONS, seasonColor } from '../lib/jeju'
import { fmtYmd, overlapsMonth, sortFestivals, statusOf, todayYmd } from '../lib/date'
import { GROUPS, typeOf } from '../lib/festivalMeta'
import { useAppStore } from '../store/useAppStore'

const CITIES = ['제주시', '서귀포시']

// 3D 제주 지도 — 축제·행사 핀을 누르면 카메라가 다가가고 정보 카드가 나온다
export default function Map3D() {
  const [params] = useSearchParams()
  const thisYear = Number(todayYmd().slice(0, 4))
  const [list, setList] = useState([])
  const [weather, setWeather] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(0)
  const [group, setGroup] = useState('all')
  const [status, setStatus] = useState('active') // active = 진행중·예정 (전체를 켜면 핀이 너무 많아진다)
  const [selected, setSelected] = useState(params.get('festival')) // ?festival=ID 로 바로 선택
  const [stampTarget, setStampTarget] = useState(null)

  const nickname = useAppStore((s) => s.nickname)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const toast = useAppStore((s) => s.toast)
  const plan = useAppStore((s) => s.plan)
  const togglePlan = useAppStore((s) => s.togglePlan)
  const clearPlan = useAppStore((s) => s.clearPlan)
  const reviews = useAppStore((s) => s.reviews)
  const loadReviews = useAppStore((s) => s.loadReviews)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])
  useEffect(() => { loadReviews() }, [loadReviews])

  useEffect(() => {
    fetchFestivals()
      .then((d) => setList(d.filter((f) => f.lng && f.lat)))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    Promise.all(CITIES.map((c) => fetchWeather(c).then((d) => [c, d])))
      .then((pairs) => setWeather(Object.fromEntries(pairs)))
      .catch(() => {}) // 날씨는 없어도 지도는 보여준다
  }, [])

  const shown = useMemo(
    () =>
      sortFestivals(
        list.filter(
          (f) =>
            (month === 0 || overlapsMonth(f, thisYear, month)) &&
            (group === 'all' || typeOf(f).group === group) &&
            (status === 'all' || statusOf(f) !== 'ended'),
        ),
      ),
    [list, month, group, status, thisYear],
  )
  // 내 일정에 담았거나 지금 고른 행사는 필터에 걸려도 지도에 남긴다 (종료된 행사를 일정에 담은 경우 등)
  const onMap = useMemo(() => {
    const have = new Set(shown.map((f) => f.id))
    return [...shown, ...list.filter((f) => !have.has(f.id) && (plan.includes(f.id) || f.id === selected))]
  }, [shown, list, plan, selected])
  const current = onMap.find((f) => f.id === selected)
  const focus = useMemo(() => (current ? { lat: current.lat, lng: current.lng } : null), [current])

  // 내 일정: 담은 순서가 아니라 날짜 순서로 동선을 잇는다 (필터와 상관없이 목록 전체에서 찾는다)
  const route = useMemo(
    () => list.filter((f) => plan.includes(f.id)).sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title, 'ko')),
    [list, plan],
  )
  const legs = useMemo(() => route.slice(1).map((f, i) => distKm(route[i], f)), [route])
  const totalKm = legs.reduce((a, b) => a + b, 0)

  const stampOf = (f) => stamps.find((s) => s.festival_id === String(f.id))
  const openStamp = (f) =>
    nickname ? setStampTarget(f) : toast('먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요', 'warning')

  return (
    <Container>
      <PageHeader icon="globe-asia-australia" title="3D 제주 지도" sub="핀을 누르면 해당 축제·행사로 다가가요. 드래그로 지도를 돌릴 수 있어요." />

      <Row className="g-2 align-items-center mb-2">
        <Col xs="auto">
          <Form.Select size="sm" value={month} onChange={(e) => { setMonth(Number(e.target.value)); setSelected(null) }}>
            <option value={0}>전체 기간</option>
            {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}월</option>)}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select size="sm" value={status} onChange={(e) => { setStatus(e.target.value); setSelected(null) }}>
            <option value="active">진행중·예정</option>
            <option value="all">종료 포함 전체</option>
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select size="sm" value={group} onChange={(e) => { setGroup(e.target.value); setSelected(null) }}>
            <option value="all">전체 유형</option>
            {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
          </Form.Select>
        </Col>
        <Col className="small d-flex flex-wrap gap-3">
          {Object.values(SEASONS).map((s) => (
            <span key={s.label}><i className="bi bi-circle-fill me-1" style={{ color: s.color }} />{s.label}</span>
          ))}
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="g-3 pb-5">
        <Col lg={8}>
          <div className="map3d-wrap">
            {loading && <div className="map3d-loading"><Spinner /></div>}
            <Jeju3D festivals={onMap} selectedId={selected} onSelect={(f) => setSelected(f ? f.id : null)} focus={focus} route={route} />
          </div>
          <p className="small text-secondary mt-2 mb-0">
            {shown.length}곳 · 핀 색은 시작 계절, 밝게 빛나는 핀은 진행중·예정, 어두운 핀은 종료예요.
          </p>
        </Col>
        <Col lg={4}>
          {current ? (
            <>
              <FestivalCard festival={current} weather={weather} stamped={Boolean(stampOf(current))} onStamp={openStamp} review={reviews[current.id]} inPlan={plan.includes(current.id)} onPlan={togglePlan} />
              <Link to={`/festivals/${current.id}`} className="small d-block mt-2">상세정보 전체 보기 →</Link>
            </>
          ) : (
            <Alert variant="secondary">핀을 누르거나 아래 목록에서 골라 보세요.</Alert>
          )}

          {/* 내 일정: 카드의 북마크 버튼으로 담으면 날짜 순서대로 동선이 그려진다 */}
          <div className="mt-3">
            <div className="d-flex align-items-center small fw-semibold mb-1">
              <i className="bi bi-bookmark-check me-1" />내 일정 {route.length > 0 && <span className="text-secondary ms-1">{route.length}곳</span>}
              {route.length > 0 && <button type="button" className="btn btn-link btn-sm ms-auto p-0" onClick={clearPlan}>모두 비우기</button>}
            </div>
            {route.length === 0 ? (
              <div className="small text-secondary">행사 카드의 <i className="bi bi-bookmark-plus" /> 버튼으로 담으면 날짜 순서대로 동선과 이동 거리를 보여줘요.</div>
            ) : (
              <>
                <ListGroup>
                  {route.map((f, i) => (
                    <div key={f.id}>
                      {i > 0 && (
                        <div className="small text-secondary ps-4 py-1">
                          <i className="bi bi-arrow-down me-1" />직선 {fmtKm(legs[i - 1])} · 차로 약 {driveMinutes(legs[i - 1])}분
                        </div>
                      )}
                      <ListGroup.Item action onClick={() => setSelected(f.id)} className="small py-2 d-flex gap-2 align-items-start">
                        <span className="plan-num flex-shrink-0">{i + 1}</span>
                        <span>
                          {f.title}
                          <span className="d-block text-secondary">{fmtYmd(f.start)} ~ {fmtYmd(f.end)}</span>
                        </span>
                      </ListGroup.Item>
                    </div>
                  ))}
                </ListGroup>
                {route.length > 1 && (
                  <div className="small mt-2">총 직선 {fmtKm(totalKm)} · 차로 약 {driveMinutes(totalKm)}분</div>
                )}
                <div className="small text-secondary">직선거리로 어림잡은 값이에요. 실제 도로·교통과 달라요.</div>
              </>
            )}
          </div>

          {/* 핀이 겹쳐 있어도 여기서 고를 수 있다 */}
          <ListGroup className="mt-3 map3d-list">
            {shown.map((f) => (
              <ListGroup.Item key={f.id} action active={f.id === selected} onClick={() => setSelected(f.id)} className="small py-2">
                <i className="bi bi-circle-fill me-2" style={{ color: seasonColor(f.start), opacity: statusOf(f) === 'ended' ? 0.5 : 1 }} />
                {f.title}
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
      </Row>

      {stampTarget && (
        <StampModal festival={stampTarget} existing={stampOf(stampTarget)} onSave={saveStamp} onClose={() => setStampTarget(null)} />
      )}
    </Container>
  )
}
