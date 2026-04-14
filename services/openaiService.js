const axios = require('axios');

class OpenAIService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiURL = 'https://api.openai.com/v1/chat/completions';
        
        this.isConfigured = this.apiKey && this.apiKey !== 'your_openai_api_key_here';
        
        if (!this.isConfigured) {
            console.log('⚠️ OpenAI Service running in fallback mode (no API key)');
        } else {
            console.log('✅ OpenAI Service configured');
        }
        
        this.fallbackRecommendations = {
            action: [
                { title: "Mad Max: Fury Road", year: "2015", reason: "Экшн высшего уровня с потрясающими визуальными эффектами" },
                { title: "John Wick", year: "2014", reason: "Стильный боевик с отличной хореографией" },
                { title: "The Dark Knight", year: "2008", reason: "Шедевр супергеройского кино" },
                { title: "Die Hard", year: "1988", reason: "Классический боевик, задавший стандарты жанра" },
                { title: "Mission: Impossible - Fallout", year: "2018", reason: "Захватывающий экшн с невероятными трюками" },
                { title: "Gladiator", year: "2000", reason: "Эпический исторический боевик" },
                { title: "The Matrix", year: "1999", reason: "Революционный боевик с элементами фантастики" },
                { title: "Terminator 2", year: "1991", reason: "Культовый фантастический боевик" }
            ],
            comedy: [
                { title: "Superbad", year: "2007", reason: "Классическая подростковая комедия" },
                { title: "The Grand Budapest Hotel", year: "2014", reason: "Остроумная и визуально прекрасная комедия" },
                { title: "Bridesmaids", year: "2011", reason: "Забавная комедия о дружбе" },
                { title: "Step Brothers", year: "2008", reason: "Безумная комедия с Уиллом Ферреллом" }
            ],
            default: [
                { title: "Inception", year: "2010", reason: "Захватывающий научно-фантастический триллер" },
                { title: "The Shawshank Redemption", year: "1994", reason: "Вдохновляющая драма о надежде" },
                { title: "Pulp Fiction", year: "1994", reason: "Культовый фильм Квентина Тарантино" },
                { title: "The Godfather", year: "1972", reason: "Легендарная гангстерская сага" },
                { title: "Fight Club", year: "1999", reason: "Психологический триллер с глубоким смыслом" }
            ]
        };
    }

    async getRecommendations(userPreferences) {
        if (!this.isConfigured) {
            console.log('🤖 Using fallback recommendations');
            return this.getFallbackRecommendations(userPreferences);
        }

        try {
            const prompt = this.buildRecommendationPrompt(userPreferences);
            
            console.log('🤖 Sending request to OpenAI API...');
            
            const response = await axios.post(this.apiURL, {
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are a movie recommendation expert. Provide 8-10 movie recommendations in JSON format. Always respond with valid JSON array containing objects with title, year, and reason fields. Be creative and consider all preferences."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 800
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            console.log('✅ OpenAI API response received');
            const recommendations = this.parseRecommendations(response.data.choices[0].message.content);
            
            if (recommendations && recommendations.length > 0) {
                return recommendations.slice(0, 10);
            } else {
                return this.getFallbackRecommendations(userPreferences);
            }
        } catch (error) {
            console.error('❌ OpenAI API error:', error.message);
            return this.getFallbackRecommendations(userPreferences);
        }
    }

    buildRecommendationPrompt(preferences) {
        const { genre, year, rating, mood, keywords } = preferences;
        
        let prompt = `Suggest 8-10 movies based on the following preferences. Return ONLY a valid JSON array, no other text:\n\n`;
        
        if (genre && genre !== 'any') {
            prompt += `• Genre: ${genre}\n`;
        }
        if (year && year !== 'any') {
            prompt += `• Year period: ${year}\n`;
        }
        if (rating && rating !== 'any') {
            prompt += `• Minimum rating: ${rating}/10\n`;
        }
        if (mood && mood !== 'any') {
            prompt += `• Mood: ${mood}\n`;
        }
        if (keywords) {
            prompt += `• Keywords: ${keywords}\n`;
        }
        
        prompt += `\nResponse format: [{"title": "Movie Title", "year": "YYYY", "reason": "Brief explanation"}, ...]`;
        
        return prompt;
    }

    parseRecommendations(content) {
        try {
            let jsonContent = content.trim();
            const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                jsonContent = jsonMatch[0];
            }
            const recommendations = JSON.parse(jsonContent);
            
            if (Array.isArray(recommendations) && recommendations.length > 0) {
                return recommendations.map(rec => ({
                    title: rec.title || rec.Title || 'Unknown',
                    year: rec.year || rec.Year || 'N/A',
                    reason: rec.reason || rec.Reason || 'Recommended based on your preferences'
                }));
            }
            return [];
        } catch (error) {
            console.error('❌ Failed to parse OpenAI response:', error.message);
            return [];
        }
    }

    getFallbackRecommendations(preferences) {
        let recommendations = [];
        
        if (preferences.genre && preferences.genre !== 'any') {
            const genreKey = preferences.genre.toLowerCase();
            if (this.fallbackRecommendations[genreKey]) {
                recommendations = [...this.fallbackRecommendations[genreKey]];
            }
        }
        
        if (recommendations.length < 5) {
            recommendations = [...recommendations, ...this.fallbackRecommendations.default];
        }
        
        return recommendations.slice(0, 10);
    }
}

module.exports = new OpenAIService();