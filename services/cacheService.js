const NodeCache = require('node-cache');

class CacheService {
    constructor(ttlSeconds = 3600) {
        this.cache = new NodeCache({ 
            stdTTL: ttlSeconds,
            checkperiod: ttlSeconds * 0.2,
            useClones: false,
            deleteOnExpire: true
        });
        
        // Отслеживаем события кэша
        this.cache.on('set', (key, value) => {
            console.log(`💾 Cache set: ${key} (${JSON.stringify(value).length} bytes)`);
        });
        
        this.cache.on('del', (key) => {
            console.log(`🗑️ Cache deleted: ${key}`);
        });
        
        this.cache.on('expired', (key) => {
            console.log(`⏰ Cache expired: ${key}`);
        });
        
        console.log('✅ Cache Service initialized');
    }

    get(key) {
        try {
            const value = this.cache.get(key);
            if (value) {
                console.log(`📖 Cache hit: ${key}`);
            } else {
                console.log(`❓ Cache miss: ${key}`);
            }
            return value;
        } catch (error) {
            console.error('❌ Cache get error:', error);
            return undefined;
        }
    }

    set(key, value, ttl = 3600) {
        try {
            const success = this.cache.set(key, value, ttl);
            if (success) {
                console.log(`✅ Cache set: ${key} (TTL: ${ttl}s)`);
            }
            return success;
        } catch (error) {
            console.error('❌ Cache set error:', error);
            return false;
        }
    }

    del(key) {
        try {
            const deleted = this.cache.del(key);
            if (deleted > 0) {
                console.log(`🗑️ Cache deleted: ${key}`);
            }
            return deleted;
        } catch (error) {
            console.error('❌ Cache del error:', error);
            return 0;
        }
    }

    flush() {
        try {
            const keys = this.cache.keys();
            this.cache.flushAll();
            console.log(`🗑️ Cache flushed: ${keys.length} keys removed`);
            return true;
        } catch (error) {
            console.error('❌ Cache flush error:', error);
            return false;
        }
    }

    has(key) {
        try {
            return this.cache.has(key);
        } catch (error) {
            console.error('❌ Cache has error:', error);
            return false;
        }
    }

    getStats() {
        try {
            return {
                keys: this.cache.keys(),
                stats: this.cache.getStats(),
                size: this.cache.keys().length
            };
        } catch (error) {
            console.error('❌ Cache stats error:', error);
            return { keys: [], stats: {}, size: 0 };
        }
    }

    getTTL(key) {
        try {
            return this.cache.getTtl(key);
        } catch (error) {
            console.error('❌ Cache TTL error:', error);
            return undefined;
        }
    }
}

module.exports = new CacheService();