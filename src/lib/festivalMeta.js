// TourAPI 분류 코드(lclsSystm3, lclsSystmCode2 로 받은 이름표) → 화면용 유형
// 대분류 '축제/공연/행사' 아래 중분류: 축제(EV01) · 공연(EV02) · 행사(EV03)
export const EV_TYPES = {
  EV010100: { group: '축제', label: '문화관광축제' },
  EV010200: { group: '축제', label: '문화예술축제' },
  EV010300: { group: '축제', label: '지역특산물축제' },
  EV010400: { group: '축제', label: '전통역사축제' },
  EV010500: { group: '축제', label: '생태자연축제' },
  EV010600: { group: '축제', label: '기타축제' },
  EV020100: { group: '공연', label: '전통공연' },
  EV020200: { group: '공연', label: '연극' },
  EV020300: { group: '공연', label: '뮤지컬' },
  EV020400: { group: '공연', label: '오페라' },
  EV020500: { group: '공연', label: '무용' },
  EV020600: { group: '공연', label: '클래식음악회' },
  EV020700: { group: '공연', label: '대중콘서트' },
  EV020800: { group: '공연', label: '영화' },
  EV020900: { group: '공연', label: '기타공연' },
  EV021000: { group: '공연', label: '넌버벌' },
  EV030100: { group: '전시', label: '전시회' },
  EV030200: { group: '행사', label: '박람회' },
  EV030300: { group: '행사', label: '스포츠경기' },
  EV030400: { group: '행사', label: '기타행사' },
}

export const GROUPS = ['축제', '공연', '전시', '행사']

export const GROUP_STYLE = {
  축제: { bg: 'danger', icon: 'balloon-heart', color: '#ff5f7e' },
  공연: { bg: 'info', icon: 'music-note-beamed', color: '#38c4f0' },
  전시: { bg: 'primary', icon: 'easel', color: '#b58cff' },
  행사: { bg: 'warning', icon: 'flag', color: '#ffb02e' },
}

// 서버가 출처마다 group/label 을 채워 보낸다. 없으면 TourAPI 분류 코드(lcls)로 찾는다.
export const typeOf = (f) => (f.group ? { group: f.group, label: f.label } : EV_TYPES[f.lcls] ?? { group: '행사', label: '기타행사' })

// 카드 배지용 글자: 유형과 세부 종류가 같으면 한 번만
export const typeText = (f) => { const { group, label } = typeOf(f); return label && label !== group ? `${group} · ${label}` : group }

// 데이터 출처 이름 (상세 페이지 하단 표기)
export const SOURCES = {
  tour: '한국관광공사 TourAPI',
  culture: '한국문화정보원 한눈에보는문화정보',
  std: '전국문화축제표준데이터(제주특별자치도·제주시)',
}
