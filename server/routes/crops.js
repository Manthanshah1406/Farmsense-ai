// server/routes/crops.js

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

// ── Static Crop Data (until Django is ready) ──
const CROP_DATA = {
    cotton: {
        name: 'Cotton', local_name: 'Kapas',
        season: 'Kharif', duration_days: 180,
        water_requirement: 'high',
        suitable_soils: ['black', 'loamy'],
        input_cost_per_acre: 18000,
        avg_yield_per_acre: 8,
    },
    wheat: {
        name: 'Wheat', local_name: 'Gehu',
        season: 'Rabi', duration_days: 120,
        water_requirement: 'medium',
        suitable_soils: ['loamy', 'clay', 'black'],
        input_cost_per_acre: 12000,
        avg_yield_per_acre: 20,
    },
    rice: {
        name: 'Rice', local_name: 'Chawal',
        season: 'Kharif', duration_days: 120,
        water_requirement: 'high',
        suitable_soils: ['clay', 'loamy', 'silt'],
        input_cost_per_acre: 14000,
        avg_yield_per_acre: 20,
    },
    maize: {
        name: 'Maize', local_name: 'Makka',
        season: 'Kharif', duration_days: 90,
        water_requirement: 'medium',
        suitable_soils: ['loamy', 'sandy', 'black'],
        input_cost_per_acre: 10000,
        avg_yield_per_acre: 15,
    },
    mungbean: {
        name: 'Mung Bean', local_name: 'Moong',
        season: 'Kharif', duration_days: 65,
        water_requirement: 'low',
        suitable_soils: ['sandy', 'loamy'],
        input_cost_per_acre: 9000,
        avg_yield_per_acre: 6,
    },
    chickpea: {
        name: 'Chickpea', local_name: 'Chana',
        season: 'Rabi', duration_days: 100,
        water_requirement: 'low',
        suitable_soils: ['black', 'loamy', 'sandy'],
        input_cost_per_acre: 8000,
        avg_yield_per_acre: 8,
    },
    groundnut: {
        name: 'Groundnut', local_name: 'Moongfali',
        season: 'Kharif', duration_days: 120,
        water_requirement: 'medium',
        suitable_soils: ['sandy', 'loamy', 'red'],
        input_cost_per_acre: 14000,
        avg_yield_per_acre: 12,
    },
    soybean: {
        name: 'Soybean', local_name: 'Soya',
        season: 'Kharif', duration_days: 100,
        water_requirement: 'medium',
        suitable_soils: ['black', 'loamy'],
        input_cost_per_acre: 10000,
        avg_yield_per_acre: 12,
    },
    bajra: {
        name: 'Bajra', local_name: 'Bajri',
        season: 'Kharif', duration_days: 80,
        water_requirement: 'low',
        suitable_soils: ['sandy', 'loamy', 'red'],
        input_cost_per_acre: 6000,
        avg_yield_per_acre: 10,
    },
    mustard: {
        name: 'Mustard', local_name: 'Sarso',
        season: 'Rabi', duration_days: 110,
        water_requirement: 'low',
        suitable_soils: ['loamy', 'sandy', 'clay'],
        input_cost_per_acre: 7000,
        avg_yield_per_acre: 8,
    },
};

// ── Static Market Prices (Gujarat averages) ───
const MARKET_PRICES = {
    cotton:    6200,
    wheat:     2200,
    rice:      2000,
    maize:     1800,
    mungbean:  5800,
    chickpea:  4800,
    groundnut: 5500,
    soybean:   3800,
    bajra:     1800,
    mustard:   5000,
};

// ── Helper: Calculate Profit ──────────────────
const calculateProfit = (cropKey, landSize, soilType) => {
    const crop = CROP_DATA[cropKey];
    if (!crop) return null;

    const marketPrice = MARKET_PRICES[cropKey] || 2000;

    // Soil suitability score
    let soilScore = 50; // default medium
    if (crop.suitable_soils.includes(soilType)) {
        soilScore = soilType === crop.suitable_soils[0] ? 90 : 75;
    } else {
        soilScore = 40;
    }

    // Yield adjusted by soil score
    const adjustedYield = crop.avg_yield_per_acre * (soilScore / 100) * 1.2;
    const totalYield    = adjustedYield * landSize;
    const grossRevenue  = totalYield * marketPrice;
    const totalCost     = crop.input_cost_per_acre * landSize;
    const netProfit     = grossRevenue - totalCost;
    const roi           = parseFloat(
                            ((netProfit / totalCost) * 100).toFixed(1)
                          );

    return {
        crop_name:              crop.name,
        local_name:             crop.local_name,
        season:                 crop.season,
        duration_days:          crop.duration_days,
        water_requirement:      crop.water_requirement,
        soil_suitability_score: soilScore,
        soil_suitable:          crop.suitable_soils.includes(soilType),
        avg_yield_per_acre:     parseFloat(adjustedYield.toFixed(1)),
        total_yield_quintal:    parseFloat(totalYield.toFixed(1)),
        market_price_per_quintal: marketPrice,
        gross_revenue:          parseFloat(grossRevenue.toFixed(0)),
        input_cost_per_acre:    crop.input_cost_per_acre,
        total_input_cost:       parseFloat(totalCost.toFixed(0)),
        net_profit:             parseFloat(netProfit.toFixed(0)),
        roi_percent:            roi,
    };
};

// ==============================================
// GET /api/crops/list
// Get all available crops
// ==============================================
router.get('/list', auth, async (req, res, next) => {
    try {
        const { season } = req.query;

        let crops = Object.entries(CROP_DATA).map(([key, data]) => ({
            key,
            name:             data.name,
            local_name:       data.local_name,
            season:           data.season,
            duration_days:    data.duration_days,
            water_requirement: data.water_requirement,
            suitable_soils:   data.suitable_soils,
            market_price:     MARKET_PRICES[key] || 0,
        }));

        // Filter by season if provided
        // e.g. GET /api/crops/list?season=Kharif
        if (season) {
            crops = crops.filter(c =>
                c.season.toLowerCase() === season.toLowerCase()
            );
        }

        res.json({
            success: true,
            total: crops.length,
            crops
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// POST /api/crops/compare
// Compare multiple crops profit side by side
// ==============================================
router.post('/compare', auth, requireProfile, [
    body('crop_keys')
        .isArray({ min: 2, max: 5 })
        .withMessage('Select 2 to 5 crops to compare'),
    body('land_size')
        .notEmpty().withMessage('Land size is required')
        .isFloat({ min: 0.1 }).withMessage('Land size must be greater than 0'),
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

        // 2. Get farm details
        const farmResult = await pool.query(
            `SELECT id, soil_type, farm_area,
                    area_unit, current_season
             FROM farms WHERE user_id = $1`,
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farm = farmResult.rows[0];
        const { crop_keys, land_size } = req.body;

        // 3. Calculate profit for each crop
        const results = [];

        for (const cropKey of crop_keys) {
            if (!CROP_DATA[cropKey]) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid crop: ${cropKey}. Valid options: ${Object.keys(CROP_DATA).join(', ')}`
                });
            }

            const profit = calculateProfit(
                cropKey,
                land_size,
                farm.soil_type
            );

            results.push(profit);
        }

        // 4. Sort by net profit
        results.sort((a, b) => b.net_profit - a.net_profit);

        // 5. Add rank and winner flag
        results.forEach((crop, index) => {
            crop.rank = index + 1;
            crop.is_recommended = index === 0;
        });

        // 6. Save comparison to DB
        await pool.query(
            `INSERT INTO crop_comparison_results
             (farm_id, season, land_size_used,
              comparison_data, recommended_crop_name)
             VALUES ($1, $2, $3, $4, $5)`,
            [
                farm.id,
                farm.current_season,
                land_size,
                JSON.stringify(results),
                results[0].crop_name
            ]
        );

        res.json({
            success: true,
            farm_info: {
                soil_type:      farm.soil_type,
                land_size_used: land_size,
                season:         farm.current_season,
            },
            winner: {
                crop:       results[0].crop_name,
                net_profit: results[0].net_profit,
                roi:        results[0].roi_percent,
            },
            comparison: results
        });

    } catch (err) {
        next(err);
    }
});

// ==============================================
// GET /api/crops/comparison-history
// Get past crop comparisons
// ==============================================
router.get('/comparison-history', auth, requireProfile, async (req, res, next) => {
    try {
        const farmResult = await pool.query(
            'SELECT id FROM farms WHERE user_id = $1',
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const result = await pool.query(
            `SELECT
                id,
                season,
                land_size_used,
                recommended_crop_name,
                created_at
             FROM crop_comparison_results
             WHERE farm_id = $1
             ORDER BY created_at DESC
             LIMIT 10`,
            [farmResult.rows[0].id]
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

module.exports = router;