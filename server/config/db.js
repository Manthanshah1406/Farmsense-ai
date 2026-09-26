// server/config/db.js

const { Pool } = require('pg');
require('dotenv').config();

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('railway') || process.env.NODE_ENV === 'production'
            ? { rejectUnauthorized: false }
            : false,
    }
    : {
        host:     process.env.DB_HOST,
        port:     process.env.DB_PORT,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    };

const pool = new Pool(poolConfig);

// Test connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('PostgreSQL connection failed:', err.message);
    } else {
        console.log('PostgreSQL connected successfully');
        release();
    }
});

module.exports = pool;