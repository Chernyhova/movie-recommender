const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const path = require('path');

dotenv.config();

console.log('=================================');
console.log('🔍 ENVIRONMENT VARIABLES CHECK:');
console.log('KINOPOISK_API_KEY:', process.env.KINOPOISK_API_KEY ? '✅ LOADED' : '❌ NOT LOADED');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ LOADED' : '❌ NOT LOADED');
console.log('=================================');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use((req, res, next) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

const recommendationsRouter = require('./routes/recommendations');
app.use('/api/recommendations', recommendationsRouter);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
    console.error('❌ Global error:', err);
    res.status(500).json({
        success: false,
        error: err.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log('═'.repeat(60));
    console.log('✅ Server started successfully!');
    console.log('═'.repeat(60));
    console.log(`📍 http://localhost:${PORT}`);
    console.log('═'.repeat(60));
    console.log('📊 Configuration:');
    console.log(`   Kinopoisk API: ${process.env.KINOPOISK_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log(`   OpenAI API: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Missing'}`);
    console.log('═'.repeat(60));
});