// server/routes/weather.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const pool = require('../config/db');
const { auth, requireProfile } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');


// ── Helper: Fetch 16-day Forecast ────────────
const fetchWeatherForecast = async (lat, lon) => {
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
                hourly: 'soil_moisture_0_to_7cm',  // ← moved to hourly
                forecast_days: 16,
                timezone: 'Asia/Kolkata',
            },
            timeout: 10000
        }
    );
    return response.data;
};

// ── Helper: Process Raw Weather Data ─────────
// ── Helper: Process Raw Weather Data ─────────
const processWeatherData = (raw) => {
    const daily  = raw.daily;
    const hourly = raw.hourly;

    // Get today's soil moisture
    // Hourly gives 24 values per day — take noon value (index 12)
    const todaySoilMoisture = hourly?.soil_moisture_0_to_7cm?.[12] || null;

    const days = daily.time.map((date, i) => ({
        date,
        temp_max:    daily.temperature_2m_max[i],
        temp_min:    daily.temperature_2m_min[i],
        rainfall_mm: daily.precipitation_sum[i] || 0,
        humidity:    daily.relative_humidity_2m_max[i],
        wind_kmh:    daily.windspeed_10m_max[i],
        et0:         daily.et0_fao_evapotranspiration[i],
    }));

    const temps    = days.map(d => d.temp_max).filter(Boolean);
    const humidity = days.map(d => d.humidity).filter(Boolean);
    const rains    = days.map(d => d.rainfall_mm);

    return {
        daily: days,
        today: days[0],
        next_7_days: {
            avg_temp_max:   parseFloat((temps.slice(0,7)
                            .reduce((a,b) => a+b, 0) / 7).toFixed(1)),
            avg_humidity:   parseFloat((humidity.slice(0,7)
                            .reduce((a,b) => a+b, 0) / 7).toFixed(1)),
            total_rainfall: parseFloat(rains.slice(0,7)
                            .reduce((a,b) => a+b, 0).toFixed(1)),
        },
        next_3day_rain:      parseFloat(rains.slice(0,3)
                             .reduce((a,b) => a+b, 0).toFixed(1)),
        soil_moisture_today: todaySoilMoisture,
    };
};


// ── Helper: Generate Alerts from Forecast ────
const generateAlertsFromForecast = (days) => {
    const alerts = [];
    const seen = new Set();

    for (const day of days) {
        // Heavy Rain
        if (day.rainfall_mm > 50 && !seen.has('heavy_rain')) {
            alerts.push({
                type:     'heavy_rain',
                severity: 'critical',
                title:    'Heavy Rain Alert',
                message:  `${day.rainfall_mm}mm rain expected on ${day.date}. Avoid fertilizer application. Check field drainage.`,
                date:     day.date,
            });
            seen.add('heavy_rain');
        }

        // Heatwave
        if (day.temp_max > 42 && !seen.has('heatwave')) {
            alerts.push({
                type:     'heatwave',
                severity: 'critical',
                title:    `Heatwave Alert — ${day.temp_max}°C`,
                message:  `Extreme heat expected on ${day.date}. Irrigate in early morning only (6-8 AM). Cover young seedlings.`,
                date:     day.date,
            });
            seen.add('heatwave');
        }

        // Fungal Risk
        if (day.humidity > 85 && day.temp_max > 22
            && day.temp_max < 32 && !seen.has('fungal_risk')) {
            alerts.push({
                type:     'fungal_risk',
                severity: 'warning',
                title:    'High Fungal Disease Risk',
                message:  `Humidity ${day.humidity}% with warm temperature on ${day.date}. Ideal conditions for fungal growth. Consider preventive spray.`,
                date:     day.date,
            });
            seen.add('fungal_risk');
        }

        // Strong Wind
        if (day.wind_kmh > 40 && !seen.has('strong_wind')) {
            alerts.push({
                type:     'strong_wind',
                severity: 'warning',
                title:    'Strong Wind Alert',
                message:  `Wind speed ${day.wind_kmh} km/h expected on ${day.date}. Avoid spraying pesticides or fertilizers.`,
                date:     day.date,
            });
            seen.add('strong_wind');
        }

        // Good Sowing Window
        if (day.temp_max >= 18 && day.temp_max <= 32
            && day.rainfall_mm < 10 && day.humidity < 70
            && !seen.has('good_sowing_window')) {
            alerts.push({
                type:     'good_sowing_window',
                severity: 'positive',
                title:    'Good Sowing Window',
                message:  `Ideal sowing conditions on ${day.date}. Temperature ${day.temp_max}°C, low rainfall expected. Perfect for germination.`,
                date:     day.date,
            });
            seen.add('good_sowing_window');
        }
    }

    // Drought Risk (no rain for 10+ days)
    const noRainDays = days.filter(d => d.rainfall_mm < 2).length;
    if (noRainDays >= 10) {
        alerts.push({
            type:     'drought_risk',
            severity: 'critical',
            title:    'Drought Risk Alert',
            message:  `No significant rainfall expected for ${noRainDays} days. Irrigate immediately if crop is in flowering or fruiting stage.`,
            date:     days[0].date,
        });
    }

    return alerts;
};

// ==============================================
// GET /api/weather/forecast
// Get 16-day weather forecast for farm
// ==============================================
router.get('/forecast', auth, requireProfile, async (req, res, next) => {
    try {
        // Get farm location
        const farmResult = await pool.query(
            `SELECT id, latitude, longitude,
                    state, district, current_season
             FROM farms WHERE user_id = $1`,
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farm = farmResult.rows[0];

        if (!farm.latitude || !farm.longitude) {
            return res.status(400).json({
                success: false,
                error: 'Farm coordinates not available. Please update your farm address.'
            });
        }

        // Fetch from Open-Meteo
        const rawData = await fetchWeatherForecast(
            farm.latitude,
            farm.longitude
        );

        // Process weather data
        const weather = processWeatherData(rawData);

        // Generate alerts from forecast
        const alerts = generateAlertsFromForecast(weather.daily);

        res.json({
            success: true,
            location: {
                district:  farm.district,
                state:     farm.state,
                latitude:  farm.latitude,
                longitude: farm.longitude,
            },
            current_season: farm.current_season,
            weather: {
                today:        weather.today,
                next_7_days:  weather.next_7_days,
                next_3day_rain: weather.next_3day_rain,
                soil_moisture_today: weather.soil_moisture_today,
                daily:        weather.daily,
            },
            weather_alerts: alerts,
            fetched_at: new Date().toISOString(),
        });

    } catch (err) {
    // Detailed error logging
    console.log('[WEATHER ERROR] Message:', err.message);
    console.log('[WEATHER ERROR] Code:', err.code);
    console.log('[WEATHER ERROR] Response status:', err.response?.status);
    console.log('[WEATHER ERROR] Response data:', err.response?.data);

    if (err.code === 'ECONNABORTED') {
        return res.status(503).json({
            success: false,
            error: 'Weather service timeout. Please try again.'
        });
    }
    if (err.response && err.response.status === 400) {
        return res.status(400).json({
            success: false,
            error: 'Invalid coordinates for weather lookup.',
            debug: err.response?.data  // ← add this
        });
    }
    next(err);
}
});

// ==============================================
// GET /api/weather/today
// Get only today's weather (quick summary)
// ==============================================
router.get('/today', auth, requireProfile, async (req, res, next) => {
    try {
        const farmResult = await pool.query(
            'SELECT latitude, longitude, district, state FROM farms WHERE user_id = $1',
            [req.user.id]
        );

        if (farmResult.rows.length === 0) {
            throw new AppError('Farm not found', 404);
        }

        const farm = farmResult.rows[0];

        if (!farm.latitude || !farm.longitude) {
            return res.status(400).json({
                success: false,
                error: 'Farm coordinates not available.'
            });
        }

        const rawData = await fetchWeatherForecast(
            farm.latitude,
            farm.longitude
        );

        const weather = processWeatherData(rawData);

        res.json({
            success: true,
            location: {
                district: farm.district,
                state:    farm.state,
            },
            today: weather.today,
            next_3day_rain: weather.next_3day_rain,
            soil_moisture:  weather.soil_moisture_today,
        });

    } catch (err) {
        next(err);
    }
});


// DEBUG ROUTE — add temporarily
router.get('/debug', auth, async (req, res, next) => {
    try {
        const farmResult = await pool.query(
            'SELECT id, latitude, longitude, state, district FROM farms WHERE user_id = $1',
            [req.user.id]
        );
        res.json({
            user_id: req.user.id,
            farm: farmResult.rows[0] || 'NO FARM FOUND'
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;