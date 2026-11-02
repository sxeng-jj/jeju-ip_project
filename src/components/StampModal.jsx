import { useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'

// 별점 + 한 줄 후기를 받아 onSave 로 넘긴다. 이미 찍은 축제면 기존 값으로 시작.
export default function StampModal({ festival, existing, onSave, onClose }) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setSaving(true)
    await onSave(festival, { rating, comment })
    setSaving(false)
    onClose()
  }

  return (
    <Modal show onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="fs-5">{festival.title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className="btn btn-link p-0 me-1 fs-3 text-warning"
              aria-label={`${n}점`}
              onClick={() => setRating(n === rating ? 0 : n)}
            >
              <i className={`bi bi-star${n <= rating ? '-fill' : ''}`} />
            </button>
          ))}
        </div>
        <Form.Control
          as="textarea"
          rows={3}
          maxLength={200}
          placeholder="한 줄 후기 (선택)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Form.Text className="text-secondary">후기는 이 행사 페이지에서 다른 사람에게도 보여요.</Form.Text>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>취소</Button>
        <Button onClick={submit} disabled={saving}>
          <i className="bi bi-patch-check me-1" />{existing ? '수정하기' : '스탬프 찍기'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
