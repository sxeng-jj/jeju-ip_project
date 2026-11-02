import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { daysBetween, daysInMonth, fmtYmd, todayYmd, ymdOf } from '../lib/date'
import { GROUP_STYLE, typeOf, typeText } from '../lib/festivalMeta'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
const MAX_LANES = 3 // 한 주에 보여줄 막대 줄 수. 넘치면 날짜 칸에 '+N' 으로 알린다.
const LONG_DAYS = 14 // 이 일수를 넘게 이어지는 행사(상설 전시 등)는 막대 대신 '장기 진행' 목록으로 뺀다.
const PRIORITY = { 축제: 0, 행사: 1, 공연: 2, 전시: 3 } // 길이가 같을 때, 날짜 목록에서 먼저 보여줄 유형

const dowOf = (ymd) => new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)).getDay()
const dayLabel = (ymd) => `${+ymd.slice(4, 6)}월 ${+ymd.slice(6, 8)}일 (${DOW[dowOf(ymd)]})`
const byType = (a, b) => PRIORITY[typeOf(a).group] - PRIORITY[typeOf(b).group]

// 월간 달력. 짧은 행사만 막대로 그리고, 날짜를 누르면 그날의 모든 행사를 아래에 보여준다.
export default function MonthCalendar({ year, month, festivals }) {
  const [picked, setPicked] = useState(null) // 선택한 날 (YYYYMMDD)
  useEffect(() => { setPicked(null) }, [year, month])

  const today = todayYmd()
  const first = new Date(year, month - 1, 1).getDay() // 1일의 요일
  const total = daysInMonth(year, month)
  const rows = Math.ceil((first + total) / 7)

  const { short, long } = useMemo(() => {
    const isLong = (f) => daysBetween(f.start, f.end) + 1 > LONG_DAYS
    return { short: festivals.filter((f) => !isLong(f)), long: festivals.filter(isLong).sort(byType) }
  }, [festivals])

  const weeks = useMemo(
    () =>
      Array.from({ length: rows }, (_, w) => {
        // 이 주의 각 칸 → 날짜(YYYYMMDD). 이번 달 밖이면 null
        const cells = Array.from({ length: 7 }, (_, c) => {
          const day = w * 7 + c - first + 1
          return day >= 1 && day <= total ? { day, ymd: ymdOf(year, month, day) } : null
        })
        const inMonth = cells.filter(Boolean)
        const wFirst = inMonth[0].ymd
        const wLast = inMonth[inMonth.length - 1].ymd
        const startCol = (ymd) => cells.findIndex((x) => x && x.ymd >= ymd) // ymd 이후 첫 칸
        const endCol = (ymd) => 6 - [...cells].reverse().findIndex((x) => x && x.ymd <= ymd) // ymd 이전 마지막 칸

        const bars = short
          .filter((f) => f.start <= wLast && f.end >= wFirst)
          .map((f) => ({
            f,
            s: startCol(f.start < wFirst ? wFirst : f.start),
            e: endCol(f.end > wLast ? wLast : f.end),
            contL: f.start < wFirst, // 앞 주에서 이어짐
            contR: f.end > wLast, // 다음 주로 이어짐
          }))
          // 일찍 시작하고 긴 막대를 먼저 놓는다. 유형 순서를 앞세우면 주 내내 이어지는 막대가 맨 아래로 밀려 숨고,
          // 그 아래 빈 줄이 있는 날짜에도 '+N' 만 뜨는 어색한 모습이 된다. 유형은 길이가 같을 때만 따진다.
          .sort((a, b) => a.s - b.s || b.e - b.s - (a.e - a.s) || byType(a.f, b.f))

        // 줄 배정: 겹치지 않는 가장 윗줄에 놓는다
        const lanes = []
        for (const b of bars) {
          let i = lanes.findIndex((occ) => occ.slice(b.s, b.e + 1).every((x) => !x))
          if (i === -1) { lanes.push(Array(7).fill(false)); i = lanes.length - 1 }
          for (let c = b.s; c <= b.e; c++) lanes[i][c] = true
          b.lane = i
        }
        const hidden = Array(7).fill(0) // 줄이 모자라 못 그린 행사 수 (칸별)
        bars.filter((b) => b.lane >= MAX_LANES).forEach((b) => { for (let c = b.s; c <= b.e; c++) hidden[c]++ })
        return { cells, shown: bars.filter((b) => b.lane < MAX_LANES), hidden }
      }),
    [rows, first, total, year, month, short],
  )

  const pick = (ymd) => setPicked((p) => (p === ymd ? null : ymd))
  const dayList = picked ? festivals.filter((f) => f.start <= picked && f.end >= picked).sort(byType) : []

  return (
    <div>
      <div className="cal">
        <div className="cal-head">
          {DOW.map((d, i) => (
            <div key={d} className={i === 0 ? 'text-danger' : i === 6 ? 'text-info' : ''}>{d}</div>
          ))}
        </div>
        {weeks.map(({ cells, shown, hidden }, w) => (
          <div key={w} className="cal-week">
            <div className="cal-days">
              {cells.map((c, i) =>
                c ? (
                  <button
                    key={i}
                    type="button"
                    className={`cal-day${c.ymd === today ? ' today' : ''}${c.ymd === picked ? ' sel' : ''}`}
                    onClick={() => pick(c.ymd)}
                    aria-label={`${dayLabel(c.ymd)} 행사 보기`}
                    aria-pressed={c.ymd === picked}
                  >
                    {c.day}
                  </button>
                ) : (
                  <div key={i} className="cal-day off" />
                ),
              )}
            </div>
            <div className="cal-bars" style={{ '--lanes': MAX_LANES }}>
              {shown.map(({ f, s, e, contL, contR, lane }) => {
                const { group, label } = typeOf(f)
                return (
                  <Link
                    key={f.id}
                    to={`/festivals/${f.id}`}
                    className={`cal-bar${contL ? ' contL' : ''}${contR ? ' contR' : ''}`}
                    style={{ gridColumn: `${s + 1} / ${e + 2}`, gridRow: lane + 1, background: GROUP_STYLE[group].color, color: GROUP_STYLE[group].text }}
                    title={`${f.title} · ${label}`}
                  >
                    {f.title}
                  </Link>
                )
              })}
              {hidden.map((n, c) =>
                n > 0 && cells[c] ? (
                  <button
                    key={`more-${c}`}
                    type="button"
                    className="cal-more"
                    style={{ gridColumn: c + 1, gridRow: MAX_LANES + 1 }}
                    onClick={() => pick(cells[c].ymd)}
                    aria-label={`${dayLabel(cells[c].ymd)} 행사 ${n}건 더 보기`}
                  >
                    +{n}
                  </button>
                ) : null,
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="small text-secondary mt-2 mb-0">
        짧은 행사 {short.length}건을 막대로 보여줘요. 날짜를 누르면 그날 열리는 행사를 모두 볼 수 있어요.
      </p>

      {/* ── 선택한 날의 행사 ── */}
      {picked && (
        <div className="cal-panel mt-3">
          <h6 className="fw-bold mb-2">{dayLabel(picked)} · {dayList.length}건</h6>
          {dayList.length === 0 ? (
            <div className="small text-secondary">이 날 열리는 행사가 없어요.</div>
          ) : (
            dayList.map((f) => <CalItem key={f.id} f={f} />)
          )}
        </div>
      )}

      {/* ── 장기 진행(상설) ── */}
      {long.length > 0 && (
        <details className="cal-panel mt-3">
          <summary className="fw-semibold">
            장기 진행·상설 행사 {long.length}건 <span className="text-secondary small fw-normal">({LONG_DAYS}일 넘게 이어지는 행사)</span>
          </summary>
          <div className="mt-2">
            {long.map((f) => <CalItem key={f.id} f={f} />)}
          </div>
        </details>
      )}
    </div>
  )
}

// 목록 한 줄: 유형 색 점 · 제목 · 종류 · 기간 · 장소
function CalItem({ f }) {
  const { group } = typeOf(f)
  return (
    <Link to={`/festivals/${f.id}`} className="cal-item">
      <i className="bi bi-circle-fill" style={{ color: GROUP_STYLE[group].color }} />
      <span className="flex-grow-1" style={{ minWidth: 0 }}>
        <span className="d-block fw-semibold text-truncate">{f.title}</span>
        <span className="d-block small text-secondary text-truncate">
          {typeText(f)} · {fmtYmd(f.start)} ~ {fmtYmd(f.end)} · {f.addr || f.place || f.city}
        </span>
      </span>
    </Link>
  )
}
