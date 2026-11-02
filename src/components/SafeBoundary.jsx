import { Component } from 'react'

// 자식을 그리다 오류가 나면 앱 전체가 멈추지 않고 fallback 을 보여준다 (예: 3D 를 그릴 수 없는 환경)
export default class SafeBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error) {
    console.warn('[SafeBoundary]', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
