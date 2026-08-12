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
        """Original combined suggestion used for the AI chat assistant."""
        if history is None:
            history = {}

        crop_result = crop_service.predict(crop_data)
        crop = crop_result["recommended_crop"]
        all_crop_recommendations = crop_result["all_crop_recommendations"]
        
        fertilizer = fertilizer_service.predict(fertilizer_data)
        irrigation = irrigation_service.predict(irrigation_data)
        
        # Use recommended crop for yield prediction if the user hasn't specified a valid one
        if yield_data.get("Crop") == "Unknown" or not yield_data.get("Crop"):
            yield_data["Crop"] = crop
            
        predicted_yield = yield_service.predict(yield_data)

        weather = None
        if latitude and longitude:
            weather = weather_service.get_weather(latitude, longitude)

        ml_predictions = {
            "recommended_crop": crop,
            "all_crop_recommendations": all_crop_recommendations,
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

    def generate_categorized(
        self,
        crop_data,
        fertilizer_data,
        irrigation_data,
        yield_data,
        latitude=None,
        longitude=None,
    ):
        """
        Run all 4 ML models and return a list of 4 structured suggestion dicts,
        one for each category: irrigation, fertilizer, pest_risk, harvest.
        Each dict has: category, title, suggestion_text, priority.
        """

        # ── Run all ML models ─────────────────────────────────────────────
        crop_result = crop_service.predict(crop_data)
        crop = crop_result["recommended_crop"]
        all_crop_recommendations = crop_result["all_crop_recommendations"]
        
        fertilizer = fertilizer_service.predict(fertilizer_data)
        irrigation = irrigation_service.predict(irrigation_data)
        
        # Use recommended crop for yield prediction if current crop is unknown
        if yield_data.get("Crop") == "Unknown" or not yield_data.get("Crop"):
            yield_data["Crop"] = crop

        predicted_yield = yield_service.predict(yield_data)

        weather = None
        if latitude and longitude:
            weather = weather_service.get_weather(latitude, longitude)

        ml_predictions = {
            "recommended_crop": crop,
            "all_crop_recommendations": all_crop_recommendations,
            "recommended_fertilizer": fertilizer,
            "irrigation_need": irrigation,
            "predicted_yield": predicted_yield,
        }

        # ── LLM enrichment (one Groq call for all 4 categories) ───────────
        ai_response = decision_engine.generate_recommendation(
            user_query=(
                "Provide specific advice for: 1) irrigation schedule, "
                "2) fertilizer application, 3) pest risk assessment, "
                "4) harvest planning and yield optimization."
            ),
            ml_predictions=ml_predictions,
            weather=weather,
            history={}
        )

        # ── Extract LLM fields safely ──────────────────────────────────────
        if isinstance(ai_response, dict):
            irrigation_ai = ai_response.get("irrigation_advice", "")
            fertilizer_ai = ai_response.get("fertilizer_recommendation", "")
            crop_ai       = ai_response.get("crop_recommendation", "")
            answer_ai     = ai_response.get("answer", "")
            confidence    = ai_response.get("confidence", 85)
        else:
            irrigation_ai = fertilizer_ai = crop_ai = answer_ai = ""
            confidence = 85

        # ── Determine weather temp for pest risk ──────────────────────────
        temp = None
        if weather and isinstance(weather, list) and len(weather) > 0:
            temp = weather[0].get("temp_max") or weather[0].get("temperature")
        elif weather and isinstance(weather, dict):
            temp = weather.get("temp_max") or weather.get("temperature")

        # ─────────────────────────────────────────────────────────────────
        # 1. IRRIGATION CARD
        # ─────────────────────────────────────────────────────────────────
        irrigation_level = str(irrigation).lower()
        if irrigation_level in ("high", "yes", "irrigate"):
            irr_priority = "high"
            irr_title = f"💧 Irrigation Required — {irrigation} Need Detected"
        elif irrigation_level in ("medium", "moderate"):
            irr_priority = "medium"
            irr_title = f"💧 Moderate Irrigation Advised for {crop.title()}"
        else:
            irr_priority = "low"
            irr_title = f"💧 Low Irrigation Need — Monitor Soil Moisture"

        irr_text = (
            f"ML Model Prediction: Your {crop} crop currently has a '{irrigation}' irrigation need.\n\n"
            + (f"{irrigation_ai}\n\n" if irrigation_ai else
               "Monitor soil moisture levels and irrigate based on the predicted need.\n\n")
            + f"Soil conditions and current weather have been factored into this recommendation. Confidence: {confidence}%."
        )

        # ─────────────────────────────────────────────────────────────────
        # 2. FERTILIZER CARD
        # ─────────────────────────────────────────────────────────────────
        fert_title = f"🧪 Apply {fertilizer} Fertilizer for {crop.title()}"
        fert_text = (
            f"ML Model Prediction: Based on your soil NPK profile, '{fertilizer}' fertilizer is recommended for your {crop} crop.\n\n"
            + (f"{fertilizer_ai}\n\n" if fertilizer_ai else
               "Apply the recommended fertilizer at the appropriate growth stage for best results.\n\n")
            + f"Confidence: {confidence}%."
        )

        # ─────────────────────────────────────────────────────────────────
        # 3. PEST RISK CARD
        # ─────────────────────────────────────────────────────────────────
        if temp and temp > 30:
            pest_priority  = "high"
            pest_risk_level = "High"
            pest_note = (
                "High temperatures increase risk of aphids, whiteflies, and fungal diseases. "
                "Scout fields daily and consider preventive spray."
            )
        elif temp and temp > 24:
            pest_priority  = "medium"
            pest_risk_level = "Moderate"
            pest_note = (
                "Moderate temperatures may favour some pest activity. "
                "Weekly scouting is recommended."
            )
        else:
            pest_priority  = "low"
            pest_risk_level = "Low"
            pest_note = (
                "Current conditions show low pest pressure. "
                "Continue regular monitoring every 10 days."
            )

        pest_title = f"🐛 Pest Risk: {pest_risk_level} for {crop.title()}"
        ai_snippet = ""
        if answer_ai:
            ai_snippet = " " + (answer_ai[:220] + "..." if len(answer_ai) > 220 else answer_ai)

        pest_text = (
            f"Current Pest Risk Assessment: {pest_risk_level} risk detected for your {crop} crop.\n\n"
            f"{pest_note}\n\n"
            + (f"Weather data: Temperature {temp}°C." if temp else "No weather data available — assess manually.")
            + ai_snippet
        )

        # ─────────────────────────────────────────────────────────────────
        # 4. HARVEST CARD
        # ─────────────────────────────────────────────────────────────────
        yield_q_acre = round(predicted_yield * 4.0468, 1)
        harvest_title = f"🌾 Yield Forecast: {yield_q_acre} Qt/Ac — {crop.title()}"
        harvest_text = (
            f"ML Model Prediction: Expected yield for your {crop} crop is approximately "
            f"{yield_q_acre} quintals per acre.\n\n"
            + (f"{crop_ai}\n\n" if crop_ai else
               "Plan your harvest timeline based on the predicted yield and current crop growth stage.\n\n")
            + "Ensure proper post-harvest storage and grading to minimize losses. "
            + f"Confidence: {confidence}%."
        )
        harvest_priority = "high" if predicted_yield > 3 else "medium"

        # ─────────────────────────────────────────────────────────────────
        # Return 4 categorized suggestions
        # ─────────────────────────────────────────────────────────────────
        return [
            {
                "category":        "irrigation",
                "title":           irr_title,
                "suggestion_text": irr_text,
                "priority":        irr_priority,
            },
            {
                "category":        "fertilizer",
                "title":           fert_title,
                "suggestion_text": fert_text,
                "priority":        "medium",
            },
            {
                "category":        "pest_risk",
                "title":           pest_title,
                "suggestion_text": pest_text,
                "priority":        pest_priority,
            },
            {
                "category":        "harvest",
                "title":           harvest_title,
                "suggestion_text": harvest_text,
                "priority":        harvest_priority,
            },
        ]


suggestion_service = SuggestionService()