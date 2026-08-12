// server/routes/analysis.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ── Crop Market Price Lookup ──────────────────
// Returns estimated market price (₹/quintal) for a given crop name
// Based on average modal prices from price_agriculture_cleaned.csv
const CROP_PRICES = {
    // Vegetables
    'bhindi':           4350,  'ladyfinger':       4350,
    'brinjal':          2450,  'eggplant':         2450,
    'cabbage':          2700,
    'cauliflower':      7250,
    'coriander':        8850,
    'ginger':           10822,
    'greenchilli':      7550,  'chilli':           7550,
    'guar':             7350,
    'lemon':            2200,
    'onion':            1800,
    'tomato':           2500,
    'potato':           1500,
    'garlic':           6000,
    'okra':             4350,
    // Grains & Cereals
    'rice':             2500,  'paddy':            2500,
    'wheat':            2200,
    'maize':            1900,  'corn':             1900,
    'jowar':            2800,  'sorghum':          2800,
    'bajra':            2400,  'millet':           2400,
    'barley':           1800,
    // Pulses
    'moong':            7500,  'greengramme':      7500,
    'urad':             6500,  'blackgram':        6500,
    'tur':              6800,  'arhar':            6800,  'pigeonpea':        6800,
    'chana':            5500,  'chickpea':         5500,
    'lentil':           5800,  'masur':            5800,
    // Oilseeds
    'soybean':          4500,  'soya':             4500,
    'groundnut':        5500,  'peanut':           5500,
    'sunflower':        5800,
    'mustard':          5200,  'rapeseed':         5200,
    'sesame':           9000,  'til':              9000,
    'castor':           5000,
    // Cash Crops
    'cotton':           7000,
    'sugarcane':         350,
    'jute':             4500,
    'tobacco':          8000,
    // Fruits
    'mango':            4000,
    'banana':           2000,
    'papaya':           1500,
    'muskmelon':        2800,  'cantaloupe':       2800,
    'watermelon':       1200,
    'pomegranate':      8000,
    'grapes':           6000,
};

const getMarketPrice = (cropName) => {
    if (!cropName) return 0;
    if (typeof cropName !== 'string') cropName = String(cropName);
    const key = cropName.toLowerCase().replace(/[\s\-_]/g, '');
    // Direct match
    if (CROP_PRICES[key]) return CROP_PRICES[key];
    // Partial match
    for (const [k, v] of Object.entries(CROP_PRICES)) {
        if (key.includes(k) || k.includes(key)) return v;
    }
    return 3000; // fallback average
};

// Input cost estimate per acre (₹)
const INPUT_COST_PER_ACRE = {
    'rice': 15000, 'paddy': 15000,
    'wheat': 12000,
    'cotton': 20000,
    'sugarcane': 25000,
    'soybean': 10000,
    'groundnut': 14000,
    'default': 12000,
};

const getInputCost = (cropName, area) => {
    if (!cropName || !area) return 0;
    if (typeof cropName !== 'string') cropName = String(cropName);
    const key = cropName.toLowerCase().replace(/[\s\-_]/g, '');
    let costPerAcre = INPUT_COST_PER_ACRE.default;
    for (const [k, v] of Object.entries(INPUT_COST_PER_ACRE)) {
        if (key.includes(k) || k.includes(key)) { costPerAcre = v; break; }
    }
    return Math.round(costPerAcre * area);
};

// Calculate a yield multiplier based on NPK and pH values
// Output is roughly 0.7 (poor soil) to 1.3 (optimal soil)
const getSoilHealthModifier = (farm) => {
    let score = 1.0;

    // N (Nitrogen) - Optimal ~ 50-100
    if (farm.npk_nitrogen < 20) score -= 0.1;
    else if (farm.npk_nitrogen > 40 && farm.npk_nitrogen <= 100) score += 0.1;
    else if (farm.npk_nitrogen > 130) score -= 0.05; // Over-fertilized

    // P (Phosphorus) - Optimal ~ 40-80
    if (farm.npk_phosphorus < 20) score -= 0.1;
    else if (farm.npk_phosphorus > 35 && farm.npk_phosphorus <= 80) score += 0.1;

    // K (Potassium) - Optimal ~ 40-80
    if (farm.npk_potassium < 20) score -= 0.1;
    else if (farm.npk_potassium > 35 && farm.npk_potassium <= 80) score += 0.1;

    // pH - Optimal ~ 6.0-7.5
    if (farm.ph_level < 5.5 || farm.ph_level > 8.0) score -= 0.15;
    else if (farm.ph_level >= 6.0 && farm.ph_level <= 7.5) score += 0.05;

    // Clamp between 0.6 and 1.4 to prevent wild swings
    return Math.max(0.6, Math.min(1.4, score));
};

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

        const aiClient = require('../services/aiEngineClient');
        
        // Fetch weather
        let weatherForecast = [];
        try {
            weatherForecast = (await aiClient.getWeatherForecast(farm.latitude, farm.longitude)) || [];
        } catch(e) {
            console.error('Weather error during analysis:', e);
        }

        // Run AI pipeline
        const aiResult = await aiClient.generateSuggestions(farm, weatherForecast);
        const preds = aiResult.ml_predictions;

        // 1 t/ha = 4.0468 quintals/acre
        const soilModifier = getSoilHealthModifier(farm);
        const yield_t_ha = (preds.predicted_yield || 0) * soilModifier;
        const yield_q_acre = Math.round(yield_t_ha * 4.0468 * 10) / 10;
        const total_yield_quintals = Math.round(yield_q_acre * farm.farm_area);
        const market_price_per_quintal = getMarketPrice(preds.recommended_crop || farm.current_crop);
        const input_cost = getInputCost(preds.recommended_crop || farm.current_crop, farm.farm_area);
        const rev = Math.round(total_yield_quintals * market_price_per_quintal);

        const analysisData = {
            recommended_crop:          preds.recommended_crop || 'Unknown',
            crop_suitability_score:    0, // not provided by basic model
            all_crop_recommendations:  preds.all_crop_recommendations || [{ crop: preds.recommended_crop, score: 100 }],
            recommended_fertilizer:    preds.recommended_fertilizer || 'Unknown',
            fertilizer_quantity:       'Based on AI recommendation',
            fertilizer_timing:         'Based on AI recommendation',
            irrigation_need:           preds.irrigation_need || 'Unknown',
            water_amount_mm:           0,
            next_irrigation_date:      new Date(Date.now() + 86400000).toISOString().split('T')[0],
            irrigation_frequency:      'AI recommended',
            predicted_yield_per_acre:  yield_q_acre,
            total_predicted_yield:     total_yield_quintals,
            yield_confidence:          'high',
            market_price_per_quintal:  market_price_per_quintal,
            gross_revenue:             rev,
            total_input_cost:          input_cost,
            net_profit:                rev - input_cost,
            roi_percent:               input_cost > 0 ? Math.round(((rev - input_cost) / input_cost) * 100) : 0,
            season:                    farm.current_season,
            weather_snapshot: {
                temp: weatherForecast?.weather?.temperature || 30,
                rainfall: weatherForecast?.weather?.rainfall || 0,
                source: 'open-meteo'
            },
            full_analysis: aiResult
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
                analysisData.recommended_crop,
                analysisData.crop_suitability_score,
                JSON.stringify(analysisData.all_crop_recommendations),
                analysisData.recommended_fertilizer,
                analysisData.fertilizer_quantity,
                analysisData.fertilizer_timing,
                analysisData.irrigation_need,
                analysisData.water_amount_mm,
                analysisData.next_irrigation_date,
                analysisData.irrigation_frequency,
                analysisData.predicted_yield_per_acre,
                analysisData.total_predicted_yield,
                analysisData.yield_confidence,
                analysisData.market_price_per_quintal,
                analysisData.gross_revenue,
                analysisData.total_input_cost,
                analysisData.net_profit,
                analysisData.roi_percent,
                analysisData.season,
                JSON.stringify(analysisData.weather_snapshot),
                JSON.stringify(analysisData.full_analysis),
            ]
        );

        // Update last_ai_run in farms table
        await pool.query(
            `UPDATE farms
             SET last_ai_run = NOW()
             WHERE id = $1`,
            [farm.id]
        );

        // ── Generate 4 separate categorized AI suggestions ─────────────────
        // Call Django /api/suggestions/categorized/ → returns irrigation,
        // fertilizer, pest_risk, harvest objects with LLM-enriched text.
        let categorizedSuggestions = [];
        try {
            const catResult = await aiClient.generateCategorizedSuggestions(farm, weatherForecast);
            categorizedSuggestions = catResult.suggestions || [];
        } catch (catErr) {
            console.error('[ANALYSIS] Categorized suggestions failed:', catErr.message);
            // Fallback: build 4 basic suggestions from ML predictions alone
            categorizedSuggestions = [
                {
                    category: 'irrigation',
                    title: `💧 Irrigation: ${preds.irrigation_need || 'Check Required'}`,
                    suggestion_text: `Based on soil and weather analysis, your irrigation need is: ${preds.irrigation_need}. Monitor soil moisture and irrigate accordingly.`,
                    priority: 'medium',
                },
                {
                    category: 'fertilizer',
                    title: `🧪 Fertilizer: Apply ${preds.recommended_fertilizer || 'Balanced NPK'}`,
                    suggestion_text: `ML model recommends applying ${preds.recommended_fertilizer} fertilizer for your crop. Apply at the correct growth stage for optimal results.`,
                    priority: 'medium',
                },
                {
                    category: 'pest_risk',
                    title: `🐛 Pest Risk Assessment for ${preds.recommended_crop || 'Your Crop'}`,
                    suggestion_text: `Monitor your ${preds.recommended_crop} crop regularly for signs of pest and disease. Scout fields weekly and apply preventive measures if needed.`,
                    priority: 'low',
                },
                {
                    category: 'harvest',
                    title: `🌾 Yield Forecast: ${yield_q_acre} Qt/Ac`,
                    suggestion_text: `Expected yield is ${yield_q_acre} quintals per acre. Plan your harvest timeline and post-harvest storage in advance.`,
                    priority: 'medium',
                },
            ];
        }

        // ── Clear previous suggestions for this farm ────────────────────────
        // Ensures running AI analysis replaces old suggestions with fresh ones
        await pool.query(
            `DELETE FROM ai_suggestions WHERE farm_id = $1`,
            [farm.id]
        );

        // Insert each of the 4 categorized suggestions into ai_suggestions table
        for (const suggestion of categorizedSuggestions) {
            const suggestionText = typeof suggestion.suggestion_text === 'object'
                ? JSON.stringify(suggestion.suggestion_text)
                : suggestion.suggestion_text;

            await pool.query(
                `INSERT INTO ai_suggestions (
                    farm_id, category, title, suggestion_text, priority, valid_for_date
                ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
                ON CONFLICT DO NOTHING`,
                [
                    farm.id,
                    suggestion.category,
                    suggestion.title,
                    suggestionText,
                    suggestion.priority || 'medium',
                ]
            );
        }

        res.json({
            success: true,
            message: 'AI analysis completed successfully',
            analysis_id: saved.rows[0].id,
            created_at: saved.rows[0].created_at,
            summary: {
                recommended_crop:  analysisData.recommended_crop,
                predicted_yield:   analysisData.predicted_yield_per_acre,
                irrigation_need:   analysisData.irrigation_need,
                fertilizer:        analysisData.recommended_fertilizer,
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