import { Link } from 'react-router-dom'
import { daysInMonth, todayYmd, ymdOf } from '../lib/date'
import { GROUP_STYLE, typeOf } from '../lib/festivalMeta'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

// 월간 달력: 주(週)마다 행사 기간을 가로 막대로 그린다. 막대가 겹치면 CSS grid 가 알아서 아래 줄로 내린다.
export default function MonthCalendar({ year, month, festivals }) {
  const first = new Date(year, month - 1, 1).getDay() // 1일의 요일
  const total = daysInMonth(year, month)
  const rows = Math.ceil((first + total) / 7)
  const today = todayYmd()

  const weeks = Array.from({ length: rows }, (_, w) => {
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

    const bars = festivals
      .filter((f) => f.start <= wLast && f.end >= wFirst)
      .map((f) => ({
        f,
        s: startCol(f.start < wFirst ? wFirst : f.start),
        e: endCol(f.end > wLast ? wLast : f.end),
        contL: f.start < wFirst, // 앞 주에서 이어짐
        contR: f.end > wLast, // 다음 주로 이어짐
      }))
      .sort((a, b) => a.s - b.s || b.e - a.e)
    return { cells, bars }
  })

  return (
    <div className="cal">
      <div className="cal-head">
        {DOW.map((d, i) => (
          <div key={d} className={i === 0 ? 'text-danger' : i === 6 ? 'text-info' : ''}>{d}</div>
        ))}
      </div>
      {weeks.map(({ cells, bars }, w) => (
        <div key={w} className="cal-week">
          <div className="cal-days">
            {cells.map((c, i) => (
              <div key={i} className={`cal-day${c ? '' : ' off'}${c?.ymd === today ? ' today' : ''}`}>
                {c?.day}
              </div>
            ))}
          </div>
          <div className="cal-bars">
            {bars.map(({ f, s, e, contL, contR }) => {
              const { group, label } = typeOf(f)
              return (
                <Link
                  key={f.id}
                  to={`/festivals/${f.id}`}
                  className={`cal-bar${contL ? ' contL' : ''}${contR ? ' contR' : ''}`}
                  style={{ gridColumn: `${s + 1} / ${e + 2}`, background: GROUP_STYLE[group].color }}
                  title={`${f.title} · ${label}`}
                >
                  {f.title}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
