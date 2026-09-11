<?php
/**
 * Without this, the browser blocks apps/web's fetch() calls to
 * /wp-json/* entirely — WordPress's default REST CORS handling is
 * "same-origin only," which breaks the moment the React app and
 * WordPress run on different origins (which they always will in a
 * real headless setup — including different PORTS on the same host,
 * which is exactly this deployment: React on :80, WordPress on :8080).
 *
 * FRONTEND_ORIGIN comes from .env. Supports a comma-separated list
 * if you ever need more than one allowed origin (e.g. a staging
 * frontend alongside production).
 *
 * IMPORTANT: this is the ONLY place CORS headers get set for the
 * REST API. Do not also add a raw header() call elsewhere (e.g. an
 * init hook, functions.php) — sending Access-Control-Allow-Origin
 * twice on the same response is invalid per the CORS spec and
 * browsers reject it outright, which looks identical to CORS not
 * being configured at all.
 */

if (!defined('ABSPATH')) exit;

function soldirectory_allowed_cors_origins(): array {
    // Fully parenthesized — mixing ?? and ?: unparenthesized is a
    // FATAL PHP PARSE ERROR (not a warning), which silently breaks
    // this entire file, including the read-only enforcement below.
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

/**
 * This CMS is read-only from the frontend's perspective — the React
 * app should never be able to create/edit/delete WordPress content
 * through the public API, only read it. Content editing happens
 * through wp-admin, by an actual editor, same as any normal CMS
 * workflow.
 */
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
