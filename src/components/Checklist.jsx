import { useEffect, useState } from 'react'
import { Form, ListGroup } from 'react-bootstrap'

// 가기 전 준비물 체크리스트. 체크 상태는 이 브라우저(localStorage)에 행사별로 저장한다.
// items: [{ key, text, why? }]
export default function Checklist({ id, items }) {
  const storeKey = `jeju-festa-checklist:${id}`
  const [done, setDone] = useState({})

  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem(storeKey)) ?? {}) } catch { setDone({}) }
  }, [storeKey])

  const toggle = (key) => {
    const next = { ...done, [key]: !done[key] }
    setDone(next)
    try { localStorage.setItem(storeKey, JSON.stringify(next)) } catch { /* 저장이 막혀도 체크는 동작한다 */ }
  }

  const left = items.filter((i) => !done[i.key]).length
  return (
    <div>
      <div className="small text-secondary mb-2">{left === 0 ? '준비 완료!' : `${left}개 남았어요`}</div>
      <ListGroup>
        {items.map((i) => (
          <ListGroup.Item key={i.key}>
            <Form.Check
              id={`chk-${id}-${i.key}`}
              type="checkbox"
              checked={Boolean(done[i.key])}
              onChange={() => toggle(i.key)}
              label={
                <span style={{ textDecoration: done[i.key] ? 'line-through' : 'none', opacity: done[i.key] ? 0.6 : 1 }}>
                  {i.text}
                  {i.why && <small className="text-secondary ms-2">{i.why}</small>}
                </span>
              }
            />
          </ListGroup.Item>
        ))}
      </ListGroup>
    </div>
  )
}
