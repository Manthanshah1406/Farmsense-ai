# ai-engine/farmsense/middleware.py

from django.http import JsonResponse
from django.conf import settings

class InternalKeyMiddleware:
    """
    Checks that every request to Django has the correct
    internal secret key sent from Node.js.
    Only applies to /api/ routes.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):

    # Skip Django admin
        if request.path.startswith('/admin/'):
            return self.get_response(request)

        # Skip authentication endpoints
        if request.path.startswith('/api/auth/'):
            return self.get_response(request)

        # Check internal key for remaining API routes
        if request.path.startswith('/api/'):
            key = request.headers.get('X-Internal-Key')
            if key != settings.INTERNAL_API_KEY:
                return JsonResponse(
                    {'error': 'Unauthorized — Invalid internal key'},
                    status=401
                )

        return self.get_response(request)