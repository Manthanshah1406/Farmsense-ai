// server/routes/alerts.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ==============================================
// GET /api/alerts
// Get active (unread) alerts for farm
// ==============================================
router.get('/', auth, requireProfile, async (req, res, next) => {
    try {
        // Get farm_id for this user
        const farmResult = await pool.query(
            'SELECT id FROM farms WHERE user_id = $1',
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farmId = farmResult.rows[0].id;

        // Query filters
        const { severity, type, limit = 20 } = req.query;

        let query = `
            SELECT
                id,
                alert_type,
                severity,
                title,
                message,
                alert_date,
                is_read,
                is_sent_email,
                is_sent_sms,
                created_at
            FROM alerts
            WHERE farm_id = $1
              AND is_read = FALSE
        `;

        const params = [farmId];

        // Optional severity filter
        // e.g. GET /api/alerts?severity=critical
        if (severity) {
            params.push(severity);
            query += ` AND severity = $${params.length}`;
        }

        // Optional type filter
        // e.g. GET /api/alerts?type=heavy_rain
        if (type) {
            params.push(type);
            query += ` AND alert_type = $${params.length}`;
        }

        query += ` ORDER BY
                    CASE severity
                        WHEN 'critical' THEN 1
                        WHEN 'warning'  THEN 2
                        WHEN 'positive' THEN 3
                        ELSE 4
                    END,
                    created_at DESC
                   LIMIT $${params.length + 1}`;

        params.push(limit);

        const result = await pool.query(query, params);

        // Count by severity
        const countResult = await pool.query(
            `SELECT
                severity,
                COUNT(*) as count
             FROM alerts
             WHERE farm_id = $1 AND is_read = FALSE
             GROUP BY severity`,
            [farmId]
        );

        const counts = { critical: 0, warning: 0, positive: 0 };
        countResult.rows.forEach(row => {
            counts[row.severity] = parseInt(row.count);
        });

        res.json({
            success: true,
            total_unread: result.rows.length,
            counts,
            alerts: result.rows
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// GET /api/alerts/history
// Get all past alerts (read + unread)
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
        const { page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        const result = await pool.query(
            `SELECT
                id,
                alert_type,
                severity,
                title,
                message,
                alert_date,
                is_read,
                created_at
             FROM alerts
             WHERE farm_id = $1
             ORDER BY created_at DESC
             LIMIT $2 OFFSET $3`,
            [farmId, limit, offset]
        );

        // Total count for pagination
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM alerts WHERE farm_id = $1',
            [farmId]
        );

        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            total,
            page: parseInt(page),
            total_pages: Math.ceil(total / limit),
            alerts: result.rows
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// PUT /api/alerts/:alertId/read
// Mark single alert as read
// ==============================================
router.put('/:alertId/read', auth, requireProfile, async (req, res, next) => {
    try {
        const { alertId } = req.params;

        // Verify alert belongs to this user's farm
        const check = await pool.query(
            `SELECT a.id FROM alerts a
             JOIN farms f ON f.id = a.farm_id
             WHERE a.id = $1 AND f.user_id = $2`,
            [alertId, req.user.id]
        );

        if (check.rows.length === 0) {
            throw new AppError('Alert not found or access denied', 404);
        }

        await pool.query(
            `UPDATE alerts
             SET is_read = TRUE
             WHERE id = $1`,
            [alertId]
        );

        res.json({
            success: true,
            message: 'Alert marked as read'
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// PUT /api/alerts/read-all
// Mark ALL alerts as read
// ==============================================
router.put('/read-all', auth, requireProfile, async (req, res, next) => {
    try {
        const farmResult = await pool.query(
            'SELECT id FROM farms WHERE user_id = $1',
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const result = await pool.query(
            `UPDATE alerts
             SET is_read = TRUE
             WHERE farm_id = $1
               AND is_read = FALSE`,
            [farmResult.rows[0].id]
        );

        res.json({
            success: true,
            message: `${result.rowCount} alerts marked as read`
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;