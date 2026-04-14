class MovieRecommender {
    constructor() {
        this.apiBaseUrl = window.location.origin + '/api';
        this.init();
    }

    init() {
        console.log('MovieRecommender initialized with API URL:', this.apiBaseUrl);
        this.bindEvents();
        this.loadPopularMovies();
        this.checkHealth();
    }

    bindEvents() {
        const form = document.getElementById('recommendationForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.getRecommendations();
            });
        } else {
            console.error('Form not found');
        }
    }

    async checkHealth() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/recommendations/health`);
            const result = await response.json();
            console.log('API Health check:', result);
            if (!result.success) {
                console.warn('API health check failed');
            }
        } catch (error) {
            console.error('Health check failed:', error);
            this.showError('Не удается подключиться к серверу. Убедитесь, что сервер запущен.');
        }
    }

    async getRecommendations() {
        const formData = {
            genre: document.getElementById('genre').value,
            year: document.getElementById('year').value,
            rating: document.getElementById('rating').value,
            mood: document.getElementById('mood').value,
            keywords: document.getElementById('keywords').value
        };

        console.log('Sending request with data:', formData);
        this.showLoading(true);
        
        try {
            const url = `${this.apiBaseUrl}/recommendations`;
            console.log('Request URL:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('Response data:', result);
            
            if (result.success) {
                this.displayRecommendations(result.data);
                if (result.fromCache) {
                    this.showCacheIndicator(true);
                    setTimeout(() => this.showCacheIndicator(false), 3000);
                }
            } else {
                this.showError(result.error || 'Не удалось получить рекомендации');
            }
        } catch (error) {
            console.error('Error in getRecommendations:', error);
            this.showError(`Ошибка: ${error.message}. Проверьте подключение к серверу.`);
        } finally {
            this.showLoading(false);
        }
    }

    async loadPopularMovies() {
        try {
            console.log('Loading popular movies...');
            const response = await fetch(`${this.apiBaseUrl}/recommendations/popular`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Popular movies loaded:', result.data?.length || 0);
            
            if (result.success && result.data) {
                this.displayPopularMovies(result.data);
                if (result.fromCache) {
                    console.log('Popular movies loaded from cache');
                }
            } else {
                console.error('Failed to load popular movies:', result.error);
            }
        } catch (error) {
            console.error('Error loading popular movies:', error);
            const container = document.getElementById('popularMovies');
            if (container) {
                container.innerHTML = '<div class="error-message">Не удалось загрузить популярные фильмы. Убедитесь, что сервер запущен.</div>';
            }
        }
    }

    displayRecommendations(recommendations) {
        const container = document.getElementById('recommendations');
        
        if (!recommendations || recommendations.length === 0) {
            container.innerHTML = '<div class="error-message">Не удалось получить рекомендации. Попробуйте изменить параметры.</div>';
            return;
        }

        const html = recommendations.map(rec => {
            if (rec.movie && rec.movie.title) {
                const posterUrl = rec.movie.posterPath;
                const hasPoster = posterUrl && posterUrl !== 'null' && posterUrl !== '' && posterUrl !== 'undefined';
                const rating = rec.movie.rating ? rec.movie.rating.toFixed(1) : 'N/A';
                
                return `
                    <div class="movie-card" onclick="movieRecommender.showMovieDetails(${rec.movie.id})">
                        ${hasPoster ? 
                            `<img src="${posterUrl}" alt="${this.escapeHtml(rec.movie.title)}" class="movie-poster" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'movie-poster\\' style=\\'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; min-height: 300px;\\'>🎬<br>${this.escapeHtml(rec.movie.title)}</div>';">` :
                            `<div class="movie-poster" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; min-height: 300px;">
                                🎬<br>${this.escapeHtml(rec.movie.title)}
                            </div>`
                        }
                        <div class="movie-info">
                            <div class="movie-title">${this.escapeHtml(rec.movie.title)}</div>
                            <div class="movie-year">${rec.movie.releaseDate ? rec.movie.releaseDate.split('-')[0] : 'N/A'}</div>
                            <div class="movie-rating">★ ${rating}</div>
                            <div class="movie-overview">${this.escapeHtml(rec.movie.overview ? rec.movie.overview.substring(0, 120) + '...' : 'Описание отсутствует')}</div>
                            ${rec.reason ? `<div class="reason">💡 ${this.escapeHtml(rec.reason)}</div>` : ''}
                        </div>
                    </div>
                `;
            } else if (rec.title) {
                return `
                    <div class="movie-card">
                        <div class="movie-poster" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; min-height: 300px; font-size: 48px;">
                            🎬<br>${this.escapeHtml(rec.title)}
                        </div>
                        <div class="movie-info">
                            <div class="movie-title">${this.escapeHtml(rec.title)}</div>
                            <div class="movie-year">${rec.year || 'N/A'}</div>
                            <div class="movie-rating">★ N/A</div>
                            ${rec.reason ? `<div class="reason">💡 ${this.escapeHtml(rec.reason)}</div>` : ''}
                        </div>
                    </div>
                `;
            }
            return '';
        }).join('');

        container.innerHTML = html;
    }

    displayPopularMovies(movies) {
        const container = document.getElementById('popularMovies');
        
        if (!movies || movies.length === 0) {
            container.innerHTML = '<div class="error-message">Не удалось загрузить популярные фильмы</div>';
            return;
        }

        const html = movies.slice(0, 8).map(movie => {
            const posterUrl = movie.posterPath;
            const hasPoster = posterUrl && posterUrl !== 'null' && posterUrl !== '' && posterUrl !== 'undefined';
            const rating = movie.rating ? movie.rating.toFixed(1) : 'N/A';
            
            return `
                <div class="movie-card" onclick="movieRecommender.showMovieDetails(${movie.id})">
                    ${hasPoster ? 
                        `<img src="${posterUrl}" alt="${this.escapeHtml(movie.title)}" class="movie-poster" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'movie-poster\\' style=\\'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; min-height: 300px;\\'>🎬<br>${this.escapeHtml(movie.title)}</div>';">` :
                        `<div class="movie-poster" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 48px; min-height: 300px;">
                            🎬<br>${this.escapeHtml(movie.title)}
                        </div>`
                    }
                    <div class="movie-info">
                        <div class="movie-title">${this.escapeHtml(movie.title)}</div>
                        <div class="movie-year">${movie.releaseDate ? movie.releaseDate.split('-')[0] : 'N/A'}</div>
                        <div class="movie-rating">★ ${rating}</div>
                        <div class="movie-overview">${this.escapeHtml(movie.overview ? movie.overview.substring(0, 100) + '...' : 'Описание отсутствует')}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    async showMovieDetails(movieId) {
        // Открываем новую страницу с деталями фильма
        window.location.href = `/movie.html?id=${movieId}`;
    }

    showLoading(show) {
        const loadingIndicator = document.getElementById('loadingIndicator');
        const recommendations = document.getElementById('recommendations');
        
        if (show) {
            if (loadingIndicator) loadingIndicator.style.display = 'block';
            if (recommendations) recommendations.innerHTML = '';
        } else {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    showCacheIndicator(show) {
        const indicator = document.getElementById('cacheIndicator');
        if (indicator) {
            indicator.style.display = show ? 'block' : 'none';
        }
    }

    showError(message) {
        const container = document.getElementById('recommendations');
        if (container) {
            container.innerHTML = `<div class="error-message">${this.escapeHtml(message)}</div>`;
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация после загрузки страницы
let movieRecommender;
document.addEventListener('DOMContentLoaded', () => {
    movieRecommender = new MovieRecommender();
    console.log('MovieRecommender ready');
});