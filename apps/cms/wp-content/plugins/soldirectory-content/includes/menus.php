<?php
/**
 * WordPress's core REST API does NOT expose registered nav menus at
 * all — there is no /wp-json/wp/v2/menus endpoint built in. This is
 * a real, necessary custom REST route, not an oversight to route
 * around.
 *
 * Registers one menu location ("mega_menu") that appears under
 * Appearance > Menus in wp-admin, and exposes whatever menu is
 * assigned there as real JSON structure (including nested/child
 * items) at /wp-json/soldirectory/v1/menu/mega_menu.
 */

if (!defined('ABSPATH')) exit;

add_action('after_setup_theme', function () {
    register_nav_menus([
        'mega_menu' => 'Mega Menu (Services)',
    ]);
});

add_action('rest_api_init', function () {
    register_rest_route('soldirectory/v1', '/menu/(?P<location>[a-zA-Z0-9_-]+)', [
        'methods' => 'GET',
        'permission_callback' => '__return_true', // public — a site's own navigation isn't sensitive
        'callback' => function (WP_REST_Request $request) {
            $location = $request->get_param('location');
            $locations = get_nav_menu_locations();

            if (empty($locations[$location])) {
                return new WP_REST_Response(['items' => []], 200);
            }

            $menu_items = wp_get_nav_menu_items($locations[$location]);
            if (!$menu_items) {
                return new WP_REST_Response(['items' => []], 200);
            }

            return new WP_REST_Response(['items' => build_menu_tree($menu_items)], 200);
        },
    ]);
});

/**
 * wp_get_nav_menu_items() returns a FLAT list where child items
 * reference their parent via menu_item_parent — this rebuilds the
 * actual nested tree structure a mega menu needs (top-level items
 * with children arrays), rather than making the frontend do that
 * reconstruction itself.
 */
function build_menu_tree(array $items, int $parent_id = 0): array {
    $tree = [];
    foreach ($items as $item) {
        if ((int) $item->menu_item_parent !== $parent_id) continue;
        $tree[] = [
            'id' => $item->ID,
            'title' => $item->title,
            'url' => $item->url,
            'children' => build_menu_tree($items, $item->ID),
        ];
    }
    return $tree;
}
