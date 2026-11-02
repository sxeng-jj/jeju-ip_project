import { Button } from 'react-bootstrap'

// 한 줄 선택 칩. options: [{ value, label, count? }]
export default function Chips({ options, value, onChange, label }) {
  return (
    <div className="d-flex flex-wrap align-items-center gap-2">
      {label && <span className="small text-secondary me-1" style={{ minWidth: '2.5rem' }}>{label}</span>}
      {options.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={value === o.value ? 'primary' : 'outline-light'}
          className="rounded-pill"
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count !== undefined && <span className="ms-1 opacity-75">{o.count}</span>}
        </Button>
      ))}
    </div>
  )
}
