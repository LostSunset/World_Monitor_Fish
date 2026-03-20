"""
MiroFish Backend - Flask应用工厂
"""

import os
import traceback
import warnings

# 抑制 multiprocessing resource_tracker 的警告（来自第三方库如 transformers）
# 需要在所有其他导入之前设置
warnings.filterwarnings("ignore", message=".*resource_tracker.*")

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from .config import Config
from .utils.logger import setup_logger, get_logger
from .utils.auth import check_api_key


# Sensitive fields that should be redacted from request body logs
_SENSITIVE_FIELDS = {'password', 'secret', 'token', 'api_key', 'apikey', 'authorization'}


def _redact_sensitive(data):
    """Redact sensitive fields from a dict for safe logging."""
    if not isinstance(data, dict):
        return data
    redacted = {}
    for key, value in data.items():
        if key.lower() in _SENSITIVE_FIELDS:
            redacted[key] = '***REDACTED***'
        elif isinstance(value, dict):
            redacted[key] = _redact_sensitive(value)
        else:
            redacted[key] = value
    return redacted


def create_app(config_class=Config):
    """Flask应用工厂函数"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # 设置JSON编码：确保中文直接显示（而不是 \uXXXX 格式）
    # Flask >= 2.3 使用 app.json.ensure_ascii，旧版本使用 JSON_AS_ASCII 配置
    if hasattr(app, 'json') and hasattr(app.json, 'ensure_ascii'):
        app.json.ensure_ascii = False

    # 设置日志
    logger = setup_logger('mirofish')

    # 只在 reloader 子进程中打印启动信息（避免 debug 模式下打印两次）
    is_reloader_process = os.environ.get('WERKZEUG_RUN_MAIN') == 'true'
    debug_mode = app.config.get('DEBUG', False)
    should_log_startup = not debug_mode or is_reloader_process

    if should_log_startup:
        logger.info("=" * 50)
        logger.info("MiroFish Backend 启动中...")
        logger.info("=" * 50)

    # M-1: CORS - use configurable origins instead of wildcard
    allowed_origins = os.environ.get('MIROFISH_CORS_ORIGINS', 'http://localhost:3000').split(',')
    CORS(app, resources={r"/api/*": {"origins": [o.strip() for o in allowed_origins]}}, supports_credentials=True)

    # L-2: Rate limiting
    limiter = Limiter(
        app=app,
        key_func=get_remote_address,
        default_limits=["200 per day", "50 per hour"],
        storage_uri="memory://"
    )

    # 注册模拟进程清理函数（确保服务器关闭时终止所有模拟进程）
    from .services.simulation_runner import SimulationRunner
    SimulationRunner.register_cleanup()
    if should_log_startup:
        logger.info("已注册模拟进程清理函数")

    # M-5: Request body logging - only in DEBUG mode, with redaction
    @app.before_request
    def log_request():
        req_logger = get_logger('mirofish.request')
        req_logger.debug(f"请求: {request.method} {request.path}")
        if debug_mode and request.content_type and 'json' in request.content_type:
            body = request.get_json(silent=True)
            if body:
                req_logger.debug(f"请求体: {_redact_sensitive(body)}")

    # H-2: Authentication - require API key on all API blueprints, exclude /health
    @app.before_request
    def enforce_api_auth():
        # Skip non-API routes (e.g. /health)
        if not request.path.startswith('/api/'):
            return None
        # Skip OPTIONS requests (CORS preflight)
        if request.method == 'OPTIONS':
            return None
        result = check_api_key()
        if result is not None:
            return result

    # M-2: CSRF protection - require X-Requested-With header or valid API key on mutating requests
    @app.before_request
    def csrf_protection():
        if request.method in ('POST', 'PUT', 'DELETE'):
            # Skip OPTIONS (handled above, but defensive)
            if request.method == 'OPTIONS':
                return None
            # Skip non-API routes
            if not request.path.startswith('/api/'):
                return None
            # If X-Requested-With is present, pass
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                return None
            # If a valid API key is present, pass (already authenticated)
            auth_result = check_api_key()
            if auth_result is None:
                return None
            # Otherwise, reject
            return jsonify({
                "success": False,
                "error": "Missing X-Requested-With: XMLHttpRequest header or valid API key for mutating requests."
            }), 403

    @app.after_request
    def log_response(response):
        req_logger = get_logger('mirofish.request')
        req_logger.debug(f"响应: {response.status_code}")
        return response

    # M-3: Security headers
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        if not app.config.get('DEBUG'):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    # H-3: Global error handler - only return traceback in DEBUG mode
    @app.errorhandler(Exception)
    def handle_exception(e):
        req_logger = get_logger('mirofish.error')
        req_logger.error(f"Unhandled exception: {str(e)}")
        req_logger.debug(traceback.format_exc())
        response = {
            "success": False,
            "error": str(e),
        }
        if app.config.get('DEBUG'):
            response["traceback"] = traceback.format_exc()
        return jsonify(response), 500

    # 注册蓝图
    from .api import graph_bp, simulation_bp, report_bp
    app.register_blueprint(graph_bp, url_prefix='/api/graph')
    app.register_blueprint(simulation_bp, url_prefix='/api/simulation')
    app.register_blueprint(report_bp, url_prefix='/api/report')

    # 健康检查
    @app.route('/health')
    def health():
        return {'status': 'ok', 'service': 'MiroFish Backend'}

    if should_log_startup:
        logger.info("MiroFish Backend 启动完成")

    return app
