<?php
/**
 * Exposes the fields defined in custom-fields.php under the REST
 * API's existing `meta` object — the SAME place they appeared when
 * this ran through ACF/SCF, in the SAME shapes, so apps/web needed no
 * changes when this plugin stopped depending on ACF/SCF's admin JS.
 * This is the direct replacement for acf-fields.php's
 * soldirectory_inject_acf_meta() and its trailing mega-menu endpoint.
 */

if (!defined('ABSPATH')) exit;

/** Decodes a repeater/group/relationship meta value; null if missing or not valid JSON. */
function soldirectory_meta_json(int $post_id, string $name) {
    $raw = get_post_meta($post_id, $name, true);
    if ($raw === '' || $raw === false) return null;
    $decoded = json_decode((string) $raw, true);
    // json_decode('3') is the integer 3, not an array: ACF stored repeater row COUNTS
    // under the same key (see acf-compat.php). Callers get an array or null, never a scalar.
    return is_array($decoded) ? $decoded : null;
}

function soldirectory_inject_custom_fields_meta(array $response_data, WP_Post $post): array {
    $groups = soldirectory_field_groups()[$post->post_type] ?? null;
    if (!$groups) return $response_data;

    // Content saved while ACF was active is converted the first time it is read.
    soldirectory_migrate_post_from_acf((int) $post->ID);

    // WordPress only includes a `meta` key when the post type has registered
    // meta, and may hand it back as an object when empty. Everything below
    // writes into it, and soldirectory_inject_group_meta() takes it by
    // reference as an array - a missing key became null there and threw a
    // TypeError that took down the whole REST response (every /services/*
    // page 404'd). Normalise it once, here.
    $meta = $response_data['meta'] ?? [];
    $response_data['meta'] = is_array($meta) ? $meta : (array) $meta;

    foreach ($groups as $group) {
        soldirectory_inject_group_meta($response_data['meta'], $group['fields'], $post->ID);
    }

    // service_area_page: 3 repeaters need reshaping from this plugin's
    // {label,value}-object rows into the [string, number] TUPLES the
    // frontend's real TypeScript types use (ServiceAreaPage.glance,
    // .serviceCounts, and .demand's nested .rows) — a deliberate shape
    // decision matching the original fixture data, unrelated to how
    // ACF happened to store rows.
    if ($post->post_type === 'service_area_page') {
        $glance = soldirectory_meta_json($post->ID, 'glance_repeater');
        if (is_array($glance)) {
            $response_data['meta']['glance_json'] = wp_json_encode(array_map(
                fn($row) => [$row['label'] ?? '', $row['value'] ?? ''], $glance
            ));
        }
        $counts = soldirectory_meta_json($post->ID, 'service_counts_repeater');
        if (is_array($counts)) {
            $response_data['meta']['service_counts_json'] = wp_json_encode(array_map(
                fn($row) => [$row['label'] ?? '', (int) ($row['count'] ?? 0)], $counts
            ));
        }
        $demand = soldirectory_meta_json($post->ID, 'demand_repeater');
        if (is_array($demand)) {
            $response_data['meta']['demand_json'] = wp_json_encode(array_map(
                fn($panel) => [
                    'title' => $panel['title'] ?? '',
                    'rows' => array_map(fn($row) => [$row['label'] ?? '', (int) ($row['value'] ?? 0)], $panel['rows'] ?? []),
                ],
                $demand
            ));
        }

        // hero_stats_group is a "group" field like finder_group/cost_group/
        // etc. above, which normally pass through as a raw object under
        // their own name — but wordpressApi.ts's mapServiceAreaPage
        // specifically reads this ONE as `meta.hero_stats_json`, a JSON
        // STRING (safeParseJson(meta.hero_stats_json, null)), matching
        // what 'service' posts' unrelated hero_stats_REPEATER field also
        // produces under that same key. Overrides the generic group
        // handling above for this one field only.
        unset($response_data['meta']['hero_stats_group']);
        $heroStats = soldirectory_meta_json($post->ID, 'hero_stats_group');
        if (is_array($heroStats) && $heroStats) {
            $response_data['meta']['hero_stats_json'] = wp_json_encode($heroStats);
        }
    }

    // related_services: resolve raw post IDs into full objects (id,
    // title, slug, featuredImage, url) so the frontend never needs a
    // second request or risks a stale link if a related service is
    // later renamed. Both 'service' and 'service_area_page' carry this field.
    if (in_array($post->post_type, ['service', 'service_area_page'], true)) {
        $relatedIds = soldirectory_meta_json($post->ID, 'related_services');
        if (is_array($relatedIds) && $relatedIds) {
            $resolved = array_map(function ($id) {
                $p = get_post((int) $id);
                if (!$p || $p->post_status !== 'publish') return null; // never expose drafts/trash
                $thumbId = get_post_thumbnail_id($p->ID);
                return [
                    'id' => $p->ID,
                    'title' => $p->post_title,
                    'slug' => $p->post_name,
                    'featuredImage' => $thumbId ? wp_get_attachment_url($thumbId) : null,
                    'url' => '/services/' . $p->post_name,
                ];
            }, $relatedIds);
            $response_data['meta']['related_services'] = array_values(array_filter($resolved));
        }
    }

    // logo_url — convenience read so the sync state is inspectable
    // directly from /wp-json/wp/v2/providers/{id}; the frontend itself
    // reads Provider.logoUrl from the Node API, kept current by webhook.php.
    if ($post->post_type === 'provider') {
        $thumbId = get_post_thumbnail_id($post->ID);
        $response_data['meta']['logo_url'] = $thumbId ? wp_get_attachment_url($thumbId) : null;
    }

    return $response_data;
}

/**
 * Walks one group's field defs, writing each into $meta (by
 * reference) in the exact shape the frontend expects:
 *  - scalar fields            -> their own value, verbatim
 *  - repeater "X_repeater"    -> "X_json" (a JSON-encoded array string,
 *                                 parsed by wordpressApi.ts's safeParseJson)
 *  - repeater NOT named "*_repeater" (mega_menu_tab's 'columns'/'links')
 *                              -> the decoded array itself (consumed
 *                                 server-side only, by the mega-menu
 *                                 REST endpoint below, never by
 *                                 wordpressApi.ts)
 *  - group                    -> the decoded object itself
 *  - relationship              -> handled separately above (needs
 *                                 resolving, not a plain passthrough)
 */
function soldirectory_inject_group_meta(array &$meta, array $fields, int $post_id): void {
    foreach ($fields as $field) {
        if (isset($field['tab']) || $field['type'] === 'relationship') continue;

        $name = $field['name'];
        if ($field['type'] === 'repeater') {
            $decoded = soldirectory_meta_json($post_id, $name);
            if (!is_array($decoded)) continue;
            if (str_ends_with($name, '_repeater')) {
                $meta[substr($name, 0, -strlen('_repeater')) . '_json'] = wp_json_encode($decoded);
            } else {
                $meta[$name] = $decoded;
            }
        } elseif ($field['type'] === 'group') {
            $decoded = soldirectory_meta_json($post_id, $name);
            if (is_array($decoded) && $decoded) $meta[$name] = $decoded;
        } elseif ($field['type'] === 'true_false') {
            // Stored as '1'/'0' (see soldirectory_store_field_value) —
            // '' specifically means "never saved through this UI", kept
            // absent so a frontend fallback like `!== false` still
            // resolves to its own default. Once saved at all, cast to a
            // REAL boolean: some frontend reads use strict `!== false`,
            // which a stray '0' STRING would not satisfy.
            $raw = get_post_meta($post_id, $name, true);
            if ($raw !== '') $meta[$name] = $raw === '1';
        } else {
            $value = get_post_meta($post_id, $name, true);
            if ($value !== null && $value !== false && $value !== '') $meta[$name] = $value;
        }
    }
}

foreach (['service', 'location', 'guide', 'service_area_page', 'mega_menu_tab', 'provider'] as $post_type) {
    add_filter("rest_prepare_{$post_type}", function ($response, $post) {
        // Adding these fields is decoration. If it ever fails, the page must
        // still be served (without the extras) rather than fatal the endpoint.
        try {
            $data = $response->get_data();
            $data = soldirectory_inject_custom_fields_meta($data, $post);
            $response->set_data($data);
        } catch (\Throwable $e) {
            error_log('[soldirectory] custom fields REST injection failed for post ' . $post->ID . ': ' . $e->getMessage());
        }
        return $response;
    }, 10, 2);
}

/**
 * Real endpoint for the frontend mega menu — returns every active
 * tab, in order, with its full column/link/CTA structure assembled.
 * Direct replacement for the same-named endpoint that used to read
 * these values via get_field(); reads plain post meta now.
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
              // One malformed tab must not take the whole menu down: skip it and log.
              try {
                soldirectory_migrate_post_from_acf((int) $tab->ID);
                if (!get_post_meta($tab->ID, 'active', true)) continue; // inactive tabs are skipped, not just hidden client-side

                $columns = soldirectory_meta_json($tab->ID, 'columns') ?: [];
                $result[] = [
                    'key' => get_post_meta($tab->ID, 'tab_key', true),
                    'label' => $tab->post_title,
                    'description' => get_post_meta($tab->ID, 'description', true),
                    'icon' => get_post_meta($tab->ID, 'icon', true),
                    'cta' => soldirectory_meta_json($tab->ID, 'cta'),
                    'columns' => array_map(function ($col) {
                        $links = array_filter(is_array($col['links'] ?? null) ? $col['links'] : [], fn($l) => !empty($l['active']));
                        return [
                            'title' => $col['title'] ?? '',
                            'links' => array_values($links),
                        ];
                    }, array_values(array_filter($columns, 'is_array'))),
                ];
              } catch (\Throwable $e) {
                error_log('[soldirectory] mega-menu tab ' . $tab->ID . ' skipped: ' . $e->getMessage());
              }
            }

            return new WP_REST_Response(['tabs' => $result], 200);
        },
    ]);
});

// The provider sync (apps/api's wordpressSync.service.ts) writes
// these via the REST API's `meta` object on POST /wp/v2/providers/{id}.
// ACF/SCF used to auto-register each of its fields as REST-editable
// meta; now that 'provider' has no ACF field group at all, that has
// to be done explicitly, or the sync's writes would silently stop
// persisting (reads are unaffected — the REST filter above always
// reads directly from post meta regardless of registration).
add_action('init', function () {
    $numericFields = ['latitude', 'longitude', 'travel_radius_km', 'weekly_capacity_hours', 'roster_size'];
    foreach (soldirectory_field_groups()['provider'][0]['fields'] as $field) {
        register_post_meta('provider', $field['name'], [
            'show_in_rest' => true,
            'single' => true,
            'type' => in_array($field['name'], $numericFields, true) ? 'number' : 'string',
            'auth_callback' => fn() => current_user_can('edit_posts'),
        ]);
    }
});
