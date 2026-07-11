// server/middleware/errorHandler.js

// ── Custom Error Class ────────────────────────
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

// ── Global Error Handler ──────────────────────
const errorHandler = (err, req, res, next) => {

    // Default values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal server error';

    // ── PostgreSQL Errors ─────────────────────
    if (err.code === '23505') {
        // Unique constraint violation
        // e.g. duplicate email or phone
        statusCode = 400;

        if (err.detail && err.detail.includes('email')) {
            message = 'Email already registered';
        } else if (err.detail && err.detail.includes('phone')) {
            message = 'Phone number already registered';
        } else {
            message = 'Duplicate entry — record already exists';
        }
    }

    if (err.code === '23503') {
        // Foreign key violation
        // e.g. farm_id doesn't exist
        statusCode = 400;
        message = 'Referenced record does not exist';
    }

    if (err.code === '23502') {
        // Not null violation
        // e.g. required field missing
        statusCode = 400;
        message = `Required field missing: ${err.column}`;
    }

    if (err.code === '22P02') {
        // Invalid input syntax
        // e.g. string passed where number expected
        statusCode = 400;
        message = 'Invalid data format provided';
    }

    // ── JWT Errors ────────────────────────────
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired. Please login again.';
    }

    // ── Log error in development ──────────────
    if (process.env.NODE_ENV === 'development') {
        console.error('-----------------------------');
        console.error('[ERROR]', err.message);
        console.error('Status:', statusCode);
        console.error('Path:', req.path);
        console.error('Method:', req.method);
        if (err.code) console.error('PG Code:', err.code);
        console.error('-----------------------------');
    }

    // ── Send response ─────────────────────────
    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            detail: err.detail || null,
            stack: err.stack,
        })
    });
};

module.exports = { errorHandler, AppError };