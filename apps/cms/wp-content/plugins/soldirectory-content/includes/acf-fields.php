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
        ],
    ];
    foreach ($repeater_fields[$post->post_type] ?? [] as $acf_name => $json_key) {
        $rows = get_field($acf_name, $post->ID);
        if ($rows) {
            $response_data['meta'][$json_key] = wp_json_encode($rows);
        }
    }

    return $response_data;
}

foreach (['service', 'location', 'guide', 'service_area_page'] as $post_type) {
    add_filter("rest_prepare_{$post_type}", function ($response, $post) {
        $data = $response->get_data();
        $data = soldirectory_inject_acf_meta($data, $post);
        $response->set_data($data);
        return $response;
    }, 10, 2);
}
