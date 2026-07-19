// server/routes/fields.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ── Helper: Auto Calculate Crop Stage ────────
const getCropStage = (sowDate) => {
    if (!sowDate) return null;

    const today = new Date();
    const sow = new Date(sowDate);
    const daysSinceSowing = Math.floor(
        (today - sow) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceSowing < 0)   return 'not_started';
    if (daysSinceSowing <= 15) return 'sowing';
    if (daysSinceSowing <= 45) return 'vegetative';
    if (daysSinceSowing <= 90) return 'flowering';
    if (daysSinceSowing <= 120) return 'fruiting';
    return 'harvest';
};

// ── Helper: Auto Calculate Harvest Date ──────
const CROP_DURATION_DAYS = {
    rice:        120,
    wheat:       120,
    cotton:      180,
    maize:       90,
    sugarcane:   365,
    chickpea:    100,
    lentil:      110,
    mungbean:    65,
    pigeonpeas:  150,
    groundnut:   120,
    soybean:     100,
    bajra:       80,
    jowar:       110,
    tomato:      90,
    potato:      90,
    onion:       120,
};

const getHarvestDate = (sowDate, cropName) => {
    if (!sowDate || !cropName) return null;
    const duration = CROP_DURATION_DAYS[cropName.toLowerCase()] || 120;
    const harvest = new Date(sowDate);
    harvest.setDate(harvest.getDate() + duration);
    return harvest.toISOString().split('T')[0];
};

// ==============================================
// POST /api/farm/:farmId/fields
// Add a new field to farm
// ==============================================
router.post('/:farmId/fields', auth, requireProfile, [
    body('field_name')
        .trim()
        .notEmpty().withMessage('Field name is required'),
    body('field_size')
        .notEmpty().withMessage('Field size is required')
        .isFloat({ min: 0.1 }).withMessage('Field size must be greater than 0'),
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

        const { farmId } = req.params;

        // 2. Verify farm belongs to this user
        const farmCheck = await pool.query(
            `SELECT id FROM farms
             WHERE id = $1 AND user_id = $2`,
            [farmId, req.user.id]
        );

        if (farmCheck.rows.length === 0) {
            throw new AppError('Farm not found or access denied', 404);
        }

        // 3. Extract fields
        const {
            field_name,
            field_size,
            current_crop,
            sow_date,
        } = req.body;

        // 4. Auto calculate stage and harvest date
        const crop_stage = getCropStage(sow_date);
        const expected_harvest_date = getHarvestDate(sow_date, current_crop);
        const status = current_crop ? 'active' : 'empty';

        // 5. Insert field
        const result = await pool.query(
            `INSERT INTO fields (
                farm_id, field_name, field_size,
                current_crop, sow_date,
                expected_harvest_date,
                crop_stage, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [
                farmId, field_name, field_size,
                current_crop || null, sow_date || null,
                expected_harvest_date,
                crop_stage, status
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Field added successfully',
            field: result.rows[0]
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// GET /api/farm/:farmId/fields
// Get all fields of a farm
// ==============================================
router.get('/:farmId/fields', auth, requireProfile, async (req, res, next) => {
    try {
        const { farmId } = req.params;

        // Verify farm belongs to this user
        const farmCheck = await pool.query(
            `SELECT id FROM farms
             WHERE id = $1 AND user_id = $2`,
            [farmId, req.user.id]
        );

        if (farmCheck.rows.length === 0) {
            throw new AppError('Farm not found or access denied', 404);
        }

        // Get all fields
        const result = await pool.query(
            `SELECT
                id,
                field_name,
                field_size,
                current_crop,
                sow_date,
                expected_harvest_date,
                crop_stage,
                status,
                created_at,
                updated_at
             FROM fields
             WHERE farm_id = $1
             ORDER BY created_at ASC`,
            [farmId]
        );

        // Auto-update crop stage based on sow_date
        const fields = result.rows.map(field => ({
            ...field,
            crop_stage: getCropStage(field.sow_date) || field.crop_stage,
            days_since_sowing: field.sow_date
                ? Math.floor(
                    (new Date() - new Date(field.sow_date))
                    / (1000 * 60 * 60 * 24)
                  )
                : null,
            days_to_harvest: field.expected_harvest_date
                ? Math.floor(
                    (new Date(field.expected_harvest_date) - new Date())
                    / (1000 * 60 * 60 * 24)
                  )
                : null,
        }));

        res.json({
            success: true,
            total: fields.length,
            fields
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// PUT /api/fields/update/:fieldId
// Update a field
// ==============================================
router.put('/update/:fieldId', auth, requireProfile, async (req, res, next) => {
    try {
        const { fieldId } = req.params;

        // Verify field belongs to this user's farm
        const fieldCheck = await pool.query(
            `SELECT f.id FROM fields f
             JOIN farms fm ON fm.id = f.farm_id
             WHERE f.id = $1 AND fm.user_id = $2`,
            [fieldId, req.user.id]
        );

        if (fieldCheck.rows.length === 0) {
            throw new AppError('Field not found or access denied', 404);
        }

        const {
            field_name,
            field_size,
            current_crop,
            sow_date,
            status,
        } = req.body;

        // Auto recalculate if sow_date or crop changed
        const crop_stage = getCropStage(sow_date);
        const expected_harvest_date = getHarvestDate(sow_date, current_crop);

        const result = await pool.query(
            `UPDATE fields SET
                field_name            = COALESCE($1, field_name),
                field_size            = COALESCE($2, field_size),
                current_crop          = COALESCE($3, current_crop),
                sow_date              = COALESCE($4, sow_date),
                expected_harvest_date = COALESCE($5, expected_harvest_date),
                crop_stage            = COALESCE($6, crop_stage),
                status                = COALESCE($7, status),
                updated_at            = NOW()
             WHERE id = $8
             RETURNING *`,
            [
                field_name, field_size,
                current_crop, sow_date,
                expected_harvest_date,
                crop_stage, status,
                fieldId
            ]
        );

        res.json({
            success: true,
            message: 'Field updated successfully',
            field: result.rows[0]
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// DELETE /api/fields/delete/:fieldId
// Delete a field
// ==============================================
router.delete('/delete/:fieldId', auth, requireProfile, async (req, res, next) => {
    try {
        const { fieldId } = req.params;

        // Verify field belongs to this user's farm
        const fieldCheck = await pool.query(
            `SELECT f.id, f.field_name FROM fields f
             JOIN farms fm ON fm.id = f.farm_id
             WHERE f.id = $1 AND fm.user_id = $2`,
            [fieldId, req.user.id]
        );

        if (fieldCheck.rows.length === 0) {
            throw new AppError('Field not found or access denied', 404);
        }

        await pool.query(
            'DELETE FROM fields WHERE id = $1',
            [fieldId]
        );

        res.json({
            success: true,
            message: `Field deleted successfully`
        });

    } catch (err) {
        next(err);
    }
});

module.exports = router;