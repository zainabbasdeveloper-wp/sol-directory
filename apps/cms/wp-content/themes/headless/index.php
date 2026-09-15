<?php
// Never redirect these paths — WordPress core handles them.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$skip_prefixes = ['/wp-admin', '/wp-login.php', '/wp-json', '/wp-content', '/wp-includes'];
foreach ($skip_prefixes as $prefix) {
    if (strpos($path, $prefix) === 0) {
        // Let WordPress handle it normally.
        return;
    }
}

// Everything else goes to the frontend.
$frontend = $_ENV['FRONTEND_ORIGIN'] ?? 'https://directory.solbusinessconsultant.com.au';
wp_redirect($frontend);
exit;
