<?php
/**
 * Without this, the browser blocks apps/web's fetch() calls to
 * /wp-json/* entirely. FRONTEND_ORIGIN comes from .env — IMPORTANT:
 * a duplicate FRONTEND_ORIGIN line later in the same .env file
 * silently overrides an earlier one (last value wins in .env files).
 * This caused a real, hard-to-spot bug in this project — check for
 * duplicates if this ever breaks again.
 */

if (!defined('ABSPATH')) exit;

function soldirectory_allowed_cors_origins(): array {
    $configured = ($_ENV['FRONTEND_ORIGIN'] ?? null) ?: (getenv('FRONTEND_ORIGIN') ?: 'http://46.250.242.208');
    return array_filter(array_map(
        static fn ($origin) => rtrim(trim($origin), '/'),
        explode(',', $configured)
    ));
}

add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');

    add_filter('rest_pre_serve_request', function ($value) {
        $allowed_origins = soldirectory_allowed_cors_origins();
        $origin = $_SERVER['HTTP_ORIGIN'] ?? get_http_origin();

        if ($origin && in_array(rtrim($origin, '/'), $allowed_origins, true)) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type, X-WP-Nonce');
            header('Access-Control-Allow-Credentials: false');
            header('Vary: Origin');
        }

        return $value;
    });
}, 15);

add_filter('rest_authentication_errors', function ($result) {
    if (!empty($result)) return $result;

    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'HEAD', 'OPTIONS'], true) && !is_user_logged_in()) {
        return new WP_Error(
            'rest_forbidden_method',
            'This API is read-only for unauthenticated requests.',
            ['status' => 401]
        );
    }
    return $result;
});
