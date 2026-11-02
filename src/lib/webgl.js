// 3D(WebGL)를 그릴 수 있는 환경인가. 안 되면 3D 대신 평범한 화면으로 대신한다.
export function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
