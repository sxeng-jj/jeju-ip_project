// Supabase Auth 오류 → 사용자에게 보여줄 한국어 문장
const BY_CODE = {
  invalid_credentials: '이메일 또는 비밀번호가 올바르지 않아요',
  email_not_confirmed: '이메일 확인이 아직이에요. 가입할 때 받은 메일의 링크를 눌러 주세요',
  user_already_exists: '이미 가입된 이메일이에요. 로그인해 주세요',
  email_exists: '이미 가입된 이메일이에요. 로그인해 주세요',
  weak_password: '비밀번호가 너무 약해요. 더 길고 복잡하게 만들어 주세요',
  email_address_invalid: '올바른 이메일 주소를 입력해 주세요',
  validation_failed: '입력한 내용을 다시 확인해 주세요',
  signup_disabled: '지금은 회원가입을 받지 않아요',
  over_email_send_rate_limit: '확인 메일을 너무 자주 보냈어요. 잠시 후 다시 시도해 주세요',
  over_request_rate_limit: '요청이 너무 많아요. 잠시 후 다시 시도해 주세요',
}

// code 가 없는 옛 형식 오류를 위한 메시지 패턴
const BY_MESSAGE = [
  [/invalid login credentials/i, BY_CODE.invalid_credentials],
  [/email not confirmed/i, BY_CODE.email_not_confirmed],
  [/already registered/i, BY_CODE.user_already_exists],
  [/rate limit/i, BY_CODE.over_email_send_rate_limit],
  [/invalid.*email|email.*invalid/i, BY_CODE.email_address_invalid],
  [/signups? not allowed/i, BY_CODE.signup_disabled],
  [/password should be at least (\d+)/i, (m) => `비밀번호는 ${m[1]}자 이상이어야 해요`],
]

export function translateAuthError(error) {
  if (!error) return ''
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]
  const msg = error.message ?? ''
  for (const [re, out] of BY_MESSAGE) {
    const m = msg.match(re)
    if (m) return typeof out === 'function' ? out(m) : out
  }
  if (/failed to fetch|network/i.test(msg)) return '네트워크에 연결하지 못했어요. 인터넷을 확인해 주세요'
  return `문제가 생겼어요: ${msg || '알 수 없는 오류'}`
}
