import { useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Container, Form, InputGroup, Row, Spinner } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import { isSupabaseReady } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'

const Stars = ({ n }) =>
  [1, 2, 3, 4, 5].map((i) => <i key={i} className={`bi bi-star${i <= n ? '-fill' : ''} text-warning me-1`} />)

// STEP 5: 닉네임 정하기 + Supabase 에 저장된 내 스탬프·후기 조회
export default function Stamps() {
  const nickname = useAppStore((s) => s.nickname)
  const setNickname = useAppStore((s) => s.setNickname)
  const stamps = useAppStore((s) => s.stamps)
  const loading = useAppStore((s) => s.stampsLoading)
  const loadStamps = useAppStore((s) => s.loadStamps)
  const removeStamp = useAppStore((s) => s.removeStamp)
  const [draft, setDraft] = useState(nickname)

  useEffect(() => { loadStamps() }, [nickname, loadStamps])

  return (
    <Container>
      <PageHeader icon="patch-check" title="내 스탬프" sub="가본 축제에 스탬프를 찍고 별점·후기를 남겨요" />

      {!isSupabaseReady && <Alert variant="warning">Supabase 설정(.env.local)이 필요해요.</Alert>}

      <Form
        className="mb-4"
        onSubmit={(e) => { e.preventDefault(); if (draft.trim()) setNickname(draft) }}
      >
        <InputGroup>
          <InputGroup.Text>닉네임</InputGroup.Text>
          <Form.Control value={draft} maxLength={20} placeholder="예: 돌하르방" onChange={(e) => setDraft(e.target.value)} />
          <Button type="submit" disabled={!draft.trim() || draft.trim() === nickname}>
            {nickname ? '바꾸기' : '정하기'}
          </Button>
        </InputGroup>
        <Form.Text className="text-secondary">로그인 없이 닉네임으로 내 스탬프를 구분해요.</Form.Text>
      </Form>

      {!nickname && <Alert variant="secondary">닉네임을 정하면 내 스탬프가 보여요.</Alert>}
      {nickname && loading && <Spinner />}
      {nickname && !loading && stamps.length === 0 && (
        <Alert variant="secondary">아직 스탬프가 없어요. 축제 페이지에서 첫 스탬프를 찍어 보세요!</Alert>
      )}

      {nickname && stamps.length > 0 && <p className="text-secondary small">{stamps.length}개 모았어요</p>}

      <Row xs={1} md={2} className="g-3 pb-5">
        {stamps.map((s) => (
          <Col key={s.id}>
            <Card className="h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <Card.Title className="fs-6">
                    <i className="bi bi-patch-check-fill text-success me-1" />{s.festival_title}
                  </Card.Title>
                  <Button size="sm" variant="outline-danger" aria-label="삭제" onClick={() => removeStamp(s.id)}>
                    <i className="bi bi-trash" />
                  </Button>
                </div>
                {s.rating && <div className="mb-1"><Stars n={s.rating} /></div>}
                {s.comment && <Card.Text className="mb-1">{s.comment}</Card.Text>}
                <Card.Text className="small text-secondary mb-0">{new Date(s.created_at).toLocaleDateString('ko-KR')}</Card.Text>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  )
}
