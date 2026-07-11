// server/middleware/auth.js

const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// ── Middleware 1: Verify JWT Token ────────────
const auth = async (req, res, next) => {
    try {
        // 1. Check header exists
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Access denied. No token provided.'
            });
        }

        // 2. Extract token
        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Access denied. Token missing.'
            });
        }

        // 3. Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // 4. Check user still exists in DB
        const result = await pool.query(
            `SELECT
                id,
                name,
                email,
                phone,
                profile_completed,
                is_email_verified,
                preferred_language
            FROM users
            WHERE id = $1`,
            [decoded.id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'User no longer exists.'
            });
        }

        // 5. Attach user + login_id to request
        req.user = result.rows[0];
        req.login_id = decoded.login_id || null;

        next();

    } catch (err) {
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                error: 'Invalid token.'
            });
        }
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                error: 'Token expired. Please login again.'
            });
        }
        next(err);
    }
};

// ── Middleware 2: Check Profile Completed ─────
const requireProfile = (req, res, next) => {
    if (!req.user.profile_completed) {
        return res.status(403).json({
            error: 'Please complete your farm profile first.',
            redirect: '/onboarding'
        });
    }
    next();
};

// ── Middleware 3: Check Email Verified ────────
const requireEmailVerified = (req, res, next) => {
    if (!req.user.is_email_verified) {
        return res.status(403).json({
            error: 'Please verify your email address first.',
            redirect: '/verify-email'
        });
    }
    next();
};

module.exports = { auth, requireProfile, requireEmailVerified };