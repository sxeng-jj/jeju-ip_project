import { Link } from 'react-router-dom'
import { Container } from 'react-bootstrap'

export default function NotFound() {
  return (
    <Container className="text-center py-5">
      <h1 className="display-4">404</h1>
      <p className="text-secondary">없는 페이지예요.</p>
      <Link to="/" className="btn btn-primary">홈으로</Link>
    </Container>
  )
}
