<?php
if (!defined('ABSPATH')) exit;

add_action('init', function () {
    register_post_type('service_area_page', [
        'labels' => ['name' => 'Service Area Pages', 'singular_name' => 'Service Area Page'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'service-area-pages',
        'supports' => ['title', 'editor', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);

    // service_name, suburb, state, intro_paragraph, faq_json,
    // suburb_facts_json, and compare_json are now managed by the
    // real ACF/SCF field group (acf-fields.php) instead of being
    // registered here directly — removing them from this list avoids
    // registering the same meta key twice. The remaining ones below
    // aren't in the ACF field group yet, so they still need this
    // plain registration to be REST-accessible at all.
    $meta_fields = [
        'toc_json'       => 'string',
        'demand_json'    => 'string',   // "Who is asking" bar charts
        'glance_json'    => 'string',   // "At a glance" key/value table
        'service_counts_json' => 'string', // "Care services available in this suburb"
        'requested_json' => 'string',   // "Most requested support"
        'languages_json' => 'string',   // Language support stats for this suburb
        'hero_stats_json'=> 'string',   // Provider count / response time / price shown in the hero
    ];
    foreach ($meta_fields as $key => $type) {
        register_post_meta('service_area_page', $key, [
            'type' => $type, 'single' => true, 'show_in_rest' => true,
            'auth_callback' => fn() => current_user_can('edit_posts'),
        ]);
    }

    // --- Service ---
    register_post_type('service', [
        'labels' => ['name' => 'Services', 'singular_name' => 'Service'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'services',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);
    // eligibility, funding_info, faq_json are now managed by the ACF/
    // SCF field group (acf-fields.php) — nothing left to register
    // directly here.

    // --- Location ---
    register_post_type('location', [
        'labels' => ['name' => 'Locations', 'singular_name' => 'Location'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'locations',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);
    // 'state' is now managed by the ACF/SCF field group too.

    // --- Guide ---
    register_post_type('guide', [
        'labels' => ['name' => 'Guides', 'singular_name' => 'Guide'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'guides',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);

    // --- Taxonomies ---
    register_taxonomy('service_category', ['service', 'service_area_page'], [
        'labels' => ['name' => 'Service Categories', 'singular_name' => 'Service Category'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'service-categories',
        'hierarchical' => true,
        'show_admin_column' => true,
    ]);

    register_taxonomy('location_region', ['location'], [
        'labels' => ['name' => 'Regions', 'singular_name' => 'Region'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'regions',
        'hierarchical' => true,
        'show_admin_column' => true,
    ]);

    register_taxonomy('guide_topic', ['guide'], [
        'labels' => ['name' => 'Guide Topics', 'singular_name' => 'Guide Topic'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'guide-topics',
        'hierarchical' => false,
        'show_admin_column' => true,
    ]);

    // The remaining 4 mega menu tabs (Condition/Funding/Coordinator/
    // Language) as real, editable-in-wp-admin taxonomies — same
    // hierarchical pattern as service_category: parent term = column
    // group heading, child term = individual link. Loosely attached
    // to 'service' (the only real CPT here) since WordPress
    // taxonomies need at least one object type — this doesn't
    // require every service to actually use them.
    foreach ([
        'condition_category' => 'Condition Categories',
        'funding_category' => 'Funding Categories',
        'coordinator_category' => 'Coordinator Categories',
        'language_category' => 'Language Categories',
    ] as $taxKey => $label) {
        register_taxonomy($taxKey, ['service'], [
            'labels' => ['name' => $label, 'singular_name' => rtrim($label, 'ies') . 'y'],
            'public' => true,
            'show_in_rest' => true,
            'rest_base' => str_replace('_', '-', $taxKey) . 's',
            'hierarchical' => true,
            'show_admin_column' => false,
        ]);
    }
});
