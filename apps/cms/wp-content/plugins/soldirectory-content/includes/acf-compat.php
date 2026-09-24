<?php
/**
 * Reads content that was saved by ACF/SCF and converts it, once per post,
 * into this plugin's own storage (see custom-fields.php's top comment).
 *
 * WHY THIS EXISTS: when ACF/SCF was replaced by the hand-rolled meta boxes,
 * the new code assumed repeaters, groups and relationships were stored as
 * one JSON value. Content created while ACF was active is NOT stored that
 * way. ACF flattens it across many meta keys:
 *
 *   repeater  "columns"      -> columns = 3 (the row COUNT), columns_0_title,
 *                               columns_0_links = 2, columns_0_links_0_label ...
 *   group     "cost_group"   -> cost_group_title, cost_group_body ...
 *   relationship / post_object -> a serialized array of post IDs
 *   image (return_format=url)  -> the attachment ID, not the URL
 *
 * Those posts therefore looked empty in the new meta boxes and crashed the
 * REST endpoints (json_decode("3") is the integer 3, not an array), which
 * the web app shows as a 404 on every service page. Nothing was lost - the
 * ACF meta is still in the database - it just wasn't being read.
 *
 * HOW IT WORKS: soldirectory_migrate_post_from_acf() reads the flattened
 * values using the field definitions in custom-fields.php and writes them
 * as JSON into the keys the rest of the plugin reads. It runs:
 *   - lazily, the first time a post is read through REST, the mega-menu
 *     endpoint, or opened in the editor; and
 *   - once for every post on the first wp-admin page load after deploy.
 * A post is only ever migrated once (marker below), and a field that already
 * holds real JSON content is never overwritten. The old flattened ACF keys
 * are left untouched.
 */

if (!defined('ABSPATH')) exit;

const SOLDIRECTORY_ACF_MIGRATED_META = '_sd_acf_migrated';
const SOLDIRECTORY_ACF_MIGRATED_ALL_OPTION = 'soldirectory_acf_migrated_all_v1';

/** Reads one field's value from ACF's flattened storage. $prefix is e.g. '' or 'columns_0_'. */
function soldirectory_acf_read_field(int $post_id, array $field, string $prefix = '') {
    $key = $prefix . $field['name'];
    $type = $field['type'] ?? 'text';

    switch ($type) {
        case 'repeater':
            $count = soldirectory_acf_row_count(get_post_meta($post_id, $key, true));
            $rows = [];
            for ($i = 0; $i < $count; $i++) {
                $row = [];
                foreach ($field['sub_fields'] ?? [] as $sf) {
                    if (isset($sf['tab'])) continue;
                    $row[$sf['name']] = soldirectory_acf_read_field($post_id, $sf, $key . '_' . $i . '_');
                }
                $rows[] = $row;
            }
            return $rows;

        case 'group':
            $obj = [];
            foreach ($field['sub_fields'] ?? [] as $sf) {
                if (isset($sf['tab'])) continue;
                $obj[$sf['name']] = soldirectory_acf_read_field($post_id, $sf, $key . '_');
            }
            return $obj;

        case 'relationship':
            return soldirectory_acf_ids(get_post_meta($post_id, $key, true));

        case 'true_false':
            $raw = get_post_meta($post_id, $key, true);
            return $raw === '1' || $raw === 1 || $raw === true;

        case 'image':
            $raw = get_post_meta($post_id, $key, true);
            if (is_numeric($raw) && (int) $raw > 0) return (string) (wp_get_attachment_url((int) $raw) ?: '');
            return is_string($raw) ? $raw : '';

        case 'number':
            $raw = get_post_meta($post_id, $key, true);
            return $raw === '' || $raw === false || !is_numeric($raw) ? '' : 0 + $raw;

        default:
            $raw = get_post_meta($post_id, $key, true);
            return is_scalar($raw) ? (string) $raw : '';
    }
}

/** ACF's repeater meta value is the row count. Anything that isn't a plain non-negative integer means "no ACF rows here". */
function soldirectory_acf_row_count($raw): int {
    if (is_int($raw)) return max(0, $raw);
    if (is_string($raw) && $raw !== '' && ctype_digit($raw)) return min((int) $raw, 500);
    return 0;
}

/** A relationship/post_object value (serialized array, single id, or numeric strings) as a list of positive ints. */
function soldirectory_acf_ids($raw): array {
    if (is_string($raw) && $raw !== '' && $raw[0] !== '[') $raw = maybe_unserialize($raw);
    if (is_numeric($raw)) $raw = [$raw];
    if (!is_array($raw)) return [];
    $ids = [];
    foreach ($raw as $id) {
        if (is_object($id) && isset($id->ID)) $id = $id->ID;
        if (is_numeric($id) && (int) $id > 0) $ids[] = (int) $id;
    }
    return array_values(array_unique($ids));
}

/** Does ACF-format data for this field exist on the post? */
function soldirectory_acf_has_data(int $post_id, array $field, string $prefix = ''): bool {
    $key = $prefix . $field['name'];
    switch ($field['type'] ?? 'text') {
        case 'repeater':
            return soldirectory_acf_row_count(get_post_meta($post_id, $key, true)) > 0;
        case 'group':
            foreach ($field['sub_fields'] ?? [] as $sf) {
                if (isset($sf['tab'])) continue;
                if (soldirectory_acf_has_data($post_id, $sf, $key . '_')) return true;
            }
            return false;
        case 'relationship':
            return count(soldirectory_acf_ids(get_post_meta($post_id, $key, true))) > 0;
        default:
            $raw = get_post_meta($post_id, $key, true);
            return $raw !== '' && $raw !== false && $raw !== null;
    }
}

/** True when a decoded JSON value carries any real content (not just [] / {} / empty strings / false). */
function soldirectory_value_has_content($value): bool {
    if (is_array($value)) {
        foreach ($value as $v) if (soldirectory_value_has_content($v)) return true;
        return false;
    }
    return $value !== '' && $value !== null && $value !== false && $value !== 0;
}

/** Converts one post's ACF-format content into this plugin's storage. Safe to call repeatedly. */
function soldirectory_migrate_post_from_acf(int $post_id): void {
    static $done = [];
    if (isset($done[$post_id])) return;
    $done[$post_id] = true;

    try {
        if (get_post_meta($post_id, SOLDIRECTORY_ACF_MIGRATED_META, true)) return;

        $groups = soldirectory_field_groups()[get_post_type($post_id)] ?? null;
        if (!$groups) return;

        foreach ($groups as $group) {
            if (!empty($group['readonly'])) continue; // provider fields are plain scalars written by the sync
            foreach ($group['fields'] as $field) {
                if (isset($field['tab'])) continue;
                $type = $field['type'] ?? 'text';
                $name = $field['name'];

                if (in_array($type, ['repeater', 'group', 'relationship'], true)) {
                    // Already holds real JSON content (written by the new meta boxes): keep it.
                    $current = get_post_meta($post_id, $name, true);
                    if (is_string($current) && $current !== '' && ($current[0] === '[' || $current[0] === '{')) {
                        if (soldirectory_value_has_content(json_decode($current, true))) continue;
                    }
                    if (!soldirectory_acf_has_data($post_id, $field)) continue;
                    $value = soldirectory_acf_read_field($post_id, $field);
                    if (soldirectory_value_has_content($value)) {
                        update_post_meta($post_id, $name, wp_json_encode($value));
                    }
                } elseif ($type === 'image') {
                    $raw = get_post_meta($post_id, $name, true);
                    if (is_numeric($raw) && (int) $raw > 0) {
                        $url = wp_get_attachment_url((int) $raw);
                        if ($url) update_post_meta($post_id, $name, $url);
                    }
                }
            }
        }

        update_post_meta($post_id, SOLDIRECTORY_ACF_MIGRATED_META, '1');
    } catch (\Throwable $e) {
        // Never let a migration problem take a page (or the REST API) down.
        error_log('[soldirectory] ACF migration failed for post ' . $post_id . ': ' . $e->getMessage());
    }
}

/**
 * Migrates every existing post of this plugin's types once, on the first
 * wp-admin page load after deploy. The lazy path above already keeps the
 * live site working; this just means editors never meet an un-migrated post.
 */
add_action('admin_init', function () {
    if (get_option(SOLDIRECTORY_ACF_MIGRATED_ALL_OPTION)) return;
    if (!current_user_can('edit_posts')) return;

    $ids = get_posts([
        'post_type' => ['service', 'location', 'guide', 'service_area_page', 'mega_menu_tab'],
        'post_status' => 'any',
        'numberposts' => -1,
        'fields' => 'ids',
        'no_found_rows' => true,
    ]);
    foreach ($ids as $id) soldirectory_migrate_post_from_acf((int) $id);
    update_option(SOLDIRECTORY_ACF_MIGRATED_ALL_OPTION, gmdate('c'), false);
});
