import requests


class WeatherService:

    BASE_URL = "https://api.open-meteo.com/v1/forecast"

    def get_weather(self, latitude, longitude):

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
            "forecast_days": 16,
            "timezone": "auto",
        }

        response = requests.get(self.BASE_URL, params=params)

        response.raise_for_status()

        data = response.json()
        
        # Build 16-day daily array for the frontend
        daily_forecast = []
        if "daily" in data:
            d = data["daily"]
            for i in range(len(d.get("time", []))):
                weather_code = d["weather_code"][i]
                # Map standard WMO codes to generic conditions for the frontend widget
                condition = "clear"
                if weather_code in [1, 2, 3]: condition = "cloudy"
                elif weather_code in [45, 48]: condition = "fog"
                elif weather_code in [51, 53, 55, 56, 57]: condition = "drizzle"
                elif weather_code in [61, 63, 65, 66, 67, 80, 81, 82]: condition = "rain"
                elif weather_code in [71, 73, 75, 77, 85, 86]: condition = "snow"
                elif weather_code in [95, 96, 99]: condition = "thunder"
                
                daily_forecast.append({
                    "date": d["time"][i],
                    "condition": condition,
                    "temp_max": d["temperature_2m_max"][i],
                    "temp_min": d["temperature_2m_min"][i],
                    "rainfall": d["precipitation_sum"][i],
                })

        return {
            "temperature": data["current"]["temperature_2m"],
            "humidity": data["current"]["relative_humidity_2m"],
            "wind_speed": data["current"]["wind_speed_10m"],
            "rainfall": data["daily"]["precipitation_sum"][0],
            "daily": daily_forecast
        }


weather_service = WeatherService()