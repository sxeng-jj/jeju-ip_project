import { Badge, Button, ListGroup } from 'react-bootstrap'
import { fmtDist } from '../lib/geo'
import { KIND_COLORS } from '../lib/jeju'

// 주변 장소 한 줄: [번호] 종류 · 이름 · 거리 · 스탬프 버튼
export default function SpotItem({ spot: s, index, stamped, onStamp }) {
  return (
    <ListGroup.Item className="d-flex align-items-center gap-3">
      {index !== undefined && (
        <span className="course-num flex-shrink-0">{index + 1}</span>
      )}
      {s.image ? (
        <img src={s.image} alt="" width={56} height={56} className="rounded flex-shrink-0" style={{ objectFit: 'cover' }} loading="lazy" />
      ) : (
        <span className="rounded d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: 56, height: 56, background: 'rgba(255,255,255,.12)' }}>
          <i className="bi bi-bank fs-4" />
        </span>
      )}
      <div className="flex-grow-1" style={{ minWidth: 0 }}>
        <div className="fw-semibold text-truncate">
          {s.title}
          {s.more > 0 && <small className="text-secondary ms-1">외 {s.more}건</small>}
        </div>
        <div className="small">
          <Badge bg="dark" style={{ borderLeft: `4px solid ${KIND_COLORS[s.kind]}` }}>{s.sub ?? s.kind}</Badge>
          <span className="text-secondary ms-2">{fmtDist(s.dist)}</span>
        </div>
      </div>
      {onStamp && (
        <Button size="sm" variant={stamped ? 'success' : 'outline-primary'} onClick={() => onStamp(s)} aria-label="스탬프">
          <i className={`bi bi-patch-check${stamped ? '-fill' : ''}`} />
        </Button>
      )}
    </ListGroup.Item>
  )
}
