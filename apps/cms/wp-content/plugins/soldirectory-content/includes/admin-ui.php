<?php
/**
 * wp-admin presentation polish for the custom post types. Nothing here
 * touches data, REST output or field definitions — it only changes how
 * the edit screens look and behave for a content editor.
 */

if (!defined('ABSPATH')) exit;

/**
 * Post types with no editor body content the frontend actually reads
 * (only title + ACF field groups + maybe a featured image) don't
 * benefit from Gutenberg — it renders their ACF groups as cramped,
 * unstyled meta boxes under an empty block canvas: the block editor
 * mounts meta box panels lazily inside a collapsible "Meta Boxes"
 * accordion, which is where ACF/SCF's repeater JS (Add row/remove
 * row/drag-to-reorder) silently fails to bind — the fields render,
 * but the buttons do nothing. The classic screen puts every ACF group
 * back in WordPress's normal postbox flow, where that JS is battle
 * tested, and it loads faster besides. REST access (show_in_rest) is
 * unaffected either way.
 *
 * 'service', 'service_area_page', 'location' and 'guide' keep
 * 'editor' in their supports() for the classic TinyMCE box, but none
 * of them are read via content.rendered by the frontend (confirmed —
 * apps/web reads every field for these through the ACF meta below,
 * never the post body), so nothing is lost by leaving Gutenberg.
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

add_action('admin_head', function () {
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || $screen->base !== 'post') return;
    ?>
    <style>
        /* ---- Postbox (field group) chrome ------------------------- */
        /* Every ACF group below is its own WordPress postbox once the
           post type is on the classic screen (see use_block_editor_for_post_type
           above) — style that shell so a page with 8 groups reads as
           8 distinct, scannable sections instead of one long form. */
        #poststuff .postbox { border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); margin-bottom: 20px; }
        #poststuff .postbox .hndle,
        #poststuff .postbox .postbox-header h2 {
            font-size: 14px; font-weight: 600; padding: 12px 16px; border-bottom: 1px solid #dcdcde;
        }
        #poststuff .postbox .inside { padding: 18px 20px 20px; margin: 0; }
        #poststuff .postbox .acf-fields { border-top: 0; }

        /* ---- Field spacing / labels -------------------------------- */
        .acf-field { padding: 14px 0; border-top: 1px solid #f0f0f1; }
        .acf-fields > .acf-field:first-child,
        .acf-table .acf-field { border-top: 0; padding: 0; }
        .acf-field .acf-label label,
        .acf-field > .acf-label { font-weight: 600; font-size: 13px; margin-bottom: 6px; color: #1d2327; }
        .acf-field .acf-label .description { color: #646970; font-size: 12.5px; line-height: 1.5; margin-top: 3px; }
        .acf-field p.description { color: #646970; font-size: 12.5px; }

        /* Inputs: one consistent look instead of the browser default. */
        .acf-field input[type=text],
        .acf-field input[type=number],
        .acf-field input[type=url],
        .acf-field input[type=email],
        .acf-field textarea,
        .acf-field select {
            width: 100%; max-width: 640px; box-sizing: border-box;
            border: 1px solid #8c8f94; border-radius: 4px; padding: 7px 10px; font-size: 13.5px;
        }
        .acf-field input[type=number] { max-width: 160px; }
        .acf-field textarea { max-width: 100%; line-height: 1.5; }
        .acf-field .acf-input input[type=text]:focus,
        .acf-field .acf-input textarea:focus,
        .acf-field .acf-input select:focus { border-color: #2271b1; box-shadow: 0 0 0 1px #2271b1; }

        /* Read-only mirror fields should look read-only, not broken. */
        .acf-field input[readonly],
        .acf-field textarea[readonly] { background: #f6f7f7; color: #50575e; cursor: default; }

        /* Wrapper width columns (soldirectory_acf_width_map) — force
           them onto one row on anything wider than a phone instead of
           silently stacking, which used to make paired fields (e.g.
           Suburb/State/Postcode) look identical to unrelated ones. */
        .acf-fields.-left > .acf-field,
        .acf-fields:not(.-left) > .acf-field[data-width] { float: left; box-sizing: border-box; }
        .acf-fields::after { content: ''; display: table; clear: both; }
        @media (max-width: 782px) { .acf-field[data-width] { width: 100% !important; float: none; } }

        /* ---- True/false toggle -------------------------------------- */
        .acf-field .acf-switch { vertical-align: middle; }

        /* ---- Tabs: make the active one obvious and give groups
               breathing room. -------------------------------------- */
        .acf-fields > .acf-tab-wrap { margin-bottom: 4px; }
        .acf-tab-group { border-bottom: 1px solid #dcdcde; margin-bottom: 18px !important; }
        .acf-tab-group li a { padding: 9px 14px; font-size: 13px; }
        .acf-tab-group li.active a { font-weight: 600; color: #1d2327; box-shadow: inset 0 -2px #2271b1; }

        /* ---- Group fields (field type "group") — indent + a rule so a
               nested set of fields (Cost & Payment, Local Information…)
               reads as one unit, not more top-level fields. --------- */
        .acf-field-group > .acf-input > .acf-fields {
            border: 1px solid #e5e5e7; border-radius: 6px; padding: 4px 16px; background: #fbfbfc;
        }

        /* ---- Repeaters: this is the part that most needed help.
               Row number, drag handle and remove icon barely showed up
               with no ACF stylesheet loaded — give them a real
               background and border so a row of fields reads as a
               row, and "Add row" / "Remove" stay reachable and
               obviously clickable. ---------------------------------- */
        .acf-repeater { margin-top: 4px; }
        .acf-repeater > .acf-table {
            width: 100%; border-collapse: collapse; border: 1px solid #dcdcde; border-radius: 6px; overflow: hidden;
        }
        .acf-repeater > .acf-table > thead th {
            background: #f6f7f7; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em;
            color: #50575e; padding: 8px 10px; border-bottom: 1px solid #dcdcde;
        }
        .acf-repeater > .acf-table > tbody > tr.acf-row { border-top: 1px solid #eee; }
        .acf-repeater > .acf-table > tbody > tr.acf-row:hover { background: #f9fbfe; }
        .acf-repeater > .acf-table > tbody > tr.acf-row > td { padding: 10px; vertical-align: top; }
        .acf-repeater .acf-row-handle.order {
            background: #f6f7f7 !important; text-align: center; color: #8c8f94; font-size: 12px; width: 32px;
        }
        .acf-repeater .acf-row-handle.remove { width: 34px; text-align: center; }
        .acf-repeater .acf-row-handle.remove .acf-icon {
            background: #fff; border: 1px solid #dcdcde; color: #a00;
        }
        .acf-repeater .acf-row-handle.remove .acf-icon:hover { background: #a00; color: #fff; border-color: #a00; }

        /* -block layout repeaters (Add row appends a stacked card, not
           a table) — the CTA/FAQ/Credential/Regulator groups above. */
        .acf-repeater.-block > .acf-table > tbody > .acf-row {
            display: block; border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 12px; padding: 14px 16px 4px;
            background: #fff; position: relative;
        }
        .acf-repeater.-block > .acf-table > tbody > .acf-row > .acf-row-handle.order {
            display: inline-block; width: auto; background: none !important; font-weight: 600; color: #2271b1; padding: 0 0 10px;
        }
        .acf-repeater.-block > .acf-table > tbody > .acf-row > .acf-row-handle.remove {
            position: absolute; top: 10px; right: 10px; width: auto;
        }
        .acf-repeater.-block > .acf-table > tbody > .acf-row > td.acf-fields { display: block; padding: 0; }
        .acf-repeater.-block > .acf-table > thead { display: none; }

        .acf-repeater .acf-actions { padding: 12px 2px 0; text-align: left; }
        .acf-repeater .acf-actions .acf-button {
            margin-top: 6px; border-radius: 4px; font-weight: 600;
        }

        /* Collapsed rows (soldirectory_acf_collapsed_map) read as a
           tidy one-line summary instead of a blank "Row 1". */
        .acf-repeater .acf-row.-collapsed > .acf-fields { display: none; }
        .acf-repeater .acf-row.-collapsed { background: #fbfbfc; }

        /* ---- Relationship / post_object (Related Services) --------- */
        .acf-field .acf-relationship,
        .acf-field .acf-post_object { max-width: 640px; }
        .acf-relationship .list { border: 1px solid #dcdcde; border-radius: 4px; }

        /* ---- Image field (Hero Background Image) -------------------- */
        .acf-field .acf-image-uploader { max-width: 320px; }

        /* ---- WYSIWYG (Pricing Information) — full width, breathing
               room from the field above. --------------------------- */
        .acf-field .wp-editor-wrap { max-width: 100%; margin-top: 4px; }
    </style>
    <?php
});
