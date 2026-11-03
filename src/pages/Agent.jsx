import { Button, Container } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'

// AI 가이드는 어느 화면에서든 오른쪽 아래 버튼으로 열 수 있다 (components/GuideWidget.jsx). 이 화면은 사용법 안내.
export default function Agent() {
  return (
    <Container>
      <PageHeader icon="robot" title="AI 가이드" sub="궁금한 걸 물어보면 제주 행사 데이터와 날씨를 직접 찾아 답해요" />
      <ul className="mb-4">
        <li>"이번 주말에 서귀포에서 할 만한 행사 알려줘"처럼 편하게 물어보세요.</li>
        <li>행사 상세 화면에서 열면 지금 보고 있는 행사를 알고 있어서 "이 행사 요약해줘"라고만 해도 돼요.</li>
        <li>답변 속 행사 이름을 누르면 상세 화면으로 이동해요.</li>
        <li>화면 오른쪽 아래 <strong>AI 가이드</strong> 버튼으로 어느 화면에서든 열 수 있어요.</li>
      </ul>
      <Button onClick={() => window.dispatchEvent(new Event('open-guide'))}>
        <i className="bi bi-chat-dots me-2" />AI 가이드 열기
      </Button>
    </Container>
  )
}
