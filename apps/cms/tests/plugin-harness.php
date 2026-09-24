<?php
// Runs the REAL plugin code against a fake WordPress, using ACF-format meta.
error_reporting(E_ALL);
$GLOBALS['LOG'] = $LOG = sys_get_temp_dir() . '/sd_harness_errors.log'; @unlink($LOG); ini_set('error_log', $LOG); ini_set('log_errors', '1');
set_error_handler(function ($no, $str, $file, $line) { throw new ErrorException($str, 0, $no, $file, $line); });

define('ABSPATH', __DIR__ . '/');
$PLUGIN = $argv[1];

// ---------- minimal WordPress ----------
$GLOBALS['META'] = [];      // [post_id][key] => value (arrays stay arrays, like unserialized ACF relationship values)
$GLOBALS['TYPES'] = [];     // post_id => post_type
$GLOBALS['ACTIONS'] = [];
$GLOBALS['FILTERS'] = [];
$GLOBALS['OPTIONS'] = [];
$GLOBALS['ROUTES'] = [];
$GLOBALS['POSTS'] = [];     // id => WP_Post

class WP_Post { public $post_name = ''; public $ID; public $post_type; public $post_title; public $post_status = 'publish'; public function __construct($id, $type, $title = '') { $this->ID = $id; $this->post_type = $type; $this->post_title = $title ?: "Post $id"; } }
class WP_REST_Response { private $d; public $status; public function __construct($d = null, $s = 200) { $this->d = $d; $this->status = $s; } public function get_data() { return $this->d; } public function set_data($d) { $this->d = $d; } }

function add_action($h, $cb, $p = 10, $a = 1) { $GLOBALS['ACTIONS'][$h][] = $cb; }
function add_filter($h, $cb, $p = 10, $a = 1) { $GLOBALS['FILTERS'][$h][] = $cb; }
function register_rest_route($ns, $route, $args) { $GLOBALS['ROUTES']["$ns$route"] = $args; }
function register_post_meta() {}
function current_user_can() { return true; }
function get_post_type($id) { return $GLOBALS['TYPES'][$id] ?? false; }
function get_post_meta($id, $key = '', $single = false) { $v = $GLOBALS['META'][$id][$key] ?? ''; return $v; }
function update_post_meta($id, $key, $value) { $GLOBALS['META'][$id][$key] = $value; return true; }
function metadata_exists($t, $id, $key) { return isset($GLOBALS['META'][$id][$key]); }
function get_option($k, $d = false) { return $GLOBALS['OPTIONS'][$k] ?? $d; }
function update_option($k, $v, $a = null) { $GLOBALS['OPTIONS'][$k] = $v; return true; }
function wp_json_encode($v, $f = 0) { return json_encode($v, $f); }
function maybe_unserialize($v) { $r = @unserialize($v); return $r === false && $v !== 'b:0;' ? $v : $r; }
function wp_get_attachment_url($id) { return $id === 77 ? 'https://cdn.test/uploads/77.jpg' : false; }
function get_posts($args) {
    $types = (array) $args['post_type'];
    $out = [];
    foreach ($GLOBALS['POSTS'] as $p) {
        if (!in_array($p->post_type, $types, true)) continue;
        $out[] = ($args['fields'] ?? '') === 'ids' ? $p->ID : $p;
    }
    return $out;
}
function get_post($id) { return $GLOBALS['POSTS'][$id] ?? ($id === 3 || $id === 4 ? (function () use ($id) { $p = new WP_Post($id, 'service', "Related $id"); $p->post_name = "related-$id"; return $p; })() : null); }
function get_post_thumbnail_id($id) { return 0; }
function esc_html($s) { return htmlspecialchars((string) $s); }
function do_action($h, ...$a) { foreach ($GLOBALS['ACTIONS'][$h] ?? [] as $cb) $cb(...$a); }

require $PLUGIN . '/includes/custom-fields.php';
require $PLUGIN . '/includes/acf-compat.php';
require $PLUGIN . '/includes/custom-fields-engine.php';
require $PLUGIN . '/includes/custom-fields-rest.php';

$pass = 0; $fail = 0;
function check($label, $ok, $extra = '') { global $pass, $fail; $ok ? $pass++ : $fail++; echo ($ok ? 'PASS' : 'FAIL') . "  $label" . ($ok ? '' : "  -> $extra") . "\n"; }

// ---------- generate ACF-format storage from the plugin's own field definitions ----------
function sample_value(array $f, string $path) {
    switch ($f['type']) {
        case 'select': return array_key_first($f['choices'] ?? ['x' => 1]);
        case 'number': return 5;
        case 'true_false': return true;
        case 'image': return 77;                 // ACF stores the attachment ID
        case 'relationship': return [3, 4];
        case 'group': $o = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $o[$sf['name']] = sample_value($sf, "$path.{$sf['name']}"); } return $o;
        case 'repeater': $rows = []; for ($i = 0; $i < 2; $i++) { $r = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $r[$sf['name']] = sample_value($sf, "$path.$i.{$sf['name']}"); } $rows[] = $r; } return $rows;
        default: return 'v:' . $path;
    }
}
function write_acf(int $id, array $f, $value, string $prefix = '') {
    $key = $prefix . $f['name'];
    switch ($f['type']) {
        case 'repeater':
            $GLOBALS['META'][$id][$key] = (string) count($value);           // ACF stores the row COUNT
            foreach ($value as $i => $row) foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; write_acf($id, $sf, $row[$sf['name']], $key . '_' . $i . '_'); }
            break;
        case 'group':
            foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; write_acf($id, $sf, $value[$sf['name']], $key . '_'); }
            break;
        case 'relationship': $GLOBALS['META'][$id][$key] = $value; break;       // unserialized array
        case 'true_false': $GLOBALS['META'][$id][$key] = $value ? '1' : '0'; break;
        case 'number': $GLOBALS['META'][$id][$key] = (string) $value; break;
        default: $GLOBALS['META'][$id][$key] = $value;
    }
}
function expected_value(array $f, $v) {
    switch ($f['type']) {
        case 'image': return 'https://cdn.test/uploads/77.jpg';
        case 'group': $o = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $o[$sf['name']] = expected_value($sf, $v[$sf['name']]); } return $o;
        case 'repeater': $rows = []; foreach ($v as $row) { $r = []; foreach ($f['sub_fields'] as $sf) { if (isset($sf['tab'])) continue; $r[$sf['name']] = expected_value($sf, $row[$sf['name']]); } $rows[] = $r; } return $rows;
        default: return $v;
    }
}

$next = 100;
foreach (soldirectory_field_groups() as $type => $groups) {
    $id = $next++;
    $GLOBALS['TYPES'][$id] = $type;
    $GLOBALS['POSTS'][$id] = new WP_Post($id, $type);
    $samples = [];
    foreach ($groups as $group) foreach ($group['fields'] as $f) {
        if (isset($f['tab'])) continue;
        $s = sample_value($f, $f['name']);
        $samples[$f['name']] = [$f, $s];
        write_acf($id, $f, $s);
    }
    if ($type === 'mega_menu_tab') { $GLOBALS['META'][$id]['active'] = '1'; }

    // 1) REST injection must not throw, even with NO `meta` key in the response (the production crash).
    $post = $GLOBALS['POSTS'][$id];
    $crash = null;
    $resp = new WP_REST_Response(['id' => $id, 'slug' => "p$id"]);   // deliberately no 'meta'
    try { foreach ($GLOBALS['FILTERS']["rest_prepare_$type"] ?? [] as $cb) $resp = $cb($resp, $post); } catch (\Throwable $e) { $crash = $e; }
    check("$type: REST injection with no meta key does not throw", $crash === null, $crash ? $crash->getMessage() : '');
    $meta = $resp->get_data()['meta'] ?? [];
    check("$type: injection logged no swallowed error", !file_exists($GLOBALS['LOG']) || strpos(file_get_contents($GLOBALS['LOG']), 'injection failed') === false, file_exists($GLOBALS['LOG']) ? file_get_contents($GLOBALS['LOG']) : '');
    if ($type === 'service_area_page') {
        $m = (array) $meta;
        check('service_area_page: glance_json is [label,value] tuples', isset($m['glance_json']) && is_array(json_decode($m['glance_json'], true)[0]) && count(json_decode($m['glance_json'], true)[0]) === 2, json_encode($m['glance_json'] ?? null));
        check('service_area_page: hero_stats_json is a JSON string; hero_stats_group removed', isset($m['hero_stats_json']) && is_string($m['hero_stats_json']) && !isset($m['hero_stats_group']));
        check('service_area_page: related_services resolved to objects', is_array($m['related_services'] ?? null) && ($m['related_services'][0]['slug'] ?? '') === 'related-3');
        check('service_area_page: finder_group passes through as an object', is_array($m['finder_group'] ?? null));
    }
    if ($type === 'service') {
        $m = (array) $meta;
        check('service: seo_og_image is a URL (not the attachment id)', ($m['seo_og_image'] ?? '') === 'https://cdn.test/uploads/77.jpg', json_encode($m['seo_og_image'] ?? null));
        check('service: *_repeater fields exposed as *_json strings', count(array_filter(array_keys($m), fn($k) => str_ends_with($k, '_json'))) > 0, implode(',', array_keys($m)));
    }
    check("$type: response has a meta array", is_array($meta) || is_object($meta));

    // 2) Migration: every repeater/group/relationship/image round-trips to the JSON storage.
    $bad = [];
    foreach ($samples as $name => [$f, $s]) {
        if (!in_array($f['type'], ['repeater', 'group', 'relationship', 'image'], true)) continue;
        $raw = $GLOBALS['META'][$id][$name] ?? null;
        $got = in_array($f['type'], ['image'], true) ? $raw : json_decode((string) $raw, true);
        $want = expected_value($f, $s);
        if ($f['type'] === 'relationship') $want = [3, 4];
        if ($got !== $want) $bad[] = $name . ' got ' . substr(json_encode($got), 0, 80) . ' want ' . substr(json_encode($want), 0, 80);
    }
    check("$type: all ACF repeaters/groups/relationships/images migrated exactly", !$bad, implode(' | ', array_slice($bad, 0, 3)));
    check("$type: marked migrated", ($GLOBALS['META'][$id][SOLDIRECTORY_ACF_MIGRATED_META] ?? '') === '1');

    // 3) The admin reader (meta box) now sees the content.
    $ok = true;
    foreach ($samples as $name => [$f, $s]) {
        if (!in_array($f['type'], ['repeater', 'group'], true)) continue;
        $val = soldirectory_get_meta_value($id, $name, $f['type']);
        if (!$val) { $ok = false; break; }
    }
    check("$type: meta-box reader returns migrated content", $ok);
}

// 4) A post with real JSON already (saved via the new meta boxes) is never overwritten.
$id = $next++;
$GLOBALS['TYPES'][$id] = 'service_area_page';
$GLOBALS['META'][$id]['glance_repeater'] = json_encode([['label' => 'Kept', 'value' => '1']]);
$GLOBALS['META'][$id]['glance_repeater_0_label'] = 'ACF version';
soldirectory_migrate_post_from_acf($id);
check('existing JSON content is not overwritten by stale ACF keys', json_decode($GLOBALS['META'][$id]['glance_repeater'], true)[0]['label'] === 'Kept');

// 5) Second migration of the same post is a no-op (marker), even if data changed.
$id2 = $next++;
$GLOBALS['TYPES'][$id2] = 'service_area_page';
soldirectory_migrate_post_from_acf($id2);   // nothing to migrate; marks
$GLOBALS['META'][$id2]['glance_repeater'] = '1'; $GLOBALS['META'][$id2]['glance_repeater_0_label'] = 'late';
unset($GLOBALS['META'][$id2][SOLDIRECTORY_ACF_MIGRATED_META]);
soldirectory_migrate_post_from_acf($id2);   // static cache: already handled in this request
check('migration runs at most once per post per request', ($GLOBALS['META'][$id2]['glance_repeater'] ?? '') === '1');

// 6) Garbage in meta never crashes the reader.
$id3 = $next++;
$GLOBALS['TYPES'][$id3] = 'mega_menu_tab';
$GLOBALS['POSTS'][$id3] = new WP_Post($id3, 'mega_menu_tab', 'Broken');
$GLOBALS['META'][$id3]['columns'] = '3';              // count with no rows behind it
$GLOBALS['META'][$id3]['cta'] = 'not json';
$GLOBALS['META'][$id3]['active'] = '1';
$crash = null;
try { $r = new WP_REST_Response(['meta' => []]); foreach ($GLOBALS['FILTERS']['rest_prepare_mega_menu_tab'] as $cb) $r = $cb($r, $GLOBALS['POSTS'][$id3]); } catch (\Throwable $e) { $crash = $e; }
check('garbage meta values do not throw', $crash === null, $crash ? $crash->getMessage() : '');

// 7) The mega-menu endpoint against ACF-format tabs.
do_action('rest_api_init');
$cb = $GLOBALS['ROUTES']['soldirectory/v1/mega-menu']['callback'];
$crash = null; $out = null;
// only real ACF-format tab: the generated one (first mega_menu_tab post)
foreach ($GLOBALS['POSTS'] as $pid => $p) if ($p->post_type === 'mega_menu_tab' && $pid !== $id3) $tabId = $pid;
$GLOBALS['POSTS'] = array_filter($GLOBALS['POSTS'], fn($p) => $p->ID === $tabId || $p->ID === $id3);
try { $out = $cb()->get_data(); } catch (\Throwable $e) { $crash = $e; }
check('mega-menu endpoint does not throw', $crash === null, $crash ? $crash->getMessage() : '');
$tabs = $out['tabs'] ?? [];
check('mega-menu: real tab has 2 columns each with links', count($tabs) >= 1 && count($tabs[0]['columns'] ?? []) === 2 && count($tabs[0]['columns'][0]['links'] ?? []) === 2, json_encode($tabs[0] ?? null));
check('mega-menu: cta group came through', is_array($tabs[0]['cta'] ?? null) && count($tabs[0]['cta']) > 0);

// 8) One-time full migration on admin_init
$before = count($GLOBALS['META']);
do_action('admin_init');
check('admin_init full migration sets its once-only option', !empty($GLOBALS['OPTIONS'][SOLDIRECTORY_ACF_MIGRATED_ALL_OPTION]));

echo "\n$pass passed, $fail failed\n";
