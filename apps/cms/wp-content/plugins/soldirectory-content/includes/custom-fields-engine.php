<?php
/**
 * Generic engine for the meta boxes defined in custom-fields.php: one
 * renderer, one saver, both driven entirely by the field definitions
 * — adding or changing a field group only ever means editing that
 * declarative array, never this file.
 */

if (!defined('ABSPATH')) exit;

const SOLDIRECTORY_NONCE_ACTION = 'soldirectory_save_fields';
const SOLDIRECTORY_NONCE_NAME = 'soldirectory_fields_nonce';

// =============================================================
// Registration
// =============================================================

add_action('add_meta_boxes', function () {
    foreach (soldirectory_field_groups() as $post_type => $groups) {
        foreach ($groups as $group) {
            add_meta_box(
                'soldirectory_' . $group['id'],
                $group['title'],
                'soldirectory_render_meta_box',
                $post_type,
                'normal',
                'default',
                ['group' => $group]
            );
        }
    }
});

// wp.media (WordPress core, not ACF) for the image picker, only on
// screens that actually have one of our meta boxes.
add_action('admin_enqueue_scripts', function ($hook) {
    if ($hook !== 'post.php' && $hook !== 'post-new.php') return;
    $screen = function_exists('get_current_screen') ? get_current_screen() : null;
    if (!$screen || !isset(soldirectory_field_groups()[$screen->post_type])) return;

    wp_enqueue_media();
    wp_enqueue_editor(); // wp_editor()'s own assets, for the one wysiwyg field
    wp_enqueue_script(
        'soldirectory-admin-fields',
        plugins_url('../assets/admin-fields.js', __FILE__),
        [],
        '1.0.0',
        true
    );
    wp_enqueue_style(
        'soldirectory-admin-fields',
        plugins_url('../assets/admin-fields.css', __FILE__),
        [],
        '1.0.0'
    );
});

// =============================================================
// Rendering
// =============================================================

function soldirectory_render_meta_box(WP_Post $post, array $box): void {
    $group = $box['args']['group'];
    wp_nonce_field(SOLDIRECTORY_NONCE_ACTION, SOLDIRECTORY_NONCE_NAME);
    echo '<div class="sdmb-box">';
    if (!empty($group['readonly'])) {
        echo '<p class="sdmb-readonly-notice">Read-only — managed by the SolDirectory application and overwritten on next sync.</p>';
    }
    soldirectory_render_fields($group['fields'], $post->ID, '', !empty($group['readonly']));
    echo '</div>';
}

/**
 * @param array  $fields   Field defs (see custom-fields.php).
 * @param int    $post_id
 * @param string $prefix   Dotted "name path" so far, e.g. "cost_group." or "steps.0.".
 * @param bool   $readonly
 * @param array|null $values Parent's already-decoded values to read sub_fields from
 *                           (repeater rows / group contents); null means "read straight
 *                           from post meta", used only at the top level.
 */
function soldirectory_render_fields(array $fields, int $post_id, string $prefix, bool $readonly, ?array $values = null): void {
    foreach ($fields as $field) {
        if (isset($field['tab'])) {
            echo '<h3 class="sdmb-tab-heading">' . esc_html($field['tab']) . '</h3>';
            continue;
        }
        $value = $values !== null ? ($values[$field['name']] ?? null) : soldirectory_get_meta_value($post_id, $field['name'], $field['type']);
        soldirectory_render_field($field, $value, $prefix . $field['name'], $readonly);
    }
}

function soldirectory_field_input_name(string $path): string {
    // "a.b.0.c" -> "a[b][0][c]" — the nested $_POST shape PHP parses natively.
    $parts = explode('.', $path);
    return $parts[0] . implode('', array_map(fn($p) => '[' . $p . ']', array_slice($parts, 1)));
}

function soldirectory_render_field(array $field, $value, string $path, bool $readonly): void {
    $type = $field['type'];
    $name = soldirectory_field_input_name($path);
    $id = 'sdmb-' . str_replace(['.', '[', ']'], '-', $path);
    $width = $field['width'] ?? null;
    $style = $width ? ' style="width:' . (int) $width . '%"' : '';
    $ro = $readonly ? ' readonly disabled' : '';

    echo '<div class="sdmb-field sdmb-field-' . esc_attr($type) . '"' . $style . '>';
    echo '<label class="sdmb-field-label" for="' . esc_attr($id) . '">' . esc_html($field['label']) . '</label>';

    switch ($type) {
        case 'textarea':
            $rows = $field['rows'] ?? 3;
            echo '<textarea class="sdmb-input" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" rows="' . (int) $rows . '"' . $ro . '>' . esc_textarea((string) $value) . '</textarea>';
            break;

        case 'number':
            echo '<input class="sdmb-input sdmb-input-number" type="number" step="any" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" value="' . esc_attr($value === null || $value === '' ? ($field['default'] ?? '') : $value) . '"' . $ro . '>';
            break;

        case 'select':
            echo '<select class="sdmb-input" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '"' . ($readonly ? ' disabled' : '') . '>';
            $current = $value !== null && $value !== '' ? $value : ($field['default'] ?? '');
            foreach ($field['choices'] as $choiceValue => $choiceLabel) {
                echo '<option value="' . esc_attr($choiceValue) . '"' . selected($current, $choiceValue, false) . '>' . esc_html($choiceLabel) . '</option>';
            }
            echo '</select>';
            break;

        case 'true_false':
            $checked = $value === null ? !empty($field['default']) : (bool) $value;
            echo '<label class="sdmb-toggle"><input type="checkbox" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" value="1"' . checked($checked, true, false) . ($readonly ? ' disabled' : '') . '><span>On</span></label>';
            break;

        case 'image':
            $url = (string) $value;
            echo '<div class="sdmb-image-field" data-input="' . esc_attr($id) . '">';
            echo '<div class="sdmb-image-preview"' . ($url ? '' : ' style="display:none"') . '><img src="' . esc_url($url) . '" alt=""></div>';
            echo '<input type="hidden" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" value="' . esc_attr($url) . '">';
            if (!$readonly) {
                echo '<button type="button" class="button sdmb-image-choose">' . ($url ? 'Change image' : 'Choose image') . '</button> ';
                echo '<button type="button" class="button-link sdmb-image-remove"' . ($url ? '' : ' style="display:none"') . '>Remove</button>';
            }
            echo '</div>';
            break;

        case 'wysiwyg':
            // WordPress core's own editor — not ACF's, so it isn't
            // affected by whatever is wrong with ACF's admin bundle.
            wp_editor((string) $value, $id, [
                'textarea_name' => $name,
                'textarea_rows' => 6,
                'media_buttons' => false,
                'quicktags' => true,
            ]);
            break;

        case 'relationship':
            $selected = is_array($value) ? array_map('intval', $value) : [];
            $posts = get_posts(['post_type' => $field['post_type'], 'post_status' => 'publish', 'numberposts' => 200, 'orderby' => 'title', 'order' => 'ASC']);
            echo '<select class="sdmb-input sdmb-relationship" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '[]" multiple size="6"' . ($readonly ? ' disabled' : '') . '>';
            foreach ($posts as $p) {
                echo '<option value="' . (int) $p->ID . '"' . selected(in_array((int) $p->ID, $selected, true), true, false) . '>' . esc_html($p->post_title) . '</option>';
            }
            echo '</select>';
            echo '<p class="sdmb-field-desc">Ctrl/Cmd-click to select more than one.</p>';
            break;

        case 'group':
            echo '<div class="sdmb-group">';
            soldirectory_render_fields($field['sub_fields'], 0, $path . '.', $readonly, is_array($value) ? $value : []);
            echo '</div>';
            break;

        case 'repeater':
            soldirectory_render_repeater($field, is_array($value) ? $value : [], $path, $readonly);
            break;

        case 'text':
        default:
            echo '<input class="sdmb-input" type="text" id="' . esc_attr($id) . '" name="' . esc_attr($name) . '" value="' . esc_attr((string) $value) . '"' . $ro . '>';
            break;
    }

    if (!empty($field['instructions'])) {
        echo '<p class="sdmb-field-desc">' . esc_html($field['instructions']) . '</p>';
    }
    echo '</div>';
}

/**
 * A repeater's own "Add row" JS clones a per-row template that's
 * scoped to THIS repeater instance (data-template on the wrapper),
 * using an index token unique to this nesting depth (data-index-token)
 * so an outer repeater's Add-row substitution can never corrupt an
 * inner repeater's own not-yet-used template string.
 */
function soldirectory_render_repeater(array $field, array $rows, string $path, bool $readonly): void {
    static $depth = 0;
    $token = '__SDIDX' . $depth . '__';
    $layout = $field['layout'] ?? 'block';
    $labelField = $field['row_label_field'] ?? null;

    echo '<div class="sdmb-repeater sdmb-repeater-' . esc_attr($layout) . '" data-name="' . esc_attr($path) . '" data-index-token="' . esc_attr($token) . '" data-next-index="' . count($rows) . '">';

    if ($layout === 'table') {
        echo '<table class="sdmb-repeater-table"><thead><tr>';
        foreach ($field['sub_fields'] as $sf) echo '<th>' . esc_html($sf['label']) . '</th>';
        if (!$readonly) echo '<th></th>';
        echo '</tr></thead><tbody class="sdmb-repeater-rows">';
        foreach ($rows as $i => $row) soldirectory_render_repeater_row($field, $row, $path, (string) $i, $readonly, true);
        echo '</tbody></table>';
    } else {
        echo '<div class="sdmb-repeater-rows">';
        foreach ($rows as $i => $row) soldirectory_render_repeater_row($field, $row, $path, (string) $i, $readonly, false);
        echo '</div>';
    }

    if (!$readonly) {
        $depth++;
        // The template row's OWN field names must carry the same
        // "$path.$index." prefix a real row gets — here $index is the
        // token text itself (e.g. "columns.__SDIDX0__.title"), so the
        // browser's later token substitution turns it into a real row
        // the instant it's cloned.
        $templateHtml = $layout === 'table'
            ? '<tr class="sdmb-repeater-row">' . soldirectory_repeater_row_inner($field, [], $path . '.' . $token) . '</tr>'
            : soldirectory_repeater_row_wrap($field, [], $path . '.' . $token);
        $depth--;
        echo '<template class="sdmb-repeater-template">' . $templateHtml . '</template>';
        echo '<button type="button" class="button sdmb-add-row">' . esc_html($field['button_label'] ?? 'Add row') . '</button>';
    }

    echo '</div>';
    unset($labelField); // documents intent; actual label shown via CSS :first-child text in a block row's heading field, no PHP needed
}

function soldirectory_render_repeater_row(array $field, array $row, string $path, string $index, bool $readonly, bool $isTable): void {
    if ($isTable) {
        echo '<tr class="sdmb-repeater-row">' . soldirectory_repeater_row_inner($field, $row, $path . '.' . $index, $readonly) . '</tr>';
    } else {
        echo soldirectory_repeater_row_wrap($field, $row, $path . '.' . $index, $readonly);
    }
}

function soldirectory_repeater_row_wrap(array $field, array $row, string $rowPath, bool $readonly = false): string {
    ob_start();
    echo '<div class="sdmb-repeater-row">';
    if (!$readonly) echo '<button type="button" class="button-link sdmb-remove-row" aria-label="Remove row">&times;</button>';
    echo '<div class="sdmb-repeater-row-fields">';
    soldirectory_render_fields($field['sub_fields'], 0, $rowPath . '.', $readonly, $row);
    echo '</div></div>';
    return ob_get_clean();
}

function soldirectory_repeater_row_inner(array $field, array $row, string $rowPath, bool $readonly = false): string {
    ob_start();
    foreach ($field['sub_fields'] as $sf) {
        echo '<td>';
        $value = $row[$sf['name']] ?? null;
        // Table cells render the bare input, no label repeated per row —
        // the column header (from soldirectory_render_repeater) already
        // says what it is.
        soldirectory_render_bare_field($sf, $value, $rowPath . '.' . $sf['name'], $readonly);
        echo '</td>';
    }
    if (!$readonly) echo '<td><button type="button" class="button-link sdmb-remove-row" aria-label="Remove row">&times;</button></td>';
    return ob_get_clean();
}

/** Same as soldirectory_render_field but without the <label>/wrapper — used inside a table cell. */
function soldirectory_render_bare_field(array $field, $value, string $path, bool $readonly): void {
    $type = $field['type'];
    $name = soldirectory_field_input_name($path);
    $ro = $readonly ? ' readonly disabled' : '';
    if ($type === 'number') {
        echo '<input class="sdmb-input" type="number" step="any" name="' . esc_attr($name) . '" value="' . esc_attr((string) $value) . '"' . $ro . '>';
    } elseif ($type === 'true_false') {
        echo '<input type="checkbox" name="' . esc_attr($name) . '" value="1"' . checked((bool) $value, true, false) . ($readonly ? ' disabled' : '') . '>';
    } else {
        echo '<input class="sdmb-input" type="text" name="' . esc_attr($name) . '" value="' . esc_attr((string) $value) . '"' . $ro . '>';
    }
}

// =============================================================
// Reading (admin display only — REST exposure has its own reader
// in custom-fields-rest.php, since it needs the *_json / tuple
// shapes the frontend expects, not this raw decoded-array shape).
// =============================================================

function soldirectory_get_meta_value(int $post_id, string $name, string $type) {
    $raw = get_post_meta($post_id, $name, true);
    if (in_array($type, ['repeater', 'group'], true)) {
        if ($raw === '' || $raw === false) return $type === 'repeater' ? [] : [];
        $decoded = json_decode((string) $raw, true);
        return is_array($decoded) ? $decoded : [];
    }
    if ($type === 'relationship') {
        $decoded = $raw ? json_decode((string) $raw, true) : [];
        return is_array($decoded) ? $decoded : [];
    }
    if ($type === 'true_false') {
        return $raw === '' && $raw !== '0' ? null : (bool) $raw;
    }
    return $raw;
}

// =============================================================
// Saving
// =============================================================

add_action('save_post', function ($post_id) {
    if (!isset($_POST[SOLDIRECTORY_NONCE_NAME]) || !wp_verify_nonce(wp_unslash($_POST[SOLDIRECTORY_NONCE_NAME]), SOLDIRECTORY_NONCE_ACTION)) return;
    if (wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) return;
    if (!current_user_can('edit_post', $post_id)) return;

    $post_type = get_post_type($post_id);
    $groups = soldirectory_field_groups()[$post_type] ?? null;
    if (!$groups) return;

    foreach ($groups as $group) {
        if (!empty($group['readonly'])) continue; // provider: nothing here is meant to be edited
        foreach ($group['fields'] as $field) {
            if (isset($field['tab'])) continue;
            $submitted = $_POST[$field['name']] ?? null;
            $value = soldirectory_collect_field_value($field, $submitted, $field['name']);
            soldirectory_store_field_value($post_id, $field, $value);
        }
    }
}, 20, 1);

/** Sanitizes one submitted field's raw $_POST value into its storage shape. */
function soldirectory_collect_field_value(array $field, $raw, string $presentKeyBase) {
    switch ($field['type']) {
        case 'textarea':
            return sanitize_textarea_field((string) ($raw ?? ''));
        case 'wysiwyg':
            return wp_kses_post((string) ($raw ?? ''));
        case 'number':
            return $raw === '' || $raw === null ? '' : (is_numeric($raw) ? 0 + $raw : '');
        case 'select':
            $choices = array_keys($field['choices'] ?? []);
            return in_array($raw, $choices, true) ? $raw : ($field['default'] ?? ($choices[0] ?? ''));
        case 'true_false':
            // An unchecked checkbox sends nothing at all — every
            // defined true_false field is visited on save regardless
            // of what $_POST contains, so "absent" correctly means
            // "off", never "leave whatever was there before".
            return !empty($raw);
        case 'image':
            return esc_url_raw((string) ($raw ?? ''));
        case 'relationship':
            $ids = is_array($raw) ? $raw : [];
            return array_values(array_unique(array_map('intval', array_filter($ids, 'is_numeric'))));
        case 'group':
            $sub = is_array($raw) ? $raw : [];
            $out = [];
            foreach ($field['sub_fields'] as $sf) {
                $out[$sf['name']] = soldirectory_collect_field_value($sf, $sub[$sf['name']] ?? null, $sf['name']);
            }
            return $out;
        case 'repeater':
            $rows = is_array($raw) ? $raw : [];
            ksort($rows, SORT_NUMERIC);
            $out = [];
            foreach ($rows as $row) {
                if (!is_array($row)) continue;
                $rowOut = [];
                foreach ($field['sub_fields'] as $sf) {
                    $rowOut[$sf['name']] = soldirectory_collect_field_value($sf, $row[$sf['name']] ?? null, $sf['name']);
                }
                $out[] = $rowOut;
            }
            return array_values($out);
        case 'text':
        default:
            return sanitize_text_field((string) ($raw ?? ''));
    }
}

function soldirectory_store_field_value(int $post_id, array $field, $value): void {
    if ($field['type'] === 'true_false') {
        // Never store a raw PHP boolean directly: WordPress's own meta
        // storage round-trips `false` through $wpdb as an empty string,
        // making "explicitly turned off" indistinguishable from "this
        // meta key was never saved at all" — and some frontend reads
        // (WordPressCPTPage.tsx's finder show/hide flags) specifically
        // rely on telling those two apart. '1'/'0' are never empty.
        update_post_meta($post_id, $field['name'], $value ? '1' : '0');
        return;
    }
    $needsJson = in_array($field['type'], ['repeater', 'group', 'relationship'], true);
    update_post_meta($post_id, $field['name'], $needsJson ? wp_json_encode($value) : $value);
}
