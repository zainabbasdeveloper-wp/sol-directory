<?php
/**
 * Custom post type for the service×suburb pages currently hardcoded
 * in apps/web/src/data/servicePageFixtures.ts (ServiceLocationPage.tsx's
 * illustrative Bankstown/Nursing example) and data/providers.ts
 * (Directory.tsx / Home.tsx / Locations.tsx). This is the real
 * content source those pages are meant to eventually read from
 * instead of hardcoded arrays — same "one canonical source, not
 * scattered copies" principle as the Service/Condition catalogues
 * already built into the Node API.
 *
 * To add a second content type later (e.g. provider marketing
 * profiles), duplicate register_post_type() + register_post_meta()
 * below with a new slug — the REST CORS/response handling in
 * rest-api.php already applies to every post type automatically.
 */

if (!defined('ABSPATH')) exit;

add_action('init', function () {
    register_post_type('service_area_page', [
        'labels' => [
            'name' => 'Service Area Pages',
            'singular_name' => 'Service Area Page',
        ],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'service-area-pages',
        'supports' => ['title', 'editor', 'custom-fields'],
        'has_archive' => false,
        // Never rendered by this WP install's own theme — the REST
        // API is the only real consumer. publicly_queryable stays
        // true only so /wp-json/wp/v2/service-area-pages works;
        // there is no front-end template for this post type at all.
        'publicly_queryable' => true,
    ]);

    $meta_fields = [
        'service_name'   => 'string',  // e.g. "Nursing"
        'suburb'         => 'string',  // e.g. "Bankstown"
        'state'          => 'string',
        'intro_paragraph'=> 'string',
        // These four are JSON-encoded arrays/objects — WordPress
        // post meta is flat by nature, so structured content (FAQ
        // lists, comparison tables) is stored as a JSON string and
        // parsed on the frontend, same as how the current
        // servicePageFixtures.ts arrays are shaped.
        'faq_json'       => 'string',
        'toc_json'       => 'string',
        'suburb_facts_json' => 'string',
        'compare_json'   => 'string',
    ];

    foreach ($meta_fields as $key => $type) {
        register_post_meta('service_area_page', $key, [
            'type' => $type,
            'single' => true,
            'show_in_rest' => true, // makes it appear under `meta` in the REST response
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
        ]);
    }

    // --- Service: one page per service (e.g. /services/personal-care) ---
    // Distinct from service_area_page above, which is the
    // service×suburb combination page (e.g. Nursing in Bankstown).
    // This is the simpler, single-service content the dynamic
    // /services/:slug route resolves to.
    register_post_type('service', [
        'labels' => ['name' => 'Services', 'singular_name' => 'Service'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'services',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);

    // --- Location: editorial content about an area (e.g. /locations/sydney) ---
    // This is the CONTENT side only — actual provider search/
    // filtering for a location still queries the real Provider API,
    // per the data-ownership split (WordPress = editorial content,
    // application DB = provider records).
    register_post_type('location', [
        'labels' => ['name' => 'Locations', 'singular_name' => 'Location'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'locations',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);
    register_post_meta('location', 'state', [
        'type' => 'string', 'single' => true, 'show_in_rest' => true,
        'auth_callback' => fn() => current_user_can('edit_posts'),
    ]);

    // --- Guide: editorial articles (e.g. /guides/choosing-an-ndis-provider) ---
    register_post_type('guide', [
        'labels' => ['name' => 'Guides', 'singular_name' => 'Guide'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'guides',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);
});
