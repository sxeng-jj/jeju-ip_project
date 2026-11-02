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
  축제: { icon: 'balloon-heart', color: '#f08a17', text: '#2d1a00' }, // 감귤 주황
  공연: { icon: 'music-note-beamed', color: '#2f8f55', text: '#ffffff' }, // 한라산 초록
  전시: { icon: 'easel', color: '#15869a', text: '#ffffff' }, // 제주 바다 청록
  행사: { icon: 'flag', color: '#f2c94c', text: '#3a2c00' }, // 유채 노랑
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

// ── 테마(관심사) ─────────────────────────────────────────
// 공식 분류가 있으면 그것을, 없으면 이름의 낱말로 어림잡는다. (자동 분류라 틀릴 수 있다)
export const THEMES = [
  { key: 'night', label: '야간·밤', icon: 'moon-stars', re: /야간|야시장|야경|야행|밤|나이트|불꽃|별빛|달빛|라이트/ },
  { key: 'family', label: '가족·어린이', icon: 'people', re: /가족|어린이|아이|키즈|동화|유아|청소년|댕댕|반려/ },
  { key: 'nature', label: '자연·꽃·오름', icon: 'flower1', re: /오름|꽃|벚꽃|유채|수국|메밀|억새|동백|숲|곶자왈|해변|올레|트레킹|생태|자연|정원|고사리/, lcls: ['EV010500'], skip: ['공연', '전시'] },
  { key: 'tradition', label: '전통·역사·신화', icon: 'bank2', re: /전통|역사|문화재|국가유산|민속|신화|해녀|탐라|굿|유적|선사|들불|제주어|향토|관아|성안/, lcls: ['EV010400'] },
  { key: 'food', label: '음식·특산물', icon: 'cup-hot', re: /음식|먹거리|특산|감귤|흑돼지|광어|방어|소라|커피|맥주|푸드|미식|밥상|메밀/, lcls: ['EV010300'], skip: ['공연', '전시'] },
  { key: 'music', label: '공연·음악', icon: 'music-note-beamed', re: /콘서트|음악|연주|합창|버스킹|뮤지컬|오페라|국악/, group: '공연' },
  { key: 'art', label: '전시·예술', icon: 'easel', re: /미술|전시|아트|예술|갤러리|비엔날레|사진|미디어아트/, group: '전시' },
  { key: 'active', label: '걷기·스포츠', icon: 'person-walking', re: /마라톤|걷기|스포츠|레저|대회|트레킹|라이딩|서핑/, lcls: ['EV030300'], skip: ['공연', '전시'] },
]

export function themesOf(f) {
  // skip: 공연·전시는 제목에 꽃·바다 같은 낱말이 있어도 야외 테마(자연·음식·스포츠)로 보지 않는다 (예: 공연 제목의 '동백꽃')
  return THEMES.filter((t) => !t.skip?.includes(f.group) && (t.re.test(f.title) || t.group === f.group || t.lcls?.includes(f.lcls))).map((t) => t.key)
}

export const THEME_BY_KEY = Object.fromEntries(THEMES.map((t) => [t.key, t]))

// 바깥에서 즐기는 행사인가 (준비물 안내에 쓴다)
export const isOutdoor = (f) => {
  const th = themesOf(f)
  return th.some((k) => ['nature', 'tradition', 'night', 'active', 'food'].includes(k)) || (f.group === '축제' && !th.includes('art'))
}
