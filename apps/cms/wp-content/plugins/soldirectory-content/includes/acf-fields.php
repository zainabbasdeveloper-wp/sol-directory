<?php
/**
 * Real ACF/SCF field groups for every post type — defined as code
 * (acf_add_local_field_group), not clicked together in the admin UI,
 * so this is version-controlled and deploys the same way every time,
 * same principle as everything else in this plugin.
 *
 * IMPORTANT: every field's 'name' below matches the exact meta key
 * the frontend (wordpressApi.ts) already reads — this replaces the
 * plain register_post_meta calls for these same keys with a real
 * admin UI, without requiring any frontend change at all.
 *
 * Field values are exposed to the REST API explicitly via
 * register_rest_field() at the bottom of this file — not relying on
 * ACF/SCF's own "Show in REST" toggle, so this works the same
 * regardless of ACF/SCF version or settings.
 */

if (!defined('ABSPATH')) exit;

/**
 * Admin-UX layer shared by every field group below. Field DEFINITIONS
 * (names/keys/types — what the frontend and REST output depend on) are
 * untouched; this only decorates how they're presented in wp-admin:
 *
 *  - repeater rows collapse to a one-line summary (the sub-field named
 *    in the map) instead of every row of a 40-item FAQ being expanded
 *    at once;
 *  - short related fields sit side by side (wrapper width) instead of
 *    one long single column;
 *  - every group gets explicit, consistent layout settings so it
 *    doesn't depend on ACF/SCF version defaults.
 *
 * Keys are FIELD KEYS (field_xxx), not names, because names like
 * 'title' / 'heading' repeat across groups.
 */
function soldirectory_acf_collapsed_map(): array {
    return [
        'field_mmt_columns'       => 'field_mmt_col_title',
        'field_mmt_col_links'     => 'field_mmt_link_label',
        'field_service_faq'       => 'field_faq_q',
        'field_reg_cards'         => 'field_reg_card_title',
        'field_cred_items'        => 'field_cred_title',
        'field_sap_faq'           => 'field_sap_faq_q',
        'field_sap_compare'       => 'field_sap_compare_title',
        'field_sap_demand'        => 'field_sap_demand_title',
        'field_expect_steps'      => 'field_expect_step_title',
        'field_regs_cards'        => 'field_regs_card_title',
    ];
}

function soldirectory_acf_width_map(): array {
    return [
        // Service Area Page basics
        'field_sap_service_name' => 34, 'field_sap_suburb' => 33, 'field_sap_state' => 33,
        // Hero stats / local information (three short values per row)
        'field_sap_hero_provider_count' => 34, 'field_sap_hero_response_minutes' => 33, 'field_sap_hero_hourly_rate' => 33,
        'field_local_population' => 34, 'field_local_income' => 33, 'field_local_postcode' => 33,
        'field_local_hospital' => 50, 'field_local_transport' => 50,
        // Provider finder toggles
        'field_pf_count' => 34, 'field_pf_sort' => 33, 'field_pf_show_filters' => 33, 'field_pf_show_map' => 34, 'field_pf_show_count' => 33,
        'field_finder_count' => 50, 'field_finder_sort' => 50,
        'field_finder_show_filters' => 34, 'field_finder_show_map' => 33, 'field_finder_show_count' => 33,
        // CTA pairs
        'field_cta_primary_label' => 50, 'field_cta_primary_action' => 50,
        'field_cta_secondary_label' => 50, 'field_cta_secondary_action' => 50,
        'field_sap_cta_primary_label' => 50, 'field_sap_cta_primary_action' => 50,
        'field_sap_cta_secondary_label' => 50, 'field_sap_cta_secondary_action' => 50,
        'field_sap_cta_primary_url' => 50, 'field_sap_cta_secondary_url' => 50,
        'field_sh_cta_label' => 50, 'field_sh_cta_url' => 50,
        // Mega menu tab header row
        'field_mmt_icon' => 50, 'field_mmt_active' => 50,
        // Provider mirror (read-only) — compact identity/address block
        'field_provider_mongo_id' => 50, 'field_provider_mongo_slug' => 50,
        'field_provider_legal_name' => 50, 'field_provider_abn' => 50,
        'field_provider_address' => 50, 'field_provider_suburb' => 25, 'field_provider_state' => 12, 'field_provider_postcode' => 13,
        'field_provider_latitude' => 50, 'field_provider_longitude' => 50,
        'field_provider_travel_radius' => 25, 'field_provider_weekly_capacity' => 25, 'field_provider_roster_size' => 25, 'field_provider_after_hours' => 25,
    ];
}

function soldirectory_acf_decorate_fields(array $fields): array {
    $collapsed = soldirectory_acf_collapsed_map();
    $widths = soldirectory_acf_width_map();
    foreach ($fields as $i => $field) {
        $key = $field['key'] ?? '';
        if ($key !== '' && isset($widths[$key]) && empty($field['wrapper'])) {
            $field['wrapper'] = ['width' => (string) $widths[$key], 'class' => '', 'id' => ''];
        }
        if (($field['type'] ?? '') === 'repeater') {
            if ($key !== '' && isset($collapsed[$key])) $field['collapsed'] = $collapsed[$key];
            if (empty($field['button_label'])) $field['button_label'] = 'Add row';
        }
        if (!empty($field['sub_fields']) && is_array($field['sub_fields'])) {
            $field['sub_fields'] = soldirectory_acf_decorate_fields($field['sub_fields']);
        }
        $fields[$i] = $field;
    }
    return $fields;
}

/** Single entry point for registering a field group (see block above). */
function soldirectory_add_group(array $group): void {
    $group = array_merge([
        'position'              => 'normal',
        'style'                 => 'default',
        'label_placement'       => 'top',
        'instruction_placement' => 'label',
        'active'                => true,
    ], $group);
    $group['fields'] = soldirectory_acf_decorate_fields($group['fields'] ?? []);
    acf_add_local_field_group($group);
}

/** A tab divider — stores nothing, purely organises a long group. */
function soldirectory_tab(string $key, string $label): array {
    return ['key' => $key, 'label' => $label, 'name' => '', 'type' => 'tab', 'placement' => 'top', 'endpoint' => 0];
}

add_action('acf/init', function () {
    // SCF/ACF may load after this plugin. Check here, after its init hook,
    // rather than during plugin file loading when the API may not exist yet.
    if (!function_exists('acf_add_local_field_group')) return;

    // --- Mega Menu Tab ---
    // Post title = tab label. Native "Order" (page-attributes,
    // already added to the CPT) = tab sort order. Everything else
    // below is the real structured control the taxonomy approach
    // couldn't offer: a stable key for the frontend to map against,
    // icon, description, active toggle, and the full Column -> Link
    // hierarchy.
    soldirectory_add_group([
        'key' => 'group_mega_menu_tab_fields',
        'title' => 'Mega Menu Tab Details',
        'fields' => [
            [
                'key' => 'field_mmt_slug_key', 'label' => 'Slug / Key',
                'name' => 'tab_key', 'type' => 'text',
                'instructions' => "Stable identifier the frontend uses to match this tab (e.g. 'service', 'condition', 'funding'). Changing this after launch requires a matching frontend update — coordinate before renaming.",
                'required' => 1,
            ],
            ['key' => 'field_mmt_description', 'label' => 'Tab Description', 'name' => 'description', 'type' => 'text', 'instructions' => 'Short subtext shown under the tab label in the menu rail (e.g. "NDIS, aged care, allied health, and more").'],
            ['key' => 'field_mmt_icon', 'label' => 'Icon (optional)', 'name' => 'icon', 'type' => 'text', 'instructions' => 'An icon identifier or short text/emoji — how this renders depends on the frontend icon system in use.'],
            ['key' => 'field_mmt_active', 'label' => 'Active', 'name' => 'active', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1, 'instructions' => 'Inactive tabs are hidden from the live menu without deleting them.'],
            [
                'key' => 'field_mmt_columns', 'label' => 'Columns', 'name' => 'columns', 'type' => 'repeater',
                'layout' => 'block', 'button_label' => 'Add column',
                'sub_fields' => [
                    ['key' => 'field_mmt_col_title', 'label' => 'Column Title', 'name' => 'title', 'type' => 'text', 'required' => 1],
                    [
                        'key' => 'field_mmt_col_links', 'label' => 'Links', 'name' => 'links', 'type' => 'repeater',
                        'layout' => 'table', 'button_label' => 'Add link',
                        'sub_fields' => [
                            ['key' => 'field_mmt_link_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text', 'required' => 1],
                            ['key' => 'field_mmt_link_url', 'label' => 'URL', 'name' => 'url', 'type' => 'text', 'instructions' => 'A relative app path (e.g. /services/personal-care) or a full URL.'],
                            ['key' => 'field_mmt_link_description', 'label' => 'Description', 'name' => 'description', 'type' => 'text'],
                            ['key' => 'field_mmt_link_icon', 'label' => 'Icon', 'name' => 'icon', 'type' => 'text'],
                            ['key' => 'field_mmt_link_badge', 'label' => 'Badge', 'name' => 'badge', 'type' => 'text', 'instructions' => 'e.g. "New" — leave blank for none.'],
                            ['key' => 'field_mmt_link_new_tab', 'label' => 'Open in new tab', 'name' => 'open_in_new_tab', 'type' => 'true_false', 'ui' => 1],
                            ['key' => 'field_mmt_link_active', 'label' => 'Active', 'name' => 'active', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1],
                        ],
                    ],
                ],
            ],
            [
                // Matches Part 3's "featured links / CTA buttons" —
                // one optional CTA per tab, shown at the bottom of
                // that tab's panel.
                'key' => 'field_mmt_cta', 'label' => 'Tab CTA (optional)', 'name' => 'cta', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_mmt_cta_label', 'label' => 'CTA Label', 'name' => 'label', 'type' => 'text'],
                    [
                        'key' => 'field_mmt_cta_action', 'label' => 'CTA Action', 'name' => 'action', 'type' => 'text',
                        'instructions' => "An action key the frontend interprets (e.g. 'get_matched', 'find_providers') rather than a hardcoded URL — this is required if the CTA should open an app flow/modal instead of navigating to a page. Leave blank and fill in URL below for a plain link instead.",
                    ],
                    ['key' => 'field_mmt_cta_url', 'label' => 'CTA URL (if not using an action)', 'name' => 'url', 'type' => 'text'],
                ],
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'mega_menu_tab']]],
    ]);

    // --- Service ---
    soldirectory_add_group([
        'key' => 'group_service_fields',
        'title' => 'Service Information',
        'fields' => [
            ['key' => 'field_service_overview_heading', 'label' => 'Overview Heading', 'name' => 'overview_heading', 'type' => 'text'],
            ['key' => 'field_service_overview_content', 'label' => 'Overview Content', 'name' => 'overview_content', 'type' => 'textarea', 'rows' => 4],
            ['key' => 'field_service_who_for', 'label' => 'Who Is This Service For?', 'name' => 'who_for', 'type' => 'textarea', 'rows' => 3],
            ['key' => 'field_service_eligibility', 'label' => 'Eligibility', 'name' => 'eligibility', 'type' => 'textarea', 'rows' => 3],
            ['key' => 'field_service_funding_info', 'label' => 'Funding Options', 'name' => 'funding_info', 'type' => 'textarea', 'rows' => 3],
            ['key' => 'field_service_plan_mgmt', 'label' => 'Plan Management Information', 'name' => 'plan_management_info', 'type' => 'textarea', 'rows' => 2],
            ['key' => 'field_service_availability', 'label' => 'Availability', 'name' => 'availability', 'type' => 'text', 'instructions' => 'e.g. "Seven days a week"'],
            ['key' => 'field_service_wait_time', 'label' => 'Typical Wait Time', 'name' => 'wait_time', 'type' => 'text', 'instructions' => 'e.g. "1-2 weeks" — an editorial estimate, not a live figure.'],
            ['key' => 'field_service_typical_cost', 'label' => 'Typical Cost', 'name' => 'typical_cost', 'type' => 'text'],
            ['key' => 'field_service_how_to_pay', 'label' => 'How to Pay', 'name' => 'how_to_pay', 'type' => 'text', 'instructions' => 'Short sentence, e.g. "Funding options include NDIS Assistive Technology. Eligibility depends on your assessment and plan."'],
            ['key' => 'field_service_hours', 'label' => 'Typical Hours', 'name' => 'hours', 'type' => 'text'],
            ['key' => 'field_service_registration_info', 'label' => 'Registration Information', 'name' => 'registration_info', 'type' => 'textarea', 'rows' => 2],
            [
                'key' => 'field_service_faq', 'label' => 'FAQ', 'name' => 'faq_repeater', 'type' => 'repeater',
                'layout' => 'block', 'button_label' => 'Add FAQ item',
                'sub_fields' => [
                    ['key' => 'field_faq_q', 'label' => 'Question', 'name' => 'question', 'type' => 'text'],
                    ['key' => 'field_faq_a', 'label' => 'Answer', 'name' => 'answer', 'type' => 'textarea', 'rows' => 2],
                ],
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service']]],
    ]);

    // --- Service Hero ---
    soldirectory_add_group([
        'key' => 'group_service_hero_fields',
        'title' => 'Service Hero',
        'fields' => [
            ['key' => 'field_sh_eyebrow', 'label' => 'Hero Eyebrow', 'name' => 'hero_eyebrow', 'type' => 'text', 'instructions' => 'Small label above the headline, e.g. the service category name.'],
            ['key' => 'field_sh_headline', 'label' => 'Hero Headline', 'name' => 'hero_headline', 'type' => 'text', 'instructions' => 'Leave blank to use the post title.'],
            ['key' => 'field_sh_description', 'label' => 'Hero Description', 'name' => 'hero_description', 'type' => 'textarea', 'rows' => 2, 'instructions' => 'Leave blank to use the excerpt.'],
            ['key' => 'field_sh_bg_image', 'label' => 'Hero Background Image', 'name' => 'hero_background_image', 'type' => 'image', 'return_format' => 'url', 'instructions' => 'Leave blank to use the featured image.'],
            ['key' => 'field_sh_cta_label', 'label' => 'Hero CTA Label', 'name' => 'hero_cta_label', 'type' => 'text'],
            ['key' => 'field_sh_cta_url', 'label' => 'Hero CTA URL/Action', 'name' => 'hero_cta_url', 'type' => 'text', 'instructions' => "A path/URL, or an action key like 'get_matched' for the frontend to interpret as opening an app flow instead of navigating."],
            [
                'key' => 'field_sh_stats', 'label' => 'Hero Stats', 'name' => 'hero_stats_repeater', 'type' => 'repeater', 'layout' => 'table',
                'instructions' => 'Editorial stats only — real provider counts/response times must come from the application, not typed in here.',
                'sub_fields' => [
                    ['key' => 'field_sh_stat_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text'],
                    ['key' => 'field_sh_stat_value', 'label' => 'Value', 'name' => 'value', 'type' => 'text'],
                    ['key' => 'field_sh_stat_desc', 'label' => 'Description', 'name' => 'description', 'type' => 'text'],
                ],
            ],
            [
                'key' => 'field_sh_summary_card', 'label' => 'Hero Summary Card', 'name' => 'hero_summary_card', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_sh_card_title', 'label' => 'Title', 'name' => 'title', 'type' => 'text'],
                    ['key' => 'field_sh_card_funding_text', 'label' => 'Funding Text', 'name' => 'funding_text', 'type' => 'text'],
                    ['key' => 'field_sh_card_availability_text', 'label' => 'Availability Text', 'name' => 'availability_text', 'type' => 'text'],
                    ['key' => 'field_sh_card_response_text', 'label' => 'Response Text', 'name' => 'response_text', 'type' => 'text'],
                    ['key' => 'field_sh_card_cta_label', 'label' => 'CTA Label', 'name' => 'cta_label', 'type' => 'text'],
                    ['key' => 'field_sh_card_cta_url', 'label' => 'CTA URL/Action', 'name' => 'cta_url', 'type' => 'text'],
                ],
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service']]],
    ]);

    // --- Provider Finder Configuration (display config only — the
    // LIVE provider dataset used to answer finder queries always comes
    // from the application database/API, never from WP. This is
    // separate from the 'provider' CPT registered in post-types.php,
    // which is a one-way display MIRROR of that same database, kept in
    // sync by apps/api's wordpressSync.service.ts — WP is still never
    // the thing the finder queries against.) ---
    soldirectory_add_group([
        'key' => 'group_service_finder_fields',
        'title' => 'Provider Finder Configuration',
        'fields' => [
            ['key' => 'field_pf_heading', 'label' => 'Finder Heading', 'name' => 'finder_heading', 'type' => 'text'],
            ['key' => 'field_pf_description', 'label' => 'Finder Description', 'name' => 'finder_description', 'type' => 'text'],
            ['key' => 'field_pf_default_location', 'label' => 'Default Location', 'name' => 'finder_default_location', 'type' => 'text'],
            ['key' => 'field_pf_cta_label', 'label' => 'Finder CTA Label', 'name' => 'finder_cta_label', 'type' => 'text'],
            ['key' => 'field_pf_count', 'label' => 'Number of Providers to Display', 'name' => 'finder_count', 'type' => 'number', 'default_value' => 6],
            ['key' => 'field_pf_sort', 'label' => 'Sort Option', 'name' => 'finder_sort', 'type' => 'select', 'choices' => ['relevance' => 'Relevance', 'distance' => 'Distance', 'recent_activity' => 'Recent Activity'], 'default_value' => 'relevance'],
            ['key' => 'field_pf_show_filters', 'label' => 'Show Filters', 'name' => 'finder_show_filters', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1],
            ['key' => 'field_pf_show_map', 'label' => 'Show Map', 'name' => 'finder_show_map', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1],
            ['key' => 'field_pf_show_count', 'label' => 'Show Provider Count', 'name' => 'finder_show_count', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service']]],
    ]);

    // --- CTA (reusable pattern: action key takes priority over a
    // plain URL, so the frontend can open an app flow/modal) ---
    soldirectory_add_group([
        'key' => 'group_service_cta_fields',
        'title' => 'CTA Section',
        'fields' => [
            ['key' => 'field_cta_heading', 'label' => 'CTA Heading', 'name' => 'cta_heading', 'type' => 'text'],
            ['key' => 'field_cta_description', 'label' => 'CTA Description', 'name' => 'cta_description', 'type' => 'text'],
            ['key' => 'field_cta_primary_label', 'label' => 'Primary Button Label', 'name' => 'cta_primary_label', 'type' => 'text'],
            ['key' => 'field_cta_primary_action', 'label' => 'Primary Button URL/Action', 'name' => 'cta_primary_action', 'type' => 'text'],
            ['key' => 'field_cta_secondary_label', 'label' => 'Secondary Button Label', 'name' => 'cta_secondary_label', 'type' => 'text'],
            ['key' => 'field_cta_secondary_action', 'label' => 'Secondary Button URL/Action', 'name' => 'cta_secondary_action', 'type' => 'text'],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service']]],
    ]);

    // --- Related Services (real relationship field, not typed URLs) ---
    soldirectory_add_group([
        'key' => 'group_service_related_fields',
        'title' => 'Related Services',
        'fields' => [
            [
                'key' => 'field_related_services', 'label' => 'Related Services', 'name' => 'related_services',
                'type' => 'post_object', 'post_type' => ['service'], 'multiple' => 1, 'return_format' => 'id',
                'instructions' => 'Select existing Service posts — the frontend resolves each into its real title, slug, and featured image, so nothing here goes stale if a related service is renamed.',
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service']]],
    ]);

    // --- Regulations & Compliance ---
    soldirectory_add_group([
        'key' => 'group_service_regulations_fields',
        'title' => 'Regulations & Compliance',
        'fields' => [
            ['key' => 'field_reg_heading', 'label' => 'Section Heading', 'name' => 'regulations_heading', 'type' => 'text'],
            ['key' => 'field_reg_intro', 'label' => 'Introduction', 'name' => 'regulations_intro', 'type' => 'textarea', 'rows' => 2],
            [
                'key' => 'field_reg_cards', 'label' => 'Regulator Cards', 'name' => 'regulator_cards_repeater', 'type' => 'repeater', 'layout' => 'block',
                'sub_fields' => [
                    ['key' => 'field_reg_card_title', 'label' => 'Title', 'name' => 'title', 'type' => 'text'],
                    ['key' => 'field_reg_card_desc', 'label' => 'Description', 'name' => 'description', 'type' => 'text'],
                    ['key' => 'field_reg_card_phone', 'label' => 'Phone', 'name' => 'phone', 'type' => 'text'],
                    ['key' => 'field_reg_card_website', 'label' => 'Website', 'name' => 'website', 'type' => 'text'],
                    ['key' => 'field_reg_card_cta', 'label' => 'CTA Label', 'name' => 'cta', 'type' => 'text'],
                ],
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service']]],
    ]);

    // --- Credentials / Verification (editorial explanation of what
    // to check — the actual verification STATUS of any provider must
    // still come from the application, never asserted here) ---
    soldirectory_add_group([
        'key' => 'group_service_credentials_fields',
        'title' => 'Credentials / Verification Guidance',
        'fields' => [
            [
                'key' => 'field_cred_items', 'label' => 'Credential Checks', 'name' => 'credentials_repeater', 'type' => 'repeater', 'layout' => 'block',
                'sub_fields' => [
                    ['key' => 'field_cred_title', 'label' => 'Title', 'name' => 'title', 'type' => 'text'],
                    ['key' => 'field_cred_desc', 'label' => 'Description', 'name' => 'description', 'type' => 'textarea', 'rows' => 2],
                ],
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service']]],
    ]);

    // --- Provider (display mirror — see post-types.php's 'provider'
    // CPT comment and services/wordpressSync.service.ts. Every field
    // below is overwritten on the provider's next sync from Mongo;
    // only the post's featured image (the logo) is actually meant to
    // be edited here, and flows back to Mongo via the webhook) ---
    soldirectory_add_group([
        'key' => 'group_provider_fields',
        'title' => 'Provider Details (synced from the application database)',
        'fields' => [
            ['key' => 'field_provider_mongo_id', 'label' => 'Application Record ID', 'name' => 'mongo_id', 'type' => 'text', 'readonly' => 1, 'instructions' => 'Links this post to its real record. Do not edit.'],
            ['key' => 'field_provider_mongo_slug', 'label' => 'Application Slug', 'name' => 'mongo_slug', 'type' => 'text', 'readonly' => 1, 'instructions' => 'The public /providers/{slug} path on the live site.'],
            ['key' => 'field_provider_legal_name', 'label' => 'Legal Entity Name', 'name' => 'legal_entity_name', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_abn', 'label' => 'ABN', 'name' => 'abn', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_contact_email', 'label' => 'Contact Email', 'name' => 'contact_email', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_address', 'label' => 'Street Address', 'name' => 'address', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_suburb', 'label' => 'Suburb', 'name' => 'suburb', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_state', 'label' => 'State', 'name' => 'state', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_postcode', 'label' => 'Postcode', 'name' => 'postcode', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_latitude', 'label' => 'Latitude', 'name' => 'latitude', 'type' => 'number', 'readonly' => 1],
            ['key' => 'field_provider_longitude', 'label' => 'Longitude', 'name' => 'longitude', 'type' => 'number', 'readonly' => 1],
            ['key' => 'field_provider_areas_served', 'label' => 'Areas Served (suburbs)', 'name' => 'service_suburbs_json', 'type' => 'textarea', 'rows' => 2, 'readonly' => 1, 'instructions' => 'Stored as a JSON array — matches the *_json convention used elsewhere in this plugin.'],
            ['key' => 'field_provider_travel_radius', 'label' => 'Travel Radius (km)', 'name' => 'travel_radius_km', 'type' => 'number', 'readonly' => 1],
            ['key' => 'field_provider_intake_status', 'label' => 'Intake Status', 'name' => 'intake_status', 'type' => 'text', 'readonly' => 1],
            ['key' => 'field_provider_weekly_capacity', 'label' => 'Weekly Capacity (hours)', 'name' => 'weekly_capacity_hours', 'type' => 'number', 'readonly' => 1],
            ['key' => 'field_provider_roster_size', 'label' => 'Roster Size', 'name' => 'roster_size', 'type' => 'number', 'readonly' => 1],
            ['key' => 'field_provider_after_hours', 'label' => 'After-Hours Cover', 'name' => 'after_hours_cover', 'type' => 'text', 'readonly' => 1],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'provider']]],
    ]);

    // --- Location ---
    soldirectory_add_group([
        'key' => 'group_location_fields',
        'title' => 'Location Details',
        'fields' => [
            ['key' => 'field_location_state', 'label' => 'State', 'name' => 'state', 'type' => 'text'],
            ['key' => 'field_location_population', 'label' => 'Population', 'name' => 'population', 'type' => 'text'],
            ['key' => 'field_location_key_stats', 'label' => 'Key Stats', 'name' => 'key_stats', 'type' => 'textarea', 'rows' => 3],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'location']]],
    ]);

    // --- Guide ---
    soldirectory_add_group([
        'key' => 'group_guide_fields',
        'title' => 'Guide Details',
        'fields' => [
            ['key' => 'field_guide_reading_time', 'label' => 'Reading Time (minutes)', 'name' => 'reading_time', 'type' => 'number'],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'guide']]],
    ]);

    // --- Service Area Page (the big service×suburb combo page) ---
    soldirectory_add_group([
        'key' => 'group_service_area_page_fields',
        'title' => 'Service Area Page Details',
        'fields' => [
            soldirectory_tab('field_sap_tab_basics', 'Basics'),
            ['key' => 'field_sap_service_name', 'label' => 'Service Name', 'name' => 'service_name', 'type' => 'text'],
            ['key' => 'field_sap_suburb', 'label' => 'Suburb', 'name' => 'suburb', 'type' => 'text'],
            ['key' => 'field_sap_state', 'label' => 'State', 'name' => 'state', 'type' => 'text'],
            ['key' => 'field_sap_intro', 'label' => 'Intro Paragraph', 'name' => 'intro_paragraph', 'type' => 'textarea', 'rows' => 4],
            soldirectory_tab('field_sap_tab_faq', 'FAQ & Suburb Facts'),
            [
                'key' => 'field_sap_faq', 'label' => 'FAQ', 'name' => 'faq_repeater', 'type' => 'repeater', 'layout' => 'block',
                'sub_fields' => [
                    // Field names are 'q'/'a' here specifically, NOT
                    // 'question'/'answer' like the plain 'service' CPT
                    // above — ServiceAreaPage's real TypeScript type
                    // (wordpressApi.ts) and the original fixture data
                    // both use {q, a}, not {question, answer}. Getting
                    // this wrong here would silently produce FAQ items
                    // that fail to render on ServiceLocationPage.tsx.
                    ['key' => 'field_sap_faq_q', 'label' => 'Question', 'name' => 'q', 'type' => 'text'],
                    ['key' => 'field_sap_faq_a', 'label' => 'Answer', 'name' => 'a', 'type' => 'textarea', 'rows' => 2],
                ],
            ],
            [
                'key' => 'field_sap_suburb_facts', 'label' => 'Suburb Facts', 'name' => 'suburb_facts_repeater', 'type' => 'repeater', 'layout' => 'table',
                'sub_fields' => [
                    ['key' => 'field_sap_fact_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text'],
                    ['key' => 'field_sap_fact_value', 'label' => 'Value', 'name' => 'value', 'type' => 'text'],
                    ['key' => 'field_sap_fact_note', 'label' => 'Note', 'name' => 'note', 'type' => 'text'],
                ],
            ],
            soldirectory_tab('field_sap_tab_compare', 'Compare & Contents'),
            [
                'key' => 'field_sap_compare', 'label' => 'Compare Cards', 'name' => 'compare_repeater', 'type' => 'repeater', 'layout' => 'block',
                'sub_fields' => [
                    ['key' => 'field_sap_compare_title', 'label' => 'Title', 'name' => 'title', 'type' => 'text'],
                    ['key' => 'field_sap_compare_body', 'label' => 'Body', 'name' => 'body', 'type' => 'textarea', 'rows' => 2],
                    ['key' => 'field_sap_compare_ask', 'label' => 'Ask', 'name' => 'ask', 'type' => 'text'],
                ],
            ],
            [
                'key' => 'field_sap_toc', 'label' => 'Table of Contents', 'name' => 'toc_repeater', 'type' => 'repeater', 'layout' => 'table',
                'sub_fields' => [
                    ['key' => 'field_sap_toc_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text'],
                    ['key' => 'field_sap_toc_href', 'label' => 'Anchor (e.g. #compare)', 'name' => 'href', 'type' => 'text'],
                ],
            ],
            soldirectory_tab('field_sap_tab_demand', 'Demand & Stats'),
            [
                // Nested repeater — each "Who is asking" panel (e.g.
                // "Also asked for in the same request") has its own
                // set of label/value bar-chart rows. Matches
                // ServiceAreaPage.demand's real shape:
                // { title, rows: [string, number][] }[].
                'key' => 'field_sap_demand', 'label' => "Who Is Asking (demand panels)", 'name' => 'demand_repeater', 'type' => 'repeater', 'layout' => 'block',
                'sub_fields' => [
                    ['key' => 'field_sap_demand_title', 'label' => 'Panel Title', 'name' => 'title', 'type' => 'text'],
                    [
                        'key' => 'field_sap_demand_rows', 'label' => 'Rows', 'name' => 'rows', 'type' => 'repeater', 'layout' => 'table',
                        'sub_fields' => [
                            ['key' => 'field_sap_demand_row_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text'],
                            ['key' => 'field_sap_demand_row_value', 'label' => 'Value (%)', 'name' => 'value', 'type' => 'number'],
                        ],
                    ],
                ],
            ],
            [
                'key' => 'field_sap_glance', 'label' => 'At a Glance (key/value table)', 'name' => 'glance_repeater', 'type' => 'repeater', 'layout' => 'table',
                'sub_fields' => [
                    ['key' => 'field_sap_glance_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text'],
                    ['key' => 'field_sap_glance_value', 'label' => 'Value', 'name' => 'value', 'type' => 'text'],
                ],
            ],
            [
                'key' => 'field_sap_service_counts', 'label' => 'Services Available (counts)', 'name' => 'service_counts_repeater', 'type' => 'repeater', 'layout' => 'table',
                'sub_fields' => [
                    ['key' => 'field_sap_svccount_label', 'label' => 'Service', 'name' => 'label', 'type' => 'text'],
                    ['key' => 'field_sap_svccount_value', 'label' => 'Provider Count', 'name' => 'count', 'type' => 'number'],
                ],
            ],
            [
                'key' => 'field_sap_requested', 'label' => 'Most Requested Support', 'name' => 'requested_repeater', 'type' => 'repeater', 'layout' => 'table',
                'sub_fields' => [
                    ['key' => 'field_sap_req_label', 'label' => 'Label', 'name' => 'label', 'type' => 'text'],
                    ['key' => 'field_sap_req_requests', 'label' => 'Requests (display text)', 'name' => 'requests', 'type' => 'text'],
                    ['key' => 'field_sap_req_providers', 'label' => 'Providers (display text)', 'name' => 'providers', 'type' => 'text'],
                    ['key' => 'field_sap_req_v', 'label' => 'Bar Value (number)', 'name' => 'v', 'type' => 'number'],
                    ['key' => 'field_sap_req_on', 'label' => 'Highlighted?', 'name' => 'on', 'type' => 'true_false'],
                ],
            ],
            soldirectory_tab('field_sap_tab_languages', 'Languages & Hero Stats'),
            [
                'key' => 'field_sap_languages', 'label' => 'Language Support Stats', 'name' => 'languages_repeater', 'type' => 'repeater', 'layout' => 'table',
                'sub_fields' => [
                    ['key' => 'field_sap_lang_name', 'label' => 'Language', 'name' => 'name', 'type' => 'text'],
                    ['key' => 'field_sap_lang_native', 'label' => 'Native Name', 'name' => 'native', 'type' => 'text'],
                    ['key' => 'field_sap_lang_count', 'label' => 'Speaker Count (display text)', 'name' => 'count', 'type' => 'text'],
                    ['key' => 'field_sap_lang_share', 'label' => 'Share (display text)', 'name' => 'share', 'type' => 'text'],
                ],
            ],
            [
                // Not a repeater — one set of hero stats per page.
                'key' => 'field_sap_hero_stats', 'label' => 'Hero Stats', 'name' => 'hero_stats_group', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_sap_hero_provider_count', 'label' => 'Provider Count', 'name' => 'providerCount', 'type' => 'number'],
                    ['key' => 'field_sap_hero_response_minutes', 'label' => 'Median Response (minutes)', 'name' => 'medianResponseMinutes', 'type' => 'number'],
                    ['key' => 'field_sap_hero_hourly_rate', 'label' => 'Hourly Rate ($)', 'name' => 'hourlyRate', 'type' => 'number'],
                ],
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service_area_page']]],
    ]);

    // --- Service Area Page — Extended Details ---
    // A second, separate field group (not crammed into the first)
    // covering the remaining document sections: Provider Finder
    // config, Cost & Payment, What To Expect, Regulations &
    // Compliance, Response Times, Local Information, CTA, and
    // Related Services. Kept logically grouped per the document's
    // own explicit instruction not to build one giant flat list.
    soldirectory_add_group([
        'key' => 'group_service_area_page_extended',
        'title' => 'Service Area Page — Extended Details',
        'fields' => [
            // --- Provider Finder configuration (Part 14) — the
            // PROVIDERS THEMSELVES still come from the real
            // application database via listProviders(), never from
            // WordPress. These fields only control how that real
            // finder displays.
            soldirectory_tab('field_sapx_tab_finder', 'Provider Finder'),
            [
                'key' => 'field_sap_finder', 'label' => 'Provider Finder', 'name' => 'finder_group', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_finder_heading', 'label' => 'Heading', 'name' => 'heading', 'type' => 'text'],
                    ['key' => 'field_finder_description', 'label' => 'Description', 'name' => 'description', 'type' => 'text'],
                    ['key' => 'field_finder_count', 'label' => 'Number of Providers to Display', 'name' => 'display_count', 'type' => 'number', 'default_value' => 6],
                    ['key' => 'field_finder_sort', 'label' => 'Sort Option', 'name' => 'sort', 'type' => 'select', 'choices' => ['relevance' => 'Relevance', 'distance' => 'Distance', 'recent' => 'Recently Active'], 'default_value' => 'relevance'],
                    ['key' => 'field_finder_show_filters', 'label' => 'Show Filters', 'name' => 'show_filters', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1],
                    ['key' => 'field_finder_show_map', 'label' => 'Show Map', 'name' => 'show_map', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1],
                    ['key' => 'field_finder_show_count', 'label' => 'Show Provider Count', 'name' => 'show_count', 'type' => 'true_false', 'default_value' => 1, 'ui' => 1],
                ],
            ],

            // --- Cost & Payment (Part 17) ---
            soldirectory_tab('field_sapx_tab_cost', 'Costs'),
            [
                'key' => 'field_sap_cost', 'label' => 'Cost & Payment', 'name' => 'cost_group', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_cost_heading', 'label' => 'Heading', 'name' => 'heading', 'type' => 'text'],
                    ['key' => 'field_cost_intro', 'label' => 'Introduction', 'name' => 'intro', 'type' => 'textarea', 'rows' => 2],
                    ['key' => 'field_cost_pricing', 'label' => 'Pricing Information', 'name' => 'pricing_info', 'type' => 'wysiwyg'],
                    ['key' => 'field_cost_ndis', 'label' => 'NDIS Information', 'name' => 'ndis_info', 'type' => 'textarea', 'rows' => 2],
                    ['key' => 'field_cost_private', 'label' => 'Private Payment Information', 'name' => 'private_info', 'type' => 'textarea', 'rows' => 2],
                    ['key' => 'field_cost_aged_care', 'label' => 'Aged Care Information', 'name' => 'aged_care_info', 'type' => 'textarea', 'rows' => 2],
                    ['key' => 'field_cost_dva', 'label' => 'DVA Information', 'name' => 'dva_info', 'type' => 'textarea', 'rows' => 2],
                    ['key' => 'field_cost_notes', 'label' => 'Additional Notes', 'name' => 'notes', 'type' => 'textarea', 'rows' => 2],
                ],
            ],

            // --- What To Expect (Part 18) ---
            soldirectory_tab('field_sapx_tab_expect', 'What To Expect'),
            [
                'key' => 'field_sap_expect', 'label' => 'What To Expect', 'name' => 'expect_group', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_expect_heading', 'label' => 'Heading', 'name' => 'heading', 'type' => 'text'],
                    ['key' => 'field_expect_intro', 'label' => 'Introduction', 'name' => 'intro', 'type' => 'textarea', 'rows' => 2],
                    [
                        'key' => 'field_expect_steps', 'label' => 'Steps', 'name' => 'steps', 'type' => 'repeater', 'layout' => 'block',
                        'sub_fields' => [
                            ['key' => 'field_expect_step_number', 'label' => 'Step Number', 'name' => 'number', 'type' => 'number'],
                            ['key' => 'field_expect_step_title', 'label' => 'Title', 'name' => 'title', 'type' => 'text'],
                            ['key' => 'field_expect_step_desc', 'label' => 'Description', 'name' => 'description', 'type' => 'textarea', 'rows' => 2],
                        ],
                    ],
                ],
            ],

            // --- Regulations & Compliance (Part 21) ---
            soldirectory_tab('field_sapx_tab_compliance', 'Compliance & Response Times'),
            [
                'key' => 'field_sap_regs', 'label' => 'Regulations & Compliance', 'name' => 'regulations_group', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_regs_heading', 'label' => 'Heading', 'name' => 'heading', 'type' => 'text'],
                    ['key' => 'field_regs_intro', 'label' => 'Introduction', 'name' => 'intro', 'type' => 'textarea', 'rows' => 2],
                    [
                        'key' => 'field_regs_cards', 'label' => 'Regulator Cards', 'name' => 'cards', 'type' => 'repeater', 'layout' => 'block',
                        'sub_fields' => [
                            ['key' => 'field_regs_card_title', 'label' => 'Title', 'name' => 'title', 'type' => 'text'],
                            ['key' => 'field_regs_card_desc', 'label' => 'Description', 'name' => 'description', 'type' => 'textarea', 'rows' => 2],
                            ['key' => 'field_regs_card_phone', 'label' => 'Phone', 'name' => 'phone', 'type' => 'text'],
                            ['key' => 'field_regs_card_website', 'label' => 'Website', 'name' => 'website', 'type' => 'text'],
                            ['key' => 'field_regs_card_cta', 'label' => 'CTA Label', 'name' => 'cta_label', 'type' => 'text'],
                        ],
                    ],
                ],
            ],

            // --- Response Times By State (Part 26) ---
            [
                'key' => 'field_sap_response_times', 'label' => 'Response Times By State', 'name' => 'response_times', 'type' => 'repeater', 'layout' => 'table',
                'sub_fields' => [
                    ['key' => 'field_rt_state', 'label' => 'State', 'name' => 'state', 'type' => 'text'],
                    ['key' => 'field_rt_minutes', 'label' => 'Response Time (minutes)', 'name' => 'minutes', 'type' => 'number'],
                    ['key' => 'field_rt_description', 'label' => 'Description', 'name' => 'description', 'type' => 'text'],
                ],
            ],

            // --- Local Information (Part 22) — NOT hardcoded to
            // Sydney; this is per-page, so a Melbourne/Brisbane/etc.
            // Service Area Page fills in its own values here.
            soldirectory_tab('field_sapx_tab_local', 'Local Information'),
            [
                'key' => 'field_sap_local', 'label' => 'Local Information', 'name' => 'local_group', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_local_population', 'label' => 'Population', 'name' => 'population', 'type' => 'text'],
                    ['key' => 'field_local_income', 'label' => 'Median Personal Income', 'name' => 'median_income', 'type' => 'text'],
                    ['key' => 'field_local_hospital', 'label' => 'Nearest Hospital', 'name' => 'nearest_hospital', 'type' => 'text'],
                    ['key' => 'field_local_transport', 'label' => 'Public Transport', 'name' => 'public_transport', 'type' => 'text'],
                    ['key' => 'field_local_community', 'label' => 'Community Information', 'name' => 'community_info', 'type' => 'textarea', 'rows' => 2],
                    ['key' => 'field_local_postcode', 'label' => 'Postcode', 'name' => 'postcode', 'type' => 'text'],
                    ['key' => 'field_local_data_date', 'label' => 'Data Date/Source', 'name' => 'data_date', 'type' => 'text'],
                ],
            ],

            // --- CTA (Part 27) — same action-key pattern already
            // proven on the Mega Menu Tab CTA, so 'get_matched' opens
            // the real app modal instead of needing a hardcoded URL.
            soldirectory_tab('field_sapx_tab_cta', 'Call To Action & Related'),
            [
                'key' => 'field_sap_cta', 'label' => 'Page CTA', 'name' => 'cta_group', 'type' => 'group',
                'sub_fields' => [
                    ['key' => 'field_sap_cta_heading', 'label' => 'CTA Heading', 'name' => 'heading', 'type' => 'text'],
                    ['key' => 'field_sap_cta_desc', 'label' => 'CTA Description', 'name' => 'description', 'type' => 'text'],
                    ['key' => 'field_sap_cta_primary_label', 'label' => 'Primary Button Label', 'name' => 'primary_label', 'type' => 'text'],
                    ['key' => 'field_sap_cta_primary_action', 'label' => 'Primary Button Action (e.g. get_matched)', 'name' => 'primary_action', 'type' => 'text'],
                    ['key' => 'field_sap_cta_primary_url', 'label' => 'Primary Button URL (if not using an action)', 'name' => 'primary_url', 'type' => 'text'],
                    ['key' => 'field_sap_cta_secondary_label', 'label' => 'Secondary Button Label', 'name' => 'secondary_label', 'type' => 'text'],
                    ['key' => 'field_sap_cta_secondary_action', 'label' => 'Secondary Button Action', 'name' => 'secondary_action', 'type' => 'text'],
                    ['key' => 'field_sap_cta_secondary_url', 'label' => 'Secondary Button URL', 'name' => 'secondary_url', 'type' => 'text'],
                ],
            ],

            // --- Related Services (Part 28) — a real ACF
            // relationship to OTHER 'service' posts, so an admin
            // picks existing services rather than retyping URLs.
            [
                'key' => 'field_sap_related', 'label' => 'Related Services', 'name' => 'related_services',
                'type' => 'relationship', 'post_type' => ['service'],
                'filters' => ['search'], 'return_format' => 'id',
                'instructions' => 'Pick existing Service posts — the frontend receives their real title, slug, and featured image, not manually typed values.',
            ],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'service_area_page']]],
    ]);
});

/**
 * Exposes every ACF/SCF field above under the REST API's existing
 * `meta` object — the SAME place plain register_post_meta fields
 * already appear — rather than as new top-level response fields.
 * This is important: the frontend reads everything from
 * response.meta.X uniformly, whether a field came from a plain
 * register_post_meta call or from ACF/SCF. Using register_rest_field
 * instead would have put these at the top level of the response
 * (response.eligibility, not response.meta.eligibility), silently
 * breaking every existing frontend read for these specific fields.
 *
 * Repeater fields are converted from ACF's array format into the
 * same JSON-string shape (faq_json, suburb_facts_json, compare_json)
 * the frontend's safeParseJson() already parses, so a post edited
 * through ACF/SCF's UI needs no frontend change either.
 */
function soldirectory_inject_acf_meta(array $response_data, WP_Post $post): array {
    if (!function_exists('get_field')) return $response_data;

    $simple_fields = [
        'service' => [
            'overview_heading', 'overview_content', 'who_for', 'eligibility', 'funding_info',
            'plan_management_info', 'availability', 'wait_time', 'typical_cost', 'how_to_pay', 'hours', 'registration_info',
            'hero_eyebrow', 'hero_headline', 'hero_description', 'hero_background_image', 'hero_cta_label', 'hero_cta_url',
            'finder_heading', 'finder_description', 'finder_default_location', 'finder_cta_label',
            'finder_count', 'finder_sort', 'finder_show_filters', 'finder_show_map', 'finder_show_count',
            'cta_heading', 'cta_description', 'cta_primary_label', 'cta_primary_action', 'cta_secondary_label', 'cta_secondary_action',
            'regulations_heading', 'regulations_intro',
        ],
        'location' => ['state', 'population', 'key_stats'],
        'guide' => ['reading_time'],
        'service_area_page' => ['service_name', 'suburb', 'state', 'intro_paragraph'],
        'provider' => [
            'mongo_id', 'mongo_slug', 'legal_entity_name', 'abn', 'contact_email',
            'address', 'suburb', 'state', 'postcode', 'latitude', 'longitude',
            'service_suburbs_json', 'travel_radius_km', 'intake_status',
            'weekly_capacity_hours', 'roster_size', 'after_hours_cover',
        ],
    ];
    foreach ($simple_fields[$post->post_type] ?? [] as $field_name) {
        $value = get_field($field_name, $post->ID);
        if ($value !== null && $value !== false) {
            $response_data['meta'][$field_name] = $value;
        }
    }

    // hero_summary_card is a single group object (not a repeater) —
    // passed through as-is since its sub-field names already match
    // what the frontend expects.
    if ($post->post_type === 'service') {
        $card = get_field('hero_summary_card', $post->ID);
        if ($card) $response_data['meta']['hero_summary_card'] = $card;
    }

    $repeater_fields = [
        'service' => [
            'faq_repeater' => 'faq_json',
            'hero_stats_repeater' => 'hero_stats_json',
            'regulator_cards_repeater' => 'regulator_cards_json',
            'credentials_repeater' => 'credentials_json',
        ],
        'service_area_page' => [
            'faq_repeater' => 'faq_json',
            'suburb_facts_repeater' => 'suburb_facts_json',
            'compare_repeater' => 'compare_json',
            // These 3 pass straight through — their ACF sub-field
            // names already match the frontend's real TypeScript
            // object shapes exactly (see wordpressApi.ts's
            // ServiceAreaPage interface).
            'toc_repeater' => 'toc_json',
            'requested_repeater' => 'requested_json',
            'languages_repeater' => 'languages_json',
        ],
    ];
    foreach ($repeater_fields[$post->post_type] ?? [] as $acf_name => $json_key) {
        $rows = get_field($acf_name, $post->ID);
        if ($rows) {
            $response_data['meta'][$json_key] = wp_json_encode($rows);
        }
    }

    // These 3 need transforming: ACF's repeater naturally produces
    // {label, value} objects per row, but the frontend's real
    // TypeScript types (ServiceAreaPage.glance, .serviceCounts, and
    // .demand's nested .rows) expect [string, number] TUPLES — a
    // deliberate shape decision made when those types were written,
    // matching the original fixture data exactly. Getting this wrong
    // silently produces a page that fails to render these sections,
    // rather than an error.
    // related_services: resolve raw post IDs into full objects
    // (id, title, slug, featuredImage, url) so the frontend never
    // has to make a second request or risk a stale link if a related
    // service is later renamed — matches the document's explicit
    // spec for this field.
    // Both 'service' (post_object) and 'service_area_page' (relationship)
    // carry a related_services field — the resolver used to run for
    // 'service' only, so the Service Area Page's Related Services field
    // was editable in wp-admin but never reached the frontend.
    if (in_array($post->post_type, ['service', 'service_area_page'], true)) {
        $relatedIds = get_field('related_services', $post->ID);
        if ($relatedIds) {
            $resolved = array_map(function ($id) {
                $id = is_object($id) ? $id->ID : $id; // tolerate return_format changes
                $p = get_post($id);
                if (!$p || $p->post_status !== 'publish') return null; // never expose drafts/trash
                $thumbId = get_post_thumbnail_id($id);
                return [
                    'id' => $p->ID,
                    'title' => $p->post_title,
                    'slug' => $p->post_name,
                    'featuredImage' => $thumbId ? wp_get_attachment_url($thumbId) : null,
                    'url' => '/services/' . $p->post_name,
                ];
            }, (array) $relatedIds);
            $response_data['meta']['related_services'] = array_values(array_filter($resolved));
        }
    }

    if ($post->post_type === 'service_area_page') {
        $glance = get_field('glance_repeater', $post->ID);
        if ($glance) {
            $response_data['meta']['glance_json'] = wp_json_encode(array_map(
                fn($row) => [$row['label'], $row['value']], $glance
            ));
        }

        $counts = get_field('service_counts_repeater', $post->ID);
        if ($counts) {
            $response_data['meta']['service_counts_json'] = wp_json_encode(array_map(
                fn($row) => [$row['label'], (int) $row['count']], $counts
            ));
        }

        $demand = get_field('demand_repeater', $post->ID);
        if ($demand) {
            $response_data['meta']['demand_json'] = wp_json_encode(array_map(
                fn($panel) => [
                    'title' => $panel['title'],
                    'rows' => array_map(fn($row) => [$row['label'], (int) $row['value']], $panel['rows'] ?? []),
                ],
                $demand
            ));
        }

        // Not a repeater — a single group of 3 numbers per page.
        $hero = get_field('hero_stats_group', $post->ID);
        if ($hero) {
            $response_data['meta']['hero_stats_json'] = wp_json_encode($hero);
        }

        // Extended field group (group_service_area_page_extended). These
        // were editable in wp-admin but never included in the REST
        // response, so filling them in had no visible effect. Groups pass
        // through as objects (sub-field names already match what
        // wordpressApi.ts's mapServiceAreaPage reads); response_times is
        // a plain repeater of {state, minutes, description}.
        foreach (['finder_group', 'cost_group', 'expect_group', 'regulations_group', 'local_group', 'cta_group'] as $group_name) {
            $group_value = get_field($group_name, $post->ID);
            if (is_array($group_value) && $group_value) {
                $response_data['meta'][$group_name] = $group_value;
            }
        }
        $response_times = get_field('response_times', $post->ID);
        if (is_array($response_times) && $response_times) {
            $response_data['meta']['response_times'] = array_values($response_times);
        }
    }

    // logo_url is a convenience read — the frontend never queries WP's
    // REST API for this directly (it reads Provider.logoUrl from the
    // Node API, kept current by the webhook), but exposing it here
    // makes the sync state inspectable/debuggable directly from
    // /wp-json/wp/v2/providers/{id}.
    if ($post->post_type === 'provider') {
        $thumbId = get_post_thumbnail_id($post->ID);
        $response_data['meta']['logo_url'] = $thumbId ? wp_get_attachment_url($thumbId) : null;
    }

    return $response_data;
}

foreach (['service', 'location', 'guide', 'service_area_page', 'mega_menu_tab', 'provider'] as $post_type) {
    add_filter("rest_prepare_{$post_type}", function ($response, $post) {
        $data = $response->get_data();
        $data = soldirectory_inject_acf_meta($data, $post);
        $response->set_data($data);
        return $response;
    }, 10, 2);
}

/**
 * Real endpoint for the frontend mega menu — returns every active
 * tab, in order, with its full column/link/CTA structure already
 * assembled. This is what PART 7/8 of the spec asked for: one clean
 * response the frontend can render directly, rather than the
 * frontend re-assembling structure from raw taxonomy terms.
 */
add_action('rest_api_init', function () {
    register_rest_route('soldirectory/v1', '/mega-menu', [
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => function () {
            $tabs = get_posts([
                'post_type' => 'mega_menu_tab',
                'post_status' => 'publish',
                'numberposts' => -1,
                'orderby' => 'menu_order',
                'order' => 'ASC',
            ]);

            $result = [];
            foreach ($tabs as $tab) {
                if (!get_field('active', $tab->ID)) continue; // inactive tabs are skipped, not just hidden client-side

                $columns = get_field('columns', $tab->ID) ?: [];
                $result[] = [
                    'key' => get_field('tab_key', $tab->ID),
                    'label' => $tab->post_title,
                    'description' => get_field('description', $tab->ID),
                    'icon' => get_field('icon', $tab->ID),
                    'cta' => get_field('cta', $tab->ID),
                    'columns' => array_map(function ($col) {
                        $links = array_filter($col['links'] ?? [], fn($l) => !empty($l['active']));
                        return [
                            'title' => $col['title'],
                            'links' => array_values($links),
                        ];
                    }, $columns),
                ];
            }

            return new WP_REST_Response(['tabs' => $result], 200);
        },
    ]);
});
