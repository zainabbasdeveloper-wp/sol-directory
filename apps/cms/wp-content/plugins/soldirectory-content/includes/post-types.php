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

    $meta_fields = [
        'service_name'   => 'string',
        'suburb'         => 'string',
        'state'          => 'string',
        'intro_paragraph'=> 'string',
        'faq_json'       => 'string',
        'toc_json'       => 'string',
        'suburb_facts_json' => 'string',
        'compare_json'   => 'string',
        // Added to cover the rest of ServiceLocationPage.tsx's
        // per-combination editorial content, which was previously
        // 100% hardcoded fixture data reused on every page regardless
        // of the actual service/suburb.
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
    foreach (['eligibility' => 'string', 'funding_info' => 'string', 'faq_json' => 'string'] as $key => $type) {
        register_post_meta('service', $key, [
            'type' => $type, 'single' => true, 'show_in_rest' => true,
            'auth_callback' => fn() => current_user_can('edit_posts'),
        ]);
    }

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
    register_post_meta('location', 'state', [
        'type' => 'string', 'single' => true, 'show_in_rest' => true,
        'auth_callback' => fn() => current_user_can('edit_posts'),
    ]);

    // --- Guide ---
    register_post_type('guide', [
        'labels' => ['name' => 'Guides', 'singular_name' => 'Guide'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'guides',
        'supports' => ['title', 'editor', 'excerpt', 'thumbnail'],
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
