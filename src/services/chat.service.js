require('dotenv').config()
const OpenAI = require('openai')
const axios = require('axios')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
})

function isWeatherQuestion(text = '') {
    return /(날씨|기온|온도|비|눈)/.test(text)
}

function normalizeCityName(city = '') {
    const raw = city.trim()
    const cleaned = raw
        .replace(/\s*날씨.*$/u, '')
        .replace(/\s*현재.*$/u, '')
        .replace(/\s*오늘.*$/u, '')
        .replace(/\s*의$/u, '')
        .trim()

    const alias = {
        서울: 'Seoul',
        인천: 'Incheon',
        부산: 'Busan',
        대구: 'Daegu',
        대전: 'Daejeon',
        광주: 'Gwangju',
        울산: 'Ulsan',
        제주: 'Jeju',
        제주도: 'Jeju',
        세종: 'Sejong'
    }

    return alias[cleaned] || cleaned
}

async function getWeather({ city }) {
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
        throw new Error('Missing OPENWEATHER_API_KEY')
    }

    const normalizedCity = normalizeCityName(city)
    const url = 'https://api.openweathermap.org/data/2.5/weather'
    let data

    try {
        const response = await axios.get(url, {
            params: {
                q: normalizedCity,
                appid: apiKey,
                units: 'metric',
                lang: 'kr'
            }
        })

        data = response.data
    } catch (error) {
        if (
            error.response?.status === 404 ||
            error.response?.status === 400
        ) {
            const geoUrl = 'http://api.openweathermap.org/geo/1.0/direct'
            const geoResponse = await axios.get(geoUrl, {
                params: {
                    q: normalizedCity,
                    limit: 1,
                    appid: apiKey
                }
            })

            const [geo] = geoResponse.data || []
            if (!geo) {
                throw error
            }

            const weatherByCoord = await axios.get(url, {
                params: {
                    lat: geo.lat,
                    lon: geo.lon,
                    appid: apiKey,
                    units: 'metric',
                    lang: 'kr'
                }
            })

            data = weatherByCoord.data
        } else {
            throw error
        }
    }

    return {
        city: data.name,
        temperature: `${Math.round(data.main.temp)}도`,
        condition: data.weather[0].description
    }
}

async function getChatReply(userMessage) {
    try {
        const firstResponse = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `
                    너는 친절한 한국어 AI 챗봇이야.
                    날씨처럼 실시간 정보가 필요한 질문에는
                    가능하면 제공된 도구를 사용해.
                    `
                },
                { role: 'user', content: userMessage }
            ],
            tools: [
                {
                    type: 'function',
                    function: {
                        name: 'getWeather',
                        description: '도시의 현재 날씨를 가져온다',
                        parameters: {
                            type: 'object',
                            properties: {
                                city: {
                                    type: 'string',
                                    description: '예: 서울, 인천, 부산'
                                }
                            },
                            required: ['city']
                        },
                    }
                }
            ],
            tool_choice: 'auto'
        })

        const message = firstResponse.choices[0].message

        if (message.tool_calls && message.tool_calls.length > 0) {
            const toolCall = message.tool_calls[0]
            const { name, arguments: args } = toolCall.function
            const parsedArgs = JSON.parse(args || '{}')

            if (name === 'getWeather') {
                if (!parsedArgs.city?.trim()) {
                    return '어느 지역 날씨를 알려드릴까요? 예: 서울, 인천, 부산'
                }

                try {
                    const weatherResult = await getWeather(parsedArgs)

                    const secondResponse = await openai.chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [
                            {
                                role: 'system',
                                content: '너는 친절한 한국어 AI 챗봇이야.'
                            },
                            { role: 'user', content: userMessage },
                            message,
                            {
                                role: 'tool',
                                tool_call_id: toolCall.id,
                                content: JSON.stringify(weatherResult)
                            }
                        ]
                    })

                    return secondResponse.choices[0].message.content
                } catch (weatherError) {
                    if (
                        weatherError.response?.status === 404 ||
                        weatherError.response?.status === 400
                    ) {
                        return '해당 지역을 찾지 못했어요. 도시 이름을 다시 알려주세요.'
                    }

                    return '현재 날씨 정보를 가져오지 못했어요. 잠시 후 다시 시도해 주세요.'
                }
            }
        }

        return (
            message.content ||
            '죄송해요, 지금은 답변을 생성하지 못했어요. 다시 질문해 주세요.'
        )
    } catch (error) {
        if (isWeatherQuestion(userMessage)) {
            return '날씨 요청을 처리하는 중 문제가 생겼어요. 지역명을 함께 입력해 주시면 다시 시도할게요. 예: 서울 날씨 알려줘'
        }

        return '죄송해요, 지금은 답변을 생성하지 못했어요. 다시 질문해 주세요.'
    }
}

module.exports = { getChatReply }
