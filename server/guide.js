// AI 가이드: Claude 가 우리 서버의 공공데이터(행사 목록·상세·날씨)를 도구로 골라 쓰며 답한다.
import Anthropic from '@anthropic-ai/sdk'
import { getEventDetail, searchEvents } from './events.js'
import { getWeather } from './weather.js'

export const MODEL = process.env.AI_GUIDE_MODEL || 'claude-opus-5-5'
// Haiku 는 거절 시 다른 모델로 넘기는 server-side fallback 을 지원하지 않아서(보내면 오류), 다른 모델일 때만 켠다
export const FALLBACK = !/haiku/i.test(MODEL)
const MAX_TURNS = 6 // 도구를 부르는 왕복은 최대 이만큼만

export const kstNow = () => new Date(Date.now() + 9 * 3600e3)
export const ymd = (d) => d.toISOString().slice(0, 10).replaceAll('-', '')
const statusOf = (f, today) => (f.end < today ? 'ended' : f.start > today ? 'upcoming' : 'ongoing')
export const fmt = (s) => `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}`

export const TOOLS = [
  {
    name: 'search_festivals',
    description:
      '제주의 축제·공연·전시·행사 목록에서 조건에 맞는 것을 찾는다. 날짜·지역·종류별 추천이나 "지금 뭐 해?" 같은 질문에 쓴다. 결과의 id 로 get_festival 을 불러 자세히 볼 수 있다.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '제목·장소·주소에 들어 있는 검색어 (예: 오름, 서귀포, 애월)' },
        month: { type: 'integer', minimum: 1, maximum: 12, description: '이 달에 열리는 행사만 (올해 기준)' },
        date: { type: 'string', description: 'YYYYMMDD — 이 날짜에 열리고 있는 행사만 (일정을 짤 때 하루씩 확인하는 데 쓴다)' },
        city: { type: 'string', enum: ['제주시', '서귀포시'] },
        group: { type: 'string', enum: ['축제', '공연', '전시', '행사'] },
        status: { type: 'string', enum: ['ongoing', 'upcoming', 'active'], description: 'ongoing=진행중, upcoming=곧 시작, active=진행중+예정(기본)' },
        limit: { type: 'integer', minimum: 1, maximum: 10 },
      },
    },
  },
  {
    name: 'get_festival',
    description: '행사 한 건의 상세정보(장소·연락처·요금·소개·홈페이지)를 가져온다.',
    input_schema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'search_festivals 결과의 id (예: cul-321668, std-abc, 140930)' } },
      required: ['id'],
    },
  },
  {
    name: 'get_weather',
    description: '제주시 또는 서귀포시의 앞으로 며칠 날씨(기온·강수확률·하늘)를 가져온다.',
    input_schema: {
      type: 'object',
      properties: { place: { type: 'string', enum: ['제주시', '서귀포시'] } },
    },
  },
]

// 사용자가 '내 일정'에 담아 둔 행사를 보는 도구 (담아 둔 id 는 화면이 서버에 함께 보내 준다)
const MY_PLAN_TOOL = {
  name: 'get_my_plan',
  description: '사용자가 "내 일정"에 미리 담아 둔 행사 목록을 본다. 일정·코스를 짜 달라는 요청에는 먼저 이것을 불러 담아 둔 행사가 있는지 확인한다.',
  input_schema: { type: 'object', properties: {} },
}

export async function runTool(name, input) {
  if (name === 'search_festivals') {
    const today = ymd(kstNow())
    const year = Number(today.slice(0, 4))
    const list = await searchEvents({ year })
    const q = (input.query ?? '').trim().toLowerCase()
    const status = input.status ?? 'active'
    const mStart = input.month ? `${year}${String(input.month).padStart(2, '0')}01` : ''
    const mEnd = input.month ? `${year}${String(input.month).padStart(2, '0')}31` : ''
    const date = /^\d{8}$/.test(input.date ?? '') ? input.date : ''
    const hits = list
      .filter((f) => {
        const st = statusOf(f, today)
        return (
          (!date || (f.start <= date && f.end >= date)) &&
          (!q || `${f.title} ${f.place} ${f.addr}`.toLowerCase().includes(q)) &&
          (!input.city || f.city === input.city) &&
          (!input.group || f.group === input.group) &&
          (!input.month || (f.start <= mEnd && f.end >= mStart)) &&
          (date || (status === 'ongoing' ? st === 'ongoing' : status === 'upcoming' ? st === 'upcoming' : st !== 'ended'))
        )
      })
      // 진행중(곧 끝나는 순) 먼저, 그다음 곧 시작하는 순
      .sort((a, b) => (statusOf(a, today) === 'ongoing' ? 0 : 1) - (statusOf(b, today) === 'ongoing' ? 0 : 1) || a.end.localeCompare(b.end))
    const limit = Math.min(10, input.limit ?? 6)
    return {
      total: hits.length,
      items: hits.slice(0, limit).map((f) => ({
        id: f.id, title: f.title, group: f.group, city: f.city, place: f.place,
        lat: f.lat ? Number(f.lat.toFixed(3)) : undefined, lng: f.lng ? Number(f.lng.toFixed(3)) : undefined, // 가까운 곳끼리 묶을 때 쓴다
        period: `${fmt(f.start)} ~ ${fmt(f.end)}`, status: statusOf(f, today),
      })),
    }
  }
  if (name === 'get_festival') {
    const d = await getEventDetail(String(input.id))
    return {
      id: d.id, title: d.title, group: d.group, period: `${fmt(d.start)} ~ ${fmt(d.end)}`, place: d.place, addr: d.addr,
      tel: d.tel, homepage: d.homepage, fee: d.fee, playtime: d.playtime, booking: d.booking,
      overview: (d.overview ?? '').slice(0, 700),
    }
  }
  if (name === 'get_weather') {
    return (await getWeather({ place: input.place ?? '제주시' })).slice(0, 5)
  }
  throw new Error(`알 수 없는 도구: ${name}`)
}

function systemPrompt(page, planCount) {
  const now = kstNow()
  const where = page?.path ? `사용자는 지금 "${page.path}" 화면을 보고 있어요${page.festivalId ? ` (행사 id: ${page.festivalId} — 이 행사에 대한 질문이면 get_festival 로 확인하세요)` : ''}.` : ''
  return `당신은 "제주 축제 달력" 사이트의 AI 가이드 "귤이"예요. 제주의 축제·공연·전시·행사를 찾고 여행 계획을 세우는 걸 도와요.

오늘은 ${ymd(now).replace(/(\d{4})(\d\d)(\d\d)/, '$1년 $2월 $3일')}(한국 시간)이에요. ${where}

규칙:
- 행사 이름·날짜·장소·요금 같은 사실은 반드시 도구로 확인한 값만 말하고, 없는 정보는 지어내지 말고 모른다고 하세요.
- 행사를 소개할 때는 [행사 제목](/festivals/행사id) 형태의 링크로 적어 주세요. id 는 도구 결과의 id 그대로 쓰고, 괄호 안에는 경로만 넣으세요(예: [제목](/festivals/123)). 지역·날짜 같은 설명은 링크 밖에 쓰세요.
- 답은 한국어로, 친근하고 짧게(보통 5줄 안팎). 추천은 2~4개로 줄이고 이유를 한 줄씩 붙이세요.
- 이 사이트에서는 행사 카드의 북마크로 "내 일정"에 담으면 지도에서 동선·도로 이동시간·카카오맵 대중교통 링크를 볼 수 있고, 가 본 곳에는 스탬프(로그인 필요)를 찍을 수 있어요. 필요하면 안내하세요.
- 일정·코스를 짜 달라는 요청이면 먼저 get_my_plan 으로 사용자가 "내 일정"에 담아 둔 행사를 확인하세요(지금 ${planCount}곳을 담아 두었어요).
  · 담아 둔 행사가 있고 요청한 날짜·지역과 관련이 있으면, 마음대로 넣지 말고 "내 일정에 담아 두신 ○○(날짜)도 포함할까요?"라고 먼저 물어보세요. 물어볼 때는 담아 둔 관련 행사를 한 번에 묶어 질문만 하고(일정 초안은 아직 보여 주지 마세요), 사용자의 답을 받은 뒤에 일정을 짜서 보여 주세요. 사용자가 이미 "내 일정 포함해서"처럼 말했다면 묻지 말고 바로 포함하세요.
  · 담아 둔 행사가 없거나 요청과 관련이 없으면 묻지 않고 바로 짜세요.
  · 일정 전체는 날짜별로 간단히(하루 2~3곳) 보여 주세요.
- 사용자에게 예·아니오나 둘 중 하나를 고르게 물을 때는 답변 맨 끝에 따로 한 줄로 [[선택: 보기1 | 보기2]] 를 붙이세요(예: [[선택: 네, 포함해 줘 | 아니요, 빼고 짜 줘]]). 화면에서 버튼으로 바뀌어요. 보기는 2~3개, 각 20자 안쪽으로 쓰세요.
- 제주 행사와 무관한 요청이나 사이트 사용법 밖의 일은 정중히 사양하세요.
- 이동시간은 실시간 교통을 반영하지 않으니, 실제 출발 전에 지도 앱으로 확인하라고 덧붙이세요.`
}

// messages: [{ role: 'user' | 'assistant', content: string }] → 답변 글자
export async function askGuide({ messages, page, plan = [] }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    const e = new Error('AI 가이드는 아직 준비 중이에요. 서버에 ANTHROPIC_API_KEY 가 설정되면 바로 쓸 수 있어요.')
    e.status = 503
    throw e
  }
  const client = new Anthropic()
  const convo = messages.map((m) => ({ role: m.role, content: m.content }))
  const tools = [...TOOLS, MY_PLAN_TOOL]

  // 담아 둔 행사를 우리 데이터에서 읽어 AI 에게 준다 (제목·기간은 데이터 값)
  const myPlan = async () => {
    if (plan.length === 0) return { count: 0, items: [], note: '담아 둔 행사가 없어요' }
    const today = ymd(kstNow())
    const all = await searchEvents({ year: Number(today.slice(0, 4)) })
    const byId = new Map(all.map((f) => [f.id, f]))
    const items = plan.map((id) => byId.get(id)).filter(Boolean).map((f) => ({
      id: f.id, title: f.title, group: f.group, city: f.city, place: f.place,
      period: `${fmt(f.start)} ~ ${fmt(f.end)}`, status: statusOf(f, today),
      lat: f.lat ? Number(f.lat.toFixed(3)) : undefined, lng: f.lng ? Number(f.lng.toFixed(3)) : undefined,
    }))
    return { count: items.length, items }
  }

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const res = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: systemPrompt(page, plan.length),
      tools,
      messages: convo,
      output_config: { effort: 'low' }, // 안내 챗봇은 빠르게 답하는 게 중요해서 낮게 둔다
      ...(FALLBACK && {
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default', // 안전 분류기가 요청을 거절하면 같은 호출 안에서 다른 모델이 이어 받는다
      }),
    })

    if (res.stop_reason === 'refusal') return '이 질문에는 답해 드리기 어려워요. 제주 행사나 여행 계획에 대해 물어봐 주세요.'
    if (res.stop_reason === 'max_tokens') return '답이 너무 길어져서 끊겼어요. 조금 더 구체적으로 다시 물어봐 주세요.'
    if (res.stop_reason !== 'tool_use') {
      const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim()
      return text || '답을 만들지 못했어요. 다시 한 번 물어봐 주세요.'
    }

    // 도구 호출: 같은 턴에 여러 개면 모두 실행해서 결과를 한 메시지에 담아 돌려준다
    convo.push({ role: 'assistant', content: res.content })
    const results = await Promise.all(
      res.content
        .filter((b) => b.type === 'tool_use')
        .map(async (b) => {
          try {
            const out = b.name === 'get_my_plan' ? await myPlan() : await runTool(b.name, b.input ?? {})
            return { type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(out) }
          } catch (e) {
            return { type: 'tool_result', tool_use_id: b.id, content: `오류: ${e.message}`, is_error: true }
          }
        }),
    )
    convo.push({ role: 'user', content: results })
  }
  return '조금 복잡한 질문이라 끝까지 찾지 못했어요. 질문을 나눠서 다시 물어봐 주세요.'
}
