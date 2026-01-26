require('dotenv').config()
const express = require('express')
const cors = require('cors')

const chatRouter = require('./routes/chat.route')

const app = express()
const PORT = 4000

app.use(cors())
app.use(express.json())

app.use('/chat', chatRouter)

app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`)
})