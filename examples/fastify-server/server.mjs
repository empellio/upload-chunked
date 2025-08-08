import Fastify from 'fastify'
import path from 'node:path'
import { server } from '../../dist/index.js'

const app = Fastify({ logger: true })

const handler = server.createUploadHandler({
  storage: { type: 'local', directory: path.join(process.cwd(), 'uploads') },
  tempDir: path.join(process.cwd(), 'tmp'),
})

app.post('/upload', handler.fastify())
app.get('/', async () => 'Upload server ready at POST /upload')

const port = process.env.PORT || 3003
app.listen({ port, host: '0.0.0.0' }).then(() => {
  console.log(`Fastify example listening on http://localhost:${port}`)
})
