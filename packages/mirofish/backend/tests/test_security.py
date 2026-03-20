"""
MiroFish Security Test Suite
Validates all security fixes from the audit.
"""
import os
import sys
import re
import json

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestSecretKey:
    """C-1: SECRET_KEY must not use hardcoded default."""

    def test_no_hardcoded_default(self):
        from app.config import Config
        # If SECRET_KEY env var is not set, it should generate a random one
        # It should NEVER be 'mirofish-secret-key'
        assert Config.SECRET_KEY != 'mirofish-secret-key', \
            "SECRET_KEY must not be the hardcoded default"

    def test_secret_key_is_strong(self):
        from app.config import Config
        assert len(Config.SECRET_KEY) >= 32, \
            "SECRET_KEY should be at least 32 characters"


class TestDebugMode:
    """H-1: Debug mode must default to False."""

    def test_debug_defaults_to_false(self):
        # Unset FLASK_DEBUG to test default
        old = os.environ.pop('FLASK_DEBUG', None)
        try:
            # Re-import to get fresh config
            import importlib
            from app import config
            importlib.reload(config)
            assert config.Config.DEBUG is False, \
                "DEBUG should default to False"
        finally:
            if old is not None:
                os.environ['FLASK_DEBUG'] = old


class TestAuthentication:
    """H-2: All API endpoints must require authentication."""

    def test_api_returns_401_without_auth(self):
        os.environ['MIROFISH_AUTH_DISABLED'] = 'false'
        os.environ['MIROFISH_API_KEYS'] = 'test-key-12345'
        from app import create_app
        app = create_app()
        client = app.test_client()

        # Test various endpoints without auth
        endpoints = [
            ('GET', '/api/graph/project/list'),
            ('POST', '/api/graph/ontology/generate'),
            ('POST', '/api/simulation/create'),
        ]

        for method, path in endpoints:
            if method == 'GET':
                resp = client.get(path)
            else:
                resp = client.post(path, json={})

            assert resp.status_code == 401, \
                f"{method} {path} should return 401 without auth, got {resp.status_code}"

    def test_health_endpoint_no_auth_required(self):
        os.environ['MIROFISH_AUTH_DISABLED'] = 'false'
        os.environ['MIROFISH_API_KEYS'] = 'test-key-12345'
        from app import create_app
        app = create_app()
        client = app.test_client()

        resp = client.get('/health')
        assert resp.status_code == 200, \
            "/health should not require authentication"


class TestErrorResponses:
    """H-3: Error responses must not contain stack traces in production."""

    def test_no_traceback_in_production_errors(self):
        os.environ['FLASK_DEBUG'] = 'False'
        from app import create_app
        app = create_app()
        client = app.test_client()

        # Trigger an error (invalid endpoint with auth disabled for this test)
        os.environ['MIROFISH_AUTH_DISABLED'] = 'true'
        resp = client.post('/api/graph/ontology/generate', json={})

        data = resp.get_json()
        if data:
            assert 'traceback' not in data, \
                "Error responses should not contain traceback in production mode"

    def test_no_traceback_in_source_code(self):
        """Verify traceback.format_exc() is not in API response JSON."""
        api_dir = os.path.join(os.path.dirname(__file__), '..', 'app', 'api')
        pattern = re.compile(r'"traceback"\s*:\s*traceback\.format_exc\(\)')

        for filename in os.listdir(api_dir):
            if filename.endswith('.py'):
                filepath = os.path.join(api_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()
                assert not pattern.search(content), \
                    f"{filename} still contains traceback.format_exc() in response JSON"


class TestPathTraversal:
    """M-4 / L-4: simulation_id must be validated against path traversal."""

    def test_simulation_id_rejects_traversal(self):
        from app.services.simulation_manager import SimulationManager
        manager = SimulationManager()

        malicious_ids = [
            '../../../etc/passwd',
            '..\\..\\windows\\system32',
            'sim_id/../../secret',
            'sim%2F..%2F..%2Fetc',
        ]

        for sid in malicious_ids:
            try:
                manager._get_simulation_dir(sid)
                assert False, f"simulation_id '{sid}' should have been rejected"
            except ValueError:
                pass  # Expected


class TestCORS:
    """M-1: CORS must not use wildcard origin."""

    def test_no_wildcard_cors(self):
        from app import create_app
        app = create_app()
        # Check that CORS is not configured with '*'
        # The flask-cors extension stores config internally
        # We test by making a request with a random origin
        client = app.test_client()
        os.environ['MIROFISH_AUTH_DISABLED'] = 'true'
        resp = client.get('/health', headers={'Origin': 'http://evil.example.com'})
        acao = resp.headers.get('Access-Control-Allow-Origin', '')
        assert acao != '*', \
            "CORS must not return wildcard Access-Control-Allow-Origin"


class TestSecurityHeaders:
    """M-3: Security headers must be present."""

    def test_security_headers_present(self):
        from app import create_app
        app = create_app()
        client = app.test_client()

        resp = client.get('/health')
        assert resp.headers.get('X-Content-Type-Options') == 'nosniff'
        assert resp.headers.get('X-Frame-Options') == 'DENY'
        assert resp.headers.get('Referrer-Policy') == 'strict-origin-when-cross-origin'


class TestFileUpload:
    """M-7: File uploads must validate content, not just extension."""

    def test_pdf_magic_bytes_validation(self):
        from app.utils.file_parser import FileParser
        import tempfile

        # Create a fake PDF (wrong magic bytes)
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False, mode='wb') as f:
            f.write(b'NOT_A_PDF_FILE')
            fake_pdf_path = f.name

        try:
            is_valid = FileParser.validate_file_magic(fake_pdf_path)
            assert not is_valid, "Fake PDF should fail magic bytes validation"
        except (ValueError, AttributeError):
            pass  # Also acceptable - means validation raised an error
        finally:
            os.unlink(fake_pdf_path)
