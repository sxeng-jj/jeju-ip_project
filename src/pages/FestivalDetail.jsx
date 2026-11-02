import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Badge, Button, Col, Container, ListGroup, Row, Spinner } from 'react-bootstrap'
import Checklist from '../components/Checklist'
import StampModal from '../components/StampModal'
import WeatherBadge from '../components/WeatherBadge'
import { fetchFestival, fetchFestivals, fetchWeather } from '../api/client'
import { fmtYmd, statusOf } from '../lib/date'
import { GROUP_STYLE, isOutdoor, SOURCES, THEME_BY_KEY, themesOf, typeOf, typeText } from '../lib/festivalMeta'
import { cityOf, forecastFor } from '../lib/weather'
import { useAppStore } from '../store/useAppStore'

const STATUS = { ongoing: ['success', '진행중'], upcoming: ['info', '예정'], ended: ['secondary', '종료'] }

// 준비물: 행사의 요금·연령·분류와 날씨 예보로 어림잡은 일반 안내다
function buildChecklist(d, w) {
  const items = [{ key: 'official', text: '공식 사이트에서 일정·요금 다시 확인', why: '일정이 바뀔 수 있어요' }]
  if (d.booking || d.homepage) items.push({ key: 'book', text: '사전 예약·신청이 필요한지 확인', why: d.booking?.split('\n')[0] })
  if (d.age || /할인|청소년|경로|우대/.test(d.fee)) items.push({ key: 'id', text: '신분증', why: '연령·할인 확인용' })
  if (d.fee && !d.fee.startsWith('무료')) items.push({ key: 'pay', text: '결제 수단 (카드·현금)' })
  if (isOutdoor(d)) items.push({ key: 'shoes', text: '편한 신발·겉옷', why: '야외에서 오래 걷거나 서 있을 수 있어요' })
  if (w && (w.rain !== '없음' || w.pop >= 60)) items.push({ key: 'rain', text: '우산·우비', why: `강수확률 ${w.pop}%` })
  if (themesOf(d).includes('night')) items.push({ key: 'warm', text: '따뜻한 겉옷', why: '밤에는 바닷바람이 차요' })
  items.push({ key: 'move', text: '주차·대중교통 확인' })
  return items
}

// 안내 한 줄 (값이 없으면 보여주지 않는다)
const Row2 = ({ icon, label, children }) =>
  children ? (
    <ListGroup.Item className="d-flex gap-3">
      <span className="text-secondary flex-shrink-0" style={{ width: '5.5rem' }}><i className={`bi bi-${icon} me-1`} />{label}</span>
      <span style={{ minWidth: 0, whiteSpace: 'pre-line' }}>{children}</span>
    </ListGroup.Item>
  ) : null

// 한 축제·행사의 상세정보: 소개·일시·장소·요금·주최·프로그램·사진
export default function FestivalDetail() {
  const { id } = useParams()
  const [d, setD] = useState(null)
  const [all, setAll] = useState([])
  const [weather, setWeather] = useState(null)
  const [photo, setPhoto] = useState(0)
  const [error, setError] = useState('')
  const [stampTarget, setStampTarget] = useState(null)

  const nickname = useAppStore((s) => s.nickname)
  const stamps = useAppStore((s) => s.stamps)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const saveStamp = useAppStore((s) => s.saveStamp)
  const toast = useAppStore((s) => s.toast)
  const reviews = useAppStore((s) => s.reviews)
  const loadReviews = useAppStore((s) => s.loadReviews)
  const plan = useAppStore((s) => s.plan)
  const togglePlan = useAppStore((s) => s.togglePlan)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])
  useEffect(() => { loadReviews() }, [loadReviews])

  useEffect(() => {
    setD(null); setError(''); setPhoto(0)
    window.scrollTo(0, 0)
    fetchFestival(id)
      .then((detail) => {
        setD(detail)
        fetchWeather(cityOf(detail)).then((days) => setWeather({ [cityOf(detail)]: days })).catch(() => {})
      })
      .catch((e) => setError(e.message))
    fetchFestivals().then(setAll).catch(() => {})
  }, [id])

  const status = d ? statusOf(d) : null
  const { group } = d ? typeOf(d) : {}
  const w = d && forecastFor(d, weather)
  const photos = d ? [d.image, ...d.images].filter((u, i, a) => u && a.indexOf(u) === i) : []

  // 같은 읍·면(없으면 같은 시)의 다른 행사
  const related = useMemo(() => {
    if (!d) return []
    const same = all.filter((f) => f.id !== d.id)
    const inArea = same.filter((f) => f.area === d.area)
    return (inArea.length ? inArea : same.filter((f) => f.city === d.city)).slice(0, 4)
  }, [all, d])

  const stamp = stamps.find((s) => s.festival_id === String(id))
  const listItem = all.find((f) => f.id === id) // 목록 쪽 정보 (출처 간 일정 불일치 등)
  const review = reviews[id]
  const checklist = useMemo(() => (d ? buildChecklist(d, w) : []), [d, w])
  const openStamp = () => (nickname ? setStampTarget({ id: d.id, title: d.title }) : toast('먼저 "내 스탬프" 페이지에서 닉네임을 정해 주세요', 'warning'))

  if (error) return <Container className="py-4"><Alert variant="danger">{error}</Alert><Link to="/festivals">← 목록으로</Link></Container>
  if (!d) return <Container className="py-5"><Spinner /></Container>

  return (
    <Container className="pb-5">
      <div className="py-3"><Link to="/festivals" className="btn btn-sm btn-outline-secondary"><i className="bi bi-arrow-left me-1" />축제·행사 목록</Link></div>

      <div className="d-flex flex-wrap gap-2 mb-2">
        <Badge bg={STATUS[status][0]}>{STATUS[status][1]}</Badge>
        <Badge bg={null} className="fw-semibold" style={{ background: GROUP_STYLE[group].color, color: GROUP_STYLE[group].text }}>{typeText(d)}</Badge>
        <Badge bg="secondary-subtle" text="secondary-emphasis">{d.city} {d.area.endsWith('시내') ? '' : d.area}</Badge>
        {themesOf(d).map((k) => <Badge key={k} bg="success-subtle" text="success-emphasis" className="fw-normal"><i className={`bi bi-${THEME_BY_KEY[k].icon} me-1`} />{THEME_BY_KEY[k].label}</Badge>)}
      </div>
      <h2 className="fw-bold">{d.title}</h2>
      <p className="text-secondary"><i className="bi bi-calendar-event me-1" />{fmtYmd(d.start)} ~ {fmtYmd(d.end)}</p>

      <Row className="g-4">
        <Col lg={6}>
          {photos.length > 0 ? (
            <>
              <img src={photos[photo]} alt={d.title} className="img-fluid rounded w-100 mb-2" style={{ maxHeight: 380, objectFit: 'cover' }} />
              {photos.length > 1 && (
                <div className="d-flex gap-2 flex-wrap">
                  {photos.map((u, i) => (
                    <img
                      key={u}
                      src={u}
                      alt=""
                      width={64}
                      height={48}
                      loading="lazy"
                      className="rounded"
                      style={{ objectFit: 'cover', cursor: 'pointer', opacity: i === photo ? 1 : 0.55, outline: i === photo ? '2px solid #fff' : 'none' }}
                      onClick={() => setPhoto(i)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded d-flex align-items-center justify-content-center text-secondary festa-photo-empty" style={{ height: 240 }}>
              <i className={`bi bi-${GROUP_STYLE[group].icon} display-3`} />
            </div>
          )}

          <div className="d-flex flex-wrap gap-2 mt-3">
            <Button variant={stamp ? 'success' : 'primary'} onClick={openStamp}>
              <i className={`bi bi-patch-check${stamp ? '-fill' : ''} me-1`} />{stamp ? '스탬프 완료 (수정)' : '스탬프 찍기'}
            </Button>
            {d.homepage && (
              <a className="btn btn-outline-secondary" href={d.homepage} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right me-1" />공식 사이트</a>
            )}
            <Button variant={plan.includes(id) ? 'warning' : 'outline-secondary'} onClick={() => togglePlan(id)}>
              <i className={`bi bi-bookmark-${plan.includes(id) ? 'check-fill' : 'plus'} me-1`} />{plan.includes(id) ? '내 일정에 담김' : '내 일정에 담기'}
            </Button>
            <Link to={`/map?festival=${d.id}`} className="btn btn-outline-secondary"><i className="bi bi-globe-asia-australia me-1" />3D 지도에서 보기</Link>
            {Number.isFinite(d.lat) && d.lat !== 0 && (
              <a className="btn btn-outline-secondary" target="_blank" rel="noreferrer" href={`https://map.kakao.com/link/map/${encodeURIComponent(d.title)},${d.lat},${d.lng}`}>
                <i className="bi bi-map me-1" />길찾기 지도
              </a>
            )}
          </div>

          {w && (
            <Alert variant="success" className="mt-3 mb-0">
              <div className="fw-semibold mb-1"><i className="bi bi-cloud-sun me-1" />행사 기간 날씨 (기상청)</div>
              <WeatherBadge w={w} showDate />
              {(w.rain !== '없음' || w.pop >= 60) && <div className="small mt-1">비 소식이 있어요. 우산을 챙기세요.</div>}
            </Alert>
          )}
        </Col>

        <Col lg={6}>
          {listItem?.conflicts && (
            <Alert variant="danger">
              <strong><i className="bi bi-exclamation-triangle me-1" />출처마다 일정이 달라요</strong>
              <div className="small mt-1">
                {SOURCES[d.source]}: {fmtYmd(d.start)} ~ {fmtYmd(d.end)}
                {listItem.conflicts.map((c) => <div key={c.source}>{SOURCES[c.source]}: {fmtYmd(c.start)} ~ {fmtYmd(c.end)}</div>)}
                <div className="mt-1">방문 전에 공식 사이트에서 확인하세요.</div>
              </div>
            </Alert>
          )}

          {(d.booking || d.homepage) && (
            <Alert variant="warning" className="mb-3">
              <div className="fw-semibold mb-1"><i className="bi bi-ticket-detailed me-1" />신청·예매</div>
              {d.fee && <div className="small mb-1" style={{ whiteSpace: 'pre-line' }}>요금: {d.fee}</div>}
              {d.booking && <div className="small mb-1" style={{ whiteSpace: 'pre-line' }}>예매·접수: {d.booking}</div>}
              {d.homepage ? (
                <a className="btn btn-sm btn-primary mt-1" href={d.homepage} target="_blank" rel="noreferrer"><i className="bi bi-box-arrow-up-right me-1" />공식 사이트에서 신청·예매 확인</a>
              ) : (
                <div className="small text-secondary">온라인 신청 링크는 제공되지 않아요. 문의처로 확인하세요.</div>
              )}
            </Alert>
          )}

          <ListGroup className="mb-3">
            <Row2 icon="clock" label="운영 시간">{d.playtime}</Row2>
            <Row2 icon="geo-alt" label="장소">{d.place}</Row2>
            <Row2 icon="signpost" label="주소">{d.addr}</Row2>
            <Row2 icon="info-circle" label="장소 안내">{d.placeInfo}</Row2>
            <Row2 icon="ticket-perforated" label="이용 요금">{d.fee}</Row2>
            <Row2 icon="person" label="연령">{d.age}</Row2>
            <Row2 icon="bookmark-check" label="예매·접수">{d.booking}</Row2>
            <Row2 icon="people" label="주최·주관">
              {d.sponsor.length > 0 && d.sponsor.map(([name, tel]) => (tel ? `${name} (${tel})` : name)).join('\n')}
            </Row2>
            <Row2 icon="telephone" label="문의">{d.tel}</Row2>
            <Row2 icon="link-45deg" label="홈페이지">
              {d.homepage && <a href={d.homepage} target="_blank" rel="noreferrer">{d.homepage}</a>}
            </Row2>
          </ListGroup>
        </Col>
      </Row>

      {d.overview && (
        <section className="mt-4">
          <h5>소개</h5>
          <p style={{ whiteSpace: 'pre-line' }}>{d.overview}</p>
        </section>
      )}
      {d.program && (
        <section className="mt-4">
          <h5>프로그램</h5>
          <p style={{ whiteSpace: 'pre-line' }}>{d.program}</p>
        </section>
      )}
      {d.subevent && (
        <section className="mt-4">
          <h5>부대행사</h5>
          <p style={{ whiteSpace: 'pre-line' }}>{d.subevent}</p>
        </section>
      )}

      <section className="mt-5">
        <h5>가기 전 준비물</h5>
        <Checklist id={d.id} items={checklist} />
      </section>

      <section className="mt-5">
        <h5>
          방문 후기
          {review?.avg && <small className="ms-2 text-warning"><i className="bi bi-star-fill me-1" />{review.avg.toFixed(1)}</small>}
          {review?.count > 0 && <small className="ms-2 text-secondary">{review.count}개</small>}
        </h5>
        <p className="small text-secondary">스탬프를 찍은 사람이 남긴 후기예요. 현장 인증을 거친 후기는 아니에요.</p>
        {review?.items.some((r) => r.comment) ? (
          <ListGroup>
            {review.items.filter((r) => r.comment).slice(0, 10).map((r, i) => (
              <ListGroup.Item key={i}>
                <div className="small mb-1">
                  <strong>{r.nickname}</strong>
                  {r.rating && <span className="ms-2 text-warning">{'★'.repeat(r.rating)}</span>}
                  <span className="ms-2 text-secondary">{new Date(r.created_at).toLocaleDateString('ko-KR')}</span>
                </div>
                <div style={{ whiteSpace: 'pre-line' }}>{r.comment}</div>
              </ListGroup.Item>
            ))}
          </ListGroup>
        ) : (
          <Alert variant="secondary" className="d-flex justify-content-between align-items-center">
            <span>아직 후기가 없어요. 첫 후기를 남겨 보세요!</span>
            <Button size="sm" onClick={openStamp}>스탬프 찍고 후기 남기기</Button>
          </Alert>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-5">
          <h5>{d.area.endsWith('시내') && related.every((f) => f.city === d.city && f.area !== d.area) ? `${d.city}의 다른 행사` : `${d.area}의 다른 행사`}</h5>
          <ListGroup>
            {related.map((f) => (
              <ListGroup.Item key={f.id} action as={Link} to={`/festivals/${f.id}`} className="d-flex justify-content-between">
                <span>{f.title}</span>
                <small className="text-secondary">{fmtYmd(f.start)} ~ {fmtYmd(f.end)}</small>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </section>
      )}

      <div className="small text-secondary mt-5">
        <div>데이터 출처: {SOURCES[d.source] ?? '공공데이터포털'} · 정보 기준일: {d.updated ? fmtYmd(d.updated) : '제공되지 않음'}</div>
        <div>일정·요금·장소는 주최 측 사정으로 바뀔 수 있어요. 방문 전에 공식 사이트나 문의처에서 다시 확인하세요.</div>
      </div>

      {stampTarget && <StampModal festival={stampTarget} existing={stamp} onSave={saveStamp} onClose={() => setStampTarget(null)} />}
    </Container>
  )
}
