async function getChatReply(message) {
    // 지금은 가짜 응답
    return `🤖 서버 응답: "${message}"`
}

module.exports = {
    getChatReply
}