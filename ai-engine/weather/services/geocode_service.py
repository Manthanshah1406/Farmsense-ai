import requests
import logging

logger = logging.getLogger(__name__)

class GeocodeService:
    def get_coordinates(self, area_name):
        """
        Converts an area name (e.g., 'Rajkot, Gujarat') into latitude and longitude
        using the free OpenStreetMap Nominatim API.
        """
        if not area_name:
            return None, None
            
        try:
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': area_name,
                'format': 'json',
                'limit': 1
            }
            headers = {
                # Nominatim requires a User-Agent header
                'User-Agent': 'FarmSense-AI-App/1.0'
            }
            
            logger.info(f"Fetching coordinates for area: {area_name}")
            response = requests.get(url, params=params, headers=headers, timeout=5)
            response.raise_for_status()
            
            data = response.json()
            if data and len(data) > 0:
                lat = float(data[0]['lat'])
                lon = float(data[0]['lon'])
                logger.info(f"Coordinates found: {lat}, {lon}")
                return lat, lon
                
            logger.warning(f"No coordinates found for area: {area_name}")
            return None, None
            
        except Exception as e:
            logger.error(f"Geocoding failed for {area_name}: {e}")
            return None, None

geocode_service = GeocodeService()
