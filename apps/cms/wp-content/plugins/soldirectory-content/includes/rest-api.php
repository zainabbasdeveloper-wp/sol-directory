<?php
/**
 * Without this, the browser blocks apps/web's fetch() calls to
 * /wp-json/* entirely — WordPress's default REST CORS handling is
 * "same-origin only," which breaks the moment the React app and
 * WordPress run on different origins (which they always will in a
 * real headless setup: e.g. React on soldirectory.com.au, WP on
 * cms.soldirectory.com.au).
 *
 * FRONTEND_ORIGIN comes from .env — matching how every credential
 * and origin config elsewhere in this project is environment-driven,
 * never hardcoded.
 */

if (!defined('ABSPATH')) exit;

add_action('rest_api_init', function () {
    remove_filter('rest_pre_serve_request', 'rest_send_cors_headers');

    add_filter('rest_pre_serve_request', function ($value) {
        $allowed_origin = $_ENV['FRONTEND_ORIGIN'] ?? getenv('FRONTEND_ORIGIN') ?: '';
        $origin = get_http_origin();

        if ($origin && $allowed_origin && $origin === $allowed_origin) {
            header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
            header('Access-Control-Allow-Methods: GET');
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
