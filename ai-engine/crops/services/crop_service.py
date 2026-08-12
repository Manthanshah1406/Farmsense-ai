import os
import joblib

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MODEL_PATH = os.path.join(
    BASE_DIR,
    "ml_models",
    "artifacts",
    "crop_recommendation_model.pkl",
)

ENCODER_PATH = os.path.join(
    BASE_DIR,
    "ml_models",
    "artifacts",
    "crop_label_encoder.pkl",
)


class CropRecommendationService:

    def __init__(self):
        self.model = joblib.load(MODEL_PATH)
        self.encoder = joblib.load(ENCODER_PATH)

    def predict(self, data):

        features = [[
            data["N"],
            data["P"],
            data["K"],
            data["temperature"],
            data["humidity"],
            data["ph"],
            data["rainfall"],
        ]]

        # Get probabilities for all classes
        probabilities = self.model.predict_proba(features)[0]
        
        # Get the indices of the top 3 probabilities in descending order
        top_indices = probabilities.argsort()[-3:][::-1]
        
        top_crops = []
        for idx in top_indices:
            crop_name = self.encoder.inverse_transform([idx])[0]
            score = round(float(probabilities[idx]) * 100, 1)
            # Only include if score > 0
            if score > 0:
                top_crops.append({"crop": crop_name, "score": score})
        
        # Fallback if no crops found (shouldn't happen with softmax)
        if not top_crops:
            top_crops = [{"crop": "Unknown", "score": 100}]
            
        return {
            "recommended_crop": top_crops[0]["crop"],
            "all_crop_recommendations": top_crops
        }


crop_service = CropRecommendationService()