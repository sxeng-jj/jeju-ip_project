import { Badge, Spinner } from 'react-bootstrap'

// 연결 상태 한 줄: state = 'loading' | 'ok' | 'fail' | 'off'
const VIEW = {
  loading: { bg: 'secondary', text: '확인 중' },
  ok: { bg: 'success', text: '정상' },
  fail: { bg: 'danger', text: '실패' },
  off: { bg: 'warning', text: '미설정' },
}

export default function Status({ label, state, detail }) {
  const v = VIEW[state]
  return (
    <li className="list-group-item d-flex align-items-center justify-content-between">
      <span>
        {label}
        {detail && <small className="text-secondary ms-2">{detail}</small>}
      </span>
      <Badge bg={v.bg} text={v.bg === 'warning' ? 'dark' : undefined}>
        {state === 'loading' && <Spinner size="sm" className="me-1" />}
        {v.text}
      </Badge>
    </li>
  )
}
