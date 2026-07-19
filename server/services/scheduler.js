// server/services/scheduler.js

const cron = require('node-cron');
const pool = require('../config/db');
const { sendAlertEmail, sendDailySummaryEmail } = require('./notifier');

// ── Helper: Generate Alerts from Forecast ─────
// Same logic as weather route but saves to DB
const generateAndSaveAlerts = async (farmId, forecast) => {
    try {
        const days = forecast.daily;
        const alerts = [];
        const seen = new Set();

        for (const day of days) {
            // Heavy Rain
            if (day.rainfall_mm > 50 && !seen.has('heavy_rain')) {
                alerts.push({
                    farm_id:    farmId,
                    alert_type: 'heavy_rain',
                    severity:   'critical',
                    title:      'Heavy Rain Alert',
                    message:    `${day.rainfall_mm}mm rain expected on ${day.date}. Avoid fertilizer. Check drainage.`,
                    alert_date: day.date,
                });
                seen.add('heavy_rain');
            }

            // Heatwave
            if (day.temp_max > 42 && !seen.has('heatwave')) {
                alerts.push({
                    farm_id:    farmId,
                    alert_type: 'heatwave',
                    severity:   'critical',
                    title:      `Heatwave Alert — ${day.temp_max}°C`,
                    message:    `Extreme heat on ${day.date}. Irrigate early morning only.`,
                    alert_date: day.date,
                });
                seen.add('heatwave');
            }

            // Fungal Risk
            if (day.humidity > 85 && day.temp_max > 22
                && day.temp_max < 32 && !seen.has('fungal_risk')) {
                alerts.push({
                    farm_id:    farmId,
                    alert_type: 'fungal_risk',
                    severity:   'warning',
                    title:      'High Fungal Disease Risk',
                    message:    `Humidity ${day.humidity}% on ${day.date}. Consider preventive spray.`,
                    alert_date: day.date,
                });
                seen.add('fungal_risk');
            }

            // Strong Wind
            if (day.wind_kmh > 40 && !seen.has('strong_wind')) {
                alerts.push({
                    farm_id:    farmId,
                    alert_type: 'strong_wind',
                    severity:   'warning',
                    title:      'Strong Wind Alert',
                    message:    `Wind ${day.wind_kmh} km/h on ${day.date}. Avoid spraying.`,
                    alert_date: day.date,
                });
                seen.add('strong_wind');
            }

            // Good Sowing Window
            if (day.temp_max >= 18 && day.temp_max <= 32
                && day.rainfall_mm < 10 && day.humidity < 70
                && !seen.has('good_sowing_window')) {
                alerts.push({
                    farm_id:    farmId,
                    alert_type: 'good_sowing_window',
                    severity:   'positive',
                    title:      'Good Sowing Window',
                    message:    `Ideal sowing on ${day.date}. Temp ${day.temp_max}°C, low rain.`,
                    alert_date: day.date,
                });
                seen.add('good_sowing_window');
            }
        }

        // Drought Risk
        const noRainDays = days.filter(d => d.rainfall_mm < 2).length;
        if (noRainDays >= 10) {
            alerts.push({
                farm_id:    farmId,
                alert_type: 'drought_risk',
                severity:   'critical',
                title:      'Drought Risk Alert',
                message:    `No rain for ${noRainDays} days. Irrigate immediately.`,
                alert_date: days[0].date,
            });
        }

        // Save alerts to DB
        for (const alert of alerts) {
            // Check if same alert already exists for today
            const existing = await pool.query(
                `SELECT id FROM alerts
                 WHERE farm_id = $1
                   AND alert_type = $2
                   AND DATE(created_at) = CURRENT_DATE`,
                [farmId, alert.alert_type]
            );

            // Only insert if not already created today
            if (existing.rows.length === 0) {
                await pool.query(
                    `INSERT INTO alerts
                     (farm_id, alert_type, severity,
                      title, message, alert_date)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        alert.farm_id,
                        alert.alert_type,
                        alert.severity,
                        alert.title,
                        alert.message,
                        alert.alert_date,
                    ]
                );
            }
        }

        return alerts;

    } catch (err) {
        console.error(`[SCHEDULER] Alert generation error farm ${farmId}:`, err.message);
        return [];
    }
};

// ── Helper: Fetch Weather for Farm ────────────
const fetchFarmWeather = async (lat, lon) => {
    try {
        const axios = require('axios');

        const response = await axios.get(
            'https://api.open-meteo.com/v1/forecast',
            {
                params: {
                    latitude:  lat,
                    longitude: lon,
                    daily: [
                        'temperature_2m_max',
                        'temperature_2m_min',
                        'precipitation_sum',
                        'relative_humidity_2m_max',
                        'windspeed_10m_max',
                        'et0_fao_evapotranspiration',
                    ].join(','),
                    hourly:       'soil_moisture_0_to_7cm',
                    forecast_days: 16,
                    timezone:     'Asia/Kolkata',
                },
                timeout: 10000
            }
        );

        const raw   = response.data;
        const daily = raw.daily;

        return {
            daily: daily.time.map((date, i) => ({
                date,
                temp_max:    daily.temperature_2m_max[i],
                temp_min:    daily.temperature_2m_min[i],
                rainfall_mm: daily.precipitation_sum[i] || 0,
                humidity:    daily.relative_humidity_2m_max[i],
                wind_kmh:    daily.windspeed_10m_max[i],
            })),
            today: {
                temp_max:    daily.temperature_2m_max[0],
                humidity:    daily.relative_humidity_2m_max[0],
                rainfall_mm: daily.precipitation_sum[0] || 0,
            }
        };

    } catch (err) {
        console.error('[SCHEDULER] Weather fetch error:', err.message);
        return null;
    }
};

// ── Helper: Run AI Pipeline for Farm ──────────
const runAIPipelineForFarm = async (farm) => {
    try {
        const aiClient = require('./aiEngineClient');

        // Try Django first
        const health = await aiClient.checkDjangoHealth();

        if (health.online) {
            console.log(`[SCHEDULER] Using Django AI for farm ${farm.id}`);
            return await aiClient.runFullPipeline(farm);
        }

        // Fallback to mock if Django is offline
        console.log(`[SCHEDULER] Django offline — using mock data for farm ${farm.id}`);
        return {
            recommended_crop:         'cotton',
            crop_suitability_score:   87.3,
            all_crop_recommendations: JSON.stringify([
                { crop: 'cotton', score: 87.3 },
                { crop: 'maize',  score: 71.2 },
            ]),
            recommended_fertilizer:   'DAP',
            fertilizer_quantity:      '50 kg/acre',
            fertilizer_timing:        'Apply this week',
            irrigation_need:          'Medium',
            water_amount_mm:          35,
            next_irrigation_date:     new Date(Date.now() + 4 * 86400000)
                                          .toISOString().split('T')[0],
            irrigation_frequency:     'Every 4 days',
            predicted_yield_per_acre: 8.5,
            total_predicted_yield:    8.5 * farm.farm_area,
            yield_confidence:         'medium',
            market_price_per_quintal: 6200,
            gross_revenue:            8.5 * farm.farm_area * 6200,
            total_input_cost:         18000 * farm.farm_area,
            net_profit:               (8.5 * farm.farm_area * 6200)
                                      - (18000 * farm.farm_area),
            roi_percent:              192.8,
            season:                   farm.current_season,
        };

    } catch (err) {
        console.error(`[SCHEDULER] Pipeline error farm ${farm.id}:`, err.message);
        return null;
    }
};

// ==============================================
// MAIN DAILY JOB — runs every day at 7:00 AM
// ==============================================
const runDailyJob = async () => {
    console.log('[SCHEDULER] Daily job started:', new Date().toISOString());

    try {
        // Get all farms with coordinates
        const farmsResult = await pool.query(
            `SELECT
                f.id, f.user_id, f.farm_name,
                f.latitude, f.longitude,
                f.farm_area, f.soil_type,
                f.current_season, f.current_crop,
                f.npk_nitrogen, f.npk_phosphorus,
                f.npk_potassium, f.ph_level
             FROM farms f
             JOIN users u ON u.id = f.user_id
             WHERE f.latitude IS NOT NULL
               AND f.longitude IS NOT NULL
               AND u.profile_completed = TRUE`
        );

        const farms = farmsResult.rows;
        console.log(`[SCHEDULER] Processing ${farms.length} farm(s)...`);

        for (const farm of farms) {
            console.log(`[SCHEDULER] Processing farm: ${farm.farm_name}`);

            // 1. Fetch weather
            const weather = await fetchFarmWeather(
                farm.latitude,
                farm.longitude
            );

            if (!weather) {
                console.log(`[SCHEDULER] Weather fetch failed for farm ${farm.id}`);
                continue;
            }

            // 2. Generate and save alerts
            const alerts = await generateAndSaveAlerts(farm.id, weather);
            console.log(`[SCHEDULER] ${alerts.length} alerts for farm ${farm.id}`);

            // 3. Run AI pipeline
            const aiResult = await runAIPipelineForFarm(farm);

            if (aiResult) {
                // Save AI analysis
                await pool.query(
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
                        season, weather_snapshot, full_analysis
                    ) VALUES (
                        $1,$2,$3,$4,$5,$6,$7,$8,$9,
                        $10,$11,$12,$13,$14,$15,$16,
                        $17,$18,$19,$20,$21,$22
                    )`,
                    [
                        farm.id,
                        aiResult.recommended_crop,
                        aiResult.crop_suitability_score,
                        aiResult.all_crop_recommendations,
                        aiResult.recommended_fertilizer,
                        aiResult.fertilizer_quantity,
                        aiResult.fertilizer_timing,
                        aiResult.irrigation_need,
                        aiResult.water_amount_mm,
                        aiResult.next_irrigation_date,
                        aiResult.irrigation_frequency,
                        aiResult.predicted_yield_per_acre,
                        aiResult.total_predicted_yield,
                        aiResult.yield_confidence,
                        aiResult.market_price_per_quintal,
                        aiResult.gross_revenue,
                        aiResult.total_input_cost,
                        aiResult.net_profit,
                        aiResult.roi_percent,
                        aiResult.season,
                        JSON.stringify(weather.today),
                        JSON.stringify(aiResult),
                    ]
                );

                // Update last_ai_run
                await pool.query(
                    `UPDATE farms SET last_ai_run = NOW() WHERE id = $1`,
                    [farm.id]
                );
            }

            // 4. Send email notifications
            if (alerts.length > 0) {
                // Get saved alert ids
                const savedAlerts = await pool.query(
                    `SELECT id, alert_type, severity, title, message
                     FROM alerts
                     WHERE farm_id = $1
                       AND DATE(created_at) = CURRENT_DATE`,
                    [farm.id]
                );

                await sendAlertEmail(farm.user_id, savedAlerts.rows);
            }

            // 5. Send daily summary
            await sendDailySummaryEmail(farm.user_id, {
                weather:           weather.today,
                recommended_crop:  aiResult?.recommended_crop,
                suitability_score: aiResult?.crop_suitability_score,
                alert_count:       alerts.length,
            });

            // 6. Emit Socket.io real-time notification
            // (io instance available via app.get('io'))
            try {
                const { app } = require('../index');
                const io = app.get('io');
                if (io && alerts.length > 0) {
                    io.to(`farm_${farm.id}`).emit('new_alert', {
                        count:   alerts.length,
                        alerts:  alerts.slice(0, 3), // send top 3
                    });
                    console.log(`[SCHEDULER] Socket alert sent to farm_${farm.id}`);
                }
            } catch (socketErr) {
                console.error('[SCHEDULER] Socket error:', socketErr.message);
            }

            console.log(`[SCHEDULER] Farm ${farm.farm_name} processed successfully`);
        }

        console.log('[SCHEDULER] Daily job completed:', new Date().toISOString());

    } catch (err) {
        console.error('[SCHEDULER] Daily job error:', err.message);
    }
};

// ==============================================
// CRON SCHEDULE — Every day at 7:00 AM IST
// ==============================================
cron.schedule('0 7 * * *', () => {
    console.log('[SCHEDULER] Cron triggered at 7:00 AM');
    runDailyJob();
}, {
    timezone: 'Asia/Kolkata'
});

console.log('[SCHEDULER] Daily job scheduled for 7:00 AM IST');

// Export for manual trigger from routes
module.exports = { runDailyJob };