<?php
/**
 * Front controller. In a headless setup this is only really hit for
 * /wp-json/* (the REST API) — there is no theme output meant to be
 * viewed directly, since apps/web is the actual public site.
 */
define('WP_USE_THEMES', true); // WP still needs an active theme internally even when nothing renders it
require __DIR__ . '/wordpress/wp-blog-header.php';
