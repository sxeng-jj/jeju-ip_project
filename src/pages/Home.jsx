import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Alert, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from 'react-bootstrap'
import FestivalCard from '../components/FestivalCard'
import WeatherBadge from '../components/WeatherBadge'
import { fetchFestivals, fetchWeather } from '../api/client'
import { overlapsMonth, sortFestivals, statusOf, todayYmd } from '../lib/date'
import { GROUP_STYLE, GROUPS, THEMES, typeOf } from '../lib/festivalMeta'
import { useAppStore } from '../store/useAppStore'

const CITIES = ['제주시', '서귀포시']

// 방문자가 처음 보는 화면: 검색 → 지금 볼 만한 행사 → 이번 달 → 관심사 → 내 스탬프
export default function Home() {
  const navigate = useNavigate()
  const today = todayYmd()
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(4, 6))

  const [list, setList] = useState([])
  const [weather, setWeather] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const user = useAppStore((s) => s.user)
  const nickname = useAppStore((s) => s.nickname)
  const authReady = useAppStore((s) => s.authReady)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)

  useEffect(() => { loadStamps() }, [user, loadStamps])

  useEffect(() => {
    fetchFestivals()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
    // 날씨는 없어도 홈은 보여준다
    Promise.all(CITIES.map((c) => fetchWeather(c).then((d) => [c, d])))
      .then((pairs) => setWeather(Object.fromEntries(pairs)))
      .catch(() => {})
  }, [])

  // sortFestivals: 진행중(곧 끝나는 순) → 예정(곧 시작하는 순) → 종료
  const sorted = useMemo(() => sortFestivals(list), [list])
  const ongoing = useMemo(() => sorted.filter((f) => statusOf(f) === 'ongoing'), [sorted])
  const upcoming = useMemo(() => sorted.filter((f) => statusOf(f) === 'upcoming'), [sorted])
  const thisMonth = useMemo(() => list.filter((f) => overlapsMonth(f, year, month)), [list, year, month])
  const countOf = (g) => thisMonth.filter((f) => typeOf(f).group === g).length

  const search = (e) => {
    e.preventDefault()
    navigate(q.trim() ? `/festivals?q=${encodeURIComponent(q.trim())}` : '/festivals')
  }

  return (
    <Container className="pb-4">
      {/* ── 첫 화면 ── */}
      <section className="festa-hero">
        <h1 className="display-5">제주의 축제·공연·전시, 한눈에</h1>
        <p className="lead text-secondary mb-4">지금 열리는 행사부터 이번 달 일정까지. 3D 지도로 찾고 스탬프를 모아요.</p>

        <Form onSubmit={search} className="mx-auto" style={{ maxWidth: 560 }}>
          <InputGroup size="lg">
            <Form.Control
              type="search"
              placeholder="행사 이름이나 지역으로 검색 (예: 오름, 서귀포, 애월)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="행사 검색"
            />
            <Button type="submit"><i className="bi bi-search me-1" />검색</Button>
          </InputGroup>
        </Form>

        <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
          <Link to="/festivals" className="btn btn-outline-primary"><i className="bi bi-grid me-1" />전체 일정</Link>
          <Link to="/festivals?view=calendar" className="btn btn-outline-primary"><i className="bi bi-calendar3 me-1" />이번 달 달력</Link>
          <Link to="/map" className="btn btn-outline-primary"><i className="bi bi-globe-asia-australia me-1" />3D 지도</Link>
        </div>
      </section>

      {/* ── 오늘 날씨 ── */}
      {CITIES.some((c) => weather[c]?.[0]) && (
        <div className="small p-2 px-3 mb-4 festa-weather text-center">
          <strong className="me-2">오늘 날씨</strong>
          {CITIES.map((c) => weather[c]?.[0] && <span key={c} className="me-3">{c} <WeatherBadge w={weather[c][0]} /></span>)}
        </div>
      )}

      {error && <Alert variant="danger">{error}</Alert>}
      {loading && <div className="text-center py-4"><Spinner /></div>}

      {!loading && !error && (
        <>
          {/* ── 지금 진행중 / 곧 시작 ── */}
          <Shelf title="지금 진행중" sub="곧 끝나는 순서" count={ongoing.length} to="/festivals?status=ongoing" empty="지금 진행 중인 행사가 없어요.">
            {ongoing.slice(0, 3).map((f) => <FestivalCard key={f.id} festival={f} weather={weather} />)}
          </Shelf>
          <Shelf title="곧 시작해요" sub="가까운 순서" count={upcoming.length} to="/festivals?status=upcoming" empty="예정된 행사가 아직 없어요.">
            {upcoming.slice(0, 3).map((f) => <FestivalCard key={f.id} festival={f} weather={weather} />)}
          </Shelf>

          {/* ── 이번 달 한눈에 ── */}
          <section className="mb-5">
            <h4 className="fw-bold mb-1">{month}월에는 이런 행사가 있어요</h4>
            <p className="text-secondary small">{month}월에 걸쳐 있는 행사 {thisMonth.length}건 · 유형을 누르면 달력으로 보여줘요</p>
            <Row xs={2} md={4} className="g-3">
              {GROUPS.map((g) => (
                <Col key={g}>
                  <Link to={`/festivals?group=${encodeURIComponent(g)}&view=calendar`} className="text-decoration-none">
                    <Card className="text-center h-100">
                      <Card.Body>
                        <i className={`bi bi-${GROUP_STYLE[g].icon} fs-3`} style={{ color: GROUP_STYLE[g].color }} />
                        <div className="display-6 fw-bold text-body">{countOf(g)}</div>
                        <div className="small text-secondary">{g}</div>
                      </Card.Body>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </section>

          {/* ── 관심사로 찾기 ── */}
          <section className="mb-5">
            <h4 className="fw-bold mb-3">어떤 행사를 찾으세요?</h4>
            <div className="d-flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <Link key={t.key} to={`/festivals?theme=${t.key}`} className="btn btn-outline-secondary rounded-pill">
                  <i className={`bi bi-${t.icon} me-1`} />{t.label}
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── 내 스탬프 ── */}
      <section className="mb-4">
        <Card className="festa-weather border-0">
          <Card.Body className="d-flex flex-wrap align-items-center gap-3">
            <i className="bi bi-patch-check display-6 text-warning" />
            <div className="flex-grow-1">
              {!authReady ? null : user ? (
                <>
                  <div className="fw-semibold">{nickname}님의 스탬프 {stamps.length}개</div>
                  <div className="small text-secondary">도감과 배지를 확인해 보세요.</div>
                </>
              ) : (
                <>
                  <div className="fw-semibold">스탬프를 모아 도감과 배지를 채워 보세요</div>
                  <div className="small text-secondary">가본 행사에 스탬프를 찍고 별점·후기를 남길 수 있어요. 로그인이 필요해요.</div>
                </>
              )}
            </div>
            {authReady && (user ? (
              <Link to="/stamps" className="btn btn-primary">내 스탬프 보기</Link>
            ) : (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-primary">로그인</Link>
                <Link to="/signup" className="btn btn-outline-primary">회원가입</Link>
              </div>
            ))}
          </Card.Body>
        </Card>
      </section>
    </Container>
  )
}

// 가로로 3장을 보여주는 한 묶음. children 은 카드 배열이다.
function Shelf({ title, sub, count, to, empty, children }) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <section className="mb-5">
      <div className="d-flex align-items-baseline gap-2 mb-2">
        <h4 className="fw-bold mb-0">{title}</h4>
        <span className="text-secondary small">{sub} · {count}건</span>
        {count > 0 && <Link to={to} className="ms-auto small">모두 보기 →</Link>}
      </div>
      {items.length === 0 ? (
        <Alert variant="secondary">{empty}</Alert>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-3">
          {items.map((card) => (
            <Col key={card.props.festival.id}>{card}</Col>
          ))}
        </Row>
      )}
    </section>
  )
}
