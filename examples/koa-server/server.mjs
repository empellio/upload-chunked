import Koa from 'koa'
import Router from '@koa/router'
import path from 'node:path'
import { server } from '../../dist/index.js'

const app = new Koa()
const router = new Router()

const handler = server.createUploadHandler({
  storage: { type: 'local', directory: path.join(process.cwd(), 'uploads') },
  tempDir: path.join(process.cwd(), 'tmp'),
})

router.post('/upload', handler.koa())
router.get('/', (ctx) => (ctx.body = 'Upload server ready at POST /upload'))

app.use(router.routes())

const port = process.env.PORT || 3002
app.listen(port, () => console.log(`Koa example listening on http://localhost:${port}`))
