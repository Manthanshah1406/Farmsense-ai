from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import (
    CropRecommendationSerializer,
    FertilizerRecommendationSerializer,
    IrrigationPredictionSerializer,
    CropYieldPredictionSerializer,
)
from .services.yield_service import yield_service
from .services.irrigation_service import irrigation_service
from .services.crop_service import crop_service
from .services.fertilizer_service import fertilizer_service
from .services.crop_service import crop_service

# Create your views here.


@api_view(["POST"])
def crop_recommendation(request):

    serializer = CropRecommendationSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    prediction = crop_service.predict(serializer.validated_data)

    return Response({
        "recommended_crop": prediction["recommended_crop"],
        "all_crop_recommendations": prediction["all_crop_recommendations"]
    })

@api_view(["POST"])
def fertilizer_recommendation(request):

    serializer = FertilizerRecommendationSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    prediction = fertilizer_service.predict(serializer.validated_data)

    return Response({
        "recommended_fertilizer": prediction
    })

@api_view(["POST"])
def irrigation_prediction(request):

    serializer = IrrigationPredictionSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    prediction = irrigation_service.predict(serializer.validated_data)

    return Response({
        "irrigation_need": prediction
    })


@api_view(["POST"])
def crop_yield_prediction(request):

    serializer = CropYieldPredictionSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    prediction = yield_service.predict(serializer.validated_data)

    return Response({
        "predicted_yield": prediction
    })