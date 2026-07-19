// server/routes/farm.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { geocodeAddress } = require('../services/geocoder');

// ── Helper: Detect Season from Month ─────────
const detectSeason = () => {
    const month = new Date().getMonth() + 1; // 1-12
    if (month >= 6 && month <= 10) return 'Kharif';
    if (month >= 11 || month <= 3) return 'Rabi';
    return 'Zaid';
};

// ==============================================
// POST /api/farm/setup
// One-time farm profile creation (onboarding)
// ==============================================
router.post('/setup', auth, [
    body('farm_name')
        .trim()
        .notEmpty().withMessage('Farm name is required'),
    body('state')
        .trim()
        .notEmpty().withMessage('State is required'),
    body('district')
        .trim()
        .notEmpty().withMessage('District is required'),
    body('pincode')
        .trim()
        .notEmpty().withMessage('Pincode is required')
        .isLength({ min: 6, max: 6 }).withMessage('Pincode must be 6 digits')
        .isNumeric().withMessage('Pincode must be numeric'),
    body('farm_area')
        .notEmpty().withMessage('Farm area is required')
        .isFloat({ min: 0.1 }).withMessage('Farm area must be greater than 0'),
    body('soil_type')
        .notEmpty().withMessage('Soil type is required')
        .isIn(['black', 'sandy', 'loamy', 'clay', 'red', 'silt'])
        .withMessage('Invalid soil type'),
], async (req, res, next) => {
    try {
        // 1. Validate inputs
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

        // 2. Check farm not already created
        const existing = await pool.query(
            'SELECT id FROM farms WHERE user_id = $1',
            [req.user.id]
        );
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Farm profile already exists. Use update instead.'
            });
        }

        // 3. Extract all fields
        const {
            farm_name,
            country = 'India',
            state,
            district,
            taluka,
            village,
            pincode,
            farm_area,
            area_unit = 'acre',
            soil_type,
            irrigation_type,
            water_source,
            npk_nitrogen,
            npk_phosphorus,
            npk_potassium,
            ph_level,
            current_crop,
            sow_date,
        } = req.body;

        // 4. Geocode address → get lat/lon
        const geoResult = await geocodeAddress(
            village, taluka, district, state, pincode
        );

        if (geoResult.success) {
            console.log(`[FARM SETUP] Geocoded: ${geoResult.latitude}, ${geoResult.longitude}`);
        } else {
            console.log('[FARM SETUP] Geocoding failed — saving without coordinates');
        }

        // 5. Detect current season
        const current_season = detectSeason();

        // 6. Insert farm
        const result = await pool.query(
            `INSERT INTO farms (
                user_id, farm_name,
                country, state, district, taluka, village, pincode,
                latitude, longitude,
                farm_area, area_unit,
                soil_type, irrigation_type, water_source,
                npk_nitrogen, npk_phosphorus, npk_potassium, ph_level,
                current_crop, sow_date,
                current_season
            ) VALUES (
                $1, $2,
                $3, $4, $5, $6, $7, $8,
                $9, $10,
                $11, $12,
                $13, $14, $15,
                $16, $17, $18, $19,
                $20, $21,
                $22
            ) RETURNING *`,
            [
                req.user.id, farm_name,
                country, state, district, taluka || null, village || null, pincode,
                geoResult.latitude, geoResult.longitude,
                farm_area, area_unit,
                soil_type, irrigation_type || null, water_source || null,
                npk_nitrogen || null, npk_phosphorus || null,
                npk_potassium || null, ph_level || null,
                current_crop || null, sow_date || null,
                current_season
            ]
        );

        const farm = result.rows[0];

        // 7. Mark profile as completed
        await pool.query(
            `UPDATE users
             SET profile_completed = TRUE
             WHERE id = $1`,
            [req.user.id]
        );

        res.status(201).json({
            success: true,
            message: 'Farm profile created successfully',
            farm,
            geocoding: {
                success: geoResult.success,
                coordinates: geoResult.success
                    ? { lat: geoResult.latitude, lon: geoResult.longitude }
                    : null,
            }
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// GET /api/farm/me
// Get complete farm profile
// ==============================================
router.get('/me', auth, requireProfile, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                f.*,
                u.name AS farmer_name,
                u.email,
                u.phone
             FROM farms f
             JOIN users u ON u.id = f.user_id
             WHERE f.user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        // Get fields count
        const fieldsCount = await pool.query(
            `SELECT COUNT(*) FROM fields WHERE farm_id = $1`,
            [result.rows[0].id]
        );

        // Get active alerts count
        const alertsCount = await pool.query(
            `SELECT COUNT(*) FROM alerts
             WHERE farm_id = $1 AND is_read = FALSE`,
            [result.rows[0].id]
        );

        res.json({
            success: true,
            farm: result.rows[0],
            stats: {
                total_fields: parseInt(fieldsCount.rows[0].count),
                unread_alerts: parseInt(alertsCount.rows[0].count),
            }
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// PUT /api/farm/update
// Update farm details
// ==============================================
router.put('/update', auth, requireProfile, async (req, res, next) => {
    try {
        const {
            farm_name,
            soil_type,
            irrigation_type,
            water_source,
            farm_area,
            area_unit,
            current_crop,
            sow_date,
        } = req.body;

        const result = await pool.query(
            `UPDATE farms SET
                farm_name      = COALESCE($1, farm_name),
                soil_type      = COALESCE($2, soil_type),
                irrigation_type= COALESCE($3, irrigation_type),
                water_source   = COALESCE($4, water_source),
                farm_area      = COALESCE($5, farm_area),
                area_unit      = COALESCE($6, area_unit),
                current_crop   = COALESCE($7, current_crop),
                sow_date       = COALESCE($8, sow_date),
                updated_at     = NOW()
             WHERE user_id = $9
             RETURNING *`,
            [
                farm_name, soil_type, irrigation_type,
                water_source, farm_area, area_unit,
                current_crop, sow_date,
                req.user.id
            ]
        );

        res.json({
            success: true,
            message: 'Farm updated successfully',
            farm: result.rows[0]
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// PUT /api/farm/soil-profile
// Update NPK and pH values
// ==============================================
router.put('/soil-profile', auth, requireProfile, [
    body('npk_nitrogen')
        .optional()
        .isFloat({ min: 0, max: 140 }).withMessage('Nitrogen must be 0-140'),
    body('npk_phosphorus')
        .optional()
        .isFloat({ min: 0, max: 145 }).withMessage('Phosphorus must be 0-145'),
    body('npk_potassium')
        .optional()
        .isFloat({ min: 0, max: 205 }).withMessage('Potassium must be 0-205'),
    body('ph_level')
        .optional()
        .isFloat({ min: 3.5, max: 9.9 }).withMessage('pH must be 3.5-9.9'),
], async (req, res, next) => {
    try {
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

        const { npk_nitrogen, npk_phosphorus, npk_potassium, ph_level } = req.body;

        const result = await pool.query(
            `UPDATE farms SET
                npk_nitrogen   = COALESCE($1, npk_nitrogen),
                npk_phosphorus = COALESCE($2, npk_phosphorus),
                npk_potassium  = COALESCE($3, npk_potassium),
                ph_level       = COALESCE($4, ph_level),
                updated_at     = NOW()
             WHERE user_id = $5
             RETURNING
                npk_nitrogen, npk_phosphorus,
                npk_potassium, ph_level`,
            [npk_nitrogen, npk_phosphorus, npk_potassium, ph_level, req.user.id]
        );

        res.json({
            success: true,
            message: 'Soil profile updated successfully',
            soil_profile: result.rows[0]
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// GET /api/farm/profile-status
// Check if farm profile is completed
// ==============================================
router.get('/profile-status', auth, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                u.profile_completed,
                u.is_email_verified,
                f.id           AS farm_id,
                f.npk_nitrogen,
                f.npk_phosphorus,
                f.npk_potassium,
                f.ph_level,
                f.latitude,
                f.longitude
             FROM users u
             LEFT JOIN farms f ON f.user_id = u.id
             WHERE u.id = $1`,
            [req.user.id]
        );

        const data = result.rows[0];

        // Check what's missing
        const missing = [];
        if (!data.profile_completed) missing.push('farm_profile');
        if (!data.is_email_verified)  missing.push('email_verification');
        if (!data.npk_nitrogen)       missing.push('soil_nitrogen');
        if (!data.npk_phosphorus)     missing.push('soil_phosphorus');
        if (!data.npk_potassium)      missing.push('soil_potassium');
        if (!data.ph_level)           missing.push('soil_ph');
        if (!data.latitude)           missing.push('geocoding');

        res.json({
            success: true,
            profile_completed: data.profile_completed,
            is_email_verified: data.is_email_verified,
            has_soil_profile: !!(data.npk_nitrogen && data.npk_phosphorus
                                 && data.npk_potassium && data.ph_level),
            has_coordinates: !!(data.latitude && data.longitude),
            missing,
            ai_ready: missing.length === 0,
        });

    } catch (err) {
        next(err);
    }
});

// PUT /api/farm/coordinates
// Manually set lat/lon if geocoding failed
router.put('/coordinates', auth, requireProfile, [
    body('latitude')
        .notEmpty().withMessage('Latitude is required')
        .isFloat({ min: 6, max: 38 }).withMessage('Invalid latitude for India'),
    body('longitude')
        .notEmpty().withMessage('Longitude is required')
        .isFloat({ min: 68, max: 98 }).withMessage('Invalid longitude for India'),
], async (req, res, next) => {
    try {
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

        const { latitude, longitude } = req.body;

        await pool.query(
            `UPDATE farms
             SET latitude = $1,
                 longitude = $2,
                 updated_at = NOW()
             WHERE user_id = $3`,
            [latitude, longitude, req.user.id]
        );

        res.json({
            success: true,
            message: 'Coordinates updated successfully',
            coordinates: { latitude, longitude }
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;