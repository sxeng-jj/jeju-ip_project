import { useEffect, useState } from 'react'
import { Container } from 'react-bootstrap'
import PageHeader from '../components/PageHeader'
import Status from '../components/Status'
import { ping } from '../api/client'
import { supabase } from '../lib/supabase'

// 서버(/api)와 Supabase 연결이 되는지 확인하는 점검용 화면 (개발·배포 확인용, 방문자용 홈이 아님)
export default function ServiceStatus() {
  const [server, setServer] = useState({ state: 'loading' })
  const [db, setDb] = useState({ state: supabase ? 'loading' : 'off' })

  useEffect(() => {
    ping()
      .then((d) => setServer({ state: 'ok', detail: `공공데이터 키 ${d.hasDataKey ? '있음' : '없음'} · Claude 키 ${d.hasClaudeKey ? '있음' : '없음'}` }))
      .catch((e) => setServer({ state: 'fail', detail: e.message }))

    if (!supabase) return
    // 테이블이 아직 없어도 "연결 자체"는 확인할 수 있다 (PGRST205 = 테이블 없음)
    // (head 요청은 404 를 에러로 돌려주지 않아 오탐이 생기므로 limit(1) 조회를 쓴다)
    supabase.from('stamps').select('id').limit(1).then(({ error }) => {
      if (!error) setDb({ state: 'ok', detail: 'stamps 테이블 조회 성공' })
      else if (error.code === 'PGRST205') setDb({ state: 'ok', detail: '연결됨 (stamps 테이블은 아직 없음)' })
      else setDb({ state: 'fail', detail: error.message })
    })
  }, [])

  return (
    <Container>
      <PageHeader icon="activity" title="서비스 상태" sub="서버 함수와 데이터베이스 연결을 점검해요" />
      <ul className="list-group mb-5">
        <Status label="서버 함수 (/api/hello)" {...server} />
        <Status label="Supabase" {...db} />
      </ul>
    </Container>
  )
}
