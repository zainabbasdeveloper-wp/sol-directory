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

    // --- Provider ---
    // A read/display MIRROR of a real Provider record — the Node API's
    // MongoDB remains the single source of truth (matching, search,
    // geocoding, onboarding, the scraper import all write there).
    // Every provider create/update auto-pushes a mirrored post here
    // (services/wordpressSync.service.ts in apps/api), keyed by
    // mongo_id (below) so re-syncs PUT the same post instead of
    // duplicating it. The ONE field that flows the other way is the
    // logo: content admins manage it via this post's featured image in
    // the WordPress Media Library, and the webhook (webhook.php)
    // pushes the resulting URL back into Mongo. Editing any other
    // field here has no effect on the live app — it gets overwritten
    // on the provider's next sync.
    register_post_type('provider', [
        'labels' => ['name' => 'Providers', 'singular_name' => 'Provider'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'providers',
        'supports' => ['title', 'thumbnail', 'custom-fields'],
        'has_archive' => false,
        'publicly_queryable' => true,
    ]);

    // --- Taxonomies ---
    // 'provider' added alongside 'service'/'service_area_page' below —
    // these 4 categories already existed for editorial content and are
    // exactly what the provider mirror needs for services/funding/
    // conditions/languages, so providers reuse them rather than
    // duplicating a parallel set.
    register_taxonomy('service_category', ['service', 'service_area_page', 'provider'], [
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
    // group heading, child term = individual link. Attaching to a
    // post type doesn't require every post of that type to actually
    // use the taxonomy.
    //
    // rest_base and singular_name are explicit here, not derived via
    // string manipulation — an earlier version appended a naive 's'
    // to pluralize (condition_category -> condition-categorys),
    // which doesn't match English pluralization and silently didn't
    // match what the frontend (MegaMenu.tsx) actually calls
    // (condition-categories). That mismatch meant these 4 REST
    // endpoints 404'd from the day they were registered — found via
    // a real REST response showing the wrong URLs, not guessed.
    // condition_category and language_category also attach to
    // 'provider' (funding_category too, further below) — coordinator_category
    // stays service-only, it's not a provider attribute.
    foreach ([
        'condition_category'   => ['label' => 'Condition Categories',   'singular' => 'Condition Category',   'rest_base' => 'condition-categories',   'types' => ['service', 'provider']],
        'funding_category'     => ['label' => 'Funding Categories',     'singular' => 'Funding Category',     'rest_base' => 'funding-categories',     'types' => ['service', 'provider']],
        'coordinator_category' => ['label' => 'Coordinator Categories', 'singular' => 'Coordinator Category', 'rest_base' => 'coordinator-categories', 'types' => ['service']],
        'language_category'    => ['label' => 'Language Categories',    'singular' => 'Language Category',    'rest_base' => 'language-categories',    'types' => ['service', 'provider']],
    ] as $taxKey => $cfg) {
        register_taxonomy($taxKey, $cfg['types'], [
            'labels' => ['name' => $cfg['label'], 'singular_name' => $cfg['singular']],
            'public' => true,
            'show_in_rest' => true,
            'rest_base' => $cfg['rest_base'],
            'hierarchical' => true,
            'show_admin_column' => false,
        ]);
    }

    // Provider-only — age groups served has no existing equivalent
    // among the editorial taxonomies above.
    register_taxonomy('age_group_category', ['provider'], [
        'labels' => ['name' => 'Age Group Categories', 'singular_name' => 'Age Group Category'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'age-group-categories',
        'hierarchical' => true,
        'show_admin_column' => false,
    ]);
});
