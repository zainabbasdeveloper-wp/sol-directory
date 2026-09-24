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
// Custom admin UI for every field this plugin manages — replaces
// ACF/SCF entirely (see custom-fields.php's top comment for why).
require_once __DIR__ . '/includes/custom-fields.php';
// Reads content saved while ACF was active and converts it (see the file's own comment).
require_once __DIR__ . '/includes/acf-compat.php';
// One-time baseline text for service posts that were created with only a title.
require_once __DIR__ . '/includes/baseline-services.php';
// Eligibility/funding guidance, FAQs, SEO fields and related links for service posts (Tools > Service content).
require_once __DIR__ . '/includes/content-services.php';
require_once __DIR__ . '/includes/custom-fields-engine.php';
require_once __DIR__ . '/includes/custom-fields-rest.php';
require_once __DIR__ . '/includes/admin-ui.php';
