const axios = require('axios');

class KinopoiskService {
    constructor() {
        this.apiKey = process.env.KINOPOISK_API_KEY;
        this.baseURL = 'https://kinopoiskapiunofficial.tech/api';
        
        this.isConfigured = this.apiKey && this.apiKey !== 'ваш_ключ_здесь';
        
        console.log('🎬 Kinopoisk Service initialized');
        if (this.isConfigured) {
            console.log('✅ Kinopoisk API key configured');
            this.testApiKey();
        } else {
            console.log('⚠️ Kinopoisk Service running in fallback mode');
        }
    }

    async testApiKey() {
        try {
            const response = await axios.get(`${this.baseURL}/v2.2/films/301`, {
                headers: {
                    'X-API-KEY': this.apiKey
                },
                timeout: 10000
            });
            console.log('✅ Kinopoisk API is WORKING!');
            console.log(`   Test film: ${response.data.nameRu}`);
            this.isConfigured = true;
        } catch (error) {
            console.error('❌ Kinopoisk API error:', error.message);
            this.isConfigured = false;
        }
    }

    async getPopularMovies(page = 1) {
        if (!this.isConfigured) {
            console.log('Using fallback movies');
            return this.getFallbackMovies();
        }

        try {
            console.log('Fetching popular movies from Kinopoisk API...');
            
            // ИСПРАВЛЕННЫЙ ЭНДПОИНТ - рабочий!
            const response = await axios.get(`${this.baseURL}/v2.2/films`, {
                params: {
                    order: 'RATING',
                    ratingFrom: 7,
                    ratingTo: 10,
                    page: page,
                    limit: 20
                },
                headers: {
                    'X-API-KEY': this.apiKey
                },
                timeout: 10000
            });
            
            const movies = response.data.items || [];
            console.log(`✅ Got ${movies.length} popular movies from API`);
            
            if (movies.length > 0) {
                console.log(`   Example: ${movies[0].nameRu}`);
                console.log(`   Poster URL: ${movies[0].posterUrlPreview ? 'Yes' : 'No'}`);
            }
            
            return movies;
        } catch (error) {
            console.error('❌ Kinopoisk error:', error.message);
            if (error.response) {
                console.error('   Status:', error.response.status);
            }
            return this.getFallbackMovies();
        }
    }

    async searchMovies(query) {
        if (!this.isConfigured) {
            return [];
        }

        try {
            console.log(`Searching for: ${query}`);
            const response = await axios.get(`${this.baseURL}/v2.1/films/search-by-keyword`, {
                params: {
                    keyword: query,
                    page: 1
                },
                headers: {
                    'X-API-KEY': this.apiKey
                },
                timeout: 10000
            });
            return response.data.films || [];
        } catch (error) {
            console.error('❌ Kinopoisk search error:', error.message);
            return [];
        }
    }

    async getMovieDetails(movieId) {
        if (!this.isConfigured) {
            return this.getFallbackMovieDetails(movieId);
        }

        try {
            const response = await axios.get(`${this.baseURL}/v2.2/films/${movieId}`, {
                headers: {
                    'X-API-KEY': this.apiKey
                },
                timeout: 10000
            });
            return response.data;
        } catch (error) {
            console.error('❌ Kinopoisk details error:', error.message);
            return this.getFallbackMovieDetails(movieId);
        }
    }

    getFallbackMovies() {
        return [
            {
                filmId: 301,
                nameRu: "Интерстеллар",
                nameEn: "Interstellar",
                description: "Когда засуха приводит человечество к продовольственному кризису, коллектив исследователей и учёных отправляется сквозь червоточину в путешествие, чтобы найти планету, подходящую для переселения.",
                rating: "8.7",
                year: "2014",
                posterUrlPreview: null
            },
            {
                filmId: 435,
                nameRu: "Зеленая миля",
                nameEn: "The Green Mile",
                description: "Пол Эджкомб — начальник блока смертников в тюрьме «Холодная гора». Он повидал много заключённых и надзирателей за время работы. Однако необычный осуждённый по имени Джон Коффи меняет жизнь Пола навсегда.",
                rating: "9.1",
                year: "1999",
                posterUrlPreview: null
            },
            {
                filmId: 326,
                nameRu: "Побег из Шоушенка",
                nameEn: "The Shawshank Redemption",
                description: "Бухгалтер Энди Дюфрейн обвинён в убийстве собственной жены и её любовника. Оказавшись в тюрьме под названием Шоушенк, он понимает, что истинные враги находятся не за решёткой, а по ту сторону её.",
                rating: "9.5",
                year: "1994",
                posterUrlPreview: null
            }
        ];
    }

    getFallbackMovieDetails(movieId) {
        const fallback = this.getFallbackMovies();
        return fallback.find(m => m.filmId == movieId) || fallback[0];
    }

    getImageUrl(posterUrl) {
        if (!posterUrl) return null;
        return posterUrl;
    }

    formatMovie(movie) {
        if (!movie) return null;
        
        let rating = 0;
        if (movie.ratingKinopoisk) {
            rating = parseFloat(movie.ratingKinopoisk);
        } else if (movie.rating) {
            if (typeof movie.rating === 'object') {
                rating = movie.rating.kp || movie.rating.imdb || 0;
            } else {
                rating = parseFloat(movie.rating) || 0;
            }
        }
        
        let posterUrl = null;
        if (movie.posterUrlPreview) {
            posterUrl = movie.posterUrlPreview;
        } else if (movie.posterUrl) {
            posterUrl = movie.posterUrl;
        }
        
        return {
            id: movie.filmId || movie.kinopoiskId,
            title: movie.nameRu || movie.name || 'Unknown',
            originalTitle: movie.nameEn || movie.originalTitle,
            overview: movie.description || movie.shortDescription || 'Описание отсутствует',
            rating: rating,
            voteCount: movie.ratingVoteCount || 0,
            releaseDate: movie.year ? `${movie.year}` : null,
            posterPath: posterUrl,
            backdropPath: posterUrl,
            genres: movie.genres || []
        };
    }
}

module.exports = new KinopoiskService();