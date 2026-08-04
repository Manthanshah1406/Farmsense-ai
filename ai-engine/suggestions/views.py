from django.shortcuts import render

# Create your views here.
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .serializers import SuggestionSerializer
from .services.suggestion_service import suggestion_service
from weather.services.geocode_service import geocode_service


@api_view(["POST"])
def generate_suggestion(request):

    serializer = SuggestionSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    crop_data = {
        "N": data["N"],
        "P": data["P"],
        "K": data["K"],
        "temperature": data["temperature"],
        "humidity": data["humidity"],
        "ph": data["ph"],
        "rainfall": data["rainfall"],
    }

    fertilizer_data = {
        "Soil_Type": data["Soil_Type"],
        "Crop_Type": data["Crop_Type"],
        "Crop_Growth_Stage": data["Crop_Growth_Stage"],
        "Season": data["Season"],
        "Irrigation_Type": data["Irrigation_Type"],
        "Previous_Crop": data["Previous_Crop"],
        "Region": data["Region"],
        "Soil_pH": data["Soil_pH"],
        "Soil_Moisture": data["Soil_Moisture"],
        "Organic_Carbon": data["Organic_Carbon"],
        "Electrical_Conductivity": data["Electrical_Conductivity"],
        "Nitrogen_Level": data["Nitrogen_Level"],
        "Phosphorus_Level": data["Phosphorus_Level"],
        "Potassium_Level": data["Potassium_Level"],
        "Temperature": data["Temperature"],
        "Humidity": data["Humidity"],
        "Rainfall": data["Rainfall"],
        "Fertilizer_Used_Last_Season": data["Fertilizer_Used_Last_Season"],
        "Yield_Last_Season": data["Yield_Last_Season"],
    }

    irrigation_data = {
        "Soil_Type": data["Soil_Type"],
        "Soil_pH": data["Soil_pH"],
        "Soil_Moisture": data["Soil_Moisture"],
        "Organic_Carbon": data["Organic_Carbon"],
        "Electrical_Conductivity": data["Electrical_Conductivity"],
        "Temperature_C": data["Temperature_C"],
        "Humidity": data["Humidity"],
        "Rainfall_mm": data["Rainfall_mm"],
        "Sunlight_Hours": data["Sunlight_Hours"],
        "Wind_Speed_kmh": data["Wind_Speed_kmh"],
        "Crop_Type": data["Crop_Type"],
        "Crop_Growth_Stage": data["Crop_Growth_Stage"],
        "Season": data["Season"],
        "Irrigation_Type": data["Irrigation_Type"],
        "Water_Source": data["Water_Source"],
        "Field_Area_hectare": data["Field_Area_hectare"],
        "Mulching_Used": data["Mulching_Used"],
        "Previous_Irrigation_mm": data["Previous_Irrigation_mm"],
        "Region": data["Region"],
    }

    yield_data = {
        "Crop": data["Crop_Type"],
        "Crop_Year": data["Crop_Year"],
        "Season": data["Season"],
        "State": data["State"],
        "Area": data["Area"],
        "Annual_Rainfall": data["Annual_Rainfall"],
        "Fertilizer": data["Fertilizer"],
        "Pesticide": data["Pesticide"],
    }

    # Geocode the area to get coordinates
    area_name = data.get("area", "")
    latitude, longitude = geocode_service.get_coordinates(area_name)

    result = suggestion_service.generate(
        crop_data,
        fertilizer_data,
        irrigation_data,
        yield_data,
        latitude=latitude,
        longitude=longitude,
        user_query=data.get("user_query", ""),
        history=data.get("history", {})
    )

    return Response(result)