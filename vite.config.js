import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// `npm run dev` 만으로 /api/* 서버 함수를 함께 돌리는 개발용 플러그인 (Vercel 의 /api 와 같은 모양)
// 배포(Vercel)에서는 이 플러그인을 쓰지 않고 api/ 폴더가 그대로 서버 함수가 됩니다.
function apiDev() {
  return {
    name: 'api-dev',
    configureServer(server) {
      Object.assign(process.env, loadEnv('development', process.cwd(), ''))

      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/')) return next()
        const url = new URL(req.url, 'http://localhost')
        const name = url.pathname.slice('/api/'.length)
        const json = (code, data) => {
          res.statusCode = code
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        }
        if (!/^[\w-]+$/.test(name)) return json(404, { error: 'not found' })

        try {
          const chunks = []
          for await (const c of req) chunks.push(c)
          const raw = Buffer.concat(chunks).toString()
          req.query = Object.fromEntries(url.searchParams)
          req.body = raw ? JSON.parse(raw) : undefined
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (data) => json(res.statusCode || 200, data)

          const mod = await server.ssrLoadModule(`/api/${name}.js`)
          await mod.default(req, res)
        } catch (e) {
          json(500, { error: e.message })
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiDev()],
})
