const express = require('express')
const router = express.Router()

const { getChatReply } = require('../services/chat.service')

router.post('/', async (req, res) => {
    const { message } = req.body

    if (!message) {
        return res.status(400).json({ error: 'message is required' })
    }

    try {
        const reply = await getChatReply(message)

        res.json({ reply })
    } catch (error) {
        res.status(500).json({
            error: 'chat processing failed',
            reply: '죄송해요, 요청 처리 중 오류가 발생했어요.'
        })
    }
})

module.exports = router
