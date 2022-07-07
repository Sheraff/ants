const express = require('express')
const path = require('path')
const app = express()
const port = process.env.PORT || 5000

app.get('*', (req, res, next) => {
	res.setHeader('Cross-origin-Embedder-Policy', 'require-corp');
	res.setHeader('Cross-origin-Opener-Policy','same-origin');
	next()
})

app.get('/', (req, res) => {
	res.sendFile(path.join(__dirname, 'index.html'));
})

app.use(express.static('./'))

app.listen(port, () => {
	console.log(`http://localhost:${port}`)
})
