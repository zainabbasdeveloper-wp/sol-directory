<?php
/**
 * WordPress config for the headless SolDirectory CMS.
 *
 * Content lives in ./wp-content (kept OUTSIDE the vendored
 * ./wordpress core directory on purpose, same principle as never
 * committing node_modules — core is a dependency, content is not).
 *
 * All secrets come from .env (see .env.example) — never hardcoded,
 * same rule this project already follows for the Node API's SMTP
 * and database credentials.
 */

require_once __DIR__ . '/vendor/autoload.php';

if (file_exists(__DIR__ . '/.env')) {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
}

define('DB_NAME', $_ENV['DB_NAME'] ?? 'soldirectory_cms');
define('DB_USER', $_ENV['DB_USER'] ?? '');
define('DB_PASSWORD', $_ENV['DB_PASSWORD'] ?? '');
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

// Keep WordPress's canonical URL aligned with the public URL configured in
// .env, including the port when the CMS is served by PHP's test server.
$wp_site_url = rtrim($_ENV['WP_SITE_URL'] ?? '', '/');
if ($wp_site_url !== '') {
    define('WP_HOME', $wp_site_url);
    define('WP_SITEURL', $wp_site_url);
}

// Content directory decoupled from WP core, same "core is a
// dependency, not something you hand-edit" principle as node_modules.
define('WP_CONTENT_DIR', __DIR__ . '/wp-content');
define('WP_CONTENT_URL', ($_ENV['WP_SITE_URL'] ?? '') . '/wp-content');

// Auth keys/salts — generate real random values via
// https://api.wordpress.org/secret-key/1.1/salt/ and put them in
// .env. Placeholder values here are NOT secure and must be replaced
// before this ever runs against a real database.
define('AUTH_KEY', $_ENV['WP_AUTH_KEY'] ?? 'put-a-real-value-in-.env');
define('SECURE_AUTH_KEY', $_ENV['WP_SECURE_AUTH_KEY'] ?? 'put-a-real-value-in-.env');
define('LOGGED_IN_KEY', $_ENV['WP_LOGGED_IN_KEY'] ?? 'put-a-real-value-in-.env');
define('NONCE_KEY', $_ENV['WP_NONCE_KEY'] ?? 'put-a-real-value-in-.env');
define('AUTH_SALT', $_ENV['WP_AUTH_SALT'] ?? 'put-a-real-value-in-.env');
define('SECURE_AUTH_SALT', $_ENV['WP_SECURE_AUTH_SALT'] ?? 'put-a-real-value-in-.env');
define('LOGGED_IN_SALT', $_ENV['WP_LOGGED_IN_SALT'] ?? 'put-a-real-value-in-.env');
define('NONCE_SALT', $_ENV['WP_NONCE_SALT'] ?? 'put-a-real-value-in-.env');

$table_prefix = 'sd_';

// Headless: no theme rendering, no comments, no XML-RPC — this
// install exists to serve the REST API to the React app and nothing
// else. Reduces attack surface accordingly.
define('WP_DEBUG', ($_ENV['WP_DEBUG'] ?? 'false') === 'true');
define('DISALLOW_FILE_EDIT', true);

if (!defined('ABSPATH')) {
    define('ABSPATH', __DIR__ . '/wordpress/');
}

require_once ABSPATH . 'wp-settings.php';
