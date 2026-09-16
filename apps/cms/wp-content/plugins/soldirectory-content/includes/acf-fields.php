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
if (!function_exists('acf_add_local_field_group')) return; // SCF/ACF not active — skip gracefully rather than fatal-erroring

add_action('acf/init', function () {

    // --- Mega Menu Tab ---
    // Post title = tab label. Native "Order" (page-attributes,
    // already added to the CPT) = tab sort order. Everything else
    // below is the real structured control the taxonomy approach
    // couldn't offer: a stable key for the frontend to map against,
    // icon, description, active toggle, and the full Column -> Link
    // hierarchy.
    acf_add_local_field_group([
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
    acf_add_local_field_group([
        'key' => 'group_service_fields',
        'title' => 'Service Details',
        'fields' => [
            ['key' => 'field_service_eligibility', 'label' => 'Eligibility', 'name' => 'eligibility', 'type' => 'textarea', 'rows' => 3],
            ['key' => 'field_service_funding_info', 'label' => 'Funding Info', 'name' => 'funding_info', 'type' => 'textarea', 'rows' => 3],
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

    // --- Location ---
    acf_add_local_field_group([
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
    acf_add_local_field_group([
        'key' => 'group_guide_fields',
        'title' => 'Guide Details',
        'fields' => [
            ['key' => 'field_guide_reading_time', 'label' => 'Reading Time (minutes)', 'name' => 'reading_time', 'type' => 'number'],
        ],
        'location' => [[['param' => 'post_type', 'operator' => '==', 'value' => 'guide']]],
    ]);

    // --- Service Area Page (the big service×suburb combo page) ---
    acf_add_local_field_group([
        'key' => 'group_service_area_page_fields',
        'title' => 'Service Area Page Details',
        'fields' => [
            ['key' => 'field_sap_service_name', 'label' => 'Service Name', 'name' => 'service_name', 'type' => 'text'],
            ['key' => 'field_sap_suburb', 'label' => 'Suburb', 'name' => 'suburb', 'type' => 'text'],
            ['key' => 'field_sap_state', 'label' => 'State', 'name' => 'state', 'type' => 'text'],
            ['key' => 'field_sap_intro', 'label' => 'Intro Paragraph', 'name' => 'intro_paragraph', 'type' => 'textarea', 'rows' => 4],
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
    $simple_fields = [
        'service' => ['eligibility', 'funding_info'],
        'location' => ['state', 'population', 'key_stats'],
        'guide' => ['reading_time'],
        'service_area_page' => ['service_name', 'suburb', 'state', 'intro_paragraph'],
    ];
    foreach ($simple_fields[$post->post_type] ?? [] as $field_name) {
        $value = get_field($field_name, $post->ID);
        if ($value !== null && $value !== false) {
            $response_data['meta'][$field_name] = $value;
        }
    }

    $repeater_fields = [
        'service' => ['faq_repeater' => 'faq_json'],
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
    }

    return $response_data;
}

foreach (['service', 'location', 'guide', 'service_area_page', 'mega_menu_tab'] as $post_type) {
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
