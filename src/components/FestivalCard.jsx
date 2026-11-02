import { Link } from 'react-router-dom'
import { Badge, Button, Card } from 'react-bootstrap'
import WeatherBadge from './WeatherBadge'
import { daysBetween, fmtYmd, statusOf, todayYmd } from '../lib/date'
import { GROUP_STYLE, typeOf, typeText } from '../lib/festivalMeta'
import { forecastFor } from '../lib/weather'

const STATUS = {
  ongoing: { bg: 'success', text: '진행중' },
  upcoming: { bg: 'info', text: '예정' },
  ended: { bg: 'secondary', text: '종료' },
}

export default function FestivalCard({ festival: f, weather, stamped, onStamp }) {
  const status = statusOf(f)
  const s = STATUS[status]
  const { group } = typeOf(f)
  const w = forecastFor(f, weather)

  // 진행중이면 종료까지, 예정이면 시작까지 남은 날
  const left = status === 'ongoing' ? daysBetween(todayYmd(), f.end) : status === 'upcoming' ? daysBetween(todayYmd(), f.start) : null
  const dday = left === null ? '' : status === 'ongoing' ? (left === 0 ? ' · 오늘 종료' : ` · ${left}일 후 종료`) : ` · ${left}일 후 시작`

  return (
    <Card className="h-100">
      {f.image ? (
        <Card.Img variant="top" src={f.image} alt={f.title} style={{ height: 180, objectFit: 'cover' }} loading="lazy" />
      ) : (
        <div className="d-flex align-items-center justify-content-center text-secondary" style={{ height: 180 }}>
          <i className={`bi bi-${GROUP_STYLE[group].icon} fs-1`} />
        </div>
      )}
      <Card.Body>
        <div className="d-flex flex-wrap gap-1 mb-2">
          <Badge bg={s.bg}>{s.text}{dday}</Badge>
          <Badge bg={GROUP_STYLE[group].bg} text={group === '행사' ? 'dark' : undefined}>{typeText(f)}</Badge>
        </div>
        <Card.Title className="fs-6">{f.title}</Card.Title>
        <Card.Text className="small mb-1">
          <i className="bi bi-calendar-event me-1" />{fmtYmd(f.start)} ~ {fmtYmd(f.end)}
        </Card.Text>
        <Card.Text className="small text-secondary mb-1">
          <i className="bi bi-geo-alt me-1" />{[f.city, f.area.endsWith('시내') ? '' : f.area, f.addr || f.place].filter(Boolean).join(' · ')}
        </Card.Text>
        {w && <WeatherBadge w={w} showDate />}
      </Card.Body>
      <Card.Footer className="bg-transparent border-0 pt-0 d-flex gap-2">
        <Link to={`/festivals/${f.id}`} className="btn btn-sm btn-primary">
          <i className="bi bi-info-circle me-1" />상세 보기
        </Link>
        {onStamp && (
          <Button size="sm" variant={stamped ? 'success' : 'outline-light'} onClick={() => onStamp(f)}>
            <i className={`bi bi-patch-check${stamped ? '-fill' : ''} me-1`} />
            {stamped ? '스탬프 완료' : '스탬프 찍기'}
          </Button>
        )}
      </Card.Footer>
    </Card>
  )
}
