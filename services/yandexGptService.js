const axios = require('axios');

class YandexGptService {
    constructor() {
        this.apiKey = process.env.YANDEX_API_KEY;
        this.folderId = process.env.YANDEX_FOLDER_ID;
        // Используем эндпоинт для AI Studio
        this.apiURL = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
        
        this.isConfigured = this.apiKey && this.folderId;
        
        if (!this.isConfigured) {
            console.log('⚠️ YandexGPT running in fallback mode');
        } else {
            console.log('✅ YandexGPT configured (FREE!)');
            this.testApiKey();
        }
        
        // База фильмов для fallback
        this.movieDatabase = {
            action: [
                { title: "Mad Max: Fury Road", year: "2015", rating: 8.7, reason: "Экшн высшего уровня с потрясающими визуальными эффектами" },
                { title: "John Wick", year: "2014", rating: 8.5, reason: "Стильный боевик с отличной хореографией" },
                { title: "The Dark Knight", year: "2008", rating: 9.0, reason: "Шедевр супергеройского кино" },
                { title: "Die Hard", year: "1988", rating: 8.2, reason: "Классический боевик" },
                { title: "Gladiator", year: "2000", rating: 8.5, reason: "Эпический исторический боевик" }
            ],
            comedy: [
                { title: "Superbad", year: "2007", rating: 8.0, reason: "Классическая подростковая комедия" },
                { title: "The Grand Budapest Hotel", year: "2014", rating: 8.1, reason: "Остроумная и визуально прекрасная комедия" },
                { title: "Bridesmaids", year: "2011", rating: 7.8, reason: "Забавная комедия о дружбе" },
                { title: "The Hangover", year: "2009", rating: 7.9, reason: "Культовая комедия" }
            ],
            horror: [
                { title: "The Conjuring", year: "2013", rating: 7.9, reason: "Атмосферный хоррор, основанный на реальных событиях" },
                { title: "Hereditary", year: "2018", rating: 7.8, reason: "Психологический хоррор" },
                { title: "Get Out", year: "2017", rating: 8.1, reason: "Социальный триллер с элементами хоррора" }
            ],
            'sci-fi': [
                { title: "Inception", year: "2010", rating: 8.8, reason: "Захватывающий научно-фантастический триллер" },
                { title: "Interstellar", year: "2014", rating: 8.7, reason: "Эпическая научная фантастика о космосе" },
                { title: "The Matrix", year: "1999", rating: 8.7, reason: "Революционный научно-фантастический боевик" }
            ],
            drama: [
                { title: "The Shawshank Redemption", year: "1994", rating: 9.3, reason: "Вдохновляющая драма о надежде" },
                { title: "Forrest Gump", year: "1994", rating: 8.8, reason: "Трогательная история жизни простого человека" },
                { title: "The Green Mile", year: "1999", rating: 8.9, reason: "Эмоциональная драма с элементами мистики" }
            ],
            thriller: [
                { title: "Fight Club", year: "1999", rating: 8.8, reason: "Психологический триллер с глубоким смыслом" },
                { title: "Se7en", year: "1995", rating: 8.6, reason: "Мрачный детективный триллер" },
                { title: "Prisoners", year: "2013", rating: 8.2, reason: "Напряженный триллер о поиске пропавших детей" }
            ],
            default: [
                { title: "Inception", year: "2010", rating: 8.8, reason: "Захватывающий научно-фантастический триллер" },
                { title: "The Shawshank Redemption", year: "1994", rating: 9.3, reason: "Вдохновляющая драма о надежде" },
                { title: "Pulp Fiction", year: "1994", rating: 8.9, reason: "Культовый фильм Квентина Тарантино" },
                { title: "The Godfather", year: "1972", rating: 9.2, reason: "Легендарная гангстерская сага" },
                { title: "Fight Club", year: "1999", rating: 8.8, reason: "Психологический триллер с глубоким смыслом" }
            ]
        };
    }

    async testApiKey() {
        try {
            const response = await axios.post(this.apiURL, {
                modelUri: `gpt://${this.folderId}/yandexgpt-lite/latest`,
                completionOptions: {
                    stream: false,
                    temperature: 0.6,
                    maxTokens: 50
                },
                messages: [
                    {
                        role: "user",
                        text: "Скажи 'API работает'"
                    }
                ]
            }, {
                headers: {
                    'Authorization': `Api-Key ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ YandexGPT API is WORKING! (FREE)');
            this.isConfigured = true;
        } catch (error) {
            console.error('❌ YandexGPT API error:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
                console.error('   Data:', JSON.stringify(error.response.data));
            }
            this.isConfigured = false;
        }
    }

    async getRecommendations(userPreferences) {
        if (!this.isConfigured) {
            console.log('🎬 Using fallback recommendations');
            return this.getFallbackRecommendations(userPreferences);
        }

        try {
            const prompt = this.buildPrompt(userPreferences);
            
            const response = await axios.post(this.apiURL, {
                modelUri: `gpt://${this.folderId}/yandexgpt/latest`,
                completionOptions: {
                    stream: false,
                    temperature: 0.8,
                    maxTokens: 800
                },
                messages: [
                    {
                        role: "user",
                        text: prompt
                    }
                ]
            }, {
                headers: {
                    'Authorization': `Api-Key ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            const aiText = response.data.result?.alternatives?.[0]?.message?.text || '';
            const recommendations = this.parseRecommendations(aiText);
            
            if (recommendations.length > 0) {
                console.log(`✅ YandexGPT generated ${recommendations.length} recommendations`);
                return recommendations;
            }
            return this.getFallbackRecommendations(userPreferences);
            
        } catch (error) {
            console.error('❌ YandexGPT error:', error.message);
            return this.getFallbackRecommendations(userPreferences);
        }
    }

    buildPrompt(preferences) {
        const { genre, year, rating, mood, keywords } = preferences;
        
        let prompt = `Ты эксперт по кино. Предложи 6 фильмов.\n\nПредпочтения пользователя:\n`;
        if (genre && genre !== 'any') prompt += `- Жанр: ${genre}\n`;
        if (year && year !== 'any') prompt += `- Год: ${year}\n`;
        if (rating && rating !== 'any') prompt += `- Минимальный рейтинг: ${rating}/10\n`;
        if (mood && mood !== 'any') prompt += `- Настроение: ${mood}\n`;
        if (keywords) prompt += `- Ключевые слова: ${keywords}\n`;
        
        prompt += `\nОтветь ТОЛЬКО JSON массивом в формате:\n[{"title": "Название фильма", "year": "Год", "reason": "Почему рекомендуем"}]\n`;
        prompt += `Не пиши ничего кроме JSON. Фильмы должны быть известными и качественными.\n`;
        
        return prompt;
    }

    parseRecommendations(content) {
        try {
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                const recs = JSON.parse(jsonMatch[0]);
                return recs.map(r => ({
                    title: r.title,
                    year: r.year || 'N/A',
                    reason: r.reason
                }));
            }
            return [];
        } catch (error) {
            console.error('Parse error:', error.message);
            return [];
        }
    }

    getFallbackRecommendations(preferences) {
        let recommendations = [];
        const genre = preferences.genre;
        
        if (genre && genre !== 'any' && this.movieDatabase[genre]) {
            recommendations = [...this.movieDatabase[genre]];
        } else {
            recommendations = [...this.movieDatabase.default];
        }
        
        // Фильтрация по году
        if (preferences.year && preferences.year !== 'any') {
            const yearRange = preferences.year.split('-');
            if (yearRange.length === 2) {
                const start = parseInt(yearRange[0]);
                const end = parseInt(yearRange[1]);
                recommendations = recommendations.filter(m => {
                    const y = parseInt(m.year);
                    return y >= start && y <= end;
                });
            }
        }
        
        // Фильтрация по рейтингу
        if (preferences.rating && preferences.rating !== 'any') {
            const minRating = parseFloat(preferences.rating);
            recommendations = recommendations.filter(m => (m.rating || 0) >= minRating);
        }
        
        if (recommendations.length < 5) {
            recommendations = [...recommendations, ...this.movieDatabase.default];
        }
        
        return recommendations.slice(0, 8).map(m => ({
            title: m.title,
            year: m.year,
            reason: m.reason
        }));
    }
}

module.exports = new YandexGptService();
