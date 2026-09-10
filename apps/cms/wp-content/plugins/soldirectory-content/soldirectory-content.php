<?php
/**
 * Plugin Name: SolDirectory Content
 * Description: Custom content types and REST API exposure for the headless SolDirectory CMS. This is the only plugin apps/web should ever need content from.
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) exit; // no direct access

require_once __DIR__ . '/includes/post-types.php';
require_once __DIR__ . '/includes/rest-api.php';
