const express = require('express')
const path = require('node:path')
const { server } = require('../../dist/index.js')

const app = express()
const handler = server.createUploadHandler({
  storage: { type: 'local', directory: path.join(process.cwd(), 'uploads') },
  tempDir: path.join(process.cwd(), 'tmp'),
})

app.post('/upload', handler.express())
app.get('/', (_req, res) => res.send('Upload server ready at POST /upload'))

const port = process.env.PORT || 3001
app.listen(port, () => console.log(`Express example listening on http://localhost:${port}`))
