<?php
if (!defined('ABSPATH')) exit;

add_action('after_setup_theme', function () {
    register_nav_menus(['mega_menu' => 'Mega Menu (Services)']);
});

add_action('rest_api_init', function () {
    register_rest_route('soldirectory/v1', '/menu/(?P<location>[a-zA-Z0-9_-]+)', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
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
