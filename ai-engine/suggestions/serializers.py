from rest_framework import serializers


class SuggestionSerializer(serializers.Serializer):

    user_query = serializers.CharField(required=False, allow_blank=True, default="")
    area = serializers.CharField(required=False, allow_blank=True, default="")
    history = serializers.DictField(required=False, default=dict)

    # Crop Recommendation
    N = serializers.FloatField()
    P = serializers.FloatField()
    K = serializers.FloatField()
    temperature = serializers.FloatField()
    humidity = serializers.FloatField()
    ph = serializers.FloatField()
    rainfall = serializers.FloatField()

    # Fertilizer
    Soil_Type = serializers.CharField()
    Crop_Type = serializers.CharField()
    Crop_Growth_Stage = serializers.CharField()
    Season = serializers.CharField()
    Irrigation_Type = serializers.CharField()
    Previous_Crop = serializers.CharField()
    Region = serializers.CharField()

    Soil_pH = serializers.FloatField()
    Soil_Moisture = serializers.FloatField()
    Organic_Carbon = serializers.FloatField()
    Electrical_Conductivity = serializers.FloatField()

    Nitrogen_Level = serializers.FloatField()
    Phosphorus_Level = serializers.FloatField()
    Potassium_Level = serializers.FloatField()

    Temperature = serializers.FloatField()
    Humidity = serializers.FloatField()
    Rainfall = serializers.FloatField()

    Fertilizer_Used_Last_Season = serializers.FloatField()
    Yield_Last_Season = serializers.FloatField()

    # Irrigation
    Temperature_C = serializers.FloatField()
    Rainfall_mm = serializers.FloatField()
    Sunlight_Hours = serializers.FloatField()
    Wind_Speed_kmh = serializers.FloatField()
    Water_Source = serializers.CharField()
    Field_Area_hectare = serializers.FloatField()
    Mulching_Used = serializers.CharField()
    Previous_Irrigation_mm = serializers.FloatField()

    # Yield
    Crop_Year = serializers.IntegerField()
    State = serializers.CharField()
    Area = serializers.FloatField()
    Annual_Rainfall = serializers.FloatField()
    Fertilizer = serializers.FloatField()
    Pesticide = serializers.FloatField()