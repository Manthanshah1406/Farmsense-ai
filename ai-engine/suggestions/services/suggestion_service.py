from crops.services.crop_service import crop_service
from crops.services.fertilizer_service import fertilizer_service
from crops.services.irrigation_service import irrigation_service
from crops.services.yield_service import yield_service
from ai.decision_engine.decision_engine import decision_engine
from weather.services.weather_service import weather_service

class SuggestionService:

    def generate(
        self,
        crop_data,
        fertilizer_data,
        irrigation_data,
        yield_data,
        latitude=None,
        longitude=None,
        user_query="",
        history=None,
    ):
        if history is None:
            history = {}

        crop = crop_service.predict(crop_data)

        fertilizer = fertilizer_service.predict(fertilizer_data)

        irrigation = irrigation_service.predict(irrigation_data)

        predicted_yield = yield_service.predict(yield_data)

        weather = None
        if latitude and longitude:
            try:
                weather = weather_service.get_weather(latitude, longitude)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to fetch weather: {e}")
                weather = None

        ml_predictions = {
            "recommended_crop": crop,
            "recommended_fertilizer": fertilizer,
            "irrigation_need": irrigation,
            "predicted_yield": predicted_yield,
        }

        ai_response = decision_engine.generate_recommendation(
            user_query=user_query,
            ml_predictions=ml_predictions,
            weather=weather,
            history=history
        )

        return {
            "ml_predictions": ml_predictions,
            "weather": weather,
            "ai_recommendation": ai_response
        }

suggestion_service = SuggestionService()