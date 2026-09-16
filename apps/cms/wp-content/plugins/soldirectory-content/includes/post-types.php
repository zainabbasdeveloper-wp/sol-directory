<?php
if (!defined('ABSPATH')) exit;

add_action('init', function () {
    // --- Mega Menu Tab (real, dedicated CPT — replaces the
    // taxonomy-based mega menu approach). One post per tab
    // (Service/Condition/Funding/Coordinator/Language), with a full
    // Column -> Link nested structure via SCF, giving a WordPress
    // admin genuine control over icons, descriptions, CTAs,
    // ordering, and active/inactive state per item — none of which
    // the earlier taxonomy-term approach could represent. ---
    register_post_type('mega_menu_tab', [
        'labels' => ['name' => 'Mega Menu Tabs', 'singular_name' => 'Mega Menu Tab'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'mega-menu-tabs',
        'supports' => ['title', 'custom-fields', 'page-attributes'], // page-attributes gives a native "Order" field for tab ordering
        'has_archive' => false,
        'publicly_queryable' => false, // this is menu config, not a page anyone should visit directly
        'show_in_menu' => true,
        'menu_icon' => 'dashicons-menu',
    ]);

    register_post_type('service_area_page', [
        'labels' => ['name' => 'Service Area Pages', 'singular_name' => 'Service Area Page'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'service-area-pages',
        'supports' => ['title', 'editor', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);

    // Every service_area_page field is now managed by the ACF/SCF
    // field group (acf-fields.php) — nothing left to register
    // directly here.

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
    //
    // rest_base and singular_name are explicit here, not derived via
    // string manipulation — an earlier version appended a naive 's'
    // to pluralize (condition_category -> condition-categorys),
    // which doesn't match English pluralization and silently didn't
    // match what the frontend (MegaMenu.tsx) actually calls
    // (condition-categories). That mismatch meant these 4 REST
    // endpoints 404'd from the day they were registered — found via
    // a real REST response showing the wrong URLs, not guessed.
    foreach ([
        'condition_category'   => ['label' => 'Condition Categories',   'singular' => 'Condition Category',   'rest_base' => 'condition-categories'],
        'funding_category'     => ['label' => 'Funding Categories',     'singular' => 'Funding Category',     'rest_base' => 'funding-categories'],
        'coordinator_category' => ['label' => 'Coordinator Categories', 'singular' => 'Coordinator Category', 'rest_base' => 'coordinator-categories'],
        'language_category'    => ['label' => 'Language Categories',    'singular' => 'Language Category',    'rest_base' => 'language-categories'],
    ] as $taxKey => $cfg) {
        register_taxonomy($taxKey, ['service'], [
            'labels' => ['name' => $cfg['label'], 'singular_name' => $cfg['singular']],
            'public' => true,
            'show_in_rest' => true,
            'rest_base' => $cfg['rest_base'],
            'hierarchical' => true,
            'show_admin_column' => false,
        ]);
    }
});
