const OpenAI = require('openai')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

async function getChatReply(message) {
    const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: '너는 친절한 한국어 AI 챗봇이야.' },
            { role: 'user', content: message }
        ]
    })

    return response.choices[0].message.content
}

module.exports = { getChatReply }