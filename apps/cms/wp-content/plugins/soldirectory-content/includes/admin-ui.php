<?php
/**
 * wp-admin presentation polish for the custom post types. Nothing here
 * touches data, REST output or field definitions — it only changes how
 * the edit screens look and behave for a content editor.
 *
 * The field groups themselves are custom meta boxes (custom-fields.php
 * / custom-fields-engine.php), not ACF/SCF — their own admin.css
 * covers field styling (see custom-fields-engine.php's enqueue). This
 * file is left with only the things that are genuinely about the
 * *screen*, not the fields on it.
 */

if (!defined('ABSPATH')) exit;

/**
 * Post types with no editor body content the frontend actually reads
 * (only title + our field groups + maybe a featured image) don't
 * benefit from Gutenberg — it renders meta boxes as cramped panels
 * under an empty block canvas. The classic screen puts them back in
 * WordPress's normal postbox flow and loads faster besides. REST
 * access (show_in_rest) is unaffected either way.
 *
 * 'service', 'service_area_page', 'location' and 'guide' keep
 * 'editor' in their supports() for the classic TinyMCE box, but none
 * of them are read via content.rendered by the frontend (confirmed —
 * apps/web reads every field for these through the meta exposed by
 * custom-fields-rest.php, never the post body), so nothing is lost by
 * leaving Gutenberg.
 */
add_filter('use_block_editor_for_post_type', function ($use_block_editor, $post_type) {
    if (in_array($post_type, ['mega_menu_tab', 'provider', 'service', 'service_area_page', 'location', 'guide'], true)) return false;
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
