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
            '/api/weather/current/',
            { params: { latitude: lat, longitude: lon } }
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
// POST /api/suggestions/
// ==============================================
const generateSuggestions = async (farm, weatherForecast, userQuery = "", history = {}) => {
    try {
        const temp = weatherForecast?.weather?.temperature || 30;
        const hum = weatherForecast?.weather?.humidity || 60;
        const rain = weatherForecast?.weather?.rainfall || 0;
        
        const daily = weatherForecast?.weather?.daily;
        let totalRain7Days = rain * 7;
        let avgTemp7Days = temp;
        let annualRainfallEstimate = rain > 0 ? rain * 100 : 800;

        if (daily && daily.length > 0) {
            const daysToUse = Math.min(7, daily.length);
            const first7 = daily.slice(0, daysToUse);
            totalRain7Days = first7.reduce((sum, d) => sum + (d.rainfall || 0), 0);
            avgTemp7Days = first7.reduce((sum, d) => sum + ((d.temp_max + d.temp_min) / 2 || temp), 0) / daysToUse;
            
            const total16 = daily.reduce((sum, d) => sum + (d.rainfall || 0), 0);
            // 16 days extrapolating to 365 days
            annualRainfallEstimate = Math.max(400, (total16 / daily.length) * 365);
        }
        
        const payload = {
            user_query: userQuery,
            history: history,

            // Crop Recommendation
            N: farm.npk_nitrogen || 50,
            P: farm.npk_phosphorus || 50,
            K: farm.npk_potassium || 50,
            // Clamp weather to avoid ML edge cases (e.g., >90 humidity or <40 rainfall locks to muskmelon)
            temperature: Math.min(35, Math.max(20, temp)),
            humidity: Math.min(80, Math.max(40, hum)),
            ph: farm.ph_level || 6.5,
            rainfall: Math.max(70, Math.min(200, rain > 0 ? 100 + (rain * 10) : 100)),

            // Fertilizer
            Soil_Type: farm.soil_type || 'Loamy',
            Crop_Type: farm.current_crop || 'Unknown',
            Crop_Growth_Stage: farm.crop_stage || 'Vegetative',
            Season: farm.current_season || 'Kharif',
            Irrigation_Type: farm.irrigation_type || 'Rainfed',
            Previous_Crop: 'Unknown',
            Region: farm.district || 'Unknown',

            Soil_pH: farm.ph_level || 6.5,
            Soil_Moisture: 40,
            Organic_Carbon: 0.5,
            Electrical_Conductivity: 0.5,

            Nitrogen_Level: farm.npk_nitrogen || 50,
            Phosphorus_Level: farm.npk_phosphorus || 50,
            Potassium_Level: farm.npk_potassium || 50,

            Temperature: temp,
            Humidity: hum,
            Rainfall: rain,

            Fertilizer_Used_Last_Season: 0,
            Yield_Last_Season: 0,

            // Irrigation
            Temperature_C: temp,
            Rainfall_mm: rain,
            Sunlight_Hours: 8,
            Wind_Speed_kmh: 10,
            Water_Source: farm.water_source || 'Borewell',
            Field_Area_hectare: (farm.farm_area || 1) * 0.4047,
            Mulching_Used: 'No',
            Previous_Irrigation_mm: 0,

            // Yield
            Crop_Year: new Date().getFullYear(),
            State: farm.state || 'Karnataka', // Provide default valid state
            Area: farm.farm_area || 1,
            Annual_Rainfall: annualRainfallEstimate,
            Fertilizer: (farm.farm_area || 1) * 100, // Adjust per area
            Pesticide: (farm.farm_area || 1) * 0.3, // Adjust per area

            // Location (for weather in pest risk)
            latitude: farm.latitude || null,
            longitude: farm.longitude || null,
        };

        const response = await djangoClient.post('/api/suggestions/', payload);
        return response.data;
    } catch (err) {
        console.error('[AI ENGINE] Suggestions error:', err.message);
        if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
        throw new Error('Django suggestions service unavailable');
    }
};

// ==============================================
// 5b. Generate Categorized AI Suggestions
// POST /api/suggestions/categorized/
// Returns 4 separate suggestion objects: irrigation, fertilizer, pest_risk, harvest
// ==============================================
const generateCategorizedSuggestions = async (farm, weatherForecast) => {
    try {
        const temp = weatherForecast?.weather?.temperature || 30;
        const hum  = weatherForecast?.weather?.humidity || 60;
        const rain = weatherForecast?.weather?.rainfall || 0;

        const daily = weatherForecast?.weather?.daily;
        let totalRain7Days = rain * 7;
        let avgTemp7Days = temp;
        let annualRainfallEstimate = rain > 0 ? rain * 100 : 800;

        if (daily && daily.length > 0) {
            const daysToUse = Math.min(7, daily.length);
            const first7 = daily.slice(0, daysToUse);
            totalRain7Days = first7.reduce((sum, d) => sum + (d.rainfall || 0), 0);
            avgTemp7Days = first7.reduce((sum, d) => sum + ((d.temp_max + d.temp_min) / 2 || temp), 0) / daysToUse;
            
            const total16 = daily.reduce((sum, d) => sum + (d.rainfall || 0), 0);
            // 16 days extrapolating to 365 days
            annualRainfallEstimate = Math.max(400, (total16 / daily.length) * 365);
        }

        const payload = {
            // Crop Recommendation
            N: farm.npk_nitrogen || 50,
            P: farm.npk_phosphorus || 50,
            K: farm.npk_potassium || 50,
            // Clamp weather to avoid ML edge cases (e.g., >90 humidity or <40 rainfall locks to muskmelon)
            temperature: Math.min(35, Math.max(20, temp)),
            humidity: Math.min(80, Math.max(40, hum)),
            ph: farm.ph_level || 6.5,
            rainfall: Math.max(70, Math.min(200, rain > 0 ? 100 + (rain * 10) : 100)),

            // Fertilizer
            Soil_Type: farm.soil_type || 'Loamy',
            Crop_Type: farm.current_crop || 'Unknown',
            Crop_Growth_Stage: farm.crop_stage || 'Vegetative',
            Season: farm.current_season || 'Kharif',
            Irrigation_Type: farm.irrigation_type || 'Rainfed',
            Previous_Crop: 'Unknown',
            Region: farm.district || 'Unknown',
            Soil_pH: farm.ph_level || 6.5,
            Soil_Moisture: 40,
            Organic_Carbon: 0.5,
            Electrical_Conductivity: 0.5,
            Nitrogen_Level: farm.npk_nitrogen || 50,
            Phosphorus_Level: farm.npk_phosphorus || 50,
            Potassium_Level: farm.npk_potassium || 50,
            Temperature: temp,
            Humidity: hum,
            Rainfall: rain,
            Fertilizer_Used_Last_Season: 0,
            Yield_Last_Season: 0,

            // Irrigation
            Temperature_C: temp,
            Rainfall_mm: rain,
            Sunlight_Hours: 8,
            Wind_Speed_kmh: 10,
            Water_Source: farm.water_source || 'Borewell',
            Field_Area_hectare: (farm.farm_area || 1) * 0.4047,
            Mulching_Used: 'No',
            Previous_Irrigation_mm: 0,
            Forecast_Rainfall_7Days_mm: Number(totalRain7Days.toFixed(2)),
            Forecast_Temp_7Days_Avg: Number(avgTemp7Days.toFixed(2)),

            // Yield
            Crop_Year: new Date().getFullYear(),
            State: farm.state || 'Karnataka',
            Area: farm.farm_area || 1,
            Annual_Rainfall: annualRainfallEstimate,
            Fertilizer: (farm.farm_area || 1) * 100,
            Pesticide: (farm.farm_area || 1) * 0.3,

            // Location for weather-based pest risk
            latitude: farm.latitude || null,
            longitude: farm.longitude || null,

            // Not used in categorized but needed by serializer
            user_query: '',
            history: {},
        };

        const response = await djangoClient.post('/api/suggestions/categorized/', payload);
        return response.data;  // { suggestions: [ {...}, {...}, {...}, {...} ] }
    } catch (err) {
        console.error('[AI ENGINE] Categorized suggestions error:', err.message);
        if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
        throw new Error('Django categorized suggestions service unavailable');
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
    generateCategorizedSuggestions,
    checkDjangoHealth,
};