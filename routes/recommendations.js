const express = require('express');
const router = express.Router();
const movieService = require('../services/kinopoiskService');
// const openaiService = require('../services/openaiService');
const openaiService = require('../services/openaiService'); 
const cacheService = require('../services/cacheService');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        status: 'OK',
        timestamp: new Date().toISOString(),
        cache: {
            keys: cacheService.getStats().keys.length,
            configured: true
        },
        services: {
            kinopoisk: !!process.env.KINOPOISK_API_KEY,
            openai: !!process.env.OPENAI_API_KEY
        }
    });
});

// Get movie recommendations based on preferences
router.post('/', async (req, res) => {
    try {
        console.log('📝 Received recommendation request:', req.body);
        
        const preferences = req.body;
        
        if (!preferences || Object.keys(preferences).length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Preferences are required'
            });
        }
        
        const cacheKey = `recommendations_${JSON.stringify(preferences)}`;
        let recommendations = cacheService.get(cacheKey);
        
        if (!recommendations) {
            console.log('🔄 Cache miss - fetching new recommendations from AI');
            const aiRecommendations = await openaiService.getRecommendations(preferences);
            console.log(`🤖 Got ${aiRecommendations.length} AI recommendations`);
            
            recommendations = [];
            for (const rec of aiRecommendations) {
                try {
                    if (rec.title) {
                        console.log(`🔍 Searching for: ${rec.title}`);
                        const searchResults = await movieService.searchMovies(rec.title);
                        
                        if (searchResults && searchResults.length > 0) {
                            const movieDetails = await movieService.getMovieDetails(searchResults[0].filmId || searchResults[0].kinopoiskId);
                            if (movieDetails) {
                                recommendations.push({
                                    ...rec,
                                    movie: movieService.formatMovie(movieDetails)
                                });
                                console.log(`✅ Found: ${rec.title}`);
                            } else {
                                recommendations.push(rec);
                            }
                        } else {
                            recommendations.push(rec);
                        }
                    } else {
                        recommendations.push(rec);
                    }
                } catch (error) {
                    console.error(`❌ Error: ${rec.title}`, error.message);
                    recommendations.push(rec);
                }
            }
            
            cacheService.set(cacheKey, recommendations, 7200);
            console.log(`💾 Recommendations cached (${recommendations.length} items)`);
        } else {
            console.log(`💿 Cache hit for recommendations`);
        }
        
        res.json({
            success: true,
            data: recommendations,
            fromCache: cacheService.has(cacheKey),
            count: recommendations.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Recommendation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get recommendations',
            timestamp: new Date().toISOString()
        });
    }
});

// Get popular movies
router.get('/popular', async (req, res) => {
    try {
        const cacheKey = 'popular_movies';
        let movies = cacheService.get(cacheKey);
        
        if (!movies) {
            console.log('🔄 Cache miss - fetching popular movies');
            const popularMovies = await movieService.getPopularMovies();
            const formattedMovies = popularMovies
                .map(movie => movieService.formatMovie(movie))
                .filter(movie => movie !== null);
            cacheService.set(cacheKey, formattedMovies, 3600);
            movies = formattedMovies;
            console.log(`💾 Cached ${movies.length} popular movies`);
            res.json({
                success: true,
                data: movies,
                fromCache: false,
                count: movies.length,
                timestamp: new Date().toISOString()
            });
        } else {
            console.log(`💿 Cache hit - ${movies.length} popular movies`);
            res.json({
                success: true,
                data: movies,
                fromCache: true,
                count: movies.length,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('❌ Popular movies error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get popular movies',
            timestamp: new Date().toISOString()
        });
    }
});

// Search movies
router.get('/search', async (req, res) => {
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required'
            });
        }
        
        const cacheKey = `search_${query.toLowerCase()}`;
        let results = cacheService.get(cacheKey);
        
        if (!results) {
            console.log(`🔍 Searching for: ${query}`);
            const movies = await movieService.searchMovies(query);
            results = movies
                .map(movie => movieService.formatMovie(movie))
                .filter(movie => movie !== null);
            cacheService.set(cacheKey, results, 1800);
            console.log(`💾 Cached ${results.length} search results`);
        }
        
        res.json({
            success: true,
            data: results,
            fromCache: cacheService.has(cacheKey),
            count: results.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to search movies',
            timestamp: new Date().toISOString()
        });
    }
});

// Get movie details by ID
router.get('/movie/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `movie_${id}`;
        
        let movie = cacheService.get(cacheKey);
        
        if (!movie) {
            console.log(`🔍 Fetching movie details for ID: ${id}`);
            const movieDetails = await movieService.getMovieDetails(id);
            if (movieDetails) {
                movie = movieService.formatMovie(movieDetails);
                cacheService.set(cacheKey, movie, 3600);
                console.log(`💾 Cached movie: ${movie.title}`);
            } else {
                return res.status(404).json({
                    success: false,
                    error: 'Movie not found',
                    timestamp: new Date().toISOString()
                });
            }
        }
        
        res.json({
            success: true,
            data: movie,
            fromCache: cacheService.has(cacheKey),
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Movie details error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get movie details',
            timestamp: new Date().toISOString()
        });
    }
});

// Get similar movies
router.get('/movie/:id/similar', async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `similar_${id}`;
        let similar = cacheService.get(cacheKey);
        
        if (!similar) {
            console.log(`🔍 Fetching similar movies for ID: ${id}`);
            const movieDetails = await movieService.getMovieDetails(id);
            if (movieDetails && movieDetails.similar && movieDetails.similar.items) {
                similar = movieDetails.similar.items.map(m => movieService.formatMovie(m));
            } else {
                // Если нет похожих, возвращаем популярные
                const popular = await movieService.getPopularMovies();
                similar = popular.slice(0, 6).map(m => movieService.formatMovie(m));
            }
            cacheService.set(cacheKey, similar, 3600);
        }
        
        res.json({
            success: true,
            data: similar,
            fromCache: cacheService.has(cacheKey),
            count: similar.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Similar movies error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to get similar movies'
        });
    }
});

// Clear cache
router.delete('/cache', (req, res) => {
    cacheService.flush();
    console.log('🗑️ Cache cleared');
    res.json({
        success: true,
        message: 'Cache cleared successfully',
        timestamp: new Date().toISOString()
    });
});

// Get cache stats
router.get('/cache/stats', (req, res) => {
    const stats = cacheService.getStats();
    res.json({
        success: true,
        data: {
            keys: stats.keys,
            count: stats.keys.length,
            stats: stats.stats
        },
        timestamp: new Date().toISOString()
    });
});

module.exports = router;