import { Badge, Button, Card } from 'react-bootstrap'
import WeatherBadge from './WeatherBadge'
import { fmtYmd, statusOf } from '../lib/date'
import { forecastFor } from '../lib/weather'

const STATUS = {
  ongoing: { bg: 'success', text: '진행중' },
  upcoming: { bg: 'info', text: '예정' },
  ended: { bg: 'secondary', text: '종료' },
}

export default function FestivalCard({ festival: f, weather, stamped, onStamp }) {
  const s = STATUS[statusOf(f)]
  const w = forecastFor(f, weather)
  return (
    <Card className="h-100">
      {f.image ? (
        <Card.Img variant="top" src={f.image} alt={f.title} style={{ height: 180, objectFit: 'cover' }} loading="lazy" />
      ) : (
        <div className="d-flex align-items-center justify-content-center text-secondary" style={{ height: 180 }}>
          <i className="bi bi-image fs-1" />
        </div>
      )}
      <Card.Body>
        <Badge bg={s.bg} className="mb-2">{s.text}</Badge>
        <Card.Title className="fs-6">{f.title}</Card.Title>
        <Card.Text className="small mb-1">
          <i className="bi bi-calendar-event me-1" />{fmtYmd(f.start)} ~ {fmtYmd(f.end)}
        </Card.Text>
        <Card.Text className="small text-secondary mb-1">
          <i className="bi bi-geo-alt me-1" />{f.addr}
        </Card.Text>
        {w && <WeatherBadge w={w} showDate />}
      </Card.Body>
      {onStamp && (
        <Card.Footer className="bg-transparent border-0 pt-0">
          <Button size="sm" variant={stamped ? 'success' : 'outline-primary'} onClick={() => onStamp(f)}>
            <i className={`bi bi-patch-check${stamped ? '-fill' : ''} me-1`} />
            {stamped ? '스탬프 완료' : '스탬프 찍기'}
          </Button>
        </Card.Footer>
      )}
    </Card>
  )
}
