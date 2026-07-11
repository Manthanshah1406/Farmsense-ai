// server/services/geocoder.js

const axios = require('axios');

// ── Geocode Address → Lat/Lon ─────────────────
// Uses Nominatim (OpenStreetMap) — completely free
// No API key needed

const geocodeAddress = async (village, taluka, district, state, pincode) => {
    try {
        // Build address string from most specific to least
        // Try pincode first — most accurate
        const addressParts = [
            village,
            taluka,
            district,
            state,
            pincode,
            'India'
        ].filter(Boolean).join(', ');

        console.log(`[GEOCODER] Looking up: ${addressParts}`);

        const response = await axios.get(
            'https://nominatim.openstreetmap.org/search',
            {
                params: {
                    q: addressParts,
                    format: 'json',
                    limit: 1,
                    countrycodes: 'in',  // India only
                },
                headers: {
                    // Nominatim requires a User-Agent
                    'User-Agent': 'FarmSenseAI/1.0 (farmsense@gmail.com)'
                },
                timeout: 10000  // 10 second timeout
            }
        );

        // Found a result
        if (response.data && response.data.length > 0) {
            const location = response.data[0];
            console.log(`[GEOCODER] Found: ${location.display_name}`);
            return {
                latitude: parseFloat(location.lat),
                longitude: parseFloat(location.lon),
                display_name: location.display_name,
                success: true
            };
        }

        // No result with full address — try with just district + state
        console.log('[GEOCODER] Full address not found, trying district...');

        const fallbackResponse = await axios.get(
            'https://nominatim.openstreetmap.org/search',
            {
                params: {
                    q: `${district}, ${state}, India`,
                    format: 'json',
                    limit: 1,
                    countrycodes: 'in',
                },
                headers: {
                    'User-Agent': 'FarmSenseAI/1.0 (farmsense@gmail.com)'
                },
                timeout: 10000
            }
        );

        if (fallbackResponse.data && fallbackResponse.data.length > 0) {
            const location = fallbackResponse.data[0];
            console.log(`[GEOCODER] Fallback found: ${location.display_name}`);
            return {
                latitude: parseFloat(location.lat),
                longitude: parseFloat(location.lon),
                display_name: location.display_name,
                success: true
            };
        }

        // Nothing found — return null
        console.log('[GEOCODER] Location not found');
        return {
            latitude: null,
            longitude: null,
            display_name: null,
            success: false
        };

    } catch (err) {
        console.error('[GEOCODER] Error:', err.message);
        // Don't crash the app — return null coords
        return {
            latitude: null,
            longitude: null,
            display_name: null,
            success: false
        };
    }
};

module.exports = { geocodeAddress };