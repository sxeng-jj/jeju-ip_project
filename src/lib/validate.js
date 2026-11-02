// 로그인·회원가입 입력 검증. 통과하면 빈 문자열, 아니면 사용자에게 보여줄 문장 하나를 돌려준다.
// (Supabase 로 보내기 전에 화면에서 먼저 걸러, 뻔한 실수로 서버 요청이 낭비되지 않게 한다)
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const PASSWORD_MIN = 8

export function validateLogin({ email, password }) {
  if (!EMAIL.test(email.trim())) return '올바른 이메일 주소를 입력해 주세요'
  if (!password) return '비밀번호를 입력해 주세요'
  return ''
}

export function validateSignup({ nickname, email, password, confirm }) {
  const nick = nickname.trim()
  if (nick.length < 2 || nick.length > 12) return '닉네임은 2~12자로 정해 주세요'
  if (!EMAIL.test(email.trim())) return '올바른 이메일 주소를 입력해 주세요'
  if (password.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요`
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return '비밀번호에 영문자와 숫자를 모두 넣어 주세요'
  if (password !== confirm) return '비밀번호 확인이 달라요'
  return ''
}
