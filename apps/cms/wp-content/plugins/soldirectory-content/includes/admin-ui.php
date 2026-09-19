<?php
/**
 * wp-admin presentation polish for the custom post types. Nothing here
 * touches data, REST output or field definitions — it only changes how
 * the edit screens look and behave for a content editor.
 */

if (!defined('ABSPATH')) exit;

/**
 * Post types with no editor body (only title + ACF field groups +
 * maybe a featured image) don't benefit from Gutenberg — it renders
 * their ACF groups as cramped meta boxes under an empty canvas. The
 * classic screen lays ACF groups out properly and loads faster. REST
 * access (show_in_rest) is unaffected.
 */
add_filter('use_block_editor_for_post_type', function ($use_block_editor, $post_type) {
    if (in_array($post_type, ['mega_menu_tab', 'provider'], true)) return false;
    return $use_block_editor;
}, 10, 2);

/** Tells editors exactly what is (and isn't) editable on a synced provider. */
add_action('admin_notices', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->post_type !== 'provider' || $screen->base !== 'post') return;
    echo '<div class="notice notice-info"><p><strong>This provider is synced from the SolDirectory application.</strong> '
        . 'Details below are overwritten the next time the provider is saved in the application, so edit them there. '
        . 'The one thing you <em>can</em> manage here is the logo: set the <strong>Featured image</strong> and it '
        . 'flows back to the live site automatically.</p></div>';
});

add_action('admin_head', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->base !== 'post') return;
    ?>
    <style>
        /* Read-only mirror fields should look read-only, not broken. */
        .acf-field input[readonly],
        .acf-field textarea[readonly] { background: #f6f7f7; color: #50575e; cursor: default; }

        /* Tabs: make the active one obvious and give groups breathing room. */
        .acf-fields > .acf-tab-wrap { margin-bottom: 8px; }
        .acf-tab-group li.active a { font-weight: 600; }

        /* Collapsed repeater rows read as a tidy list, not a wall of fields. */
        .acf-repeater.-block > .acf-table > tbody > .acf-row > .acf-row-handle.order { background: #f6f7f7; }
        .acf-repeater .acf-actions .acf-button { margin-top: 6px; }

        /* Instructions under a label were easy to miss next to inputs. */
        .acf-field .acf-label .description { color: #646970; font-size: 12.5px; line-height: 1.5; }
    </style>
    <?php
});
