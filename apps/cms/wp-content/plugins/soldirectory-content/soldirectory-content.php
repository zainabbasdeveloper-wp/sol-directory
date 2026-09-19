<?php
/**
 * Plugin Name: SolDirectory Content
 * Description: Custom content types and REST API exposure for the headless SolDirectory CMS.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit;

require_once __DIR__ . '/includes/post-types.php';
require_once __DIR__ . '/includes/rest-api.php';
require_once __DIR__ . '/includes/webhook.php';
require_once __DIR__ . '/includes/menus.php';
require_once __DIR__ . '/includes/acf-fields.php';
require_once __DIR__ . '/includes/admin-ui.php';
