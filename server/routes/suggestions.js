// server/routes/suggestions.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ==============================================
// GET /api/suggestions
// Get today's AI suggestions for farm
// ==============================================
router.get('/', auth, requireProfile, async (req, res, next) => {
    try {
        // Get farm_id
        const farmResult = await pool.query(
            'SELECT id FROM farms WHERE user_id = $1',
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farmId = farmResult.rows[0].id;

        // Query filters
        const { category, priority, date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        let query = `
            SELECT
                s.id,
                s.category,
                s.title,
                s.suggestion_text,
                s.priority,
                s.valid_for_date,
                s.is_read,
                s.created_at,
                f.field_name,
                f.current_crop,
                f.crop_stage
            FROM ai_suggestions s
            LEFT JOIN fields f ON f.id = s.field_id
            WHERE s.farm_id = $1
              AND s.valid_for_date = $2
        `;

        const params = [farmId, targetDate];

        // Optional category filter
        // e.g. GET /api/suggestions?category=irrigation
        if (category) {
            params.push(category);
            query += ` AND s.category = $${params.length}`;
        }

        // Optional priority filter
        // e.g. GET /api/suggestions?priority=high
        if (priority) {
            params.push(priority);
            query += ` AND s.priority = $${params.length}`;
        }

        query += ` ORDER BY
                    CASE s.priority
                        WHEN 'high'   THEN 1
                        WHEN 'medium' THEN 2
                        WHEN 'low'    THEN 3
                    END,
                    s.created_at DESC`;

        const result = await pool.query(query, params);

        // Count by category
        const countResult = await pool.query(
            `SELECT category, COUNT(*) as count
             FROM ai_suggestions
             WHERE farm_id = $1
               AND valid_for_date = $2
             GROUP BY category`,
            [farmId, targetDate]
        );

        const categoryCounts = {};
        countResult.rows.forEach(row => {
            categoryCounts[row.category] = parseInt(row.count);
        });

        res.json({
            success: true,
            date: targetDate,
            total: result.rows.length,
            category_counts: categoryCounts,
            suggestions: result.rows
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// PUT /api/suggestions/:suggestionId/read
// Mark suggestion as read
// ==============================================
router.put('/:suggestionId/read', auth, requireProfile, async (req, res, next) => {
    try {
        const { suggestionId } = req.params;

        // Verify suggestion belongs to this user's farm
        const check = await pool.query(
            `SELECT s.id FROM ai_suggestions s
             JOIN farms f ON f.id = s.farm_id
             WHERE s.id = $1 AND f.user_id = $2`,
            [suggestionId, req.user.id]
        );

        if (check.rows.length === 0) {
            throw new AppError('Suggestion not found or access denied', 404);
        }

        await pool.query(
            `UPDATE ai_suggestions
             SET is_read = TRUE
             WHERE id = $1`,
            [suggestionId]
        );

        res.json({
            success: true,
            message: 'Suggestion marked as read'
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// GET /api/suggestions/history
// Get past suggestions (last 7 days)
// ==============================================
router.get('/history', auth, requireProfile, async (req, res, next) => {
    try {
        const farmResult = await pool.query(
            'SELECT id FROM farms WHERE user_id = $1',
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farmId = farmResult.rows[0].id;
        const { days = 7 } = req.query;

        const result = await pool.query(
            `SELECT
                s.id,
                s.category,
                s.title,
                s.suggestion_text,
                s.priority,
                s.valid_for_date,
                s.is_read,
                s.created_at,
                f.field_name,
                f.current_crop
             FROM ai_suggestions s
             LEFT JOIN fields f ON f.id = s.field_id
             WHERE s.farm_id = $1
               AND s.valid_for_date >= CURRENT_DATE - $2::interval
             ORDER BY s.valid_for_date DESC, s.created_at DESC`,
            [farmId, `${days} days`]
        );

        res.json({
            success: true,
            days: parseInt(days),
            total: result.rows.length,
            suggestions: result.rows
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;