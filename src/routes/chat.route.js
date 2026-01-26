const express = require('express')
const router = express.Router()

const { getChatReply } = require('../services/chat.service')

router.post('/', async (req, res) => {
    const { message } = req.body

    if (!message) {
        return res.status(400).json({ error: 'message is required' })
    }

    const reply = await getChatReply(message)

    res.json({ reply })
})

module.exports = router