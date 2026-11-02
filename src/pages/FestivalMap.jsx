import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Alert, Col, Container, Form, ListGroup, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import JejuMap from '../components/JejuMap'
import FestivalCard from '../components/FestivalCard'
import StampModal from '../components/StampModal'
import { fetchFestivals, fetchWeather } from '../api/client'
import { distKm, driveMinutes, fmtKm, transitUrl } from '../lib/geo'
import { fetchRoadRoute, fmtMin } from '../lib/roadRoute'
import { SEASONS, seasonColor } from '../lib/jeju'
import { daysBetween, fmtYmd, overlapsMonth, sortFestivals, statusOf, todayYmd } from '../lib/date'
import { GROUPS, typeOf } from '../lib/festivalMeta'
import { useNeedLogin } from '../lib/useNeedLogin'
import { useAppStore } from '../store/useAppStore'

const CITIES = ['제주시', '서귀포시']

// 지도에서 고를 수 있는 월: 이번 달부터 12개월. value 는 'YYYYMM', 올해가 아니면 라벨에 연도를 붙인다.
function upcomingMonths(today) {
  const y0 = Number(today.slice(0, 4))
  const m0 = Number(today.slice(4, 6))
  return Array.from({ length: 12 }, (_, i) => {
    const idx = m0 - 1 + i
    const y = y0 + Math.floor(idx / 12)
    const m = (idx % 12) + 1
    return { value: `${y}${String(m).padStart(2, '0')}`, y, m, label: y === y0 ? `${m}월` : `${y}년 ${m}월` }
  })
}

// 목록 한 줄 아래에 붙일 상태 글자: '진행중 · 3일 후 종료' / '예정 · 5일 후 시작' / '종료'
function statusText(f, today) {
  const st = statusOf(f, today)
  if (st === 'ended') return '종료'
  if (st === 'ongoing') {
    const left = daysBetween(today, f.end)
    return left === 0 ? '진행중 · 오늘 종료' : `진행중 · ${left}일 후 종료`
  }
  return `예정 · ${daysBetween(today, f.start)}일 후 시작`
}

// 제주 지도 — 축제·행사 핀을 누르면 그곳으로 이동하고 정보 카드가 나온다
export default function FestivalMap() {
  const [params] = useSearchParams()
  const today = todayYmd()
  const months = useMemo(() => upcomingMonths(today), [today])
  const [list, setList] = useState([])
  const [weather, setWeather] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [month, setMonth] = useState('') // '' = 전체 기간, 아니면 'YYYYMM'
  const [group, setGroup] = useState('all')
  const [status, setStatus] = useState('active') // active = 진행중·예정 | ongoing = 진행중만 | upcoming = 곧 시작만 (종료된 행사는 지도에서 뺀다)
  const [selected, setSelected] = useState(params.get('festival')) // ?festival=ID 로 바로 선택
  const [stampTarget, setStampTarget] = useState(null)

  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const user = useAppStore((s) => s.user)
  const needLogin = useNeedLogin()
  const plan = useAppStore((s) => s.plan)
  const togglePlan = useAppStore((s) => s.togglePlan)
  const clearPlan = useAppStore((s) => s.clearPlan)
  const reviews = useAppStore((s) => s.reviews)
  const loadReviews = useAppStore((s) => s.loadReviews)

  useEffect(() => { loadStamps() }, [user, loadStamps])
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

  const shown = useMemo(() => {
    const mo = months.find((x) => x.value === month)
    return sortFestivals(
      list.filter((f) => {
        const st = statusOf(f, today)
        return (
          (!mo || overlapsMonth(f, mo.y, mo.m)) &&
          (group === 'all' || typeOf(f).group === group) &&
          (status === 'ongoing' ? st === 'ongoing' : status === 'upcoming' ? st === 'upcoming' : st !== 'ended')
        )
      }),
    )
  }, [list, month, group, status, months, today])
  // 내 일정에 담았거나 지금 고른 행사는 필터에 걸려도 지도에 남긴다 (종료된 행사를 일정에 담았거나 링크로 들어온 경우 등)
  const onMap = useMemo(() => {
    const have = new Set(shown.map((f) => f.id))
    return [...shown, ...list.filter((f) => !have.has(f.id) && (plan.includes(f.id) || f.id === selected))]
  }, [shown, list, plan, selected])
  const current = onMap.find((f) => f.id === selected)

  // 내 일정: 담은 순서가 아니라 날짜 순서로 동선을 잇는다 (필터와 상관없이 목록 전체에서 찾는다)
  const route = useMemo(
    () => list.filter((f) => plan.includes(f.id)).sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title, 'ko')),
    [list, plan],
  )
  const legs = useMemo(() => route.slice(1).map((f, i) => distKm(route[i], f)), [route])
  const totalKm = legs.reduce((a, b) => a + b, 0)

  // 실제 도로 길로 잰 거리·시간 (실패하면 위의 직선 어림값으로 대신한다)
  const [road, setRoad] = useState({ key: '', status: 'idle', data: null })
  const routeKey = route.map((f) => f.id).join(',')
  useEffect(() => {
    if (route.length < 2) return undefined
    let alive = true
    fetchRoadRoute(route)
      .then((data) => alive && setRoad({ key: routeKey, status: 'ok', data }))
      .catch(() => alive && setRoad({ key: routeKey, status: 'error', data: null }))
    return () => { alive = false }
    // route 는 routeKey 가 바뀔 때만 달라진다
  }, [routeKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const roadOk = road.key === routeKey && road.status === 'ok' ? road.data : null
  const roadLoading = route.length > 1 && road.key !== routeKey
  const roadTotal = roadOk ? roadOk.legs.reduce((a, l) => ({ km: a.km + l.km, min: a.min + l.min }), { km: 0, min: 0 }) : null

  const stampOf = (f) => stamps.find((s) => s.festival_id === String(f.id))
  const openStamp = (f) =>
    user ? setStampTarget(f) : needLogin()

  return (
    <Container>
      <PageHeader icon="map" title="제주 지도" sub="핀을 누르면 정보가 나와요. 지도를 끌어 이동하고, 확대·축소할 수 있어요. 숫자는 같은 곳에 모인 행사예요." />

      <Row className="g-2 align-items-center mb-2">
        <Col xs="auto">
          <Form.Select size="sm" value={month} onChange={(e) => { setMonth(e.target.value); setSelected(null) }} aria-label="월 선택">
            <option value="">전체 기간</option>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Form.Select>
        </Col>
        <Col xs="auto">
          <Form.Select size="sm" value={status} onChange={(e) => { setStatus(e.target.value); setSelected(null) }} aria-label="진행 상태">
            <option value="active">진행중·예정</option>
            <option value="ongoing">진행중만</option>
            <option value="upcoming">곧 시작만</option>
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
          <div className="map-wrap">
            {loading && <div className="map-loading"><Spinner /></div>}
            <JejuMap festivals={onMap} selectedId={selected} onSelect={(f) => setSelected(f ? f.id : null)} route={route} roadPath={roadOk?.path} />
          </div>
          <p className="small text-secondary mt-2 mb-0">
            {shown.length}곳 · 핀 색은 시작 계절이에요. 이미 끝난 행사는 내 일정에 담았을 때만 어두운 핀으로 보여요.
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
                          <i className="bi bi-arrow-down me-1" />
                          {roadOk
                            ? <>도로 {fmtKm(roadOk.legs[i - 1].km)} · 차로 약 {fmtMin(roadOk.legs[i - 1].min)}</>
                            : <>직선 {fmtKm(legs[i - 1])} · 차로 약 {fmtMin(driveMinutes(legs[i - 1]))}{roadLoading && ' (도로 길 계산 중…)'}</>}
                          <a href={transitUrl(route[i - 1], f)} target="_blank" rel="noopener noreferrer" className="ms-2 text-nowrap">
                            <i className="bi bi-bus-front me-1" />버스·대중교통
                          </a>
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
                  <div className="small mt-2">
                    {roadTotal
                      ? <>총 도로 {fmtKm(roadTotal.km)} · 차로 약 {fmtMin(roadTotal.min)}</>
                      : <>총 직선 {fmtKm(totalKm)} · 차로 약 {fmtMin(driveMinutes(totalKm))}</>}
                  </div>
                )}
                <div className="small text-secondary">
                  {roadOk
                    ? '실제 도로 길(OpenStreetMap)로 잰 값이에요. 막히지 않을 때의 자동차 기준이라 실시간 교통은 반영하지 않아요.'
                    : road.key === routeKey && road.status === 'error'
                      ? '도로 길을 불러오지 못해 직선거리로 어림잡은 값을 보여줘요. 실제 도로·교통과 달라요.'
                      : route.length > 1 && '도로 길을 계산하는 동안 직선거리로 어림잡은 값을 보여줘요.'}
                </div>
              </>
            )}
          </div>

          {/* 핀이 겹쳐 있어도 여기서 고를 수 있다 */}
          {!loading && !error && shown.length === 0 && (
            <Alert variant="secondary" className="mt-3 small">조건에 맞는 진행중·예정 행사가 없어요. 기간이나 유형을 바꿔 보세요.</Alert>
          )}
          <ListGroup className="mt-3 map-list">
            {shown.map((f) => (
              <ListGroup.Item key={f.id} action active={f.id === selected} onClick={() => setSelected(f.id)} className="small py-2 d-flex gap-2 align-items-start">
                <i className="bi bi-circle-fill mt-1 flex-shrink-0" style={{ color: seasonColor(f.start), fontSize: '.7rem' }} />
                <span style={{ minWidth: 0 }}>
                  {f.title}
                  <span className="d-block opacity-75" style={{ fontSize: '.72rem' }}>{statusText(f, today)}</span>
                </span>
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
