"""
API authentication utilities.

Checks Authorization: Bearer <token> or X-MiroFish-Key header.
Tokens are read from the MIROFISH_API_KEYS environment variable (comma-separated).
Authentication can be bypassed by setting MIROFISH_AUTH_DISABLED=true for local dev.
"""

import os
from functools import wraps
from flask import request, jsonify


def _get_valid_keys():
    """Return the set of valid API keys from environment."""
    raw = os.environ.get('MIROFISH_API_KEYS', '')
    if not raw:
        return set()
    return {k.strip() for k in raw.split(',') if k.strip()}


def _is_auth_disabled():
    """Check if authentication is disabled for local development."""
    return os.environ.get('MIROFISH_AUTH_DISABLED', '').lower() == 'true'


def check_api_key():
    """
    Validate the request carries a valid API key.

    Returns None if authentication passes, or a (response, status_code) tuple on failure.
    """
    if _is_auth_disabled():
        return None

    valid_keys = _get_valid_keys()
    if not valid_keys:
        # No keys configured and auth is not explicitly disabled -- allow requests
        # (avoids breaking existing deployments that haven't configured keys yet).
        return None

    # Check Authorization: Bearer <token>
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
        if token in valid_keys:
            return None

    # Check X-MiroFish-Key header
    api_key = request.headers.get('X-MiroFish-Key', '').strip()
    if api_key and api_key in valid_keys:
        return None

    return jsonify({
        "success": False,
        "error": "Unauthorized. Provide a valid API key via Authorization: Bearer <token> or X-MiroFish-Key header."
    }), 401


def require_api_key(f):
    """Decorator that enforces API key authentication on a route."""
    @wraps(f)
    def decorated(*args, **kwargs):
        result = check_api_key()
        if result is not None:
            return result
        return f(*args, **kwargs)
    return decorated
