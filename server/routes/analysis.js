// server/routes/analysis.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ==============================================
// GET /api/analysis/latest
// Get latest AI analysis result for farm
// ==============================================
router.get('/latest', auth, requireProfile, async (req, res, next) => {
    try {
        // Get farm
        const farmResult = await pool.query(
            'SELECT id, current_season, last_ai_run FROM farms WHERE user_id = $1',
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farm = farmResult.rows[0];

        // Get latest analysis
        const result = await pool.query(
            `SELECT *
             FROM ai_analysis_results
             WHERE farm_id = $1
             ORDER BY created_at DESC
             LIMIT 1`,
            [farm.id]
        );

        // No analysis yet
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                has_analysis: false,
                message: 'No analysis available yet. Run analysis first.',
                farm_id: farm.id,
                last_ai_run: farm.last_ai_run,
            });
        }

        const analysis = result.rows[0];

        res.json({
            success: true,
            has_analysis: true,
            last_ai_run: farm.last_ai_run,
            current_season: farm.current_season,
            analysis: {
                id: analysis.id,

                // Crop Recommendation
                crop_recommendation: {
                    recommended_crop:       analysis.recommended_crop,
                    suitability_score:      analysis.crop_suitability_score,
                    all_recommendations:    analysis.all_crop_recommendations,
                },

                // Fertilizer
                fertilizer_plan: {
                    recommended_fertilizer: analysis.recommended_fertilizer,
                    quantity:               analysis.fertilizer_quantity,
                    timing:                 analysis.fertilizer_timing,
                },

                // Irrigation
                irrigation_plan: {
                    irrigation_need:        analysis.irrigation_need,
                    water_amount_mm:        analysis.water_amount_mm,
                    next_irrigation_date:   analysis.next_irrigation_date,
                    frequency:              analysis.irrigation_frequency,
                },

                // Yield Prediction
                yield_prediction: {
                    yield_per_acre:         analysis.predicted_yield_per_acre,
                    total_yield:            analysis.total_predicted_yield,
                    confidence:             analysis.yield_confidence,
                },

                // Profit Estimate
                profit_estimate: {
                    market_price_per_quintal: analysis.market_price_per_quintal,
                    gross_revenue:            analysis.gross_revenue,
                    total_input_cost:         analysis.total_input_cost,
                    net_profit:               analysis.net_profit,
                    roi_percent:              analysis.roi_percent,
                },

                // Meta
                season:           analysis.season,
                weather_snapshot: analysis.weather_snapshot,
                created_at:       analysis.created_at,
            }
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// POST /api/analysis/run
// Manually trigger full AI pipeline
// (Django not ready yet — saves mock data)
// ==============================================
router.post('/run', auth, requireProfile, async (req, res, next) => {
    try {
        // Get farm with all details
        const farmResult = await pool.query(
            `SELECT * FROM farms WHERE user_id = $1`,
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farm = farmResult.rows[0];

        // Check farm has coordinates for weather
        if (!farm.latitude || !farm.longitude) {
            return res.status(400).json({
                success: false,
                error: 'Farm location coordinates not available. Please update your farm address.'
            });
        }

        // Check farm has soil profile for AI
        if (!farm.npk_nitrogen || !farm.npk_phosphorus ||
            !farm.npk_potassium || !farm.ph_level) {
            return res.status(400).json({
                success: false,
                error: 'Soil profile incomplete. Please add N, P, K and pH values.'
            });
        }

        // ── TODO: Call Django AI pipeline ────────
        // When Django is ready, replace mock data with:
        // const aiEngineClient = require('../services/aiEngineClient');
        // const aiResult = await aiEngineClient.runFullPipeline(farm);

        // ── Mock AI Result (until Django is ready) ─
        const mockAnalysis = {
            recommended_crop:          'cotton',
            crop_suitability_score:    87.3,
            all_crop_recommendations:  [
                { crop: 'cotton', score: 87.3 },
                { crop: 'maize',  score: 71.2 },
                { crop: 'rice',   score: 65.8 },
            ],
            recommended_fertilizer:    'DAP',
            fertilizer_quantity:       '50 kg/acre',
            fertilizer_timing:         'Apply within next 3 days before rain',
            irrigation_need:           'Medium',
            water_amount_mm:           35.0,
            next_irrigation_date:      new Date(Date.now() + 4 * 86400000)
                                           .toISOString().split('T')[0],
            irrigation_frequency:      'Every 4 days',
            predicted_yield_per_acre:  8.5,
            total_predicted_yield:     8.5 * farm.farm_area,
            yield_confidence:          'medium',
            market_price_per_quintal:  6200,
            gross_revenue:             (8.5 * farm.farm_area) * 6200,
            total_input_cost:          18000 * farm.farm_area,
            net_profit:                ((8.5 * farm.farm_area) * 6200)
                                       - (18000 * farm.farm_area),
            roi_percent:               parseFloat(
                                         ((((8.5 * farm.farm_area) * 6200)
                                         - (18000 * farm.farm_area))
                                         / (18000 * farm.farm_area) * 100)
                                         .toFixed(1)
                                       ),
            season:                    farm.current_season,
            weather_snapshot: {
                avg_temp:     32.1,
                avg_humidity: 74,
                rainfall:     85,
                source:       'mock_data'
            },
        };

        // Save analysis result to DB
        const saved = await pool.query(
            `INSERT INTO ai_analysis_results (
                farm_id,
                recommended_crop, crop_suitability_score,
                all_crop_recommendations,
                recommended_fertilizer, fertilizer_quantity,
                fertilizer_timing,
                irrigation_need, water_amount_mm,
                next_irrigation_date, irrigation_frequency,
                predicted_yield_per_acre, total_predicted_yield,
                yield_confidence,
                market_price_per_quintal, gross_revenue,
                total_input_cost, net_profit, roi_percent,
                season, weather_snapshot,
                full_analysis
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9,
                $10, $11, $12, $13, $14, $15, $16,
                $17, $18, $19, $20, $21, $22
            ) RETURNING id, created_at`,
            [
                farm.id,
                mockAnalysis.recommended_crop,
                mockAnalysis.crop_suitability_score,
                JSON.stringify(mockAnalysis.all_crop_recommendations),
                mockAnalysis.recommended_fertilizer,
                mockAnalysis.fertilizer_quantity,
                mockAnalysis.fertilizer_timing,
                mockAnalysis.irrigation_need,
                mockAnalysis.water_amount_mm,
                mockAnalysis.next_irrigation_date,
                mockAnalysis.irrigation_frequency,
                mockAnalysis.predicted_yield_per_acre,
                mockAnalysis.total_predicted_yield,
                mockAnalysis.yield_confidence,
                mockAnalysis.market_price_per_quintal,
                mockAnalysis.gross_revenue,
                mockAnalysis.total_input_cost,
                mockAnalysis.net_profit,
                mockAnalysis.roi_percent,
                mockAnalysis.season,
                JSON.stringify(mockAnalysis.weather_snapshot),
                JSON.stringify(mockAnalysis),
            ]
        );

        // Update last_ai_run in farms table
        await pool.query(
            `UPDATE farms
             SET last_ai_run = NOW()
             WHERE id = $1`,
            [farm.id]
        );

        res.json({
            success: true,
            message: 'AI analysis completed successfully',
            analysis_id: saved.rows[0].id,
            created_at: saved.rows[0].created_at,
            note: 'Mock data used — Django AI engine will replace this',
            summary: {
                recommended_crop:  mockAnalysis.recommended_crop,
                suitability_score: mockAnalysis.crop_suitability_score,
                net_profit:        mockAnalysis.net_profit,
                irrigation_need:   mockAnalysis.irrigation_need,
                fertilizer:        mockAnalysis.recommended_fertilizer,
            }
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// GET /api/analysis/history
// Get all past analysis results
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

        const { limit = 10 } = req.query;

        const result = await pool.query(
            `SELECT
                id,
                recommended_crop,
                crop_suitability_score,
                irrigation_need,
                recommended_fertilizer,
                net_profit,
                roi_percent,
                season,
                created_at
             FROM ai_analysis_results
             WHERE farm_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [farmResult.rows[0].id, limit]
        );

        res.json({
            success: true,
            total: result.rows.length,
            history: result.rows
        });

    } catch (err) {
        next(err);
    }
});

// POST /api/analysis/trigger-job
// Manually trigger daily job for testing
router.post('/trigger-job', auth, async (req, res, next) => {
    try {
        const { runDailyJob } = require('../services/scheduler');
        await runDailyJob();
        res.json({
            success: true,
            message: 'Daily job triggered successfully'
        });
    } catch (err) {
        next(err);
    }
});

// GET /api/analysis/django-status
// Check if Django AI engine is running
router.get('/django-status', auth, async (req, res, next) => {
    try {
        const aiClient = require('../services/aiEngineClient');
        const status = await aiClient.checkDjangoHealth();

        res.json({
            success: true,
            django: {
                online:  status.online,
                message: status.online
                    ? 'Django AI engine is running'
                    : 'Django AI engine is offline',
                error: status.error || null,
            }
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;