// server/services/aiEngineClient.js

const axios = require('axios');

// ── Django Internal Client ────────────────────
// All requests to Django include X-Internal-Key
// Django rejects any request without this key

const djangoClient = axios.create({
    baseURL: process.env.DJANGO_URL,        // http://localhost:8000
    timeout: 30000,                          // 30 seconds (ML can be slow)
    headers: {
        'Content-Type':  'application/json',
        'X-Internal-Key': process.env.DJANGO_INTERNAL_KEY,
    }
});

// ── Request Logger ────────────────────────────
djangoClient.interceptors.request.use((config) => {
    console.log(`[AI ENGINE] ${config.method.toUpperCase()} ${config.url}`);
    return config;
});

// ── Response Logger ───────────────────────────
djangoClient.interceptors.response.use(
    (response) => {
        console.log(`[AI ENGINE] Response: ${response.status} ${response.config.url}`);
        return response;
    },
    (error) => {
        console.error(
            `[AI ENGINE] Error: ${error.response?.status} ${error.config?.url}`,
            error.response?.data || error.message
        );
        return Promise.reject(error);
    }
);

// ==============================================
// 1. Get Weather Forecast
// GET /api/weather/forecast/
// ==============================================
const getWeatherForecast = async (lat, lon) => {
    try {
        const response = await djangoClient.get(
            '/api/weather/forecast/',
            { params: { lat, lon } }
        );
        return response.data;
    } catch (err) {
        console.error('[AI ENGINE] Weather forecast error:', err.message);
        throw new Error('Django weather service unavailable');
    }
};

// ==============================================
// 2. Check Alerts from Weather
// POST /api/weather/check-alerts/
// ==============================================
const checkWeatherAlerts = async (farmData, weatherForecast) => {
    try {
        const response = await djangoClient.post(
            '/api/weather/check-alerts/',
            {
                farm_id:          farmData.id,
                lat:              farmData.latitude,
                lon:              farmData.longitude,
                soil_type:        farmData.soil_type,
                current_crop:     farmData.current_crop,
                weather_forecast: weatherForecast,
            }
        );
        return response.data;
    } catch (err) {
        console.error('[AI ENGINE] Check alerts error:', err.message);
        throw new Error('Django alert service unavailable');
    }
};

// ==============================================
// 3. Run Full AI Pipeline (all 5 modules)
// POST /api/analysis/full-pipeline/
// ==============================================
const runFullPipeline = async (farm) => {
    try {
        const response = await djangoClient.post(
            '/api/analysis/full-pipeline/',
            {
                farm_id:       farm.id,
                // Soil Profile
                nitrogen:      farm.npk_nitrogen,
                phosphorus:    farm.npk_phosphorus,
                potassium:     farm.npk_potassium,
                ph:            farm.ph_level,
                // Farm Details
                soil_type:     farm.soil_type,
                irrigation:    farm.irrigation_type,
                farm_area:     farm.farm_area,
                area_unit:     farm.area_unit,
                state:         farm.state,
                district:      farm.district,
                // Location
                latitude:      farm.latitude,
                longitude:     farm.longitude,
                // Current crop info
                current_crop:  farm.current_crop,
                sow_date:      farm.sow_date,
                season:        farm.current_season,
            }
        );
        return response.data;
    } catch (err) {
        console.error('[AI ENGINE] Full pipeline error:', err.message);
        throw new Error('Django AI pipeline unavailable');
    }
};

// ==============================================
// 4. Crop Comparison
// POST /api/crops/compare/
// ==============================================
const compareCrops = async (farm, cropKeys, landSize) => {
    try {
        const response = await djangoClient.post(
            '/api/crops/compare/',
            {
                farm_id:   farm.id,
                soil_type: farm.soil_type,
                nitrogen:  farm.npk_nitrogen,
                phosphorus: farm.npk_phosphorus,
                potassium: farm.npk_potassium,
                ph:        farm.ph_level,
                latitude:  farm.latitude,
                longitude: farm.longitude,
                season:    farm.current_season,
                state:     farm.state,
                crop_keys: cropKeys,
                land_size: landSize,
            }
        );
        return response.data;
    } catch (err) {
        console.error('[AI ENGINE] Crop compare error:', err.message);
        throw new Error('Django crop comparison unavailable');
    }
};

// ==============================================
// 5. Generate AI Suggestions
// POST /api/suggestions/generate/
// ==============================================
const generateSuggestions = async (farm, weatherForecast) => {
    try {
        const response = await djangoClient.post(
            '/api/suggestions/generate/',
            {
                farm_id:          farm.id,
                soil_type:        farm.soil_type,
                nitrogen:         farm.npk_nitrogen,
                phosphorus:       farm.npk_phosphorus,
                potassium:        farm.npk_potassium,
                ph:               farm.ph_level,
                current_crop:     farm.current_crop,
                sow_date:         farm.sow_date,
                season:           farm.current_season,
                irrigation_type:  farm.irrigation_type,
                weather_forecast: weatherForecast,
            }
        );
        return response.data;
    } catch (err) {
        console.error('[AI ENGINE] Suggestions error:', err.message);
        throw new Error('Django suggestions service unavailable');
    }
};

// ==============================================
// 6. Health Check — Is Django Running?
// GET /api/health/
// ==============================================
const checkDjangoHealth = async () => {
    try {
        const response = await djangoClient.get('/api/health/', {
            timeout: 5000
        });
        return {
            online: true,
            status: response.data
        };
    } catch (err) {
        return {
            online: false,
            error: err.message
        };
    }
};

module.exports = {
    getWeatherForecast,
    checkWeatherAlerts,
    runFullPipeline,
    compareCrops,
    generateSuggestions,
    checkDjangoHealth,
};