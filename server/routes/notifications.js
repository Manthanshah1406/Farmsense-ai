// server/routes/notifications.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { auth } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ==============================================
// GET /api/notifications/prefs
// Get notification preferences
// ==============================================
router.get('/prefs', auth, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                email_alerts,
                sms_alerts,
                alert_time,
                alert_types
             FROM notification_preferences
             WHERE user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            throw new AppError('Notification preferences not found', 404);
        }

        const prefs = result.rows[0];

        res.json({
            success: true,
            preferences: {
                id:           prefs.id,
                email_alerts: prefs.email_alerts,
                sms_alerts:   prefs.sms_alerts,
                alert_time:   prefs.alert_time,
                alert_types:  prefs.alert_types.split(','),
            }
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// PUT /api/notifications/prefs
// Update notification preferences
// ==============================================
router.put('/prefs', auth, [
    body('email_alerts')
        .optional()
        .isBoolean().withMessage('email_alerts must be true or false'),
    body('sms_alerts')
        .optional()
        .isBoolean().withMessage('sms_alerts must be true or false'),
    body('alert_time')
        .optional()
        .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
        .withMessage('alert_time must be in HH:MM format'),
    body('alert_types')
        .optional()
        .isArray().withMessage('alert_types must be an array'),
], async (req, res, next) => {
    try {
        // 1. Validate
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array().map(e => ({
                    field: e.path,
                    message: e.msg
                }))
            });
        }

        const {
            email_alerts,
            sms_alerts,
            alert_time,
            alert_types,
        } = req.body;

        // Prevent enabling SMS alerts if user does not have a valid phone number
        if (sms_alerts === true) {
            const userResult = await pool.query('SELECT phone FROM users WHERE id = $1', [req.user.id]);
            const userPhone = userResult.rows[0]?.phone;
            if (!userPhone || userPhone.trim() === '' || userPhone === '0000000000') {
                return res.status(400).json({
                    success: false,
                    error: 'Please add a valid phone number to your profile before enabling SMS notifications.'
                });
            }
        }

        // 2. Validate alert_types values
        const VALID_ALERT_TYPES = [
            'heavy_rain',
            'drought_risk',
            'heatwave',
            'frost_risk',
            'strong_wind',
            'fungal_risk',
            'good_sowing_window',
            'irrigation_needed',
        ];

        if (alert_types) {
            const invalid = alert_types.filter(
                t => !VALID_ALERT_TYPES.includes(t)
            );
            if (invalid.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid alert types: ${invalid.join(', ')}`,
                    valid_types: VALID_ALERT_TYPES
                });
            }
        }

        // 3. Update preferences
        const result = await pool.query(
            `UPDATE notification_preferences SET
                email_alerts = COALESCE($1, email_alerts),
                sms_alerts   = COALESCE($2, sms_alerts),
                alert_time   = COALESCE($3, alert_time),
                alert_types  = COALESCE($4, alert_types)
             WHERE user_id = $5
             RETURNING *`,
            [
                email_alerts  !== undefined ? email_alerts  : null,
                sms_alerts    !== undefined ? sms_alerts    : null,
                alert_time    || null,
                alert_types   ? alert_types.join(',') : null,
                req.user.id
            ]
        );

        const updated = result.rows[0];

        res.json({
            success: true,
            message: 'Notification preferences updated',
            preferences: {
                email_alerts: updated.email_alerts,
                sms_alerts:   updated.sms_alerts,
                alert_time:   updated.alert_time,
                alert_types:  updated.alert_types.split(','),
            }
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// POST /api/notifications/test-email
// Send a test email to verify setup
// ==============================================
router.post('/test-email', auth, async (req, res, next) => {
    try {
        const { sendTestEmail } = require('../services/emailService');
        await sendTestEmail(req.user.email, req.user.name);
        res.json({
            success: true,
            message: `Test email sent to ${req.user.email}`
        });
    } catch (err) {
        console.error('[EMAIL ERROR]', err.message);
        res.status(500).json({
            success: false,
            error: 'Failed to send test email.',
            detail: err.message
        });
    }
});

module.exports = router;