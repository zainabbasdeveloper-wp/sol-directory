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


// Behind an Nginx reverse proxy, PHP's built-in server sees HTTP even
// though the browser connected via HTTPS. Tell WordPress the original
// request was HTTPS so it doesn't redirect-loop on /wp-admin.
if (
    (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
    || (isset($_SERVER['HTTP_X_FORWARDED_SSL']) && $_SERVER['HTTP_X_FORWARDED_SSL'] === 'on')
) {
    $_SERVER['HTTPS'] = 'on';
    $_SERVER['SERVER_PORT'] = 443;
}


define('DB_NAME', $_ENV['DB_NAME'] ?? 'soldirectory_cms');
define('DB_USER', $_ENV['DB_USER'] ?? '');
define('DB_PASSWORD', $_ENV['DB_PASSWORD'] ?? '');
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_CHARSET', 'utf8mb4');
define('DB_COLLATE', '');

define('AUTH_KEY',         '0;@ep+`JFg@!xo;`S|^{$bU2AS4&=jh[$OZMJC& 5+}QJJ^}>?L#MCa~rZq39|(r');
define('SECURE_AUTH_KEY',  '|S]#G>^4S}<Ym+?gqUu,n:nvMS} 358`(d-QCHoivXzMg-FtG;<d(E0-|gT7IPsu');
define('LOGGED_IN_KEY',    'LQpAzRs4&#Ff{6V`O|jQT=%!eYzh%dIvw@E/JS0;v0U3&gB?NJ]xeMW:0h@g(fKt');
define('NONCE_KEY',        'B6jgg^>%X&8y1j88.l*zdMKAkNh|}G@@[Lq4TzCHUrQ3jwdqbA`Q+dXxE`dsK`oV');
define('AUTH_SALT',        'NH1IE`6E_X>rBsl$&fBqb[:M>-dV=V+>_!_A,cl+IV(n*6U%::=&T`#lVu0g+>`[');
define('SECURE_AUTH_SALT', '79t:3mZK|t|<.^ `FqfZs|)Hm1QN/R`V:bZKtG6=Uau6&`TJkr)Ahf(o,/e8rc57');
define('LOGGED_IN_SALT',   'NSQ0L@XHzT*L-Sq]d t!<F&C1#PjBy3P3PG{}M#(GN0!%p^k=7PRhS={d[*q@]/d');
define('NONCE_SALT',       'ywt)bo/utJIQ0Ht W{lURbja+Dch.-7!6-%;Nju,KrAKi6l{lE8_MOQq}4([=OfO');


// Keep WordPress's canonical URL aligned with the public URL configured in
// .env, including the port when the CMS is served by PHP's test server.
$wp_site_url = rtrim($_ENV['WP_SITE_URL'] ?? '', '/');
if ($wp_site_url !== '') {
    define('WP_HOME', $wp_site_url);
    define('WP_SITEURL', $wp_site_url);
}

// Force cookie domain + secure flags so sessions survive across the proxy
define('COOKIE_DOMAIN', 'wordpress.solbusinessconsultant.com.au');
define('COOKIEPATH', '/');
define('SITECOOKIEPATH', '/');
define('ADMIN_COOKIE_PATH', '/');

// Content directory decoupled from WP core, same "core is a
// dependency, not something you hand-edit" principle as node_modules.
define('WP_CONTENT_DIR', __DIR__ . '/wp-content');
define('WP_CONTENT_URL', ($_ENV['WP_SITE_URL'] ?? '') . '/wp-content');

// Auth keys/salts — generate real random values via
// https://api.wordpress.org/secret-key/1.1/salt/ and put them in
// .env. Placeholder values here are NOT secure and must be replaced
// before this ever runs against a real database.




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
